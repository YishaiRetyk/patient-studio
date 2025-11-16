import { Module } from '@nestjs/common';
import { EmailService } from './email.service';

/**
 * Notifications Module
 * Provides email notification services via SendGrid
 */
@Module({
  providers: [EmailService],
  exports: [EmailService],
})
export class NotificationsModule {}
