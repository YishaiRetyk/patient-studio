import { Strategy } from 'passport-auth0';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Auth0 Authentication Strategy (T031)
 * Per research.md: Auth0 OIDC with MFA for practitioners
 * Per FR-001: Multi-factor authentication for all practitioner accounts
 */
@Injectable()
export class Auth0Strategy extends PassportStrategy(Strategy, 'auth0') {
  private readonly logger = new Logger(Auth0Strategy.name);

  constructor(private readonly configService: ConfigService) {
    const authConfig = configService.get('auth');

    super({
      domain: authConfig.auth0.domain,
      clientID: authConfig.auth0.clientId,
      clientSecret: authConfig.auth0.clientSecret,
      callbackURL: '/api/v1/auth/callback',
      audience: authConfig.auth0.audience,
      scope: 'openid profile email',
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    extraParams: any,
    profile: any,
  ): Promise<any> {
    this.logger.debug(`Auth0 validation for user: ${profile.id}`);

    // Extract user information from Auth0 profile
    const user = {
      authProviderId: profile.id,
      email: profile.emails?.[0]?.value || profile.email,
      name: profile.displayName || profile.name,
      picture: profile.picture,
      // Tenant ID should be in app_metadata (set during Auth0 user creation)
      tenantId: profile.app_metadata?.tenant_id,
      // Role should be in app_metadata
      role: profile.app_metadata?.role || 'PRACTITIONER',
      // MFA verification status
      mfaVerified: profile.multifactor?.length > 0,
    };

    // Per FR-001: Enforce MFA for practitioners
    if (user.role === 'PRACTITIONER' && !user.mfaVerified) {
      this.logger.warn(`MFA not enabled for practitioner: ${user.email}`);
      throw new UnauthorizedException('Multi-factor authentication required for practitioners');
    }

    if (!user.tenantId) {
      this.logger.error(`Missing tenant ID for user: ${user.email}`);
      throw new UnauthorizedException('Invalid tenant context');
    }

    return user;
  }
}
