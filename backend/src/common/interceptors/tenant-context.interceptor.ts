import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaClient } from '@prisma/client';

/**
 * Tenant Context Interceptor (T034)
 * Per FR-041: Set PostgreSQL RLS session variable for tenant isolation
 *
 * This interceptor extracts tenantId from JWT claims and sets the
 * PostgreSQL session variable for Row-Level Security enforcement.
 */
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TenantContextInterceptor.name);
  private readonly prisma = new PrismaClient();

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.tenantId) {
      this.logger.warn('Request without valid tenant context');
      throw new UnauthorizedException('Invalid tenant context');
    }

    // Set PostgreSQL session variable for RLS
    // Per 02-tenant-isolation.sql: app.current_tenant_id
    try {
      await this.prisma.$executeRawUnsafe(
        `SET LOCAL app.current_tenant_id = '${user.tenantId}'`,
      );

      this.logger.debug(`Tenant context set: ${user.tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to set tenant context: ${error.message}`, error.stack);
      throw new UnauthorizedException('Failed to establish tenant context');
    }

    return next.handle();
  }
}
