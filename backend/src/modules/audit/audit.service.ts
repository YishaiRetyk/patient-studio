import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditEventType, AuditAction } from '@prisma/client';

/**
 * Audit Logging Service (T043)
 * Per FR-043 to FR-047: Comprehensive audit logging for HIPAA compliance
 * Per research.md: CloudWatch logging with 7-year retention
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Log PHI access event (per FR-043)
   * CRITICAL: All PHI access must be logged
   */
  async logPhiAccess(params: {
    userId: string;
    tenantId: string;
    entityType: string;
    entityId: string;
    action: AuditAction;
    ipAddress?: string;
    userAgent?: string;
    beforeValue?: any;
    afterValue?: any;
  }): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          eventType: AuditEventType.PHI_ACCESS,
          entityType: params.entityType,
          entityId: params.entityId,
          action: params.action,
          beforeValue: params.beforeValue,
          afterValue: params.afterValue,
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      this.logger.log(
        `PHI_ACCESS: User ${params.userId} performed ${params.action} on ${params.entityType}:${params.entityId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to log PHI access: ${error.message}`, error.stack);
      // CRITICAL: Log to CloudWatch as fallback
      this.logger.error(JSON.stringify(params));
    }
  }

  /**
   * Log authentication event (per FR-044)
   */
  async logAuthEvent(params: {
    userId?: string;
    tenantId: string;
    action: 'LOGIN' | 'LOGOUT' | 'LOGIN_FAILED' | 'MFA_REQUIRED' | 'PASSWORD_RESET';
    ipAddress?: string;
    userAgent?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          eventType: AuditEventType.AUTH_EVENT,
          entityType: 'AUTH',
          action: AuditAction.CREATE,
          afterValue: {
            action: params.action,
            metadata: params.metadata,
          },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      this.logger.log(`AUTH_EVENT: ${params.action} for tenant ${params.tenantId}`);
    } catch (error) {
      this.logger.error(`Failed to log auth event: ${error.message}`, error.stack);
    }
  }

  /**
   * Log administrative action (per FR-045)
   */
  async logAdminAction(params: {
    userId: string;
    tenantId: string;
    action: string;
    entityType?: string;
    entityId?: string;
    beforeValue?: any;
    afterValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.prisma.auditEvent.create({
        data: {
          tenantId: params.tenantId,
          userId: params.userId,
          eventType: AuditEventType.ADMIN_ACTION,
          entityType: params.entityType,
          entityId: params.entityId,
          action: AuditAction.UPDATE,
          beforeValue: params.beforeValue,
          afterValue: {
            action: params.action,
            ...params.afterValue,
          },
          ipAddress: params.ipAddress,
          userAgent: params.userAgent,
        },
      });

      this.logger.log(`ADMIN_ACTION: ${params.action} by user ${params.userId}`);
    } catch (error) {
      this.logger.error(`Failed to log admin action: ${error.message}`, error.stack);
    }
  }

  /**
   * Query audit logs with filters
   */
  async queryAuditLogs(filters: {
    tenantId: string;
    userId?: string;
    eventType?: AuditEventType;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<any[]> {
    const where: any = {
      tenantId: filters.tenantId,
    };

    if (filters.userId) where.userId = filters.userId;
    if (filters.eventType) where.eventType = filters.eventType;
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;

    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    return this.prisma.auditEvent.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: filters.limit || 100,
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });
  }
}
