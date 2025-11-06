import { Module } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { AppointmentsController } from './appointments.controller';
import { PrismaService } from '../../common/database/prisma.service';
import { EmailService } from '../notifications/email.service';
import { AuditService } from '../audit/audit.service';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Appointments Module (T083)
 * Provides appointment booking and management functionality
 */
@Module({
  imports: [AuthModule, AuditModule, NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PrismaService, EmailService, AuditService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
