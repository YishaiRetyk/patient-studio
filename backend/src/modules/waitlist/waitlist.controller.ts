import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard, Roles } from '../auth/guards/rbac.guard';
import { WaitlistService } from './waitlist.service';
import { UserRole } from '@prisma/client';
import { AuditLog } from '../audit/audit.interceptor';

/**
 * Waitlist Controller (T100)
 * Per FR-024 to FR-026: Waitlist management endpoints
 */
@Controller('waitlist')
@UseGuards(JwtAuthGuard, RbacGuard)
export class WaitlistController {
  constructor(private readonly waitlistService: WaitlistService) {}

  /**
   * POST /waitlist (T100)
   * Add patient to waitlist
   * Per FR-024: Patients can join waitlist for desired time slots
   */
  @Post()
  @Roles(UserRole.PATIENT, UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @AuditLog({ entityType: 'WaitlistEntry' })
  async addToWaitlist(
    @Body()
    dto: {
      patientId: string;
      practitionerId?: string;
      desiredDateStart: string;
      desiredDateEnd: string;
    },
    @Request() req: any,
  ) {
    const entry = await this.waitlistService.addToWaitlist({
      patientId: dto.patientId,
      practitionerId: dto.practitionerId,
      desiredDateStart: new Date(dto.desiredDateStart),
      desiredDateEnd: new Date(dto.desiredDateEnd),
      tenantId: req.user.tenantId,
      userId: req.user.sub,
    });

    return entry;
  }

  /**
   * GET /waitlist/patient/:patientId (T100)
   * Get waitlist entries for a patient
   */
  @Get('patient/:patientId')
  @Roles(UserRole.PATIENT, UserRole.PRACTITIONER, UserRole.ADMIN)
  async getPatientWaitlistEntries(@Param('patientId') patientId: string, @Request() req: any) {
    // Validate patient can only view their own waitlist entries (unless admin)
    if (req.user.role === UserRole.PATIENT && req.user.sub !== patientId) {
      throw new Error('You can only view your own waitlist entries');
    }

    return this.waitlistService.getPatientWaitlistEntries(patientId, req.user.tenantId);
  }

  /**
   * GET /waitlist/practitioner/:practitionerId (T100)
   * Get waitlist entries for a practitioner
   */
  @Get('practitioner/:practitionerId')
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN)
  async getPractitionerWaitlistEntries(
    @Param('practitionerId') practitionerId: string,
    @Request() req: any,
  ) {
    return this.waitlistService.getPractitionerWaitlistEntries(practitionerId, req.user.tenantId);
  }

  /**
   * PATCH /waitlist/:id/claim (T100)
   * Claim waitlist slot (patient accepts the offered time)
   */
  @Patch(':id/claim')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ entityType: 'WaitlistEntry' })
  async claimWaitlistSlot(@Param('id') id: string, @Request() req: any) {
    const entry = await this.waitlistService.claimWaitlistSlot(
      id,
      req.user.tenantId,
      req.user.sub,
    );

    return {
      message: 'Waitlist slot claimed successfully',
      entry,
    };
  }

  /**
   * DELETE /waitlist/:id (T100)
   * Remove from waitlist (patient cancels waitlist entry)
   */
  @Delete(':id')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ entityType: 'WaitlistEntry' })
  async removeFromWaitlist(@Param('id') id: string, @Request() req: any) {
    await this.waitlistService.removeFromWaitlist(id, req.user.tenantId, req.user.sub);

    return {
      message: 'Removed from waitlist successfully',
    };
  }
}
