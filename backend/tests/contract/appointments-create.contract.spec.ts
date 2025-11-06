import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/common/database/prisma.service';

/**
 * Contract Test: POST /appointments (T064)
 * Per Constitution Principle IV: Test-First for Healthcare
 *
 * This test MUST FAIL before implementation exists.
 * Verifies appointment creation API contract.
 */
describe('POST /appointments (Contract)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
  let patientId: string;
  let practitionerId: string;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Setup test data
    const tenant = await prisma.tenant.create({
      data: {
        practiceName: 'Test Clinic',
        subscriptionPlan: 'BASIC',
      },
    });
    tenantId = tenant.id;

    const practUser = await prisma.user.create({
      data: {
        tenantId,
        email: 'practitioner@test.com',
        role: 'PRACTITIONER',
        authProvider: 'auth0',
        authProviderId: 'auth0|pract123',
        mfaEnabled: true,
      },
    });

    const practitioner = await prisma.practitioner.create({
      data: {
        userId: practUser.id,
        tenantId,
        fullName: 'Dr. Jane Smith',
        specialty: 'Physical Therapy',
      },
    });
    practitionerId = practitioner.id;

    const patient = await prisma.patient.create({
      data: {
        tenantId,
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phone: '+1234567890',
        email: 'patient@test.com',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+1234567891',
        emergencyContactRelationship: 'Spouse',
      },
    });
    patientId = patient.id;

    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { tenantId } });
    await prisma.patient.deleteMany({ where: { tenantId } });
    await prisma.practitioner.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  describe('Request Validation', () => {
    it('should require patientId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          practitionerId,
          startTime: '2025-01-06T10:00:00Z',
          endTime: '2025-01-06T11:00:00Z',
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'patientId' }),
        ]),
      );
    });

    it('should require practitionerId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          startTime: '2025-01-06T10:00:00Z',
          endTime: '2025-01-06T11:00:00Z',
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'practitionerId' }),
        ]),
      );
    });

    it('should require startTime', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          practitionerId,
          endTime: '2025-01-06T11:00:00Z',
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'startTime' }),
        ]),
      );
    });

    it('should require endTime', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          practitionerId,
          startTime: '2025-01-06T10:00:00Z',
        })
        .expect(400);

      expect(response.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'endTime' }),
        ]),
      );
    });

    it('should reject invalid UUID format', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId: 'invalid-uuid',
          practitionerId,
          startTime: '2025-01-06T10:00:00Z',
          endTime: '2025-01-06T11:00:00Z',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject invalid ISO 8601 datetime', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          practitionerId,
          startTime: 'invalid-date',
          endTime: '2025-01-06T11:00:00Z',
        })
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });

    it('should reject endTime before startTime', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          practitionerId,
          startTime: '2025-01-06T11:00:00Z',
          endTime: '2025-01-06T10:00:00Z',
        })
        .expect(400);

      expect(response.body.message).toContain('endTime must be after startTime');
    });
  });

  describe('Response Contract', () => {
    it('should return created appointment with correct schema', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          practitionerId,
          startTime: '2025-01-06T10:00:00Z',
          endTime: '2025-01-06T11:00:00Z',
        })
        .expect(201);

      // Verify response structure per OpenAPI spec
      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('patientId', patientId);
      expect(response.body).toHaveProperty('practitionerId', practitionerId);
      expect(response.body).toHaveProperty('startTime');
      expect(response.body).toHaveProperty('endTime');
      expect(response.body).toHaveProperty('status', 'SCHEDULED');
      expect(response.body).toHaveProperty('version', 1);
      expect(response.body).toHaveProperty('createdAt');

      // Verify UUID format
      expect(response.body.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );

      // Verify ISO 8601 datetime format
      expect(response.body.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(response.body.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should return 409 for double-booking same time slot', async () => {
      // First booking
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          practitionerId,
          startTime: '2025-01-06T14:00:00Z',
          endTime: '2025-01-06T15:00:00Z',
        })
        .expect(201);

      // Attempt double booking
      const response = await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          patientId,
          practitionerId,
          startTime: '2025-01-06T14:00:00Z',
          endTime: '2025-01-06T15:00:00Z',
        })
        .expect(409);

      expect(response.body.message).toContain('time slot is already booked');
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/appointments')
        .send({
          patientId,
          practitionerId,
          startTime: '2025-01-06T10:00:00Z',
          endTime: '2025-01-06T11:00:00Z',
        })
        .expect(401);
    });
  });
});
