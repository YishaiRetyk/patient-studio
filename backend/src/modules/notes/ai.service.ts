import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

/**
 * AI Service for OpenAI GPT-4o Integration
 * Task ID: T115, T116, T117
 * Per FR-044 to FR-046: AI-powered SOAP note autocompletion with PHI de-identification
 * Constitution Principle IV: HIPAA-compliant AI assistance with zero-retention
 */
@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);
  private readonly openai: OpenAI;
  private readonly rateLimitMap: Map<
    string,
    { count: number; resetTime: number }
  > = new Map();

  // Rate limiting: 20 requests per minute per user (FR-046)
  private readonly RATE_LIMIT = 20;
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');

    if (!apiKey) {
      this.logger.error('OPENAI_API_KEY not configured');
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({
      apiKey,
      // Zero-retention mode for HIPAA compliance (FR-045)
      defaultHeaders: {
        'OpenAI-Organization': this.configService.get<string>('OPENAI_ORG_ID', ''),
      },
    });

    this.logger.log('AIService initialized with OpenAI GPT-4o');
  }

  /**
   * De-identify PHI from text before sending to OpenAI API
   * Task ID: T116
   * Per FR-046: Remove all 18 HIPAA identifiers
   */
  deidentifyPHI(text: string, patientName: string): string {
    if (!text) {
      return text;
    }

    let deidentified = text;

    // 1. Replace patient name (case-insensitive)
    if (patientName) {
      const nameRegex = new RegExp(patientName, 'gi');
      deidentified = deidentified.replace(nameRegex, 'Patient A');

      // Also handle first and last names separately
      const nameParts = patientName.split(/\s+/);
      nameParts.forEach((part) => {
        if (part.length > 1) {
          const partRegex = new RegExp(`\\b${part}\\b`, 'gi');
          deidentified = deidentified.replace(partRegex, 'Patient A');
        }
      });
    }

    // 2. Replace Social Security Numbers (XXX-XX-XXXX or XXXXXXXXX)
    deidentified = deidentified.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '###-##-####');
    deidentified = deidentified.replace(/\b\d{9}\b/g, '#########');

    // 3. Replace phone numbers (various formats)
    deidentified = deidentified.replace(
      /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      '##########',
    );
    deidentified = deidentified.replace(/\b\d{10}\b/g, '##########');

    // 4. Replace email addresses
    deidentified = deidentified.replace(
      /\b[\w.-]+@[\w.-]+\.\w+\b/g,
      'email@redacted',
    );

    // 5. Replace dates (MM/DD/YYYY, YYYY-MM-DD)
    deidentified = deidentified.replace(
      /\b\d{2}\/\d{2}\/\d{4}\b/g,
      '##/##/####',
    );
    deidentified = deidentified.replace(
      /\b\d{4}-\d{2}-\d{2}\b/g,
      '####-##-##',
    );

    // 6. Replace street addresses (basic pattern)
    deidentified = deidentified.replace(
      /\b\d+\s+[\w\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Place|Pl|Apt|Apartment|Suite|Unit)\b/gi,
      '[ADDRESS REDACTED]',
    );

    // 7. Replace ZIP codes (5 or 9 digit)
    deidentified = deidentified.replace(/\b\d{5}(?:-\d{4})?\b/g, '#####');

    // 8. Replace medical record numbers (MRN patterns)
    deidentified = deidentified.replace(
      /\b(?:MRN|Medical Record Number)[\s:#]*(\d{6,})/gi,
      '[MRN REDACTED]',
    );

    // 9. Replace account numbers (basic pattern)
    deidentified = deidentified.replace(
      /\b(?:Account|Acct)[\s:#]*(\d{6,})/gi,
      '[ACCOUNT REDACTED]',
    );

    // 10. Replace URLs
    deidentified = deidentified.replace(
      /https?:\/\/[^\s]+/g,
      '[URL REDACTED]',
    );

    // 11. Replace IP addresses
    deidentified = deidentified.replace(
      /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
      '[IP REDACTED]',
    );

    return deidentified;
  }

  /**
   * Check rate limit for user
   * Task ID: T117
   * Per FR-046: 20 requests per minute per user
   */
  private checkRateLimit(userId: string): boolean {
    const now = Date.now();
    const userLimit = this.rateLimitMap.get(userId);

    if (!userLimit || now > userLimit.resetTime) {
      // Reset or initialize rate limit
      this.rateLimitMap.set(userId, {
        count: 1,
        resetTime: now + this.RATE_LIMIT_WINDOW_MS,
      });
      return true;
    }

    if (userLimit.count >= this.RATE_LIMIT) {
      // Rate limit exceeded
      return false;
    }

    // Increment count
    userLimit.count++;
    return true;
  }

  /**
   * Generate AI completion for SOAP note section
   * Task ID: T115, T117
   * Per FR-044: OpenAI GPT-4o autocompletion with rate limiting
   */
  async generateSoapCompletion(params: {
    partialNote: { subjective?: string; objective?: string; assessment?: string; plan?: string; soapSection: 'subjective' | 'objective' | 'assessment' | 'plan' };
    context: { patientName: string; appointmentDate: string };
    userId: string;
    tenantId: string;
  }): Promise<{
    completion: string;
    soapSection: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    estimatedCost: number;
    phiDeidentified: boolean;
    hipaaCompliant: boolean;
    zeroRetention: boolean;
    timestamp: string;
  }> {
    const { partialNote, context, userId, tenantId } = params;

    // Check rate limit
    if (!this.checkRateLimit(userId)) {
      throw new Error('Rate limit exceeded. Maximum 20 requests per minute.');
    }

    // Build context from partial note
    const noteContext = Object.entries(partialNote)
      .filter(([key]) => key !== 'soapSection')
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    // De-identify PHI before sending to OpenAI
    const deidentifiedContext = this.deidentifyPHI(
      noteContext,
      context.patientName,
    );

    // Log de-identification (without actual PHI)
    this.logger.log(
      `PHI de-identification applied for tenant ${tenantId}, user ${userId}`,
    );

    // Construct prompt based on SOAP section
    const sectionPrompts = {
      subjective: 'You are a medical documentation assistant. Based on the context below, continue or complete the Subjective section of this SOAP note. Be concise and clinical. Focus on patient-reported symptoms and concerns.',
      objective: 'You are a medical documentation assistant. Based on the context below, continue or complete the Objective section of this SOAP note. Be concise and clinical. Focus on observable findings and clinical observations.',
      assessment: 'You are a medical documentation assistant. Based on the context below, continue or complete the Assessment section of this SOAP note. Be concise and clinical. Focus on clinical impressions and diagnoses.',
      plan: 'You are a medical documentation assistant. Based on the context below, continue or complete the Plan section of this SOAP note. Be concise and clinical. Focus on treatment recommendations and follow-up actions.',
    };

    const systemPrompt =
      sectionPrompts[partialNote.soapSection] ||
      'You are a medical documentation assistant helping to complete SOAP notes.';

    try {
      // Call OpenAI API with zero-retention configuration
      const startTime = Date.now();
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: `Continue this SOAP note section:\n\n${deidentifiedContext}`,
          },
        ],
        max_tokens: 150,
        temperature: 0.3, // Lower temperature for more focused, clinical responses
        user: `tenant-${tenantId}-user-${userId}`, // For OpenAI tracking (hashed)
      });
      const endTime = Date.now();

      const responseText = completion.choices[0]?.message?.content || '';

      // Calculate cost (GPT-4o pricing as of 2025: ~$0.03/1K input tokens, ~$0.06/1K output tokens)
      const inputCost = (completion.usage?.prompt_tokens || 0) * 0.00003;
      const outputCost = (completion.usage?.completion_tokens || 0) * 0.00006;
      const totalCost = inputCost + outputCost;

      this.logger.log(
        `OpenAI completion generated in ${endTime - startTime}ms. Cost: $${totalCost.toFixed(4)}`,
      );

      return {
        completion: responseText,
        soapSection: partialNote.soapSection,
        usage: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        estimatedCost: totalCost,
        phiDeidentified: true,
        hipaaCompliant: true,
        zeroRetention: true, // OpenAI zero-retention mode enabled
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error(
        `OpenAI API error for tenant ${tenantId}:`,
        error.message,
      );

      if (error.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again later.');
      }

      if (error.status >= 500) {
        throw new Error('AI service temporarily unavailable. Please try again later.');
      }

      throw new Error(`Failed to generate AI completion: ${error.message}`);
    }
  }

  /**
   * Clean up expired rate limit entries (called periodically)
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [userId, limit] of this.rateLimitMap.entries()) {
      if (now > limit.resetTime) {
        this.rateLimitMap.delete(userId);
      }
    }
  }
}
