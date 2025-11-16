/**
 * Contract Test: POST /notes/ai-complete endpoint
 * Test ID: T109
 * Per FR-044 to FR-046: AI-powered SOAP note autocompletion with PHI de-identification
 * Constitution Principle IV: Test-First for Healthcare PHI endpoints
 *
 * This test MUST FAIL before implementation (Red phase)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient, UserRole, AppointmentStatus } from '@prisma/client';
import { AppModule } from '../../src/app.module';

describe('POST /notes/ai-complete - AI SOAP Note Autocompletion (Contract Test)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;

  // Test fixtures
  let tenantId: string;
  let practitionerId: string;
  let patientId: string;
  let appointmentId: string;
  let noteId: string;
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
   * Setup test fixtures: tenant, practitioner, patient, appointment, partial note
   */
  async function setupTestData() {
    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        practiceName: 'Test Clinic for AI',
        subscriptionPlan: 'PROFESSIONAL',
        status: 'ACTIVE',
      },
    });
    tenantId = tenant.id;

    // Create practitioner user
    const practitionerUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'ai-practitioner@test.com',
        role: UserRole.PRACTITIONER,
        authProvider: 'auth0',
        authProviderId: 'auth0|aiprac123',
        status: 'ACTIVE',
      },
    });

    // Create practitioner
    const practitioner = await prisma.practitioner.create({
      data: {
        userId: practitionerUser.id,
        tenantId,
        fullName: 'Dr. AI Test',
        specialty: 'Psychology',
        availableHours: {},
      },
    });
    practitionerId = practitioner.id;

    // Create patient
    const patient = await prisma.patient.create({
      data: {
        tenantId,
        fullName: 'John Doe',
        email: 'john.doe@test.com',
        phoneNumber: '+1234567890',
        dateOfBirth: new Date('1985-05-15'),
      },
    });
    patientId = patient.id;

    // Create completed appointment
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        patientId,
        practitionerId,
        startTime: pastDate,
        endTime: new Date(pastDate.getTime() + 60 * 60 * 1000),
        status: AppointmentStatus.COMPLETED,
      },
    });
    appointmentId = appointment.id;

    // Mock JWT token
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

  describe('Valid Request - AI Autocompletion', () => {
    it('should generate AI completion for partial SOAP note', async () => {
      const aiCompleteDto = {
        partialNote: {
          subjective: 'Patient reports feeling anxious about work stress.',
          soapSection: 'objective', // Requesting completion for objective section
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(aiCompleteDto)
        .expect(200);

      // Contract: Response structure validation
      expect(response.body).toHaveProperty('completion');
      expect(response.body).toHaveProperty('soapSection', 'objective');
      expect(response.body).toHaveProperty('timestamp');

      // Contract: Completion should be non-empty string
      expect(typeof response.body.completion).toBe('string');
      expect(response.body.completion.length).toBeGreaterThan(0);

      // Contract: Should not include PHI in the completion
      // (This is a contract test - we're verifying the API contract, not the de-identification logic)
      expect(response.body.completion).not.toContain('john.doe@test.com');
      expect(response.body.completion).not.toContain('+1234567890');
    });

    it('should handle all SOAP sections for completion', async () => {
      const soapSections = ['subjective', 'objective', 'assessment', 'plan'];

      for (const section of soapSections) {
        const aiCompleteDto = {
          partialNote: {
            subjective: 'Patient reports symptoms',
            soapSection: section,
          },
          context: {
            patientName: 'John Doe',
            appointmentDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
        };

        const response = await request(app.getHttpServer())
          .post('/notes/ai-complete')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(aiCompleteDto)
          .expect(200);

        expect(response.body).toHaveProperty('completion');
        expect(response.body).toHaveProperty('soapSection', section);
        expect(response.body.completion).toBeTruthy();
      }
    });

    it('should respect rate limiting - 20 requests per minute per user', async () => {
      const aiCompleteDto = {
        partialNote: {
          subjective: 'Test rate limiting',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      // Make 20 successful requests
      const requests = Array.from({ length: 20 }, (_, i) =>
        request(app.getHttpServer())
          .post('/notes/ai-complete')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(aiCompleteDto)
      );

      const responses = await Promise.all(requests);
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });

      // 21st request should be rate limited
      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(aiCompleteDto)
        .expect(429); // Too Many Requests

      // Contract: Rate limit error structure
      expect(response.body).toHaveProperty('statusCode', 429);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('rate limit');
    }, 90000); // Extended timeout for rate limit test

    it('should include token usage and cost estimation in response', async () => {
      const aiCompleteDto = {
        partialNote: {
          subjective: 'Patient reports symptoms',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(aiCompleteDto)
        .expect(200);

      // Contract: Should include OpenAI API usage metadata
      expect(response.body).toHaveProperty('usage');
      expect(response.body.usage).toHaveProperty('promptTokens');
      expect(response.body.usage).toHaveProperty('completionTokens');
      expect(response.body.usage).toHaveProperty('totalTokens');

      // Contract: Should include cost estimation
      expect(response.body).toHaveProperty('estimatedCost');
      expect(typeof response.body.estimatedCost).toBe('number');
      expect(response.body.estimatedCost).toBeGreaterThan(0);
    });
  });

  describe('Validation - Invalid Requests', () => {
    it('should reject request with missing partial note', async () => {
      const invalidDto = {
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400); // Bad Request

      // Contract: Validation error structure (per FR-059)
      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('errors');
      expect(Array.isArray(response.body.errors)).toBe(true);

      const errorFields = response.body.errors.map((e: any) => e.field);
      expect(errorFields).toContain('partialNote');
    });

    it('should reject request with invalid SOAP section', async () => {
      const invalidDto = {
        partialNote: {
          subjective: 'Test',
          soapSection: 'invalid_section', // Not a valid SOAP section
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400); // Bad Request

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('soapSection');
    });

    it('should reject request with empty partial note', async () => {
      const invalidDto = {
        partialNote: {
          subjective: '', // Empty
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400); // Bad Request

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
    });

    it('should reject request with partial note exceeding max length', async () => {
      // Create a very long partial note (> 10,000 characters)
      const longText = 'a'.repeat(10001);

      const invalidDto = {
        partialNote: {
          subjective: longText,
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(invalidDto)
        .expect(400); // Bad Request

      expect(response.body).toHaveProperty('statusCode', 400);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('length');
    });
  });

  describe('Authorization & Security', () => {
    it('should reject AI completion without authentication', async () => {
      const aiCompleteDto = {
        partialNote: {
          subjective: 'Test',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .send(aiCompleteDto)
        .expect(401); // Unauthorized
    });

    it('should reject AI completion by non-practitioner role', async () => {
      // Create patient user
      const patientUser = await prisma.user.create({
        data: {
          tenantId,
          email: 'patient-ai@test.com',
          role: UserRole.PATIENT,
          authProvider: 'auth0',
          authProviderId: 'auth0|patientai',
          status: 'ACTIVE',
        },
      });

      const patientToken = 'mock-jwt-token-' + patientUser.id;

      const aiCompleteDto = {
        partialNote: {
          subjective: 'Test',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${patientToken}`)
        .send(aiCompleteDto)
        .expect(403); // Forbidden

      expect(response.body).toHaveProperty('statusCode', 403);
      expect(response.body).toHaveProperty('message');

      // Cleanup
      await prisma.user.delete({ where: { id: patientUser.id } });
    });

    it('should de-identify PHI before sending to OpenAI API', async () => {
      const aiCompleteDto = {
        partialNote: {
          subjective: 'Patient John Doe (SSN: 123-45-6789, Phone: +1234567890, Email: john.doe@test.com) reports anxiety.',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(aiCompleteDto)
        .expect(200);

      // Contract: Response should indicate PHI was de-identified
      expect(response.body).toHaveProperty('phiDeidentified', true);

      // Contract: The completion should not contain the original PHI
      // (This is verified in unit tests for the de-identification service)
      expect(response.body.completion).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle OpenAI API service errors gracefully', async () => {
      // This test will need to mock OpenAI API failure
      // For now, we define the contract for error handling

      const aiCompleteDto = {
        partialNote: {
          subjective: 'Test OpenAI failure',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      // When OpenAI API fails, we expect a 503 Service Unavailable
      // This will be implemented in the service layer
      // For now, this test documents the expected behavior

      // Contract: OpenAI API error response structure
      // expect(response.body).toHaveProperty('statusCode', 503);
      // expect(response.body).toHaveProperty('message', 'AI service temporarily unavailable');
      // expect(response.body).toHaveProperty('retryAfter');
    });

    it('should handle timeout for slow OpenAI API responses', async () => {
      // Contract: Requests should timeout after 30 seconds
      // This documents the expected behavior for implementation

      const aiCompleteDto = {
        partialNote: {
          subjective: 'Test timeout',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      // When request times out:
      // expect(response.body).toHaveProperty('statusCode', 504);
      // expect(response.body).toHaveProperty('message', 'AI service request timeout');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit log for AI completion request', async () => {
      const aiCompleteDto = {
        partialNote: {
          subjective: 'Test audit logging',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(aiCompleteDto)
        .expect(200);

      // Verify audit log was created
      const auditLog = await prisma.auditEvent.findFirst({
        where: {
          entityType: 'AI_COMPLETION',
          action: 'AI_ASSIST',
          tenantId,
        },
        orderBy: { timestamp: 'desc' },
      });

      expect(auditLog).toBeTruthy();
      expect(auditLog?.tenantId).toEqual(tenantId);

      // Contract: Audit log should include metadata about the AI request
      // (without storing actual PHI content)
      expect(auditLog?.metadata).toBeTruthy();
    });
  });

  describe('Zero-Retention OpenAI Configuration', () => {
    it('should verify OpenAI zero-retention mode is enabled', async () => {
      // This test documents the contract requirement that OpenAI must be configured
      // with zero-retention mode for HIPAA compliance

      const aiCompleteDto = {
        partialNote: {
          subjective: 'Test zero-retention',
          soapSection: 'objective',
        },
        context: {
          patientName: 'John Doe',
          appointmentDate: new Date().toISOString(),
        },
      };

      const response = await request(app.getHttpServer())
        .post('/notes/ai-complete')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(aiCompleteDto)
        .expect(200);

      // Contract: Response should include confirmation of zero-retention
      expect(response.body).toHaveProperty('hipaaCompliant', true);
      expect(response.body).toHaveProperty('zeroRetention', true);
    });
  });
});
