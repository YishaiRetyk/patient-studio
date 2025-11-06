import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Appointment } from '@prisma/client';

/**
 * Reminder Scheduling Service (T075)
 * Per FR-015: Email reminders 48h and 2h before appointments
 * Uses SQS for async message processing via Lambda
 */
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);
  private readonly sqsClient: SQSClient;
  private readonly queueUrl: string;

  constructor(private readonly configService: ConfigService) {
    const awsConfig = this.configService.get('aws');

    this.sqsClient = new SQSClient({
      region: awsConfig.region,
      credentials: awsConfig.credentials,
    });

    // Queue URL from environment (configured in Terraform)
    this.queueUrl = process.env.AWS_SQS_REMINDER_QUEUE_URL || '';

    if (!this.queueUrl) {
      this.logger.warn('SQS reminder queue URL not configured - reminders disabled');
    }
  }

  /**
   * Schedule reminders for new appointment
   * Sends 48h and 2h reminder messages to SQS
   */
  async scheduleReminders(appointment: Appointment & { patient: any }): Promise<void> {
    if (!this.queueUrl) {
      this.logger.debug('SQS not configured - skipping reminder scheduling');
      return;
    }

    try {
      const appointmentTime = new Date(appointment.startTime);

      // Calculate reminder times
      const reminder48h = new Date(appointmentTime.getTime() - 48 * 60 * 60 * 1000);
      const reminder2h = new Date(appointmentTime.getTime() - 2 * 60 * 60 * 1000);

      // Schedule 48-hour reminder
      if (reminder48h > new Date()) {
        await this.sendReminderMessage({
          appointmentId: appointment.id,
          patientEmail: appointment.patient.email,
          patientName: appointment.patient.fullName,
          appointmentTime: appointmentTime.toISOString(),
          reminderType: '48h',
          sendAt: reminder48h.toISOString(),
        });

        this.logger.log(
          `48h reminder scheduled for appointment ${appointment.id} at ${reminder48h.toISOString()}`,
        );
      }

      // Schedule 2-hour reminder
      if (reminder2h > new Date()) {
        await this.sendReminderMessage({
          appointmentId: appointment.id,
          patientEmail: appointment.patient.email,
          patientName: appointment.patient.fullName,
          appointmentTime: appointmentTime.toISOString(),
          reminderType: '2h',
          sendAt: reminder2h.toISOString(),
        });

        this.logger.log(
          `2h reminder scheduled for appointment ${appointment.id} at ${reminder2h.toISOString()}`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to schedule reminders: ${error.message}`, error.stack);
      // Don't throw - reminder failure shouldn't block appointment creation
    }
  }

  /**
   * Send reminder message to SQS
   * Lambda function will process these messages at scheduled time
   */
  private async sendReminderMessage(reminder: {
    appointmentId: string;
    patientEmail: string;
    patientName: string;
    appointmentTime: string;
    reminderType: '48h' | '2h';
    sendAt: string;
  }): Promise<void> {
    const command = new SendMessageCommand({
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(reminder),
      MessageAttributes: {
        reminderType: {
          DataType: 'String',
          StringValue: reminder.reminderType,
        },
        sendAt: {
          DataType: 'String',
          StringValue: reminder.sendAt,
        },
      },
      // Delay message delivery to match reminder time
      DelaySeconds: this.calculateDelay(reminder.sendAt),
    });

    await this.sqsClient.send(command);
  }

  /**
   * Calculate SQS delay (max 15 minutes, for longer delays use scheduled events)
   */
  private calculateDelay(sendAt: string): number {
    const sendTime = new Date(sendAt).getTime();
    const now = Date.now();
    const delaySeconds = Math.floor((sendTime - now) / 1000);

    // SQS max delay is 900 seconds (15 minutes)
    // For longer delays, use EventBridge scheduled events (handled by Lambda)
    return Math.min(Math.max(delaySeconds, 0), 900);
  }

  /**
   * Cancel reminders for cancelled/rescheduled appointment
   * In production, use message deduplication or DynamoDB tracking
   */
  async cancelReminders(appointmentId: string): Promise<void> {
    // TODO: Implement reminder cancellation
    // Options:
    // 1. Track reminder message IDs in database and delete from SQS
    // 2. Lambda checks appointment status before sending
    // 3. Use message deduplication with cancellation flag

    this.logger.log(`Reminder cancellation requested for appointment ${appointmentId}`);
  }
}
