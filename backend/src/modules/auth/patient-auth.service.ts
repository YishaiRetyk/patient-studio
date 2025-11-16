import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Patient Authentication Service (T038-T040)
 * Per FR-002: Magic link and OTP authentication for patients
 * Implements passwordless authentication with time-limited tokens
 */
@Injectable()
export class PatientAuthService {
  private readonly logger = new Logger(PatientAuthService.name);
  // In-memory storage for demo (use Redis in production)
  private readonly magicLinks = new Map<string, { email: string; expiresAt: number }>();
  private readonly otps = new Map<string, { code: string; email: string; expiresAt: number }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Generate magic link token (T039)
   * Per FR-002: 15-minute TTL for magic links
   */
  async generateMagicLink(email: string, _tenantId: string): Promise<string> {
    const authConfig = this.configService.get('auth');
    const token = randomBytes(32).toString('hex');
    const expiresAt = Date.now() + authConfig.magicLink.ttl;

    // Store token with email and expiry
    this.magicLinks.set(token, { email, expiresAt });

    this.logger.debug(`Magic link generated for ${email}, expires at ${new Date(expiresAt)}`);

    // Return full URL for email
    const appUrl = this.configService.get('NEXT_PUBLIC_APP_URL', 'http://localhost:3000');
    return `${appUrl}/auth/magic-link?token=${token}`;
  }

  /**
   * Validate magic link token (T039)
   */
  async validateMagicLink(token: string, tenantId: string): Promise<any> {
    const linkData = this.magicLinks.get(token);

    if (!linkData) {
      this.logger.warn(`Invalid magic link token: ${token}`);
      throw new UnauthorizedException('Invalid or expired magic link');
    }

    if (Date.now() > linkData.expiresAt) {
      this.magicLinks.delete(token);
      this.logger.warn(`Expired magic link for ${linkData.email}`);
      throw new UnauthorizedException('Magic link has expired');
    }

    // Find patient by email
    const patient = await this.prisma.patient.findFirst({
      where: {
        email: linkData.email,
        tenantId,
      },
    });

    if (!patient) {
      this.logger.warn(`Patient not found for magic link: ${linkData.email}`);
      throw new UnauthorizedException('Patient not found');
    }

    // Delete used token
    this.magicLinks.delete(token);

    return {
      patientId: patient.id,
      email: patient.email,
      tenantId: patient.tenantId,
    };
  }

  /**
   * Generate OTP code (T040)
   * Per FR-002: 6-digit code with 5-minute TTL
   */
  async generateOTP(email: string, tenantId: string): Promise<string> {
    const authConfig = this.configService.get('auth');
    const otpLength = authConfig.otp.length;

    // Generate random 6-digit code
    const code = Array.from({ length: otpLength }, () => Math.floor(Math.random() * 10)).join('');

    const expiresAt = Date.now() + authConfig.otp.ttl;

    // Hash email + code for storage key
    const key = createHash('sha256').update(`${email}:${tenantId}`).digest('hex');

    this.otps.set(key, { code, email, expiresAt });

    this.logger.debug(`OTP generated for ${email}: ${code}, expires at ${new Date(expiresAt)}`);

    return code;
  }

  /**
   * Validate OTP code (T040)
   */
  async validateOTP(email: string, code: string, tenantId: string): Promise<any> {
    const key = createHash('sha256').update(`${email}:${tenantId}`).digest('hex');

    const otpData = this.otps.get(key);

    if (!otpData) {
      this.logger.warn(`No OTP found for ${email}`);
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    if (Date.now() > otpData.expiresAt) {
      this.otps.delete(key);
      this.logger.warn(`Expired OTP for ${email}`);
      throw new UnauthorizedException('OTP has expired');
    }

    if (otpData.code !== code) {
      this.logger.warn(`Invalid OTP code for ${email}`);
      throw new UnauthorizedException('Invalid OTP code');
    }

    // Find patient
    const patient = await this.prisma.patient.findFirst({
      where: {
        email,
        tenantId,
      },
    });

    if (!patient) {
      this.logger.warn(`Patient not found for OTP: ${email}`);
      throw new UnauthorizedException('Patient not found');
    }

    // Delete used OTP
    this.otps.delete(key);

    return {
      patientId: patient.id,
      email: patient.email,
      tenantId: patient.tenantId,
    };
  }

  /**
   * Cleanup expired tokens (should run periodically)
   */
  cleanupExpiredTokens(): void {
    const now = Date.now();

    // Clean magic links
    for (const [token, data] of this.magicLinks.entries()) {
      if (now > data.expiresAt) {
        this.magicLinks.delete(token);
      }
    }

    // Clean OTPs
    for (const [key, data] of this.otps.entries()) {
      if (now > data.expiresAt) {
        this.otps.delete(key);
      }
    }

    this.logger.debug('Expired tokens cleaned up');
  }
}
