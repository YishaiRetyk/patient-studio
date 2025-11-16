import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/database/prisma.service';
import { EmailService } from '../notifications/email.service';
import { AuditService } from '../audit/audit.service';
import { Appointment, AppointmentStatus, AuditAction } from '@prisma/client';

/**
 * Appointments Service (T071-T073)
 * Per FR-011 to FR-020: Appointment booking, availability, double-booking prevention
 */
@Injectable()
export class AppointmentsService {
  private readonly logger = new Logger(AppointmentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Cancel appointment and trigger waitlist notifications (T096)
   * Per FR-026: Automatic waitlist notification on cancellation
   */
  async cancel(
    id: string,
    data: {
      cancellationReason?: string;
      tenantId: string;
      userId?: string;
    },
  ): Promise<Appointment> {
    // Fetch current appointment
    const current = await this.prisma.appointment.findFirst({
      where: {
        id,
        tenantId: data.tenantId,
      },
    });

    if (!current) {
      throw new NotFoundException('Appointment not found or access denied');
    }

    // Cannot cancel already cancelled or completed appointments
    if (current.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }
    if (current.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed appointments');
    }

    // Update appointment status to CANCELLED
    const cancelled = await this.prisma.appointment.update({
      where: { id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancellationReason: data.cancellationReason,
      },
      include: {
        patient: true,
        practitioner: true,
      },
    });

    this.logger.log(`Appointment cancelled: ${id}`);

    // Log audit event
    if (data.userId) {
      await this.auditService.logPhiAccess({
        userId: data.userId,
        tenantId: data.tenantId,
        entityType: 'Appointment',
        entityId: id,
        action: AuditAction.UPDATE,
        beforeValue: { status: current.status },
        afterValue: {
          status: AppointmentStatus.CANCELLED,
          cancellationReason: data.cancellationReason,
        },
      });
    }

    return cancelled;
  }

  /**
   * Create appointment with optimistic locking (T073)
   * Per FR-011, FR-012, FR-014: Booking with double-booking prevention
   */
  async create(data: {
    patientId: string;
    practitionerId: string;
    startTime: Date;
    endTime: Date;
    tenantId: string;
    userId?: string;
  }): Promise<Appointment> {
    // Validate tenant context
    await this.validateTenantContext(data.tenantId, data.patientId, data.practitionerId);

    // Validate booking rules
    this.validateAppointmentTimes(data.startTime, data.endTime);

    // Check for double-booking
    await this.checkDoubleBooking(data.practitionerId, data.startTime, data.endTime, data.tenantId);

    // Create appointment with version = 1 (optimistic locking)
    try {
      const appointment = await this.prisma.appointment.create({
        data: {
          tenantId: data.tenantId,
          patientId: data.patientId,
          practitionerId: data.practitionerId,
          startTime: data.startTime,
          endTime: data.endTime,
          status: AppointmentStatus.SCHEDULED,
          version: 1,
        },
        include: {
          patient: true,
          practitioner: true,
        },
      });

      this.logger.log(`Appointment created: ${appointment.id} for patient ${data.patientId}`);

      // Send confirmation email (T074)
      await this.sendConfirmationEmail(appointment);

      // Log audit event
      if (data.userId) {
        await this.auditService.logPhiAccess({
          userId: data.userId,
          tenantId: data.tenantId,
          entityType: 'Appointment',
          entityId: appointment.id,
          action: AuditAction.CREATE,
          afterValue: appointment,
        });
      }

      return appointment;
    } catch (error) {
      // Handle unique constraint violation (double-booking at DB level)
      if (error.code === 'P2002') {
        throw new ConflictException(
          'The selected time slot is already booked. Please choose another time.',
        );
      }
      throw error;
    }
  }

  /**
   * Update appointment with optimistic locking
   * Per FR-014: Optimistic locking to prevent race conditions
   */
  async update(
    id: string,
    data: {
      startTime?: Date;
      endTime?: Date;
      status?: AppointmentStatus;
      currentVersion: number;
      tenantId: string;
      userId?: string;
    },
  ): Promise<Appointment> {
    // Fetch current appointment to check version
    const current = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!current) {
      throw new NotFoundException('Appointment not found');
    }

    // Optimistic locking check
    if (current.version !== data.currentVersion) {
      throw new ConflictException(
        'Appointment has been modified by another user. Please refresh and try again.',
      );
    }

    // If updating times, validate and check double-booking
    if (data.startTime || data.endTime) {
      const newStartTime = data.startTime || current.startTime;
      const newEndTime = data.endTime || current.endTime;

      this.validateAppointmentTimes(newStartTime, newEndTime);

      await this.checkDoubleBooking(
        current.practitionerId,
        newStartTime,
        newEndTime,
        data.tenantId,
        id, // Exclude current appointment from check
      );
    }

    try {
      const updated = await this.prisma.appointment.update({
        where: { id, version: data.currentVersion },
        data: {
          startTime: data.startTime,
          endTime: data.endTime,
          status: data.status,
          version: { increment: 1 }, // Increment version
        },
        include: {
          patient: true,
          practitioner: true,
        },
      });

      this.logger.log(`Appointment updated: ${id} (version ${updated.version})`);

      // Log audit event
      if (data.userId) {
        await this.auditService.logPhiAccess({
          userId: data.userId,
          tenantId: data.tenantId,
          entityType: 'Appointment',
          entityId: id,
          action: AuditAction.UPDATE,
          beforeValue: current,
          afterValue: updated,
        });
      }

      return updated;
    } catch (error) {
      // Handle version mismatch (concurrent modification)
      if (error.code === 'P2025') {
        throw new ConflictException('Appointment has been modified. Please refresh and try again.');
      }
      throw error;
    }
  }

  /**
   * Get availability for practitioner (T072)
   * Per FR-012: Real-time availability display
   */
  async getAvailability(params: {
    practitionerId: string;
    startDate: Date;
    endDate: Date;
    tenantId: string;
  }): Promise<any[]> {
    // Validate practitioner exists and belongs to tenant
    const practitioner = await this.prisma.practitioner.findFirst({
      where: {
        id: params.practitionerId,
        tenantId: params.tenantId,
      },
    });

    if (!practitioner) {
      throw new NotFoundException('Practitioner not found or access denied');
    }

    // Get all booked appointments in date range
    const bookedAppointments = await this.prisma.appointment.findMany({
      where: {
        practitionerId: params.practitionerId,
        startTime: {
          gte: params.startDate,
          lte: params.endDate,
        },
        status: AppointmentStatus.SCHEDULED,
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    // Generate availability slots based on practitioner hours
    const availability = this.generateAvailabilitySlots(
      params.startDate,
      params.endDate,
      practitioner.availableHours as any,
      bookedAppointments,
    );

    return availability;
  }

  /**
   * Validate tenant context (prevent cross-tenant access)
   */
  private async validateTenantContext(
    tenantId: string,
    patientId: string,
    practitionerId: string,
  ): Promise<void> {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { tenantId: true },
    });

    const practitioner = await this.prisma.practitioner.findUnique({
      where: { id: practitionerId },
      select: { tenantId: true },
    });

    if (!patient || !practitioner) {
      throw new NotFoundException('Patient or practitioner not found');
    }

    if (patient.tenantId !== tenantId || practitioner.tenantId !== tenantId) {
      throw new BadRequestException('Tenant mismatch');
    }

    if (patient.tenantId !== practitioner.tenantId) {
      throw new BadRequestException('Patient and practitioner must belong to the same tenant');
    }
  }

  /**
   * Validate appointment times (business rules)
   * Per FR-013: Appointment validation rules
   */
  private validateAppointmentTimes(startTime: Date, endTime: Date): void {
    const now = new Date();

    // Cannot book in the past
    if (startTime < now) {
      throw new BadRequestException('Cannot book appointments in the past');
    }

    // Must be at least 2 hours in advance (per FR-013)
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    if (startTime < twoHoursFromNow) {
      throw new BadRequestException('Appointments must be booked at least 2 hours in advance');
    }

    // endTime must be after startTime
    if (endTime <= startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    // Duration checks
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = durationMs / (60 * 1000);

    // Minimum 15 minutes
    if (durationMinutes < 15) {
      throw new BadRequestException('Appointment duration must be at least 15 minutes');
    }

    // Maximum 4 hours
    if (durationMinutes > 240) {
      throw new BadRequestException('Appointment duration cannot exceed 4 hours');
    }
  }

  /**
   * Check for double-booking (per FR-014)
   */
  private async checkDoubleBooking(
    practitionerId: string,
    startTime: Date,
    endTime: Date,
    tenantId: string,
    excludeAppointmentId?: string,
  ): Promise<void> {
    const overlappingAppointments = await this.prisma.appointment.findMany({
      where: {
        practitionerId,
        tenantId,
        status: AppointmentStatus.SCHEDULED,
        id: excludeAppointmentId ? { not: excludeAppointmentId } : undefined,
        OR: [
          // New appointment starts during existing appointment
          {
            startTime: { lte: startTime },
            endTime: { gt: startTime },
          },
          // New appointment ends during existing appointment
          {
            startTime: { lt: endTime },
            endTime: { gte: endTime },
          },
          // New appointment completely contains existing appointment
          {
            startTime: { gte: startTime },
            endTime: { lte: endTime },
          },
        ],
      },
    });

    if (overlappingAppointments.length > 0) {
      throw new ConflictException(
        'The selected time slot is already booked. Please choose another time.',
      );
    }
  }

  /**
   * Send confirmation email (T074)
   */
  private async sendConfirmationEmail(appointment: any): Promise<void> {
    try {
      await this.emailService.sendAppointmentConfirmation(appointment.patient.email, {
        patientName: appointment.patient.fullName,
        practitionerName: appointment.practitioner.fullName,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
      });
    } catch (error) {
      this.logger.error(
        `Failed to send confirmation email for appointment ${appointment.id}: ${error.message}`,
      );
      // Don't throw - email failure shouldn't block appointment creation
    }
  }

  /**
   * Generate availability slots based on practitioner hours
   */
  private generateAvailabilitySlots(
    startDate: Date,
    endDate: Date,
    availableHours: any,
    bookedAppointments: any[],
  ): any[] {
    const slots: any[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      const dayName = current.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const dayHours = availableHours?.[dayName];

      if (dayHours && Array.isArray(dayHours)) {
        dayHours.forEach((hours: any) => {
          const [startHour] = hours.start.split(':').map(Number);
          const [endHour, endMinute] = hours.end.split(':').map(Number);

          // Generate 30-minute slots
          for (let hour = startHour; hour < endHour; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
              if (hour === endHour && minute >= endMinute) break;

              const slotStart = new Date(current);
              slotStart.setHours(hour, minute, 0, 0);

              const slotEnd = new Date(slotStart);
              slotEnd.setMinutes(slotEnd.getMinutes() + 30);

              // Check if slot is booked
              const isBooked = bookedAppointments.some(
                (apt) => slotStart >= apt.startTime && slotStart < apt.endTime,
              );

              slots.push({
                date: current.toISOString().split('T')[0],
                startTime: `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`,
                endTime: `${slotEnd.getHours().toString().padStart(2, '0')}:${slotEnd.getMinutes().toString().padStart(2, '0')}`,
                available: !isBooked,
              });
            }
          }
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return slots;
  }
}
