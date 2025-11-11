import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KMSClient, GenerateDataKeyCommand } from '@aws-sdk/client-kms';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

/**
 * Encryption Service for SOAP Note Field-Level Encryption
 * Task ID: T121
 * Per FR-048, FR-052: Per-tenant encryption using AWS KMS
 * Constitution Principle IV: Field-level encryption for PHI
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly kmsClient: KMSClient;
  private readonly kmsKeyId: string;
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyCache: Map<string, { key: Buffer; expiresAt: number }> = new Map();
  private readonly KEY_CACHE_TTL_MS = 3600000; // 1 hour

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION', 'us-east-1');
    this.kmsKeyId = this.configService.get<string>('AWS_KMS_KEY_ID', '');

    if (!this.kmsKeyId) {
      this.logger.warn(
        'AWS_KMS_KEY_ID not configured. Encryption service may not function correctly.',
      );
    }

    this.kmsClient = new KMSClient({ region });
    this.logger.log('EncryptionService initialized with AWS KMS');
  }

  /**
   * Get or generate encryption key for tenant using AWS KMS
   */
  private async getTenantKey(tenantId: string): Promise<Buffer> {
    // Check cache first
    const cached = this.keyCache.get(tenantId);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.key;
    }

    try {
      // Generate data key using AWS KMS
      const command = new GenerateDataKeyCommand({
        KeyId: this.kmsKeyId,
        KeySpec: 'AES_256',
        EncryptionContext: {
          tenantId,
          purpose: 'clinical-notes-encryption',
        },
      });

      const response = await this.kmsClient.send(command);

      if (!response.Plaintext) {
        throw new Error('Failed to generate data key from KMS');
      }

      const key = Buffer.from(response.Plaintext);

      // Cache the key
      this.keyCache.set(tenantId, {
        key,
        expiresAt: Date.now() + this.KEY_CACHE_TTL_MS,
      });

      this.logger.log(`Generated new encryption key for tenant ${tenantId}`);
      return key;
    } catch (error) {
      this.logger.error(`Failed to get tenant key from KMS: ${error.message}`);
      throw new Error('KMS service unavailable');
    }
  }

  /**
   * Encrypt plaintext using AES-256-GCM with per-tenant key
   * Task ID: T121
   */
  async encrypt(plaintext: string, tenantId: string): Promise<string> {
    if (!plaintext) {
      return '';
    }

    if (!tenantId) {
      throw new Error('Invalid tenant ID for encryption');
    }

    try {
      // Get tenant-specific encryption key
      const key = await this.getTenantKey(tenantId);

      // Generate random IV (initialization vector)
      const iv = randomBytes(16);

      // Create cipher
      const cipher = createCipheriv(this.algorithm, key, iv);

      // Encrypt plaintext
      let encrypted = cipher.update(plaintext, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // Get authentication tag (for GCM mode)
      const authTag = cipher.getAuthTag();

      // Combine IV + authTag + encrypted data
      const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);

      // Return as base64-encoded string
      return combined.toString('base64');
    } catch (error) {
      this.logger.error(`Encryption failed: ${error.message}`);
      throw new Error('Encryption failed');
    }
  }

  /**
   * Decrypt ciphertext using AES-256-GCM with per-tenant key
   * Task ID: T121
   */
  async decrypt(ciphertext: string, tenantId: string): Promise<string> {
    if (!ciphertext) {
      return '';
    }

    if (!tenantId) {
      throw new Error('Invalid tenant ID for decryption');
    }

    try {
      // Get tenant-specific encryption key
      const key = await this.getTenantKey(tenantId);

      // Decode base64 ciphertext
      const combined = Buffer.from(ciphertext, 'base64');

      // Extract IV, authTag, and encrypted data
      const iv = combined.subarray(0, 16);
      const authTag = combined.subarray(16, 32);
      const encryptedData = combined.subarray(32);

      // Create decipher
      const decipher = createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt data
      let decrypted = decipher.update(encryptedData, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      this.logger.error(`Decryption failed: ${error.message}`);
      throw new Error('Decryption failed');
    }
  }

  /**
   * Encrypt all SOAP sections for a clinical note
   */
  async encryptSoapSections(
    soapNote: {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    },
    tenantId: string,
  ): Promise<{
    subjectiveEncrypted: string;
    objectiveEncrypted: string;
    assessmentEncrypted: string;
    planEncrypted: string;
  }> {
    const [subjectiveEncrypted, objectiveEncrypted, assessmentEncrypted, planEncrypted] =
      await Promise.all([
        this.encrypt(soapNote.subjective, tenantId),
        this.encrypt(soapNote.objective, tenantId),
        this.encrypt(soapNote.assessment, tenantId),
        this.encrypt(soapNote.plan, tenantId),
      ]);

    return {
      subjectiveEncrypted,
      objectiveEncrypted,
      assessmentEncrypted,
      planEncrypted,
    };
  }

  /**
   * Decrypt all SOAP sections for a clinical note
   */
  async decryptSoapSections(
    encryptedNote: {
      subjectiveEncrypted: string;
      objectiveEncrypted: string;
      assessmentEncrypted: string;
      planEncrypted: string;
    },
    tenantId: string,
  ): Promise<{
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }> {
    const [subjective, objective, assessment, plan] = await Promise.all([
      this.decrypt(encryptedNote.subjectiveEncrypted, tenantId),
      this.decrypt(encryptedNote.objectiveEncrypted, tenantId),
      this.decrypt(encryptedNote.assessmentEncrypted, tenantId),
      this.decrypt(encryptedNote.planEncrypted, tenantId),
    ]);

    return {
      subjective,
      objective,
      assessment,
      plan,
    };
  }

  /**
   * Clear key cache (for testing or key rotation)
   */
  clearKeyCache(): void {
    this.keyCache.clear();
    this.logger.log('Encryption key cache cleared');
  }

  /**
   * Clean up expired keys from cache
   */
  cleanupExpiredKeys(): void {
    const now = Date.now();
    for (const [tenantId, cached] of this.keyCache.entries()) {
      if (now >= cached.expiresAt) {
        this.keyCache.delete(tenantId);
      }
    }
  }
}
