import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../../src/app.module';
import { PrismaService } from '../../../src/common/database/prisma.service';
import { AppointmentsService } from '../../../src/modules/appointments/appointments.service';

/**
 * Integration Test: Tenant Isolation on Appointments (T067)
 * Per Constitution Principle IV: Test-First for Healthcare
 *
 * This test MUST FAIL before implementation exists.
 * Tests Row-Level Security (RLS) enforcement for multi-tenant isolation.
 */
describe('Tenant Isolation on Appointments (Integration)', () => {
  let module: TestingModule;
  let prisma: PrismaService;
  let appointmentsService: AppointmentsService;
  let tenant1Id: string;
  let tenant2Id: string;
  let tenant1PatientId: string;
  let tenant2PatientId: string;
  let tenant1PractitionerId: string;
  let tenant2PractitionerId: string;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    prisma = module.get(PrismaService);
    appointmentsService = module.get(AppointmentsService);

    // Setup Tenant 1
    const tenant1 = await prisma.tenant.create({
      data: {
        practiceName: 'Clinic A',
        subscriptionPlan: 'BASIC',
      },
    });
    tenant1Id = tenant1.id;

    const tenant1PractUser = await prisma.user.create({
      data: {
        tenantId: tenant1Id,
        email: 'practitioner1@test.com',
        role: 'PRACTITIONER',
        authProvider: 'auth0',
        authProviderId: 'auth0|pract1',
        mfaEnabled: true,
      },
    });

    const tenant1Practitioner = await prisma.practitioner.create({
      data: {
        userId: tenant1PractUser.id,
        tenantId: tenant1Id,
        fullName: 'Dr. Jane Smith',
        specialty: 'Physical Therapy',
      },
    });
    tenant1PractitionerId = tenant1Practitioner.id;

    const tenant1Patient = await prisma.patient.create({
      data: {
        tenantId: tenant1Id,
        fullName: 'John Doe',
        dateOfBirth: new Date('1990-01-01'),
        phone: '+1234567890',
        email: 'patient1@test.com',
        emergencyContactName: 'Jane Doe',
        emergencyContactPhone: '+1234567891',
        emergencyContactRelationship: 'Spouse',
      },
    });
    tenant1PatientId = tenant1Patient.id;

    // Setup Tenant 2
    const tenant2 = await prisma.tenant.create({
      data: {
        practiceName: 'Clinic B',
        subscriptionPlan: 'PROFESSIONAL',
      },
    });
    tenant2Id = tenant2.id;

    const tenant2PractUser = await prisma.user.create({
      data: {
        tenantId: tenant2Id,
        email: 'practitioner2@test.com',
        role: 'PRACTITIONER',
        authProvider: 'auth0',
        authProviderId: 'auth0|pract2',
        mfaEnabled: true,
      },
    });

    const tenant2Practitioner = await prisma.practitioner.create({
      data: {
        userId: tenant2PractUser.id,
        tenantId: tenant2Id,
        fullName: 'Dr. Bob Johnson',
        specialty: 'Massage Therapy',
      },
    });
    tenant2PractitionerId = tenant2Practitioner.id;

    const tenant2Patient = await prisma.patient.create({
      data: {
        tenantId: tenant2Id,
        fullName: 'Alice Smith',
        dateOfBirth: new Date('1992-02-02'),
        phone: '+1234567892',
        email: 'patient2@test.com',
        emergencyContactName: 'Bob Smith',
        emergencyContactPhone: '+1234567893',
        emergencyContactRelationship: 'Spouse',
      },
    });
    tenant2PatientId = tenant2Patient.id;
  });

  afterAll(async () => {
    // Clean up Tenant 1
    await prisma.appointment.deleteMany({ where: { tenantId: tenant1Id } });
    await prisma.patient.deleteMany({ where: { tenantId: tenant1Id } });
    await prisma.practitioner.deleteMany({ where: { tenantId: tenant1Id } });
    await prisma.user.deleteMany({ where: { tenantId: tenant1Id } });
    await prisma.tenant.delete({ where: { id: tenant1Id } });

    // Clean up Tenant 2
    await prisma.appointment.deleteMany({ where: { tenantId: tenant2Id } });
    await prisma.patient.deleteMany({ where: { tenantId: tenant2Id } });
    await prisma.practitioner.deleteMany({ where: { tenantId: tenant2Id } });
    await prisma.user.deleteMany({ where: { tenantId: tenant2Id } });
    await prisma.tenant.delete({ where: { id: tenant2Id } });

    await module.close();
  });

  describe('RLS Policy Enforcement', () => {
    it('should only return appointments for the current tenant', async () => {
      // Set Tenant 1 context
      await prisma.setTenantContext(tenant1Id);

      // Create appointment for Tenant 1
      const tenant1Appointment = await appointmentsService.create({
        patientId: tenant1PatientId,
        practitionerId: tenant1PractitionerId,
        startTime: new Date('2025-01-06T10:00:00Z'),
        endTime: new Date('2025-01-06T11:00:00Z'),
        tenantId: tenant1Id,
      });

      // Switch to Tenant 2 context
      await prisma.setTenantContext(tenant2Id);

      // Create appointment for Tenant 2
      const tenant2Appointment = await appointmentsService.create({
        patientId: tenant2PatientId,
        practitionerId: tenant2PractitionerId,
        startTime: new Date('2025-01-06T10:00:00Z'),
        endTime: new Date('2025-01-06T11:00:00Z'),
        tenantId: tenant2Id,
      });

      // Verify appointments are isolated
      expect(tenant1Appointment.tenantId).toBe(tenant1Id);
      expect(tenant2Appointment.tenantId).toBe(tenant2Id);

      // Query as Tenant 1 - should only see Tenant 1 appointments
      await prisma.setTenantContext(tenant1Id);
      const tenant1Appointments = await prisma.appointment.findMany({
        where: { status: 'SCHEDULED' },
      });

      expect(tenant1Appointments.length).toBeGreaterThan(0);
      expect(tenant1Appointments.every((a: any) => a.tenantId === tenant1Id)).toBe(
        true,
      );

      // Query as Tenant 2 - should only see Tenant 2 appointments
      await prisma.setTenantContext(tenant2Id);
      const tenant2Appointments = await prisma.appointment.findMany({
        where: { status: 'SCHEDULED' },
      });

      expect(tenant2Appointments.length).toBeGreaterThan(0);
      expect(tenant2Appointments.every((a: any) => a.tenantId === tenant2Id)).toBe(
        true,
      );
    });

    it('should prevent cross-tenant appointment queries', async () => {
      // Set Tenant 1 context
      await prisma.setTenantContext(tenant1Id);

      // Create Tenant 1 appointment
      const tenant1Appointment = await appointmentsService.create({
        patientId: tenant1PatientId,
        practitionerId: tenant1PractitionerId,
        startTime: new Date('2025-01-07T10:00:00Z'),
        endTime: new Date('2025-01-07T11:00:00Z'),
        tenantId: tenant1Id,
      });

      // Switch to Tenant 2 context
      await prisma.setTenantContext(tenant2Id);

      // Attempt to query Tenant 1 appointment by ID
      const result = await prisma.appointment.findUnique({
        where: { id: tenant1Appointment.id },
      });

      // RLS should prevent access - result should be null
      expect(result).toBeNull();
    });

    it('should prevent cross-tenant appointment updates', async () => {
      // Set Tenant 1 context and create appointment
      await prisma.setTenantContext(tenant1Id);
      const tenant1Appointment = await appointmentsService.create({
        patientId: tenant1PatientId,
        practitionerId: tenant1PractitionerId,
        startTime: new Date('2025-01-08T10:00:00Z'),
        endTime: new Date('2025-01-08T11:00:00Z'),
        tenantId: tenant1Id,
      });

      // Switch to Tenant 2 context
      await prisma.setTenantContext(tenant2Id);

      // Attempt to update Tenant 1 appointment
      await expect(
        prisma.appointment.update({
          where: { id: tenant1Appointment.id },
          data: { status: 'CANCELLED' },
        }),
      ).rejects.toThrow(); // RLS prevents update
    });

    it('should prevent cross-tenant appointment deletion', async () => {
      // Set Tenant 1 context and create appointment
      await prisma.setTenantContext(tenant1Id);
      const tenant1Appointment = await appointmentsService.create({
        patientId: tenant1PatientId,
        practitionerId: tenant1PractitionerId,
        startTime: new Date('2025-01-09T10:00:00Z'),
        endTime: new Date('2025-01-09T11:00:00Z'),
        tenantId: tenant1Id,
      });

      // Switch to Tenant 2 context
      await prisma.setTenantContext(tenant2Id);

      // Attempt to delete Tenant 1 appointment
      await expect(
        prisma.appointment.delete({
          where: { id: tenant1Appointment.id },
        }),
      ).rejects.toThrow(); // RLS prevents deletion
    });
  });

  describe('Service-Level Tenant Validation', () => {
    it('should validate tenantId matches authenticated user tenant', async () => {
      await prisma.setTenantContext(tenant1Id);

      // Attempt to create appointment for wrong tenant
      await expect(
        appointmentsService.create({
          patientId: tenant1PatientId,
          practitionerId: tenant1PractitionerId,
          startTime: new Date('2025-01-10T10:00:00Z'),
          endTime: new Date('2025-01-10T11:00:00Z'),
          tenantId: tenant2Id, // Wrong tenant!
        }),
      ).rejects.toThrow('Tenant mismatch');
    });

    it('should prevent cross-tenant patient-practitioner bookings', async () => {
      await prisma.setTenantContext(tenant1Id);

      // Attempt to book Tenant 1 patient with Tenant 2 practitioner
      await expect(
        appointmentsService.create({
          patientId: tenant1PatientId,
          practitionerId: tenant2PractitionerId, // Wrong tenant!
          startTime: new Date('2025-01-11T10:00:00Z'),
          endTime: new Date('2025-01-11T11:00:00Z'),
          tenantId: tenant1Id,
        }),
      ).rejects.toThrow('Patient and practitioner must belong to the same tenant');
    });
  });

  describe('Availability Query Isolation', () => {
    it('should only show availability for practitioners in the same tenant', async () => {
      await prisma.setTenantContext(tenant1Id);

      // Query availability for Tenant 1 practitioner
      const availability = await appointmentsService.getAvailability({
        practitionerId: tenant1PractitionerId,
        startDate: new Date('2025-01-06'),
        endDate: new Date('2025-01-10'),
        tenantId: tenant1Id,
      });

      expect(availability).toBeDefined();

      // Attempt to query availability for Tenant 2 practitioner from Tenant 1 context
      await expect(
        appointmentsService.getAvailability({
          practitionerId: tenant2PractitionerId, // Different tenant
          startDate: new Date('2025-01-06'),
          endDate: new Date('2025-01-10'),
          tenantId: tenant1Id,
        }),
      ).rejects.toThrow('Practitioner not found or access denied');
    });
  });
});
