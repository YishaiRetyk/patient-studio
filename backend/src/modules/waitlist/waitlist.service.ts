import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { EmailService } from '../notifications/email.service';
import { AuditService } from '../audit/audit.service';
import { WaitlistEntry, WaitlistStatus, AuditAction } from '@prisma/client';

/**
 * Waitlist Service (T094-T095)
 * Per FR-024 to FR-026: Waitlist management with notification logic
 */
@Injectable()
export class WaitlistService {
  private readonly logger = new Logger(WaitlistService.name);
  private readonly CLAIM_WINDOW_MS = 60 * 60 * 1000; // 1 hour in milliseconds

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Add patient to waitlist (T094)
   * Per FR-024: Patients can join waitlist for desired time slots
   */
  async addToWaitlist(data: {
    patientId: string;
    practitionerId?: string;
    desiredDateStart: Date;
    desiredDateEnd: Date;
    tenantId: string;
    userId?: string;
  }): Promise<WaitlistEntry> {
    // Validate tenant context
    await this.validateTenantContext(data.tenantId, data.patientId, data.practitionerId);

    // Validate date range
    this.validateDateRange(data.desiredDateStart, data.desiredDateEnd);

    // Create waitlist entry
    const entry = await this.prisma.waitlistEntry.create({
      data: {
        tenantId: data.tenantId,
        patientId: data.patientId,
        practitionerId: data.practitionerId,
        desiredDateStart: data.desiredDateStart,
        desiredDateEnd: data.desiredDateEnd,
        status: WaitlistStatus.ACTIVE,
      },
      include: {
        tenant: true,
      },
    });

    this.logger.log(
      `Patient ${data.patientId} added to waitlist for ${data.desiredDateStart.toISOString()} to ${data.desiredDateEnd.toISOString()}`,
    );

    // Log audit event
    if (data.userId) {
      await this.auditService.logPhiAccess({
        userId: data.userId,
        tenantId: data.tenantId,
        entityType: 'WaitlistEntry',
        entityId: entry.id,
        action: AuditAction.CREATE,
        afterValue: entry,
      });
    }

    return entry;
  }

  /**
   * Get waitlist entries for a patient
   */
  async getPatientWaitlistEntries(patientId: string, tenantId: string): Promise<WaitlistEntry[]> {
    return this.prisma.waitlistEntry.findMany({
      where: {
        patientId,
        tenantId,
        status: WaitlistStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Get waitlist entries for a practitioner
   */
  async getPractitionerWaitlistEntries(
    practitionerId: string,
    tenantId: string,
  ): Promise<WaitlistEntry[]> {
    return this.prisma.waitlistEntry.findMany({
      where: {
        practitionerId,
        tenantId,
        status: WaitlistStatus.ACTIVE,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  /**
   * Notify waitlist when appointment is cancelled (T095-T096)
   * Per FR-025: Automatic notification with 1-hour claim window
   */
  async notifyWaitlistOnCancellation(
    cancelledAppointment: {
      id: string;
      practitionerId: string;
      startTime: Date;
      endTime: Date;
      tenantId: string;
    },
    userId?: string,
  ): Promise<void> {
    this.logger.log(
      `Processing waitlist notifications for cancelled appointment: ${cancelledAppointment.id}`,
    );

    // Find matching waitlist entries (FIFO order)
    const matchingEntries = await this.prisma.waitlistEntry.findMany({
      where: {
        tenantId: cancelledAppointment.tenantId,
        status: WaitlistStatus.ACTIVE,
        OR: [
          // Specific practitioner preference
          {
            practitionerId: cancelledAppointment.practitionerId,
            desiredDateStart: {
              lte: cancelledAppointment.startTime,
            },
            desiredDateEnd: {
              gte: cancelledAppointment.endTime,
            },
          },
          // Any practitioner (null practitionerId)
          {
            practitionerId: null,
            desiredDateStart: {
              lte: cancelledAppointment.startTime,
            },
            desiredDateEnd: {
              gte: cancelledAppointment.endTime,
            },
          },
        ],
      },
      include: {
        tenant: true,
      },
      orderBy: {
        createdAt: 'asc', // FIFO - oldest entry first
      },
      take: 1, // Only notify the first person in line
    });

    if (matchingEntries.length === 0) {
      this.logger.log('No matching waitlist entries found for cancelled appointment');
      return;
    }

    const entry = matchingEntries[0];

    // Update entry status and set notification time
    await this.prisma.waitlistEntry.update({
      where: {
        id: entry.id,
      },
      data: {
        status: WaitlistStatus.ACTIVE, // Keep as ACTIVE until claimed or expired
        notifiedAt: new Date(),
      },
    });

    // Get patient details for notification
    const patient = await this.prisma.patient.findUnique({
      where: {
        id: entry.patientId,
      },
    });

    if (!patient) {
      this.logger.error(`Patient not found for waitlist entry: ${entry.id}`);
      return;
    }

    // Send notification email with claim link
    try {
      const practitioner = await this.prisma.practitioner.findUnique({
        where: {
          id: cancelledAppointment.practitionerId,
        },
      });

      await this.emailService.sendWaitlistNotification(patient.email, {
        patientName: patient.fullName,
        practitionerName: practitioner?.fullName || 'Available practitioner',
        startTime: cancelledAppointment.startTime,
        endTime: cancelledAppointment.endTime,
        claimUrl: `${process.env.FRONTEND_URL}/appointments/claim?waitlistId=${entry.id}`,
        expiresAt: new Date(Date.now() + this.CLAIM_WINDOW_MS),
      });

      this.logger.log(`Waitlist notification sent to patient: ${patient.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send waitlist notification for entry ${entry.id}: ${error.message}`,
      );
      // Don't throw - notification failure shouldn't block the process
    }

    // Log audit event
    if (userId) {
      await this.auditService.logAdminAction({
        userId,
        tenantId: entry.tenantId,
        entityType: 'WaitlistEntry',
        entityId: entry.id,
        action: AuditAction.UPDATE,
        afterValue: {
          status: 'NOTIFIED',
          notifiedAt: new Date(),
        },
      });
    }
  }

  /**
   * Claim waitlist slot (patient accepts the offered time)
   */
  async claimWaitlistSlot(
    waitlistId: string,
    tenantId: string,
    userId?: string,
  ): Promise<WaitlistEntry> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        id: waitlistId,
        tenantId,
      },
    });

    if (!entry) {
      throw new NotFoundException('Waitlist entry not found or access denied');
    }

    // Validate entry is in ACTIVE status
    if (entry.status !== WaitlistStatus.ACTIVE) {
      throw new BadRequestException(`Cannot claim waitlist entry with status: ${entry.status}`);
    }

    // Validate claim window (1 hour from notification)
    if (entry.notifiedAt) {
      const expiresAt = new Date(entry.notifiedAt.getTime() + this.CLAIM_WINDOW_MS);
      if (new Date() > expiresAt) {
        // Expire the entry
        await this.expireWaitlistEntry(waitlistId, tenantId, userId);
        throw new ConflictException(
          'Claim window has expired. This time slot has been offered to the next person in line.',
        );
      }
    }

    // Update status to CLAIMED
    const updated = await this.prisma.waitlistEntry.update({
      where: {
        id: waitlistId,
      },
      data: {
        status: WaitlistStatus.CLAIMED,
        claimedAt: new Date(),
      },
    });

    this.logger.log(`Waitlist entry claimed: ${waitlistId}`);

    // Log audit event
    if (userId) {
      await this.auditService.logPhiAccess({
        userId,
        tenantId,
        entityType: 'WaitlistEntry',
        entityId: waitlistId,
        action: AuditAction.UPDATE,
        beforeValue: { status: entry.status },
        afterValue: { status: WaitlistStatus.CLAIMED, claimedAt: new Date() },
      });
    }

    return updated;
  }

  /**
   * Expire waitlist entry (when claim window passes)
   */
  async expireWaitlistEntry(
    waitlistId: string,
    tenantId: string,
    userId?: string,
  ): Promise<WaitlistEntry> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        id: waitlistId,
        tenantId,
      },
    });

    if (!entry) {
      throw new NotFoundException('Waitlist entry not found or access denied');
    }

    const updated = await this.prisma.waitlistEntry.update({
      where: {
        id: waitlistId,
      },
      data: {
        status: WaitlistStatus.EXPIRED,
      },
    });

    this.logger.log(`Waitlist entry expired: ${waitlistId}`);

    // Log audit event
    if (userId) {
      await this.auditService.logAdminAction({
        userId,
        tenantId,
        entityType: 'WaitlistEntry',
        entityId: waitlistId,
        action: AuditAction.UPDATE,
        beforeValue: { status: entry.status },
        afterValue: { status: WaitlistStatus.EXPIRED },
      });
    }

    return updated;
  }

  /**
   * Remove from waitlist (patient cancels waitlist entry)
   */
  async removeFromWaitlist(waitlistId: string, tenantId: string, userId?: string): Promise<void> {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: {
        id: waitlistId,
        tenantId,
      },
    });

    if (!entry) {
      throw new NotFoundException('Waitlist entry not found or access denied');
    }

    await this.prisma.waitlistEntry.delete({
      where: {
        id: waitlistId,
      },
    });

    this.logger.log(`Waitlist entry removed: ${waitlistId}`);

    // Log audit event
    if (userId) {
      await this.auditService.logPhiAccess({
        userId,
        tenantId,
        entityType: 'WaitlistEntry',
        entityId: waitlistId,
        action: AuditAction.DELETE,
        beforeValue: entry,
      });
    }
  }

  /**
   * Validate tenant context (prevent cross-tenant access)
   */
  private async validateTenantContext(
    tenantId: string,
    patientId: string,
    practitionerId?: string,
  ): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { tenantId: true },
    });

    if (!patient) {
      throw new NotFoundException('Patient not found');
    }

    if (patient.tenantId !== tenantId) {
      throw new BadRequestException('Tenant mismatch');
    }

    if (practitionerId) {
      const practitioner = await this.prisma.practitioner.findUnique({
        where: { id: practitionerId },
        select: { tenantId: true },
      });

      if (!practitioner) {
        throw new NotFoundException('Practitioner not found');
      }

      if (practitioner.tenantId !== tenantId) {
        throw new BadRequestException('Tenant mismatch');
      }
    }
  }

  /**
   * Validate date range
   */
  private validateDateRange(startDate: Date, endDate: Date): void {
    const now = new Date();

    // Cannot create waitlist for past dates
    if (startDate < now) {
      throw new BadRequestException('Cannot create waitlist entries for past dates');
    }

    // endDate must be after startDate
    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Maximum date range is 30 days
    const maxRangeMs = 30 * 24 * 60 * 60 * 1000;
    if (endDate.getTime() - startDate.getTime() > maxRangeMs) {
      throw new BadRequestException('Date range cannot exceed 30 days');
    }
  }
}
