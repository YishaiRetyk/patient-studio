import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KMSClient, EncryptCommand, DecryptCommand } from '@aws-sdk/client-kms';

/**
 * Encryption Service using AWS KMS (T042)
 * Per FR-039, FR-040: Field-level encryption for SSN and SOAP notes
 * Per research.md: Per-tenant KMS keys for data isolation
 */
@Injectable()
export class EncryptionService {
  private readonly logger = new Logger(EncryptionService.name);
  private readonly kmsClient: KMSClient;
  private readonly keyId: string;

  constructor(private readonly configService: ConfigService) {
    const awsConfig = this.configService.get('aws');

    this.kmsClient = new KMSClient({
      region: awsConfig.region,
      credentials: awsConfig.credentials,
    });

    this.keyId = awsConfig.kms.keyId;

    if (!this.keyId) {
      this.logger.warn('AWS KMS Key ID not configured - field-level encryption disabled');
    }
  }

  /**
   * Encrypt plaintext using AWS KMS
   * @param plaintext - Data to encrypt (SSN, SOAP note sections)
   * @param tenantId - Tenant ID for per-tenant key derivation (optional)
   * @returns Base64-encoded ciphertext
   */
  async encrypt(plaintext: string, tenantId?: string): Promise<string> {
    if (!this.keyId) {
      throw new Error('KMS encryption not configured');
    }

    try {
      const command = new EncryptCommand({
        KeyId: this.keyId,
        Plaintext: Buffer.from(plaintext, 'utf-8'),
        EncryptionContext: tenantId ? { tenantId } : undefined,
      });

      const response = await this.kmsClient.send(command);
      return Buffer.from(response.CiphertextBlob!).toString('base64');
    } catch (error) {
      this.logger.error(`KMS encryption failed: ${error.message}`, error.stack);
      throw new Error('Field-level encryption failed');
    }
  }

  /**
   * Decrypt ciphertext using AWS KMS
   * @param ciphertext - Base64-encoded encrypted data
   * @param tenantId - Tenant ID for per-tenant key derivation (optional)
   * @returns Decrypted plaintext
   */
  async decrypt(ciphertext: string, tenantId?: string): Promise<string> {
    if (!this.keyId) {
      throw new Error('KMS decryption not configured');
    }

    try {
      const command = new DecryptCommand({
        KeyId: this.keyId,
        CiphertextBlob: Buffer.from(ciphertext, 'base64'),
        EncryptionContext: tenantId ? { tenantId } : undefined,
      });

      const response = await this.kmsClient.send(command);
      return Buffer.from(response.Plaintext!).toString('utf-8');
    } catch (error) {
      this.logger.error(`KMS decryption failed: ${error.message}`, error.stack);
      throw new Error('Field-level decryption failed');
    }
  }

  /**
   * Encrypt SSN field (per FR-039)
   */
  async encryptSSN(ssn: string, tenantId: string): Promise<string> {
    return this.encrypt(ssn, tenantId);
  }

  /**
   * Decrypt SSN field (per FR-039)
   */
  async decryptSSN(encryptedSSN: string, tenantId: string): Promise<string> {
    return this.decrypt(encryptedSSN, tenantId);
  }

  /**
   * Encrypt SOAP note section (per FR-040)
   */
  async encryptSOAPSection(content: string, tenantId: string): Promise<string> {
    return this.encrypt(content, tenantId);
  }

  /**
   * Decrypt SOAP note section (per FR-040)
   */
  async decryptSOAPSection(encryptedContent: string, tenantId: string): Promise<string> {
    return this.decrypt(encryptedContent, tenantId);
  }
}
