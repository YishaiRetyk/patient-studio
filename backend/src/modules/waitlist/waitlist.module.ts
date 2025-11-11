import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { DatabaseModule } from '../../common/database/database.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';

/**
 * Waitlist Module (T101)
 * Per FR-024 to FR-026: Waitlist management with notifications
 */
@Module({
  imports: [DatabaseModule, NotificationsModule, AuditModule],
  controllers: [WaitlistController],
  providers: [WaitlistService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
