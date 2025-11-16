import { registerAs } from '@nestjs/config';

/**
 * Auth0 Configuration (T030)
 * Per research.md: Auth0 OIDC with MFA for practitioners
 * Per FR-001 to FR-005: Multi-factor authentication, session management
 */
export default registerAs('auth', () => ({
  auth0: {
    domain: process.env.AUTH0_DOMAIN,
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    audience: process.env.AUTH0_AUDIENCE,
    issuerUrl: process.env.AUTH0_ISSUER_URL || `https://${process.env.AUTH0_DOMAIN}/`,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRATION || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRATION || '7d',
  },
  session: {
    // Per FR-004: Session timeout requirements
    inactiveTimeout: parseInt(process.env.SESSION_TIMEOUT_INACTIVE || '900000', 10), // 15 minutes
    absoluteTimeout: parseInt(process.env.SESSION_TIMEOUT_ABSOLUTE || '28800000', 10), // 8 hours
  },
  magicLink: {
    // Per FR-002: Patient authentication via magic link
    ttl: parseInt(process.env.MAGIC_LINK_TTL || '900000', 10), // 15 minutes
  },
  otp: {
    // Per FR-002: Patient authentication via OTP
    length: parseInt(process.env.OTP_LENGTH || '6', 10),
    ttl: parseInt(process.env.OTP_TTL || '300000', 10), // 5 minutes
  },
}));
