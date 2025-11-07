import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AppointmentStatus } from '@prisma/client';

/**
 * Calendar Service (T097)
 * Per FR-023: iCal feed generation for practitioner calendar export
 */
@Injectable()
export class CalendarService {
  private readonly logger = new Logger(CalendarService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate iCal feed for practitioner (T097)
   * Per FR-023: Secure iCal feed with calendar token
   */
  async generateICalFeed(calendarToken: string): Promise<string> {
    // Find practitioner by calendar token
    const practitioner = await this.prisma.practitioner.findUnique({
      where: {
        calendarToken,
      },
      include: {
        appointments: {
          where: {
            status: {
              in: [AppointmentStatus.SCHEDULED, AppointmentStatus.COMPLETED],
            },
          },
          include: {
            patient: {
              select: {
                fullName: true,
                phone: true,
              },
            },
          },
          orderBy: {
            startTime: 'asc',
          },
        },
      },
    });

    if (!practitioner) {
      throw new UnauthorizedException('Invalid calendar token');
    }

    this.logger.log(`Generating iCal feed for practitioner: ${practitioner.id}`);

    // Generate iCal format
    const ical = this.buildICalFeed(practitioner);

    return ical;
  }

  /**
   * Build iCal feed content following RFC 5545 standard
   * https://datatracker.ietf.org/doc/html/rfc5545
   */
  private buildICalFeed(practitioner: any): string {
    const now = new Date();
    const timestamp = this.formatICalDateTime(now);

    // Build iCal header
    let ical = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Patient Studio//Calendar//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeText(practitioner.fullName)} - Appointments`,
      'X-WR-TIMEZONE:UTC',
      'X-WR-CALDESC:Patient Studio appointment calendar',
    ].join('\r\n');

    // Add each appointment as VEVENT
    for (const appointment of practitioner.appointments) {
      const event = this.buildVEvent(appointment, practitioner.fullName, timestamp);
      ical += '\r\n' + event;
    }

    // Close calendar
    ical += '\r\nEND:VCALENDAR\r\n';

    return ical;
  }

  /**
   * Build individual VEVENT component for an appointment
   */
  private buildVEvent(appointment: any, practitionerName: string, timestamp: string): string {
    const uid = `appointment-${appointment.id}@patient-studio.com`;
    const startTime = this.formatICalDateTime(appointment.startTime);
    const endTime = this.formatICalDateTime(appointment.endTime);
    const createdTime = this.formatICalDateTime(appointment.createdAt);
    const updatedTime = this.formatICalDateTime(appointment.updatedAt);

    // Build summary (patient name with privacy consideration)
    const summary = this.escapeText(`Appointment: ${appointment.patient.fullName}`);

    // Build description
    const description = this.escapeText(
      `Patient: ${appointment.patient.fullName}\\n` +
      `Phone: ${appointment.patient.phone}\\n` +
      `Status: ${appointment.status}\\n` +
      `Practitioner: ${practitionerName}`,
    );

    // Build location (can be customized)
    const location = this.escapeText('Patient Studio');

    // Status mapping
    const status = appointment.status === AppointmentStatus.COMPLETED
      ? 'CONFIRMED'
      : appointment.status === AppointmentStatus.CANCELLED
      ? 'CANCELLED'
      : 'CONFIRMED';

    return [
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${timestamp}`,
      `DTSTART:${startTime}`,
      `DTEND:${endTime}`,
      `CREATED:${createdTime}`,
      `LAST-MODIFIED:${updatedTime}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `LOCATION:${location}`,
      `STATUS:${status}`,
      'CLASS:PRIVATE', // Mark as private for HIPAA compliance
      'TRANSP:OPAQUE', // Show as busy
      `ORGANIZER:CN=${this.escapeText(practitionerName)}`,
      'END:VEVENT',
    ].join('\r\n');
  }

  /**
   * Format date-time in iCal format (UTC)
   * Format: YYYYMMDDTHHmmssZ
   */
  private formatICalDateTime(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');

    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Escape special characters for iCal text fields
   * Per RFC 5545: Section 3.3.11
   */
  private escapeText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')  // Backslash
      .replace(/;/g, '\\;')    // Semicolon
      .replace(/,/g, '\\,')    // Comma
      .replace(/\n/g, '\\n')   // Newline
      .replace(/\r/g, '');     // Remove carriage return
  }

  /**
   * Get practitioner by calendar token (for validation)
   */
  async validateCalendarToken(calendarToken: string): Promise<boolean> {
    const practitioner = await this.prisma.practitioner.findUnique({
      where: {
        calendarToken,
      },
    });

    return !!practitioner;
  }
}
