import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { AuditService } from './audit.service';
import { AuditAction } from '@prisma/client';

/**
 * Audit Logging Interceptor (T044)
 * Automatically logs PHI access for endpoints decorated with @AuditLog()
 * Per FR-043: All PHI access must be logged
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    // Get audit metadata from @AuditLog() decorator
    const auditMetadata = this.reflector.getAllAndOverride<{
      entityType: string;
      action?: AuditAction;
    }>('audit', [context.getHandler(), context.getClass()]);

    // If no audit metadata, skip logging
    if (!auditMetadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      this.logger.warn('Audit log attempted without user context');
      return next.handle();
    }

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (response) => {
          const duration = Date.now() - startTime;

          // Determine action from HTTP method if not specified
          const action = auditMetadata.action || this.getActionFromMethod(request.method);

          // Extract entity ID from request params or response
          const entityId = request.params?.id || response?.id;

          // Log PHI access asynchronously
          this.auditService
            .logPhiAccess({
              userId: user.userId,
              tenantId: user.tenantId,
              entityType: auditMetadata.entityType,
              entityId,
              action,
              ipAddress: request.ip || request.connection.remoteAddress,
              userAgent: request.headers['user-agent'],
              beforeValue: request.method === 'PATCH' || request.method === 'PUT' ? request.body : undefined,
              afterValue: response,
            })
            .catch((error) => {
              this.logger.error(`Audit logging failed: ${error.message}`);
            });

          this.logger.debug(
            `Audit logged: ${action} on ${auditMetadata.entityType} (${duration}ms)`,
          );
        },
        error: (error) => {
          this.logger.error(`Request failed during audit: ${error.message}`);
        },
      }),
    );
  }

  private getActionFromMethod(method: string): AuditAction {
    switch (method) {
      case 'GET':
        return AuditAction.READ;
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return AuditAction.READ;
    }
  }
}

/**
 * Decorator to mark endpoints that require audit logging
 * Usage: @AuditLog({ entityType: 'Patient' })
 */
export const AuditLog = (metadata: { entityType: string; action?: AuditAction }) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('audit', metadata, descriptor.value);
    } else {
      Reflect.defineMetadata('audit', metadata, target);
    }
  };
};
