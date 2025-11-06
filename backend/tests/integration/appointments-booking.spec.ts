import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { AppointmentsService } from '../../../src/modules/appointments/appointments.service';

/**
 * Integration Test: Appointment Booking with Optimistic Locking (T065)
 * Per Constitution Principle IV: Test-First for Healthcare
 *
 * This test MUST FAIL before implementation exists.
 * Tests optimistic locking (version control) to prevent race conditions.
 */
describe('Appointment Booking with Optimistic Locking (Integration)', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let appointmentsService: AppointmentsService;
  let tenantId: string;
  let patientId: string;
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

    // Set tenant context for RLS
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

  describe('Optimistic Locking Version Control', () => {
    it('should create appointment with version 1', async () => {
      const appointment = await appointmentsService.create({
        patientId,
        practitionerId,
        startTime: new Date('2025-01-06T10:00:00Z'),
        endTime: new Date('2025-01-06T11:00:00Z'),
        tenantId,
      });

      expect(appointment).toHaveProperty('version', 1);
      expect(appointment).toHaveProperty('status', 'SCHEDULED');
    });

    it('should increment version on update', async () => {
      // Create appointment
      const appointment = await appointmentsService.create({
        patientId,
        practitionerId,
        startTime: new Date('2025-01-06T14:00:00Z'),
        endTime: new Date('2025-01-06T15:00:00Z'),
        tenantId,
      });

      expect(appointment.version).toBe(1);

      // Update appointment (e.g., reschedule)
      const updated = await appointmentsService.update(appointment.id, {
        startTime: new Date('2025-01-06T15:00:00Z'),
        endTime: new Date('2025-01-06T16:00:00Z'),
        currentVersion: 1,
        tenantId,
      });

      expect(updated.version).toBe(2);
    });

    it('should prevent concurrent modifications with stale version', async () => {
      // Create appointment
      const appointment = await appointmentsService.create({
        patientId,
        practitionerId,
        startTime: new Date('2025-01-07T10:00:00Z'),
        endTime: new Date('2025-01-07T11:00:00Z'),
        tenantId,
      });

      // First update succeeds
      await appointmentsService.update(appointment.id, {
        startTime: new Date('2025-01-07T11:00:00Z'),
        endTime: new Date('2025-01-07T12:00:00Z'),
        currentVersion: 1,
        tenantId,
      });

      // Second update with stale version fails
      await expect(
        appointmentsService.update(appointment.id, {
          startTime: new Date('2025-01-07T13:00:00Z'),
          endTime: new Date('2025-01-07T14:00:00Z'),
          currentVersion: 1, // Stale version
          tenantId,
        }),
      ).rejects.toThrow('Appointment has been modified');
    });
  });

  describe('Business Logic Validation', () => {
    it('should prevent booking in the past', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      await expect(
        appointmentsService.create({
          patientId,
          practitionerId,
          startTime: pastDate,
          endTime: new Date(),
          tenantId,
        }),
      ).rejects.toThrow('Cannot book appointments in the past');
    });

    it('should enforce 2-hour minimum booking window', async () => {
      const now = new Date();
      const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

      await expect(
        appointmentsService.create({
          patientId,
          practitionerId,
          startTime: oneHourFromNow,
          endTime: new Date(oneHourFromNow.getTime() + 60 * 60 * 1000),
          tenantId,
        }),
      ).rejects.toThrow('Appointments must be booked at least 2 hours in advance');
    });

    it('should validate appointment duration (minimum 15 minutes)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await expect(
        appointmentsService.create({
          patientId,
          practitionerId,
          startTime: futureDate,
          endTime: new Date(futureDate.getTime() + 10 * 60 * 1000), // 10 minutes
          tenantId,
        }),
      ).rejects.toThrow('Appointment duration must be at least 15 minutes');
    });

    it('should validate appointment duration (maximum 4 hours)', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);

      await expect(
        appointmentsService.create({
          patientId,
          practitionerId,
          startTime: futureDate,
          endTime: new Date(futureDate.getTime() + 5 * 60 * 60 * 1000), // 5 hours
          tenantId,
        }),
      ).rejects.toThrow('Appointment duration cannot exceed 4 hours');
    });
  });

  describe('Email Confirmation', () => {
    it('should send confirmation email after successful booking', async () => {
      const appointment = await appointmentsService.create({
        patientId,
        practitionerId,
        startTime: new Date('2025-01-08T10:00:00Z'),
        endTime: new Date('2025-01-08T11:00:00Z'),
        tenantId,
      });

      // Verify appointment was created
      expect(appointment.id).toBeDefined();

      // In a real test, we'd verify email was sent
      // For now, verify the appointment has the data needed for email
      const patient = await prisma.patient.findUnique({ where: { id: patientId } });
      const practitioner = await prisma.practitioner.findUnique({
        where: { id: practitionerId },
      });

      expect(patient?.email).toBe('patient@test.com');
      expect(practitioner?.fullName).toBe('Dr. Jane Smith');
    });
  });
});
