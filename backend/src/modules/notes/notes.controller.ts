import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Request,
  UseGuards,
  HttpCode,
  HttpStatus,
  Header,
  StreamableFile,
} from '@nestjs/common';
import { ClinicalNotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { AICompleteDto } from './dto/ai-complete.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RbacGuard, Roles } from '../auth/guards/rbac.guard';
import { UserRole } from '@prisma/client';
import { AuditLog } from '../audit/audit.interceptor';

/**
 * Clinical Notes Controller
 * Task ID: T122, T123
 * Per FR-043 to FR-053: SOAP note endpoints with encryption and audit logging
 */
@Controller('notes')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ClinicalNotesController {
  constructor(private readonly clinicalNotesService: ClinicalNotesService) {}

  /**
   * POST /notes
   * Create a new clinical note
   * Task ID: T122, T123
   * Per FR-043: Create encrypted SOAP note
   */
  @Post()
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @AuditLog({ entityType: 'ClinicalNote' })
  async create(@Body() dto: CreateNoteDto, @Request() req: any) {
    const note = await this.clinicalNotesService.create({
      appointmentId: dto.appointmentId,
      practitionerId: req.user.practitionerId, // Assuming practitionerId is in JWT payload
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      subjective: dto.subjective,
      objective: dto.objective,
      assessment: dto.assessment,
      plan: dto.plan,
      sharedWithPatient: dto.sharedWithPatient,
    });

    // Return note with encrypted fields (do not return plaintext)
    return {
      id: note.id,
      appointmentId: note.appointmentId,
      practitionerId: note.practitionerId,
      tenantId: note.tenantId,
      subjectiveEncrypted: note.subjectiveEncrypted,
      objectiveEncrypted: note.objectiveEncrypted,
      assessmentEncrypted: note.assessmentEncrypted,
      planEncrypted: note.planEncrypted,
      sharedWithPatient: note.sharedWithPatient,
      version: note.version,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  /**
   * GET /notes/:id
   * Retrieve a clinical note (decrypted)
   * Task ID: T122
   * Per FR-050: Retrieve note with audit logging
   */
  @Get(':id')
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ entityType: 'ClinicalNote' })
  async findOne(@Param('id') id: string, @Request() req: any) {
    const note = await this.clinicalNotesService.findOne(
      id,
      req.user.tenantId,
      req.user.userId,
    );

    // Return note with decrypted sections
    return {
      id: note.id,
      appointmentId: note.appointmentId,
      practitionerId: note.practitionerId,
      tenantId: note.tenantId,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      sharedWithPatient: note.sharedWithPatient,
      version: note.version,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      appointment: note.appointment,
    };
  }

  /**
   * PATCH /notes/:id
   * Update a clinical note
   * Task ID: T122, T123
   * Per FR-049: Update note with version increment
   */
  @Patch(':id')
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ entityType: 'ClinicalNote' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateNoteDto,
    @Request() req: any,
  ) {
    const updatedNote = await this.clinicalNotesService.update(id, {
      tenantId: req.user.tenantId,
      userId: req.user.userId,
      subjective: dto.subjective,
      objective: dto.objective,
      assessment: dto.assessment,
      plan: dto.plan,
      sharedWithPatient: dto.sharedWithPatient,
      currentVersion: dto.currentVersion,
    });

    // Return updated note with encrypted fields
    return {
      id: updatedNote.id,
      appointmentId: updatedNote.appointmentId,
      practitionerId: updatedNote.practitionerId,
      tenantId: updatedNote.tenantId,
      subjectiveEncrypted: updatedNote.subjectiveEncrypted,
      objectiveEncrypted: updatedNote.objectiveEncrypted,
      assessmentEncrypted: updatedNote.assessmentEncrypted,
      planEncrypted: updatedNote.planEncrypted,
      sharedWithPatient: updatedNote.sharedWithPatient,
      version: updatedNote.version,
      createdAt: updatedNote.createdAt,
      updatedAt: updatedNote.updatedAt,
    };
  }

  /**
   * GET /notes/:id/pdf
   * Generate PDF export of clinical note
   * Task ID: T118, T123
   * Per FR-047: PDF export for practitioners
   */
  @Get(':id/pdf')
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', 'attachment; filename="clinical-note.pdf"')
  @AuditLog({ entityType: 'ClinicalNote' })
  async exportPDF(@Param('id') id: string, @Request() req: any): Promise<StreamableFile> {
    const pdfBuffer = await this.clinicalNotesService.generatePDF(
      id,
      req.user.tenantId,
      req.user.userId,
    );

    return new StreamableFile(pdfBuffer);
  }

  /**
   * POST /notes/ai-complete
   * AI-powered SOAP note autocompletion
   * Task ID: T115, T117, T123
   * Per FR-044, FR-046: OpenAI GPT-4o autocompletion with PHI de-identification
   */
  @Post('ai-complete')
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @AuditLog({ entityType: 'AI_COMPLETION' })
  async aiComplete(@Body() dto: AICompleteDto, @Request() req: any) {
    const result = await this.clinicalNotesService.aiComplete({
      partialNote: {
        subjective: dto.partialNote.subjective,
        objective: dto.partialNote.objective,
        assessment: dto.partialNote.assessment,
        plan: dto.partialNote.plan,
        soapSection: dto.partialNote.soapSection as any,
      },
      context: dto.context,
      userId: req.user.userId,
      tenantId: req.user.tenantId,
    });

    return result;
  }

  /**
   * GET /notes/appointment/:appointmentId
   * Get clinical note by appointment ID
   * Task ID: T122
   */
  @Get('appointment/:appointmentId')
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async findByAppointment(
    @Param('appointmentId') appointmentId: string,
    @Request() req: any,
  ) {
    const note = await this.clinicalNotesService.findByAppointment(
      appointmentId,
      req.user.tenantId,
    );

    if (!note) {
      return null;
    }

    return {
      id: note.id,
      appointmentId: note.appointmentId,
      practitionerId: note.practitionerId,
      version: note.version,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  }

  /**
   * GET /notes/:id/audit
   * Get audit history for a clinical note
   * Task ID: T120
   * Per FR-050: Complete audit trail
   */
  @Get(':id/audit')
  @Roles(UserRole.PRACTITIONER, UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getAuditHistory(@Param('id') id: string, @Request() req: any) {
    const auditHistory = await this.clinicalNotesService.getAuditHistory(
      id,
      req.user.tenantId,
    );

    return { auditHistory };
  }

  /**
   * DELETE /notes/:id
   * Delete a clinical note
   * Task ID: T122
   * Note: Should be carefully controlled for HIPAA compliance
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN) // Only admins can delete notes
  @HttpCode(HttpStatus.OK)
  @AuditLog({ entityType: 'ClinicalNote' })
  async delete(@Param('id') id: string, @Request() req: any) {
    await this.clinicalNotesService.delete(id, req.user.tenantId, req.user.userId);

    return { message: 'Clinical note deleted successfully' };
  }
}
