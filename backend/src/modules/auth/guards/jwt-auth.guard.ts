import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';

/**
 * JWT Authentication Guard (T032)
 * Per FR-004: Session management with JWT tokens
 * Validates JWT tokens and extracts user context
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn('No JWT token provided');
      throw new UnauthorizedException('Authentication required');
    }

    try {
      const authConfig = this.configService.get('auth');
      const payload = verify(token, authConfig.jwt.secret);

      // Attach user to request
      request.user = {
        userId: payload.sub,
        email: payload.email,
        tenantId: payload.tenantId,
        role: payload.role,
        authProviderId: payload.authProviderId,
      };

      // Check session timeout (per FR-004)
      const sessionConfig = authConfig.session;
      const now = Date.now();
      const issuedAt = payload.iat * 1000;
      const lastActivity = payload.lastActivity || issuedAt;

      // Absolute timeout: 8 hours
      if (now - issuedAt > sessionConfig.absoluteTimeout) {
        this.logger.warn(`Session expired (absolute timeout): ${payload.email}`);
        throw new UnauthorizedException('Session expired - please login again');
      }

      // Inactivity timeout: 15 minutes
      if (now - lastActivity > sessionConfig.inactiveTimeout) {
        this.logger.warn(`Session expired (inactivity timeout): ${payload.email}`);
        throw new UnauthorizedException('Session expired due to inactivity');
      }

      return true;
    } catch (error) {
      this.logger.error(`JWT validation failed: ${error.message}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractToken(request: any): string | null {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return null;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : null;
  }
}
