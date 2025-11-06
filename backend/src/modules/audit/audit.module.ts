import { Module } from '@nestjs/common';
import { AuditService } from './audit.service';
import { AuditInterceptor } from './audit.interceptor';
import { PrismaService } from '../../common/database/prisma.service';

/**
 * Audit Module
 * Provides audit logging services for HIPAA compliance
 */
@Module({
  providers: [AuditService, AuditInterceptor, PrismaService],
  exports: [AuditService, AuditInterceptor],
})
export class AuditModule {}
