import { registerAs } from '@nestjs/config';

/**
 * Sentry Configuration (T047)
 * Per FR-054: Error tracking and monitoring
 */
export default registerAs('sentry', () => ({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
}));
