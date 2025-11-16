import { registerAs } from '@nestjs/config';

/**
 * AWS Configuration (T042, T046)
 * Per research.md: KMS for field-level encryption, CloudWatch for logging
 */
export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  kms: {
    // Per FR-039, FR-040: Field-level encryption with per-tenant keys
    keyId: process.env.AWS_KMS_KEY_ID,
  },
  s3: {
    // Per FR-047: Audit log storage with 7-year retention
    auditBucket: process.env.AWS_S3_AUDIT_BUCKET,
  },
  cloudWatch: {
    // Per FR-046: Centralized logging
    logGroup: process.env.AWS_CLOUDWATCH_LOG_GROUP,
    logStream: process.env.AWS_CLOUDWATCH_LOG_STREAM,
  },
}));
