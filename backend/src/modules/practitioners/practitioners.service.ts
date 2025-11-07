import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Practitioner, AuditAction } from '@prisma/client';
import { randomBytes } from 'crypto';

/**
 * Practitioner Service (T092-T093)
 * Per FR-021 to FR-023: Practitioner calendar management and availability configuration
 */
@Injectable()
export class PractitionersService {
  private readonly logger = new Logger(PractitionersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get practitioner by ID with tenant validation
   */
  async findOne(id: string, tenantId: string): Promise<Practitioner> {
    const practitioner = await this.prisma.practitioner.findFirst({
      where: {
        id,
        tenantId,
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            status: true,
          },
        },
        appointments: {
          where: {
            startTime: {
              gte: new Date(),
            },
          },
          orderBy: {
            startTime: 'asc',
          },
          take: 10,
        },
      },
    });

    if (!practitioner) {
      throw new NotFoundException('Practitioner not found or access denied');
    }

    return practitioner;
  }

  /**
   * Get all practitioners for a tenant
   */
  async findAll(tenantId: string): Promise<Practitioner[]> {
    return this.prisma.practitioner.findMany({
      where: {
        tenantId,
      },
      include: {
        user: {
          select: {
            email: true,
            role: true,
            status: true,
          },
        },
      },
      orderBy: {
        fullName: 'asc',
      },
    });
  }

  /**
   * Update practitioner available hours (T093)
   * Per FR-022: Practitioner can configure their available hours
   */
  async updateAvailableHours(
    practitionerId: string,
    availableHours: AvailableHours,
    tenantId: string,
    userId?: string,
  ): Promise<Practitioner> {
    // Validate practitioner exists and belongs to tenant
    const practitioner = await this.findOne(practitionerId, tenantId);

    // Validate available hours format
    this.validateAvailableHours(availableHours);

    const before = { ...practitioner };

    const updated = await this.prisma.practitioner.update({
      where: {
        id: practitionerId,
      },
      data: {
        availableHours: availableHours as any,
      },
    });

    this.logger.log(`Available hours updated for practitioner: ${practitionerId}`);

    // Log audit event
    if (userId) {
      await this.auditService.logAdminAction({
        userId,
        tenantId,
        entityType: 'Practitioner',
        entityId: practitionerId,
        action: AuditAction.UPDATE,
        beforeValue: { availableHours: before.availableHours },
        afterValue: { availableHours: updated.availableHours },
      });
    }

    return updated;
  }

  /**
   * Generate or regenerate calendar token for iCal export (T097)
   * Per FR-023: iCal feed generation with secure token
   */
  async generateCalendarToken(
    practitionerId: string,
    tenantId: string,
    userId?: string,
  ): Promise<string> {
    // Validate practitioner exists and belongs to tenant
    const practitioner = await this.findOne(practitionerId, tenantId);

    // Generate secure random token (32 bytes = 64 hex characters)
    const token = randomBytes(32).toString('hex');

    const updated = await this.prisma.practitioner.update({
      where: {
        id: practitionerId,
      },
      data: {
        calendarToken: token,
      },
    });

    this.logger.log(`Calendar token generated for practitioner: ${practitionerId}`);

    // Log audit event
    if (userId) {
      await this.auditService.logAdminAction({
        userId,
        tenantId,
        entityType: 'Practitioner',
        entityId: practitionerId,
        action: AuditAction.UPDATE,
        beforeValue: { calendarToken: practitioner.calendarToken ? '[REDACTED]' : null },
        afterValue: { calendarToken: '[GENERATED]' },
      });
    }

    return updated.calendarToken!;
  }

  /**
   * Validate available hours structure
   * Format: { "monday": [{"start": "09:00", "end": "17:00"}], ... }
   */
  private validateAvailableHours(availableHours: AvailableHours): void {
    const validDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    for (const [day, hours] of Object.entries(availableHours)) {
      // Validate day name
      if (!validDays.includes(day.toLowerCase())) {
        throw new BadRequestException(`Invalid day name: ${day}. Must be one of: ${validDays.join(', ')}`);
      }

      // Validate hours array
      if (!Array.isArray(hours)) {
        throw new BadRequestException(`Hours for ${day} must be an array`);
      }

      // Validate each time slot
      for (const slot of hours) {
        if (!slot.start || !slot.end) {
          throw new BadRequestException(`Each time slot must have 'start' and 'end' properties`);
        }

        // Validate time format (HH:MM)
        if (!timeRegex.test(slot.start) || !timeRegex.test(slot.end)) {
          throw new BadRequestException(
            `Invalid time format. Must be HH:MM (24-hour format). Got: start="${slot.start}", end="${slot.end}"`,
          );
        }

        // Validate end time is after start time
        const [startHour, startMinute] = slot.start.split(':').map(Number);
        const [endHour, endMinute] = slot.end.split(':').map(Number);

        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;

        if (endMinutes <= startMinutes) {
          throw new BadRequestException(
            `End time must be after start time. Got: start="${slot.start}", end="${slot.end}"`,
          );
        }

        // Validate reasonable working hours (at least 30 minutes, max 24 hours)
        const durationMinutes = endMinutes - startMinutes;
        if (durationMinutes < 30) {
          throw new BadRequestException('Time slot duration must be at least 30 minutes');
        }
        if (durationMinutes > 24 * 60) {
          throw new BadRequestException('Time slot duration cannot exceed 24 hours');
        }
      }

      // Validate no overlapping time slots for the same day
      for (let i = 0; i < hours.length; i++) {
        for (let j = i + 1; j < hours.length; j++) {
          if (this.timeSlotsOverlap(hours[i], hours[j])) {
            throw new BadRequestException(
              `Overlapping time slots detected for ${day}: ${hours[i].start}-${hours[i].end} and ${hours[j].start}-${hours[j].end}`,
            );
          }
        }
      }
    }
  }

  /**
   * Check if two time slots overlap
   */
  private timeSlotsOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
    const start1 = this.timeToMinutes(slot1.start);
    const end1 = this.timeToMinutes(slot1.end);
    const start2 = this.timeToMinutes(slot2.start);
    const end2 = this.timeToMinutes(slot2.end);

    return (start1 < end2 && end1 > start2);
  }

  /**
   * Convert time string (HH:MM) to minutes since midnight
   */
  private timeToMinutes(time: string): number {
    const [hour, minute] = time.split(':').map(Number);
    return hour * 60 + minute;
  }
}

/**
 * Type definitions for available hours
 */
export interface TimeSlot {
  start: string; // Format: "HH:MM" (24-hour)
  end: string;   // Format: "HH:MM" (24-hour)
}

export interface AvailableHours {
  monday?: TimeSlot[];
  tuesday?: TimeSlot[];
  wednesday?: TimeSlot[];
  thursday?: TimeSlot[];
  friday?: TimeSlot[];
  saturday?: TimeSlot[];
  sunday?: TimeSlot[];
}
