import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { AppointmentsService } from '../../../src/modules/appointments/appointments.service';

/**
 * Integration Test: Double-Booking Prevention (T066)
 * Per Constitution Principle IV: Test-First for Healthcare
 *
 * This test MUST FAIL before implementation exists.
 * Tests concurrent booking attempts to ensure double-booking cannot occur.
 */
describe('Double-Booking Prevention (Integration)', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let appointmentsService: AppointmentsService;
  let tenantId: string;
  let patient1Id: string;
  let patient2Id: string;
  let practitionerId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = module.get(PrismaService);
    appointmentsService = module.get(AppointmentsService);

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

    const patient1 = await prisma.patient.create({
      data: {
        tenantId,
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phone: '+1234567890',
        email: 'patient1@test.com',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+1234567891',
        emergencyContactRelationship: 'Spouse',
      },
    });
    patient1Id = patient1.id;

    const patient2 = await prisma.patient.create({
      data: {
        tenantId,
        fullName: 'Alice Smith',
        dateOfBirth: new Date('1992-02-02'),
        phone: '+1234567892',
        email: 'patient2@test.com',
        emergencyContactName: 'Bob Smith',
        emergencyContactPhone: '+1234567893',
        emergencyContactRelationship: 'Spouse',
      },
    });
    patient2Id = patient2.id;

    await prisma.setTenantContext(tenantId);
  });

  afterAll(async () => {
    await prisma.appointment.deleteMany({ where: { tenantId } });
    await prisma.patient.deleteMany({ where: { tenantId } });
    await prisma.practitioner.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.delete({ where: { id: tenantId } });
    await module.close();
  });

  describe('Sequential Booking Prevention', () => {
    it('should prevent booking same time slot twice', async () => {
      const startTime = new Date('2025-01-06T10:00:00Z');
      const endTime = new Date('2025-01-06T11:00:00Z');

      // First booking succeeds
      const appointment1 = await appointmentsService.create({
        patientId: patient1Id,
        practitionerId,
        startTime,
        endTime,
        tenantId,
      });

      expect(appointment1).toHaveProperty('id');
      expect(appointment1.status).toBe('SCHEDULED');

      // Second booking for same time slot fails
      await expect(
        appointmentsService.create({
          patientId: patient2Id,
          practitionerId,
          startTime,
          endTime,
          tenantId,
        }),
      ).rejects.toThrow('time slot is already booked');
    });

    it('should prevent booking overlapping time slots', async () => {
      // Book 10:00-11:00
      await appointmentsService.create({
        patientId: patient1Id,
        practitionerId,
        startTime: new Date('2025-01-06T14:00:00Z'),
        endTime: new Date('2025-01-06T15:00:00Z'),
        tenantId,
      });

      // Attempt to book 10:30-11:30 (overlaps)
      await expect(
        appointmentsService.create({
          patientId: patient2Id,
          practitionerId,
          startTime: new Date('2025-01-06T14:30:00Z'),
          endTime: new Date('2025-01-06T15:30:00Z'),
          tenantId,
        }),
      ).rejects.toThrow('time slot is already booked');
    });

    it('should allow booking adjacent time slots', async () => {
      // Book 09:00-10:00
      const appointment1 = await appointmentsService.create({
        patientId: patient1Id,
        practitionerId,
        startTime: new Date('2025-01-07T09:00:00Z'),
        endTime: new Date('2025-01-07T10:00:00Z'),
        tenantId,
      });

      // Book 10:00-11:00 (starts exactly when previous ends)
      const appointment2 = await appointmentsService.create({
        patientId: patient2Id,
        practitionerId,
        startTime: new Date('2025-01-07T10:00:00Z'),
        endTime: new Date('2025-01-07T11:00:00Z'),
        tenantId,
      });

      expect(appointment1.id).toBeDefined();
      expect(appointment2.id).toBeDefined();
      expect(appointment1.id).not.toBe(appointment2.id);
    });
  });

  describe('Concurrent Booking Attempts', () => {
    it('should handle concurrent booking attempts with race condition', async () => {
      const startTime = new Date('2025-01-08T10:00:00Z');
      const endTime = new Date('2025-01-08T11:00:00Z');

      // Simulate concurrent booking attempts
      const promises = [
        appointmentsService.create({
          patientId: patient1Id,
          practitionerId,
          startTime,
          endTime,
          tenantId,
        }),
        appointmentsService.create({
          patientId: patient2Id,
          practitionerId,
          startTime,
          endTime,
          tenantId,
        }),
      ];

      // One should succeed, one should fail
      const results = await Promise.allSettled(promises);

      const successful = results.filter((r) => r.status === 'fulfilled');
      const failed = results.filter((r) => r.status === 'rejected');

      expect(successful.length).toBe(1);
      expect(failed.length).toBe(1);

      // Verify the failed one has correct error message
      expect((failed[0] as PromiseRejectedResult).reason.message).toContain(
        'time slot is already booked',
      );
    });

    it('should maintain data integrity during concurrent operations', async () => {
      const baseTime = new Date('2025-01-09T09:00:00Z');

      // Create multiple concurrent booking attempts for different slots
      const promises = Array.from({ length: 5 }, (_, i) => {
        const startTime = new Date(baseTime.getTime() + i * 60 * 60 * 1000);
        const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

        return appointmentsService.create({
          patientId: i % 2 === 0 ? patient1Id : patient2Id,
          practitionerId,
          startTime,
          endTime,
          tenantId,
        });
      });

      const results = await Promise.allSettled(promises);

      // All should succeed since they're different time slots
      const successful = results.filter((r) => r.status === 'fulfilled');
      expect(successful.length).toBe(5);

      // Verify no duplicates in database
      const appointments = await prisma.appointment.findMany({
        where: {
          practitionerId,
          startTime: { gte: baseTime },
          status: 'SCHEDULED',
        },
      });

      expect(appointments.length).toBe(5);

      // Verify unique time slots
      const uniqueStartTimes = new Set(
        appointments.map((a: any) => a.startTime.toISOString()),
      );
      expect(uniqueStartTimes.size).toBe(5);
    });
  });

  describe('Database Constraints', () => {
    it('should enforce unique constraint on (practitionerId, startTime, status)', async () => {
      // This tests that the database-level constraint works
      // even if application logic is bypassed

      const startTime = new Date('2025-01-10T10:00:00Z');
      const endTime = new Date('2025-01-10T11:00:00Z');

      // First create via service (normal flow)
      await appointmentsService.create({
        patientId: patient1Id,
        practitionerId,
        startTime,
        endTime,
        tenantId,
      });

      // Attempt direct database insert (bypassing service validation)
      await expect(
        prisma.appointment.create({
          data: {
            tenantId,
            patientId: patient2Id,
            practitionerId,
            startTime,
            endTime,
            status: 'SCHEDULED',
          },
        }),
      ).rejects.toThrow(); // Unique constraint violation
    });
  });
});
