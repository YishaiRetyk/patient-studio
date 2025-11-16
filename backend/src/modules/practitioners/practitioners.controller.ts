import {
  Controller,
  Get,
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
import { PractitionersService, AvailableHours } from './practitioners.service';
import { UserRole } from '@prisma/client';

/**
 * Practitioner Controller (T098-T099)
 * Per FR-021 to FR-023: Practitioner calendar management endpoints
 */
@Controller('practitioners')
@UseGuards(JwtAuthGuard, RbacGuard)
export class PractitionersController {
  constructor(private readonly practitionersService: PractitionersService) {}

  /**
   * Get all practitioners for tenant
   * GET /practitioners
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.PRACTITIONER, UserRole.PATIENT)
  async findAll(@Request() req: any) {
    return this.practitionersService.findAll(req.user.tenantId);
  }

  /**
   * Get practitioner by ID
   * GET /practitioners/:id
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.PRACTITIONER, UserRole.PATIENT)
  async findOne(@Param('id') id: string, @Request() req: any) {
    return this.practitionersService.findOne(id, req.user.tenantId);
  }

  /**
   * Update practitioner available hours (T093, T099)
   * PATCH /practitioners/:id/hours
   * Per FR-022: Practitioner can configure their available hours
   */
  @Patch(':id/hours')
  @Roles(UserRole.ADMIN, UserRole.PRACTITIONER)
  @HttpCode(HttpStatus.OK)
  async updateAvailableHours(
    @Param('id') id: string,
    @Body('availableHours') availableHours: AvailableHours,
    @Request() req: any,
  ) {
    // Validate that practitioner can only update their own hours (unless admin)
    if (req.user.role === UserRole.PRACTITIONER) {
      const practitioner = await this.practitionersService.findOne(id, req.user.tenantId);
      if (practitioner.userId !== req.user.sub) {
        throw new Error('You can only update your own available hours');
      }
    }

    return this.practitionersService.updateAvailableHours(
      id,
      availableHours,
      req.user.tenantId,
      req.user.sub,
    );
  }

  /**
   * Generate calendar token for iCal export (T099)
   * POST /practitioners/:id/calendar-token
   * Per FR-023: Generate secure token for iCal feed
   */
  @Patch(':id/calendar-token')
  @Roles(UserRole.ADMIN, UserRole.PRACTITIONER)
  @HttpCode(HttpStatus.OK)
  async generateCalendarToken(@Param('id') id: string, @Request() req: any) {
    // Validate that practitioner can only generate token for themselves (unless admin)
    if (req.user.role === UserRole.PRACTITIONER) {
      const practitioner = await this.practitionersService.findOne(id, req.user.tenantId);
      if (practitioner.userId !== req.user.sub) {
        throw new Error('You can only generate calendar token for yourself');
      }
    }

    const token = await this.practitionersService.generateCalendarToken(
      id,
      req.user.tenantId,
      req.user.sub,
    );

    return {
      calendarToken: token,
      calendarUrl: `${process.env.API_URL}/calendar/export/${token}`,
    };
  }
}
