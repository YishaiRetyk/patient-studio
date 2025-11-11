/**
 * Contract Test: POST /notes endpoint
 * Test ID: T108
 * Per FR-043 to FR-053: Clinical SOAP note creation with field-level encryption
 * Constitution Principle IV: Test-First for Healthcare PHI endpoints
 *
 * This test MUST FAIL before implementation (Red phase)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient, UserRole, AppointmentStatus } from '@prisma/client';
import { ClinicalNotesModule } from '../../src/modules/notes/notes.module';
import { AppModule } from '../../src/app.module';

describe('POST /notes - Create Clinical Note (Contract Test)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Test fixtures
  let tenantId: string;
  let practitionerId: string;
  let patientId: string;
  let appointmentId: string;
  let accessToken: string;

  beforeAll(async () => {
    prisma = new PrismaClient();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    // Cleanup test data
    await cleanupTestData();
    await prisma.$disconnect();
    await app.close();
  });

  /**
   * Setup test fixtures: tenant, practitioner, patient, completed appointment
   */
  async function setupTestData() {
    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        practiceName: 'Test Clinic for Notes',
        subscriptionPlan: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    // Create practitioner user
    const practitionerUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'practitioner@test.com',
        role: UserRole.PRACTITIONER,
        authProvider: 'auth0',
        authProviderId: 'auth0|practitioner123',
        status: 'ACTIVE',
      },
    });

    // Create practitioner
    const practitioner = await prisma.practitioner.create({
      data: {
        userId: practitionerUser.id,
        tenantId,
        fullName: 'Dr. Test Practitioner',
        specialty: 'Psychology',
        availableHours: {},
      },
    });
    practitionerId = practitioner.id;

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        tenantId,
        fullName: 'Test Patient',
        email: 'patient@test.com',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date('1990-01-01'),
      },
    });
    patientId = patient.id;

    // Create completed appointment (notes can only be created for past appointments)
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // Yesterday
    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        patientId,
        practitionerId,
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 60 * 60 * 1000), // 1 hour later
        status: AppointmentStatus.COMPLETED,
      },
    });
    appointmentId = appointment.id;

    // Mock JWT token (in real tests, this would come from Auth0 or test auth service)
    accessToken = 'mock-jwt-token-' + practitionerUser.id;
  }

  /**
   * Cleanup test fixtures
   */
  async function cleanupTestData() {
    await prisma.clinicalNote.deleteMany({ where: { tenantId } });
    await prisma.appointment.deleteMany({ where: { tenantId } });
    await prisma.patient.deleteMany({ where: { tenantId } });
    await prisma.practitioner.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
  }

  describe('Valid Request - SOAP Note Creation', () => {
    it('should create a clinical note with encrypted SOAP sections', async () => {
      const createNoteDto = {
        appointmentId,
        subjective: 'Patient reports improved mood and reduced anxiety over the past week.',
        objective: 'Patient appears calm and engaged. Speech is clear and organized.',
        assessment: 'Generalized anxiety disorder showing improvement with current treatment plan.',
        plan: 'Continue current therapy approach. Schedule follow-up in 2 weeks. Consider medication review.',
        sharedWithPatient: false,
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createNoteDto)
        .expect(201);

      // Contract: Response structure validation
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('appointmentId', appointmentId);
      expect(response.body).toHaveProperty('practitionerId', practitionerId);
      expect(response.body).toHaveProperty('tenantId', tenantId);

      // Contract: SOAP fields should NOT be returned in plaintext (security requirement)
      expect(response.body).not.toHaveProperty('subjective');
      expect(response.body).not.toHaveProperty('objective');
      expect(response.body).not.toHaveProperty('assessment');
      expect(response.body).not.toHaveProperty('plan');

      // Contract: Encrypted fields should exist in response
      expect(response.body).toHaveProperty('subjectiveEncrypted');
      expect(response.body).toHaveProperty('objectiveEncrypted');
      expect(response.body).toHaveProperty('assessmentEncrypted');
      expect(response.body).toHaveProperty('planEncrypted');

      // Contract: Metadata fields
      expect(response.body).toHaveProperty('sharedWithPatient', false);
      expect(response.body).toHaveProperty('version', 1);
      expect(response.body).toHaveProperty('createdAt');
      expect(response.body).toHaveProperty('updatedAt');

      // Verify encrypted values are not empty and different from plaintext
      expect(response.body.subjectiveEncrypted).toBeTruthy();
      expect(response.body.subjectiveEncrypted).not.toEqual(createNoteDto.subjective);

      // Verify note was persisted correctly in database
      const savedNote = await prisma.clinicalNote.findUnique({
        where: { id: response.body.id },
      });
      expect(savedNote).toBeTruthy();
      expect(savedNote?.appointmentId).toEqual(appointmentId);
    });

    it('should enforce one note per appointment constraint', async () => {
      // Create first note
      const createNoteDto = {
        appointmentId,
        subjective: 'First note',
        objective: 'First note objective',
        assessment: 'First note assessment',
        plan: 'First note plan',
      };

      await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createNoteDto)
        .expect(201);

      // Attempt to create second note for same appointment
      const duplicateNoteDto = {
        appointmentId,
        subjective: 'Second note (should fail)',
        objective: 'Second note objective',
        assessment: 'Second note assessment',
        plan: 'Second note plan',
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(duplicateNoteDto)
        .expect(409); // Conflict

      // Contract: Error response structure
      expect(response.body).toHaveProperty('statusCode', 409);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('already exists');
    });
  });

  describe('Validation - Invalid Requests', () => {
    it('should reject note creation for future appointments', async () => {
      // Create future appointment
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // Tomorrow
      const futureAppointment = await prisma.appointment.create({
        data: {
          tenantId,
          patientId,
          practitionerId,
          startTime: futureDate,
          endTime: new Date(futureDate.getTime() + 60 * 60 * 1000),
          status: AppointmentStatus.SCHEDULED,
        },
      });

      const createNoteDto = {
        appointmentId: futureAppointment.id,
        subjective: 'Should not be allowed',
        objective: 'Should not be allowed',
        assessment: 'Should not be allowed',
        plan: 'Should not be allowed',
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createNoteDto)
        .expect(400); // Bad Request

      // Contract: Error response structure
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('past appointment');

      // Cleanup
      await prisma.appointment.delete({ where: { id: futureAppointment.id } });
    });

    it('should reject note with missing required SOAP sections', async () => {
      const invalidNoteDto = {
        appointmentId,
        subjective: 'Has subjective',
        // Missing objective, assessment, plan
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidNoteDto)
        .expect(400); // Bad Request

      // Contract: Validation error structure (per FR-059)
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);

      // Should have errors for missing fields
      const errorFields = response.body.errors.map((e: any) => e.field);
      expect(errorFields).toContain('objective');
      expect(errorFields).toContain('assessment');
      expect(errorFields).toContain('plan');
    });

    it('should reject note with empty SOAP sections', async () => {
      const invalidNoteDto = {
        appointmentId,
        subjective: '',
        objective: '',
        assessment: '',
        plan: '',
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidNoteDto)
        .expect(400); // Bad Request

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject note for non-existent appointment', async () => {
      const fakeAppointmentId = '00000000-0000-0000-0000-000000000000';

      const createNoteDto = {
        appointmentId: fakeAppointmentId,
        subjective: 'Should not be allowed',
        objective: 'Should not be allowed',
        assessment: 'Should not be allowed',
        plan: 'Should not be allowed',
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createNoteDto)
        .expect(404); // Not Found

      expect(response.body).toHaveProperty('statusCode', 404);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Appointment not found');
    });
  });

  describe('Authorization & Tenant Isolation', () => {
    it('should reject note creation without authentication', async () => {
      const createNoteDto = {
        appointmentId,
        subjective: 'Should not be allowed',
        objective: 'Should not be allowed',
        assessment: 'Should not be allowed',
        plan: 'Should not be allowed',
      };

      await request(app.getHttpServer())
        .post('/notes')
        .send(createNoteDto)
        .expect(401); // Unauthorized
    });

    it('should reject note creation by non-practitioner role', async () => {
      // Create patient user
      const patientUser = await prisma.user.create({
        data: {
          tenantId,
          email: 'patient-user@test.com',
          role: UserRole.PATIENT,
          authProvider: 'auth0',
          authProviderId: 'auth0|patient123',
          status: 'ACTIVE',
        },
      });

      const patientToken = 'mock-jwt-token-' + patientUser.id;

      const createNoteDto = {
        appointmentId,
        subjective: 'Should not be allowed',
        objective: 'Should not be allowed',
        assessment: 'Should not be allowed',
        plan: 'Should not be allowed',
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(createNoteDto)
        .expect(403); // Forbidden

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body).toHaveProperty('message');

      // Cleanup
      await prisma.user.delete({ where: { id: patientUser.id } });
    });

    it('should enforce tenant isolation - reject cross-tenant note creation', async () => {
      // Create another tenant and appointment
      const otherTenant = await prisma.tenant.create({
        data: {
          practiceName: 'Other Clinic',
          subscriptionPlan: 'BASIC',
          status: 'ACTIVE',
        },
      });

      const otherPatient = await prisma.patient.create({
        data: {
          tenantId: otherTenant.id,
          fullName: 'Other Patient',
          email: 'other-patient@test.com',
          phoneNumber: '+9876543210',
          dateOfBirth: new Date('1985-01-01'),
        },
      });

      const otherPractitioner = await prisma.user.create({
        data: {
          tenantId: otherTenant.id,
          email: 'other-practitioner@test.com',
          role: UserRole.PRACTITIONER,
          authProvider: 'auth0',
          authProviderId: 'auth0|otherprac',
          status: 'ACTIVE',
          practitioner: {
            create: {
              tenantId: otherTenant.id,
              fullName: 'Dr. Other',
              specialty: 'Psychiatry',
              availableHours: {},
            },
          },
        },
        include: { practitioner: true },
      });

      const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const otherAppointment = await prisma.appointment.create({
        data: {
          tenantId: otherTenant.id,
          patientId: otherPatient.id,
          practitionerId: otherPractitioner.practitioner!.id,
          startTime: pastDate,
          endTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
          status: AppointmentStatus.COMPLETED,
        },
      });

      // Try to create note for other tenant's appointment using our practitioner's token
      const createNoteDto = {
        appointmentId: otherAppointment.id,
        subjective: 'Cross-tenant access attempt',
        objective: 'Should be blocked',
        assessment: 'Should be blocked',
        plan: 'Should be blocked',
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createNoteDto)
        .expect(403); // Forbidden

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body).toHaveProperty('message');

      // Cleanup
      await prisma.appointment.delete({ where: { id: otherAppointment.id } });
      await prisma.practitioner.delete({ where: { id: otherPractitioner.practitioner!.id } });
      await prisma.user.delete({ where: { id: otherPractitioner.id } });
      await prisma.patient.delete({ where: { id: otherPatient.id } });
      await prisma.tenant.delete({ where: { id: otherTenant.id } });
    });
  });

  describe('Audit Trail', () => {
    it('should create audit log entry for note creation', async () => {
      const createNoteDto = {
        appointmentId,
        subjective: 'Test for audit',
        objective: 'Test for audit',
        assessment: 'Test for audit',
        plan: 'Test for audit',
      };

      const response = await request(app.getHttpServer())
        .post('/notes')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createNoteDto)
        .expect(201);

      // Verify audit log was created
      const auditLog = await prisma.auditEvent.findFirst({
        where: {
          entityType: 'ClinicalNote',
          entityId: response.body.id,
          action: 'CREATE',
        },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog?.tenantId).toEqual(tenantId);
      expect(auditLog?.entityId).toEqual(response.body.id);
    });
  });
});
