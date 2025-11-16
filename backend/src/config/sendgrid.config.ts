import { registerAs } from '@nestjs/config';

/**
 * SendGrid Configuration (T048)
 * Per research.md: SendGrid with BAA for HIPAA-compliant emails
 * Per FR-015: Email reminders (48h and 2h before appointments)
 */
export default registerAs('sendgrid', () => ({
  apiKey: process.env.SENDGRID_API_KEY,
  from: {
    email: process.env.SENDGRID_FROM_EMAIL || 'noreply@patient-studio.com',
    name: process.env.SENDGRID_FROM_NAME || 'Patient Studio',
  },
  templates: {
    appointmentConfirmation: process.env.SENDGRID_TEMPLATE_APPOINTMENT_CONFIRMATION,
    appointmentReminder48h: process.env.SENDGRID_TEMPLATE_REMINDER_48H,
    appointmentReminder2h: process.env.SENDGRID_TEMPLATE_REMINDER_2H,
    magicLink: process.env.SENDGRID_TEMPLATE_MAGIC_LINK,
    otp: process.env.SENDGRID_TEMPLATE_OTP,
  },
}));
