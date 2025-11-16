import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

/**
 * Rate Limiting Guard (T045)
 * Per FR-048, FR-049: API rate limiting
 * - Global: 600 requests/minute per tenant
 * - Login: 5 attempts/15 minutes per IP
 * - AI: 20 requests/minute per user
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);
  // In-memory storage for demo (use Redis in production)
  private readonly requests = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
  ) {
    // Cleanup expired entries every minute
    setInterval(() => this.cleanup(), 60000);
  }

  canActivate(context: ExecutionContext): boolean {
    // Get rate limit metadata from @RateLimit() decorator
    const rateLimitConfig = this.reflector.getAllAndOverride<{
      type: 'global' | 'login' | 'ai';
      limit?: number;
      windowMs?: number;
    }>('rateLimit', [context.getHandler(), context.getClass()]);

    // If no rate limit specified, use global default
    const config = rateLimitConfig || { type: 'global' };

    const request = context.switchToHttp().getRequest();
    const key = this.getKey(request, config.type);

    const rateLimitSettings = this.configService.get('rateLimit')[config.type];
    const limit = config.limit || rateLimitSettings.limit;
    const windowMs = config.windowMs || rateLimitSettings.windowMs;

    const now = Date.now();
    const entry = this.requests.get(key);

    if (!entry || now > entry.resetAt) {
      // New window
      this.requests.set(key, {
        count: 1,
        resetAt: now + windowMs,
      });
      return true;
    }

    if (entry.count >= limit) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      this.logger.warn(`Rate limit exceeded for ${key}: ${entry.count}/${limit}`);

      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment counter
    entry.count++;
    return true;
  }

  private getKey(request: any, type: string): string {
    switch (type) {
      case 'login':
        // Rate limit by IP address for login attempts
        return `login:${request.ip || request.connection.remoteAddress}`;
      case 'ai':
        // Rate limit by user ID for AI requests
        return `ai:${request.user?.userId || 'anonymous'}`;
      case 'global':
      default:
        // Rate limit by tenant ID for global API
        return `global:${request.user?.tenantId || 'anonymous'}`;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (now > entry.resetAt) {
        this.requests.delete(key);
      }
    }
  }
}

/**
 * Decorator to specify rate limit type
 * Usage: @RateLimit({ type: 'login' })
 */
export const RateLimit = (config: {
  type: 'global' | 'login' | 'ai';
  limit?: number;
  windowMs?: number;
}) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('rateLimit', config, descriptor.value);
    } else {
      Reflect.defineMetadata('rateLimit', config, target);
    }
  };
};
