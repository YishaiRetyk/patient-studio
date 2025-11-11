import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

/**
 * RBAC Guard (T033)
 * Per FR-005: Role-based access control
 * Enforces role restrictions on endpoints using @Roles() decorator
 */
@Injectable()
export class RbacGuard implements CanActivate {
  private readonly logger = new Logger(RbacGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get required roles from @Roles() decorator
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    // If no roles specified, allow access
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.role) {
      this.logger.warn('RBAC check failed: No user or role in request');
      throw new ForbiddenException('Access denied - authentication required');
    }

    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      this.logger.warn(
        `RBAC check failed: User ${user.email} (${user.role}) attempted to access endpoint requiring roles: ${requiredRoles.join(', ')}`,
      );
      throw new ForbiddenException('Access denied - insufficient permissions');
    }

    this.logger.debug(`RBAC check passed: ${user.email} has role ${user.role}`);
    return true;
  }
}

/**
 * Roles decorator for use with RbacGuard
 * Usage: @Roles(UserRole.ADMIN, UserRole.PRACTITIONER)
 */
export const Roles = (...roles: UserRole[]) => {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata('roles', roles, descriptor.value);
    } else {
      Reflect.defineMetadata('roles', roles, target);
    }
  };
};
