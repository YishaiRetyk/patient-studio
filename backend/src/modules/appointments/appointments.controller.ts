import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { GetAvailabilityDto } from './dto/get-availability.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard, Roles } from '../auth/guards/rbac.guard';
import { UserRole } from '@prisma/client';
import { AuditLog } from '../audit/audit.interceptor';

/**
 * Appointments Controller (T079-T082)
 * Per FR-011 to FR-020: Appointment management endpoints
 */
@Controller('appointments')
@UseGuards(JwtAuthGuard, RbacGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  /**
   * GET /appointments/availability (T080)
   * Per FR-012: Real-time availability display
   */
  @Get('availability')
  @Roles(UserRole.PATIENT, UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAvailability(
    @Query() query: GetAvailabilityDto,
    @Request() req: any,
  ) {
    const availability = await this.appointmentsService.getAvailability({
      practitionerId: query.practitionerId,
      startDate: new Date(query.startDate),
      endDate: new Date(query.endDate),
      tenantId: req.user.tenantId,
    });

    return { availability };
  }

  /**
   * POST /appointments (T080)
   * Per FR-011, FR-014: Create appointment with double-booking prevention
   */
  @Post()
  @Roles(UserRole.PATIENT, UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @AuditLog({ entityType: 'Appointment' })
  async create(@Body() dto: CreateAppointmentDto, @Request() req: any) {
    const appointment = await this.appointmentsService.create({
      patientId: dto.patientId,
      practitionerId: dto.practitionerId,
      startTime: new Date(dto.startTime),
      endTime: new Date(dto.endTime),
      tenantId: req.user.tenantId,
      userId: req.user.userId,
    });

    return appointment;
  }

  /**
   * PATCH /appointments/:id
   * Update appointment (reschedule, cancel, etc.)
   */
  @Patch(':id')
  @Roles(UserRole.PATIENT, UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ entityType: 'Appointment' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
    @Request() req: any,
  ) {
    const appointment = await this.appointmentsService.update(id, {
      startTime: dto.startTime ? new Date(dto.startTime) : undefined,
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      status: dto.status,
      currentVersion: dto.currentVersion,
      tenantId: req.user.tenantId,
      userId: req.user.userId,
    });

    return appointment;
  }
}
