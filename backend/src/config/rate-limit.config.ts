import { registerAs } from '@nestjs/config';

/**
 * Rate Limiting Configuration (T045)
 * Per FR-048, FR-049: API rate limits
 */
export default registerAs('rateLimit', () => ({
  global: {
    // Per FR-048: 600 requests/minute per tenant
    limit: parseInt(process.env.RATE_LIMIT_GLOBAL || '600', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10), // 1 minute
  },
  login: {
    // Per FR-048: 5 login attempts per 15 minutes per IP
    limit: parseInt(process.env.RATE_LIMIT_LOGIN || '5', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || '900000', 10), // 15 minutes
  },
  ai: {
    // Per FR-049: 20 AI requests/minute per user
    limit: parseInt(process.env.RATE_LIMIT_AI || '20', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_AI_WINDOW || '60000', 10), // 1 minute
  },
}));
