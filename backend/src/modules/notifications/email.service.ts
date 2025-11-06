import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as sgMail from '@sendgrid/mail';

/**
 * Email Service (T041, T048)
 * Per research.md: SendGrid with BAA for HIPAA-compliant emails
 * Per FR-015: Appointment reminders (48h and 2h before)
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {
    const sendgridConfig = this.configService.get('sendgrid');

    if (sendgridConfig.apiKey) {
      sgMail.setApiKey(sendgridConfig.apiKey);
      this.logger.log('SendGrid initialized');
    } else {
      this.logger.warn('SendGrid API key not configured - emails will be logged only');
    }
  }

  /**
   * Send magic link email for patient authentication
   */
  async sendMagicLink(email: string, magicLink: string): Promise<void> {
    const sendgridConfig = this.configService.get('sendgrid');

    const msg = {
      to: email,
      from: {
        email: sendgridConfig.from.email,
        name: sendgridConfig.from.name,
      },
      subject: 'Your Patient Studio Login Link',
      text: `Click here to login: ${magicLink}\n\nThis link expires in 15 minutes.`,
      html: `
        <h2>Login to Patient Studio</h2>
        <p>Click the button below to securely login to your account:</p>
        <p><a href="${magicLink}" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Login to Patient Studio</a></p>
        <p>Or copy and paste this link: ${magicLink}</p>
        <p><small>This link expires in 15 minutes. If you didn't request this, please ignore this email.</small></p>
      `,
    };

    await this.send(msg);
  }

  /**
   * Send OTP code email for patient authentication
   */
  async sendOTP(email: string, code: string): Promise<void> {
    const sendgridConfig = this.configService.get('sendgrid');

    const msg = {
      to: email,
      from: {
        email: sendgridConfig.from.email,
        name: sendgridConfig.from.name,
      },
      subject: 'Your Patient Studio Verification Code',
      text: `Your verification code is: ${code}\n\nThis code expires in 5 minutes.`,
      html: `
        <h2>Your Verification Code</h2>
        <p>Enter this code to login to Patient Studio:</p>
        <h1 style="font-size: 32px; letter-spacing: 8px; color: #0ea5e9;">${code}</h1>
        <p><small>This code expires in 5 minutes. If you didn't request this, please ignore this email.</small></p>
      `,
    };

    await this.send(msg);
  }

  /**
   * Send appointment confirmation email
   */
  async sendAppointmentConfirmation(
    email: string,
    appointmentDetails: {
      patientName: string;
      practitionerName: string;
      startTime: Date;
      endTime: Date;
    },
  ): Promise<void> {
    const sendgridConfig = this.configService.get('sendgrid');

    const msg = {
      to: email,
      from: {
        email: sendgridConfig.from.email,
        name: sendgridConfig.from.name,
      },
      subject: 'Appointment Confirmed - Patient Studio',
      html: `
        <h2>Appointment Confirmed</h2>
        <p>Dear ${appointmentDetails.patientName},</p>
        <p>Your appointment has been confirmed with the following details:</p>
        <ul>
          <li><strong>Practitioner:</strong> ${appointmentDetails.practitionerName}</li>
          <li><strong>Date & Time:</strong> ${appointmentDetails.startTime.toLocaleString()}</li>
          <li><strong>Duration:</strong> ${Math.round((appointmentDetails.endTime.getTime() - appointmentDetails.startTime.getTime()) / 60000)} minutes</li>
        </ul>
        <p>You will receive reminder emails 48 hours and 2 hours before your appointment.</p>
      `,
    };

    await this.send(msg);
  }

  /**
   * Send appointment reminder (48h or 2h before)
   * Per FR-015
   */
  async sendAppointmentReminder(
    email: string,
    appointmentDetails: {
      patientName: string;
      practitionerName: string;
      startTime: Date;
    },
    reminderType: '48h' | '2h',
  ): Promise<void> {
    const sendgridConfig = this.configService.get('sendgrid');
    const reminderText = reminderType === '48h' ? '48 hours' : '2 hours';

    const msg = {
      to: email,
      from: {
        email: sendgridConfig.from.email,
        name: sendgridConfig.from.name,
      },
      subject: `Appointment Reminder - ${reminderText}`,
      html: `
        <h2>Upcoming Appointment Reminder</h2>
        <p>Dear ${appointmentDetails.patientName},</p>
        <p>This is a reminder that you have an appointment in ${reminderText}:</p>
        <ul>
          <li><strong>Practitioner:</strong> ${appointmentDetails.practitionerName}</li>
          <li><strong>Date & Time:</strong> ${appointmentDetails.startTime.toLocaleString()}</li>
        </ul>
        <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
      `,
    };

    await this.send(msg);
  }

  /**
   * Send waitlist notification
   */
  async sendWaitlistNotification(
    email: string,
    patientName: string,
    availableTime: Date,
  ): Promise<void> {
    const sendgridConfig = this.configService.get('sendgrid');

    const msg = {
      to: email,
      from: {
        email: sendgridConfig.from.email,
        name: sendgridConfig.from.name,
      },
      subject: 'Appointment Slot Available - Patient Studio',
      html: `
        <h2>Appointment Slot Available</h2>
        <p>Dear ${patientName},</p>
        <p>Good news! An appointment slot has become available at your preferred time:</p>
        <p><strong>${availableTime.toLocaleString()}</strong></p>
        <p><a href="${this.configService.get('NEXT_PUBLIC_APP_URL')}/appointments/claim" style="background-color: #0ea5e9; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Claim This Slot</a></p>
        <p><small>This notification expires in 24 hours. First come, first served.</small></p>
      `,
    };

    await this.send(msg);
  }

  /**
   * Internal send method with error handling
   */
  private async send(msg: any): Promise<void> {
    try {
      const sendgridConfig = this.configService.get('sendgrid');

      if (!sendgridConfig.apiKey) {
        this.logger.debug(`[DEV MODE] Would send email to ${msg.to}: ${msg.subject}`);
        return;
      }

      await sgMail.send(msg);
      this.logger.log(`Email sent to ${msg.to}: ${msg.subject}`);
    } catch (error) {
      this.logger.error(`Failed to send email to ${msg.to}: ${error.message}`, error.stack);
      // Don't throw - email failures shouldn't block main operations
      // But log to Sentry for monitoring
    }
  }
}
