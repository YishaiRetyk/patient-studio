import { registerAs } from '@nestjs/config';

/**
 * Stripe Configuration
 * Per FR-030 to FR-037: Payment processing and billing
 */
export default registerAs('stripe', () => ({
  apiKey: process.env.STRIPE_API_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
}));
