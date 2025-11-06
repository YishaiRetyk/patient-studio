/**
 * Lambda Function: Appointment Reminder Processor (T076)
 * Per FR-015: Process SQS messages and send appointment reminders
 *
 * Triggered by SQS queue messages from ReminderService
 * Sends emails via SendGrid
 */

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/**
 * Lambda handler
 */
exports.handler = async (event) => {
  console.log(`Processing ${event.Records.length} reminder messages`);

  const results = await Promise.allSettled(
    event.Records.map((record) => processReminder(record))
  );

  const successful = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  console.log(`Processed: ${successful} succeeded, ${failed} failed`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      processed: event.Records.length,
      successful,
      failed,
    }),
  };
};

/**
 * Process individual reminder message
 */
async function processReminder(record) {
  const reminder = JSON.parse(record.body);

  console.log(
    `Processing ${reminder.reminderType} reminder for appointment ${reminder.appointmentId}`
  );

  // Check if reminder should still be sent (appointment might be cancelled)
  // In production, query database to verify appointment status
  const shouldSend = await shouldSendReminder(reminder.appointmentId);

  if (!shouldSend) {
    console.log(`Skipping reminder - appointment ${reminder.appointmentId} cancelled/completed`);
    return;
  }

  // Send reminder email
  await sendReminderEmail(reminder);

  console.log(`Reminder sent successfully to ${reminder.patientEmail}`);
}

/**
 * Check if reminder should be sent (verify appointment status)
 */
async function shouldSendReminder(appointmentId) {
  // TODO: Query database to check appointment status
  // For now, assume all reminders should be sent
  return true;
}

/**
 * Send reminder email via SendGrid
 */
async function sendReminderEmail(reminder) {
  const reminderText =
    reminder.reminderType === '48h' ? '48 hours' : '2 hours';

  const appointmentTime = new Date(reminder.appointmentTime);
  const formattedTime = appointmentTime.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  const msg = {
    to: reminder.patientEmail,
    from: {
      email: process.env.SENDGRID_FROM_EMAIL,
      name: process.env.SENDGRID_FROM_NAME || 'Patient Studio',
    },
    subject: `Appointment Reminder - ${reminderText}`,
    html: `
      <h2>Upcoming Appointment Reminder</h2>
      <p>Dear ${reminder.patientName},</p>
      <p>This is a reminder that you have an appointment in ${reminderText}:</p>
      <div style="background-color: #f0f9ff; padding: 16px; border-radius: 8px; margin: 16px 0;">
        <p style="margin: 0; font-size: 18px; font-weight: bold;">${formattedTime}</p>
      </div>
      <p>If you need to reschedule or cancel, please contact us as soon as possible.</p>
      <p>Thank you!</p>
      <hr style="margin: 24px 0;" />
      <p style="font-size: 12px; color: #666;">
        You're receiving this email because you have an upcoming appointment with Patient Studio.
      </p>
    `,
  };

  await sgMail.send(msg);
}
