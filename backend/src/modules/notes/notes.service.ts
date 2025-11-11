import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaClient, ClinicalNote, AppointmentStatus } from '@prisma/client';
import { EncryptionService } from './encryption.service';
import { PDFService } from './pdf.service';
import { AIService } from './ai.service';

/**
 * Clinical Notes Service
 * Task ID: T119, T120, T121, T125
 * Per FR-043 to FR-053: SOAP note management with encryption, versioning, and audit trail
 */
@Injectable()
export class ClinicalNotesService {
  private readonly logger = new Logger(ClinicalNotesService.name);

  constructor(
    private readonly prisma: PrismaClient,
    private readonly encryptionService: EncryptionService,
    private readonly pdfService: PDFService,
    private readonly aiService: AIService,
  ) {
    this.logger.log('ClinicalNotesService initialized');
  }

  /**
   * Create a new clinical note
   * Task ID: T119, T120, T121
   * Per FR-043, FR-048: Create encrypted SOAP note with version 1
   */
  async create(params: {
    appointmentId: string;
    practitionerId: string;
    tenantId: string;
    userId: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
    sharedWithPatient?: boolean;
  }): Promise<ClinicalNote> {
    const {
      appointmentId,
      practitionerId,
      tenantId,
      // userId is not used but required by interface for audit context
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      userId,
      subjective,
      objective,
      assessment,
      plan,
      sharedWithPatient = false,
    } = params;

    // Validate: note can only be created for past appointments (T125)
    await this.validatePastAppointment(appointmentId, tenantId);

    // Check if note already exists for this appointment
    const existingNote = await this.prisma.clinicalNote.findUnique({
      where: { appointmentId },
    });

    if (existingNote) {
      throw new ConflictException('Clinical note already exists for this appointment');
    }

    // Encrypt all SOAP sections
    const encryptedSoapSections = await this.encryptionService.encryptSoapSections(
      { subjective, objective, assessment, plan },
      tenantId,
    );

    // Create note in database
    const note = await this.prisma.clinicalNote.create({
      data: {
        tenantId,
        appointmentId,
        practitionerId,
        ...encryptedSoapSections,
        sharedWithPatient,
        version: 1, // Initial version
      },
    });

    this.logger.log(`Clinical note created: ${note.id} for appointment ${appointmentId}`);

    return note;
  }

  /**
   * Update an existing clinical note
   * Task ID: T120
   * Per FR-049: Update note with version increment and optimistic locking
   */
  async update(
    noteId: string,
    params: {
      tenantId: string;
      userId: string;
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      sharedWithPatient?: boolean;
      currentVersion?: number; // For optimistic locking
    },
  ): Promise<ClinicalNote> {
    // userId is not used but required by interface for audit context
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { tenantId, userId, currentVersion, ...updateData } = params;

    // Fetch existing note
    const existingNote = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, tenantId },
    });

    if (!existingNote) {
      throw new NotFoundException('Clinical note not found');
    }

    // Optimistic locking check
    if (currentVersion !== undefined && existingNote.version !== currentVersion) {
      throw new ConflictException(
        `Version conflict: expected version ${currentVersion}, but current version is ${existingNote.version}`,
      );
    }

    // Decrypt existing sections
    const decryptedSections = await this.encryptionService.decryptSoapSections(
      {
        subjectiveEncrypted: existingNote.subjectiveEncrypted,
        objectiveEncrypted: existingNote.objectiveEncrypted,
        assessmentEncrypted: existingNote.assessmentEncrypted,
        planEncrypted: existingNote.planEncrypted,
      },
      tenantId,
    );

    // Merge updates with existing data
    const updatedSections = {
      subjective: updateData.subjective ?? decryptedSections.subjective,
      objective: updateData.objective ?? decryptedSections.objective,
      assessment: updateData.assessment ?? decryptedSections.assessment,
      plan: updateData.plan ?? decryptedSections.plan,
    };

    // Re-encrypt all sections
    const encryptedSections = await this.encryptionService.encryptSoapSections(
      updatedSections,
      tenantId,
    );

    // Update with version increment
    const updatedNote = await this.prisma.clinicalNote.update({
      where: { id: noteId },
      data: {
        ...encryptedSections,
        sharedWithPatient: updateData.sharedWithPatient ?? existingNote.sharedWithPatient,
        version: { increment: 1 }, // Increment version
      },
    });

    this.logger.log(`Clinical note updated: ${noteId}, new version: ${updatedNote.version}`);

    return updatedNote;
  }

  /**
   * Find one clinical note by ID and decrypt
   * Task ID: T119
   * Per FR-050: Retrieve and decrypt note (audit log created by interceptor)
   */
  async findOne(
    noteId: string,
    tenantId: string,
    _userId: string,
  ): Promise<
    ClinicalNote & {
      subjective: string;
      objective: string;
      assessment: string;
      plan: string;
    }
  > {
    // Verify tenant isolation
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, tenantId },
      include: {
        appointment: {
          include: {
            patient: true,
            practitioner: true,
          },
        },
      },
    });

    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    // Decrypt SOAP sections
    const decryptedSections = await this.encryptionService.decryptSoapSections(
      {
        subjectiveEncrypted: note.subjectiveEncrypted,
        objectiveEncrypted: note.objectiveEncrypted,
        assessmentEncrypted: note.assessmentEncrypted,
        planEncrypted: note.planEncrypted,
      },
      tenantId,
    );

    // Return note with decrypted sections
    return {
      ...note,
      ...decryptedSections,
    };
  }

  /**
   * Find all notes for a practitioner
   */
  async findAllForPractitioner(
    practitionerId: string,
    tenantId: string,
    options?: {
      limit?: number;
      offset?: number;
    },
  ): Promise<ClinicalNote[]> {
    const { limit = 50, offset = 0 } = options || {};

    const notes = await this.prisma.clinicalNote.findMany({
      where: { practitionerId, tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        appointment: {
          include: {
            patient: true,
          },
        },
      },
    });

    return notes;
  }

  /**
   * Find note by appointment ID
   */
  async findByAppointment(appointmentId: string, tenantId: string): Promise<ClinicalNote | null> {
    const note = await this.prisma.clinicalNote.findFirst({
      where: { appointmentId, tenantId },
    });

    return note;
  }

  /**
   * Generate PDF export of clinical note
   * Task ID: T118
   * Per FR-047: Generate PDF for practitioners
   */
  async generatePDF(noteId: string, tenantId: string, userId: string): Promise<Buffer> {
    // Retrieve and decrypt note
    const note = await this.findOne(noteId, tenantId, userId);

    // Prepare PDF data
    const pdfData = {
      practitionerName: note.appointment.practitioner.fullName,
      practitionerLicense: note.appointment.practitioner.licenseNumber || undefined,
      patientName: note.appointment.patient.fullName,
      appointmentDate: note.appointment.startTime,
      subjective: note.subjective,
      objective: note.objective,
      assessment: note.assessment,
      plan: note.plan,
      createdAt: note.createdAt,
      version: note.version,
    };

    // Generate PDF
    const pdfBuffer = await this.pdfService.generateNotePDF(pdfData);

    this.logger.log(`PDF generated for note ${noteId}`);

    return pdfBuffer;
  }

  /**
   * AI-powered SOAP note completion
   * Task ID: T115, T116, T117
   * Per FR-044, FR-046: OpenAI autocompletion with PHI de-identification
   */
  async aiComplete(params: {
    partialNote: {
      subjective?: string;
      objective?: string;
      assessment?: string;
      plan?: string;
      soapSection: 'subjective' | 'objective' | 'assessment' | 'plan';
    };
    context: {
      patientName: string;
      appointmentDate: string;
    };
    userId: string;
    tenantId: string;
  }): Promise<{
    completion: string;
    soapSection: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    estimatedCost: number;
    phiDeidentified: boolean;
    hipaaCompliant: boolean;
    zeroRetention: boolean;
    timestamp: string;
  }> {
    // Delegate to AI service
    return this.aiService.generateSoapCompletion(params);
  }

  /**
   * Validate that appointment is in the past and belongs to tenant
   * Task ID: T125
   * Per FR-043: Notes can only be created for past appointments
   */
  private async validatePastAppointment(appointmentId: string, tenantId: string): Promise<void> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { id: appointmentId, tenantId },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    // Check if appointment is in the past
    if (appointment.startTime > new Date()) {
      throw new BadRequestException('Clinical notes can only be created for past appointments');
    }

    // Check if appointment is completed or no-show
    if (
      appointment.status !== AppointmentStatus.COMPLETED &&
      appointment.status !== AppointmentStatus.NO_SHOW
    ) {
      throw new BadRequestException(
        `Clinical notes can only be created for completed or no-show appointments. Current status: ${appointment.status}`,
      );
    }
  }

  /**
   * Delete a clinical note (soft delete or hard delete based on policy)
   * Note: For HIPAA compliance, deletion should be carefully controlled
   */
  async delete(noteId: string, tenantId: string, userId: string): Promise<void> {
    const note = await this.prisma.clinicalNote.findFirst({
      where: { id: noteId, tenantId },
    });

    if (!note) {
      throw new NotFoundException('Clinical note not found');
    }

    // Hard delete (in production, consider soft delete for audit purposes)
    await this.prisma.clinicalNote.delete({
      where: { id: noteId },
    });

    this.logger.log(`Clinical note deleted: ${noteId} by user ${userId}`);
  }

  /**
   * Get audit history for a clinical note
   * Task ID: T120
   * Per FR-050: Complete audit trail for PHI access
   */
  async getAuditHistory(noteId: string, tenantId: string): Promise<any[]> {
    const auditLogs = await this.prisma.auditEvent.findMany({
      where: {
        tenantId,
        entityType: 'ClinicalNote',
        entityId: noteId,
      },
      orderBy: { timestamp: 'asc' },
      include: {
        user: {
          select: {
            email: true,
            role: true,
          },
        },
      },
    });

    return auditLogs;
  }
}
