import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/common/database/prisma.service';

/**
 * Contract Test: GET /appointments/availability (T063)
 * Per Constitution Principle IV: Test-First for Healthcare
 *
 * This test MUST FAIL before implementation exists.
 * Verifies API contract matches OpenAPI specification.
 */
describe('GET /appointments/availability (Contract)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantId: string;
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

    const user = await prisma.user.create({
      data: {
        tenantId,
        email: 'practitioner@test.com',
        role: 'PRACTITIONER',
        authProvider: 'auth0',
        authProviderId: 'auth0|test123',
        mfaEnabled: true,
      },
    });

    const practitioner = await prisma.practitioner.create({
      data: {
        userId: user.id,
        tenantId,
        fullName: 'Dr. Jane Smith',
        specialty: 'Physical Therapy',
        availableHours: {
          monday: [{ start: '09:00', end: '17:00' }],
          tuesday: [{ start: '09:00', end: '17:00' }],
          wednesday: [{ start: '09:00', end: '17:00' }],
          thursday: [{ start: '09:00', end: '17:00' }],
          friday: [{ start: '09:00', end: '17:00' }],
        },
      },
    });
    practitionerId = practitioner.id;

    // Mock auth token (in real test, use actual JWT)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    await prisma.practitioner.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await app.close();
  });

  describe('Query Parameters Validation', () => {
    it('should require practitionerId query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/appointments/availability')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('practitionerId');
    });

    it('should require startDate query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/appointments/availability')
        .query({ practitionerId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('startDate');
    });

    it('should require endDate query parameter', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/appointments/availability')
        .query({ practitionerId, startDate: '2025-01-01' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('endDate');
    });

    it('should reject invalid date format', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/appointments/availability')
        .query({
          practitionerId,
          startDate: 'invalid-date',
          endDate: '2025-01-07',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Response Contract', () => {
    it('should return availability with correct schema', async () => {
      const startDate = '2025-01-06'; // Monday
      const endDate = '2025-01-10'; // Friday

      const response = await request(app.getHttpServer())
        .get('/api/v1/appointments/availability')
        .query({ practitionerId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      // Verify response structure
      expect(response.body).toHaveProperty('availability');
      expect(Array.isArray(response.body.availability)).toBe(true);

      if (response.body.availability.length > 0) {
        const slot = response.body.availability[0];

        // Verify slot schema per OpenAPI spec
        expect(slot).toHaveProperty('date');
        expect(slot).toHaveProperty('startTime');
        expect(slot).toHaveProperty('endTime');
        expect(slot).toHaveProperty('available');
        expect(typeof slot.available).toBe('boolean');

        // Verify ISO 8601 date format
        expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(slot.startTime).toMatch(/^\d{2}:\d{2}$/);
        expect(slot.endTime).toMatch(/^\d{2}:\d{2}$/);
      }
    });

    it('should only return slots within practitioner available hours', async () => {
      const startDate = '2025-01-06'; // Monday
      const endDate = '2025-01-06';

      const response = await request(app.getHttpServer())
        .get('/api/v1/appointments/availability')
        .query({ practitionerId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const slots = response.body.availability;

      // All slots should be between 09:00 and 17:00
      slots.forEach((slot: any) => {
        const startHour = parseInt(slot.startTime.split(':')[0]);
        const endHour = parseInt(slot.endTime.split(':')[0]);

        expect(startHour).toBeGreaterThanOrEqual(9);
        expect(endHour).toBeLessThanOrEqual(17);
      });
    });

    it('should not return slots for weekends if not configured', async () => {
      const startDate = '2025-01-04'; // Saturday
      const endDate = '2025-01-05'; // Sunday

      const response = await request(app.getHttpServer())
        .get('/api/v1/appointments/availability')
        .query({ practitionerId, startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const slots = response.body.availability;

      // Should return empty array for weekends
      expect(slots).toEqual([]);
    });
  });

  describe('Authorization', () => {
    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/appointments/availability')
        .query({
          practitionerId,
          startDate: '2025-01-06',
          endDate: '2025-01-10',
        })
        .expect(401);
    });
  });
});
