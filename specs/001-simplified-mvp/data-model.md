# Data Model: Simplified MVP

**Feature**: 001-simplified-mvp
**Date**: 2025-11-06
**Status**: Complete

This document defines the database schema for the Patient & Studio Scheduler Simplified MVP using Prisma ORM with PostgreSQL 16.

---

## Overview

### Multi-Tenant Architecture

All entities (except `Tenant` itself) are **tenant-scoped** with a `tenantId` foreign key. Row-Level Security (RLS) policies enforce isolation at the database level.

### Security Model

- **Encryption at rest**: AWS RDS encryption (AES-256)
- **Field-level encryption**: SSN and payment card data using AWS KMS with per-tenant keys
- **Row-Level Security**: PostgreSQL RLS policies on all tenant-scoped tables
- **Audit trail**: All PHI access logged to `AuditEvent` table and CloudWatch

### Relationships

```
Tenant
  ├── User (1:N)
  ├── Patient (1:N)
  ├── Practitioner (1:N)
  ├── Appointment (1:N)
  ├── ClinicalNote (1:N)
  ├── Invoice (1:N)
  └── AuditEvent (1:N)

Patient
  ├── Allergy (1:N)
  ├── Medication (1:N)
  ├── Appointment (1:N)
  └── Invoice (1:N)

Practitioner (extends User)
  ├── Appointment (1:N)
  └── ClinicalNote (1:N)

Appointment
  ├── ClinicalNote (1:1, optional)
  ├── Invoice (1:1, optional)
  └── WaitlistEntry (1:N)
```

---

## Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  extensions = [uuid_ossp(schema: "extensions")]
}

// =============================================================================
// Core Multi-Tenant Schema
// =============================================================================

model Tenant {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  practiceName      String   @map("practice_name") @db.VarChar(255)
  subscriptionPlan  SubscriptionPlan @default(FREE) @map("subscription_plan")
  status            TenantStatus @default(ACTIVE)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relationships
  users             User[]
  patients          Patient[]
  practitioners     Practitioner[]
  appointments      Appointment[]
  waitlistEntries   WaitlistEntry[]
  clinicalNotes     ClinicalNote[]
  invoices          Invoice[]
  auditEvents       AuditEvent[]

  @@map("tenants")
}

enum SubscriptionPlan {
  FREE
  BASIC
  PROFESSIONAL
  ENTERPRISE
}

enum TenantStatus {
  ACTIVE
  SUSPENDED
  CANCELLED
}

// =============================================================================
// User Management & Authentication
// =============================================================================

model User {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  email             String   @db.VarChar(255)
  role              UserRole
  authProvider      String   @default("auth0") @map("auth_provider") @db.VarChar(50)
  authProviderId    String   @map("auth_provider_id") @db.VarChar(255)
  mfaEnabled        Boolean  @default(false) @map("mfa_enabled")
  status            UserStatus @default(ACTIVE)
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")
  lastLoginAt       DateTime? @map("last_login_at")

  // Relationships
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  practitioner      Practitioner?
  auditEvents       AuditEvent[]

  @@unique([tenantId, email], name: "unique_email_per_tenant")
  @@index([tenantId])
  @@index([authProviderId])
  @@map("users")
}

enum UserRole {
  ADMIN
  PRACTITIONER
  PATIENT
}

enum UserStatus {
  ACTIVE
  LOCKED
  DELETED
}

model Practitioner {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  userId            String   @unique @map("user_id") @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  fullName          String   @map("full_name") @db.VarChar(255)
  specialty         String?  @db.VarChar(255)
  licenseNumber     String?  @map("license_number") @db.VarChar(100)
  availableHours    Json?    @map("available_hours") // JSON: { "monday": [{"start": "09:00", "end": "17:00"}], ... }
  calendarToken     String?  @unique @map("calendar_token") @db.VarChar(64) // iCal export token
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relationships
  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  appointments      Appointment[]
  clinicalNotes     ClinicalNote[]

  @@index([tenantId])
  @@map("practitioners")
}

// =============================================================================
// Patient Management
// =============================================================================

model Patient {
  id                        String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  tenantId                  String   @map("tenant_id") @db.Uuid
  fullName                  String   @map("full_name") @db.VarChar(255)
  dateOfBirth               DateTime @map("date_of_birth") @db.Date
  phone                     String   @db.VarChar(50)
  email                     String   @db.VarChar(255)
  emergencyContactName      String   @map("emergency_contact_name") @db.VarChar(255)
  emergencyContactPhone     String   @map("emergency_contact_phone") @db.VarChar(50)
  emergencyContactRelationship String @map("emergency_contact_relationship") @db.VarChar(100)
  ssnEncrypted              String?  @map("ssn_encrypted") @db.Text // Field-level encrypted
  createdAt                 DateTime @default(now()) @map("created_at")
  updatedAt                 DateTime @updatedAt @map("updated_at")

  // Relationships
  tenant                    Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  allergies                 Allergy[]
  medications               Medication[]
  appointments              Appointment[]
  invoices                  Invoice[]

  @@unique([tenantId, email], name: "unique_patient_email_per_tenant")
  @@index([tenantId])
  @@index([tenantId, fullName])
  @@map("patients")
}

model Allergy {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  patientId         String   @map("patient_id") @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  allergen          String   @db.VarChar(255)
  reaction          String?  @db.Text
  severity          AllergySeverity
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relationships
  patient           Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([patientId])
  @@map("allergies")
}

enum AllergySeverity {
  MILD
  MODERATE
  SEVERE
  LIFE_THREATENING
}

model Medication {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  patientId         String   @map("patient_id") @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  medicationName    String   @map("medication_name") @db.VarChar(255)
  dosage            String?  @db.VarChar(100)
  frequency         String?  @db.VarChar(100)
  prescribingProvider String? @map("prescribing_provider") @db.VarChar(255)
  startDate         DateTime? @map("start_date") @db.Date
  endDate           DateTime? @map("end_date") @db.Date
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relationships
  patient           Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([patientId])
  @@map("medications")
}

// =============================================================================
// Appointment Scheduling
// =============================================================================

model Appointment {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  patientId         String   @map("patient_id") @db.Uuid
  practitionerId    String   @map("practitioner_id") @db.Uuid
  startTime         DateTime @map("start_time")
  endTime           DateTime @map("end_time")
  status            AppointmentStatus @default(SCHEDULED)
  cancellationReason String? @map("cancellation_reason") @db.Text
  version           Int      @default(1) // Optimistic locking for double-booking prevention
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relationships
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patient           Patient  @relation(fields: [patientId], references: [id], onDelete: Cascade)
  practitioner      Practitioner @relation(fields: [practitionerId], references: [id], onDelete: Cascade)
  clinicalNote      ClinicalNote?
  invoice           Invoice?

  @@unique([practitionerId, startTime, status], name: "unique_practitioner_slot")
  @@index([tenantId])
  @@index([patientId])
  @@index([practitionerId, startTime])
  @@index([tenantId, startTime])
  @@map("appointments")
}

enum AppointmentStatus {
  SCHEDULED
  COMPLETED
  CANCELLED
  NO_SHOW
}

model WaitlistEntry {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  patientId         String   @map("patient_id") @db.Uuid
  practitionerId    String?  @map("practitioner_id") @db.Uuid // Optional: specific practitioner preference
  desiredDateStart  DateTime @map("desired_date_start")
  desiredDateEnd    DateTime @map("desired_date_end")
  status            WaitlistStatus @default(ACTIVE)
  createdAt         DateTime @default(now()) @map("created_at")
  notifiedAt        DateTime? @map("notified_at")
  claimedAt         DateTime? @map("claimed_at")

  // Relationships
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId, status, createdAt])
  @@index([practitionerId, status])
  @@map("waitlist_entries")
}

enum WaitlistStatus {
  ACTIVE
  CLAIMED
  EXPIRED
}

// =============================================================================
// Clinical Documentation
// =============================================================================

model ClinicalNote {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  appointmentId     String   @unique @map("appointment_id") @db.Uuid
  practitionerId    String   @map("practitioner_id") @db.Uuid

  // SOAP sections - field-level encrypted
  subjectiveEncrypted String @map("subjective_encrypted") @db.Text
  objectiveEncrypted  String @map("objective_encrypted") @db.Text
  assessmentEncrypted String @map("assessment_encrypted") @db.Text
  planEncrypted       String @map("plan_encrypted") @db.Text

  sharedWithPatient Boolean  @default(false) @map("shared_with_patient")
  version           Int      @default(1) // Versioning for audit trail
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relationships
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  appointment       Appointment @relation(fields: [appointmentId], references: [id], onDelete: Cascade)
  practitioner      Practitioner @relation(fields: [practitionerId], references: [id], onDelete: Restrict)

  @@index([tenantId])
  @@index([practitionerId])
  @@index([appointmentId])
  @@map("clinical_notes")
}

// =============================================================================
// Billing & Payments
// =============================================================================

model Invoice {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  patientId         String   @map("patient_id") @db.Uuid
  appointmentId     String   @unique @map("appointment_id") @db.Uuid
  invoiceNumber     String   @unique @map("invoice_number") @db.VarChar(50) // Format: INV-20251106-001
  amount            Int      // Amount in cents
  currency          String   @default("usd") @db.VarChar(3)
  status            InvoiceStatus @default(UNPAID)
  stripeInvoiceId   String?  @unique @map("stripe_invoice_id") @db.VarChar(255)
  stripePaymentIntentId String? @unique @map("stripe_payment_intent_id") @db.VarChar(255)
  paidAt            DateTime? @map("paid_at")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  // Relationships
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  patient           Patient  @relation(fields: [patientId], references: [id], onDelete: Restrict)
  appointment       Appointment @relation(fields: [appointmentId], references: [id], onDelete: Restrict)

  @@index([tenantId])
  @@index([patientId])
  @@index([tenantId, status])
  @@map("invoices")
}

enum InvoiceStatus {
  UNPAID
  PAID
  CANCELLED
  REFUNDED
}

// =============================================================================
// Audit Logging
// =============================================================================

model AuditEvent {
  id                String   @id @default(dbgenerated("extensions.uuid_generate_v4()")) @db.Uuid
  tenantId          String   @map("tenant_id") @db.Uuid
  userId            String?  @map("user_id") @db.Uuid
  eventType         AuditEventType @map("event_type")
  entityType        String?  @map("entity_type") @db.VarChar(50)
  entityId          String?  @map("entity_id") @db.Uuid
  action            AuditAction?
  beforeValue       Json?    @map("before_value")
  afterValue        Json?    @map("after_value")
  ipAddress         String?  @map("ip_address") @db.VarChar(45)
  userAgent         String?  @map("user_agent") @db.Text
  timestamp         DateTime @default(now())

  // Relationships
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  user              User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([tenantId, timestamp])
  @@index([userId, timestamp])
  @@index([eventType, timestamp])
  @@index([entityType, entityId])
  @@map("audit_events")
}

enum AuditEventType {
  PHI_ACCESS
  AUTH_EVENT
  ADMIN_ACTION
}

enum AuditAction {
  READ
  CREATE
  UPDATE
  DELETE
}
```

---

## Row-Level Security (RLS) Policies

These SQL policies are applied after Prisma migrations to enforce tenant isolation at the database level.

### Enable RLS on All Tenant-Scoped Tables

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
```

### Create Tenant Isolation Policies

```sql
-- Policy for users table
CREATE POLICY tenant_isolation_policy ON users
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON patients
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON practitioners
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON allergies
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON medications
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON appointments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON waitlist_entries
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON clinical_notes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON invoices
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON audit_events
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Bypass RLS for Superuser (Migrations/Admin)

```sql
-- Allow database owner to bypass RLS for migrations
ALTER TABLE users FORCE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
-- (repeat for all tables)

-- In application code, set tenant context before queries:
-- SET LOCAL app.current_tenant_id = '<tenant-uuid>';
```

---

## Entity Lifecycle & State Transitions

### Appointment State Machine

```
       ┌─────────────┐
       │  SCHEDULED  │ ─────────────────────┐
       └─────────────┘                      │
             │                              │
             │ (appointment time passes)    │ (cancel before appointment)
             │                              │
             ▼                              ▼
       ┌─────────────┐              ┌─────────────┐
       │  COMPLETED  │              │  CANCELLED  │
       └─────────────┘              └─────────────┘
             │
             │ (mark as no-show)
             │
             ▼
       ┌─────────────┐
       │   NO_SHOW   │
       └─────────────┘
```

**Transition Rules:**
- `SCHEDULED → COMPLETED`: Only after appointment `endTime` has passed, triggered by practitioner
- `SCHEDULED → CANCELLED`: Patient can cancel with 24h notice, practitioner can cancel anytime
- `SCHEDULED → NO_SHOW`: Only after appointment `startTime` + 15 minutes grace period
- **No backward transitions** allowed (e.g., cannot move from COMPLETED back to SCHEDULED)

### Invoice State Machine

```
       ┌─────────────┐
       │   UNPAID    │
       └─────────────┘
             │
             │ (Stripe payment success webhook)
             │
             ▼
       ┌─────────────┐              ┌─────────────┐
       │    PAID     │ ────────────▶│  REFUNDED   │
       └─────────────┘              └─────────────┘
             │                              ▲
             │                              │
             ▼                              │
       ┌─────────────┐                     │
       │  CANCELLED  │─────────────────────┘
       └─────────────┘
```

**Transition Rules:**
- `UNPAID → PAID`: Triggered by Stripe `invoice.paid` webhook
- `UNPAID → CANCELLED`: Practitioner can cancel unpaid invoice
- `PAID → REFUNDED`: Triggered by Stripe refund API call
- `CANCELLED → REFUNDED`: N/A (cannot refund cancelled invoice)

---

## Indexes & Query Optimization

### Critical Indexes

```sql
-- Tenant isolation (used by RLS)
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_patients_tenant_id ON patients(tenant_id);
CREATE INDEX idx_appointments_tenant_id ON appointments(tenant_id);
-- (repeat for all tenant-scoped tables)

-- Appointment scheduling queries
CREATE INDEX idx_appointments_practitioner_start_time
  ON appointments(practitioner_id, start_time)
  WHERE status = 'SCHEDULED';

CREATE INDEX idx_appointments_patient
  ON appointments(patient_id, start_time);

-- Waitlist queries
CREATE INDEX idx_waitlist_active
  ON waitlist_entries(tenant_id, status, created_at)
  WHERE status = 'ACTIVE';

-- Audit log queries
CREATE INDEX idx_audit_events_tenant_timestamp
  ON audit_events(tenant_id, timestamp DESC);

CREATE INDEX idx_audit_events_entity
  ON audit_events(entity_type, entity_id, timestamp DESC);

-- Patient search
CREATE INDEX idx_patients_name
  ON patients(tenant_id, full_name);

-- Invoice queries
CREATE INDEX idx_invoices_status
  ON invoices(tenant_id, status, created_at DESC);
```

### Query Performance Considerations

**Appointment Availability Query** (most frequent):
```sql
-- Find available slots for practitioner on a specific day
SELECT start_time, end_time
FROM appointments
WHERE practitioner_id = $1
  AND DATE(start_time) = $2
  AND status = 'SCHEDULED'
  AND tenant_id = current_setting('app.current_tenant_id')::uuid
ORDER BY start_time;

-- Index used: idx_appointments_practitioner_start_time
-- Expected: <10ms for 100 appointments
```

**Waitlist Notification Query** (on cancellation):
```sql
-- Find first waitlisted patient for specific date range
SELECT *
FROM waitlist_entries
WHERE tenant_id = current_setting('app.current_tenant_id')::uuid
  AND status = 'ACTIVE'
  AND practitioner_id = $1
  AND desired_date_start <= $2
  AND desired_date_end >= $2
ORDER BY created_at ASC
LIMIT 1;

-- Index used: idx_waitlist_active
-- Expected: <5ms for 1000 waitlist entries
```

---

## Data Retention & Deletion

### HIPAA Requirements

- **Medical records**: Retain for minimum 6 years (FR-053)
- **Audit logs**: Retain for 7 years (FR-046)
- **Inactive tenants**: Archive after 2 years of no logins

### Soft Delete Implementation

```prisma
// Add to all PHI-containing models
model Patient {
  // ... existing fields
  deletedAt DateTime? @map("deleted_at")
}

// Prisma middleware for soft delete
prisma.$use(async (params, next) => {
  if (params.model && params.action === 'delete') {
    // Change delete to update with deletedAt timestamp
    params.action = 'update';
    params.args.data = { deletedAt: new Date() };
  }

  if (params.action === 'findMany' || params.action === 'findFirst') {
    // Filter out soft-deleted records
    params.args.where = { ...params.args.where, deletedAt: null };
  }

  return next(params);
});
```

---

## Field-Level Encryption

### Encrypted Fields

**Patient Table:**
- `ssnEncrypted`: Social Security Number (if provided)

**ClinicalNote Table:**
- `subjectiveEncrypted`: SOAP Subjective section
- `objectiveEncrypted`: SOAP Objective section
- `assessmentEncrypted`: SOAP Assessment section
- `planEncrypted`: SOAP Plan section

### Encryption Pattern

```typescript
// Encryption service using AWS KMS
@Injectable()
export class EncryptionService {
  constructor(private kmsClient: KMSClient) {}

  async encryptField(value: string, tenantId: string): Promise<string> {
    const command = new EncryptCommand({
      KeyId: `alias/tenant-${tenantId}`, // Per-tenant KMS key
      Plaintext: Buffer.from(value, 'utf-8')
    });

    const response = await this.kmsClient.send(command);
    return Buffer.from(response.CiphertextBlob).toString('base64');
  }

  async decryptField(encrypted: string, tenantId: string): Promise<string> {
    const command = new DecryptCommand({
      KeyId: `alias/tenant-${tenantId}`,
      CiphertextBlob: Buffer.from(encrypted, 'base64')
    });

    const response = await this.kmsClient.send(command);
    return Buffer.from(response.Plaintext).toString('utf-8');
  }
}

// Prisma middleware for automatic encryption/decryption
prisma.$use(async (params, next) => {
  const encryptedFields = ['ssnEncrypted', 'subjectiveEncrypted', 'objectiveEncrypted', 'assessmentEncrypted', 'planEncrypted'];

  // Encrypt before create/update
  if ((params.action === 'create' || params.action === 'update') && params.args.data) {
    for (const field of encryptedFields) {
      if (params.args.data[field]) {
        const tenantId = params.args.data.tenantId || getCurrentTenantId();
        params.args.data[field] = await encryptionService.encryptField(
          params.args.data[field],
          tenantId
        );
      }
    }
  }

  const result = await next(params);

  // Decrypt after read
  if (result && (params.action === 'findFirst' || params.action === 'findMany' || params.action === 'findUnique')) {
    const records = Array.isArray(result) ? result : [result];

    for (const record of records) {
      for (const field of encryptedFields) {
        if (record[field]) {
          record[field] = await encryptionService.decryptField(
            record[field],
            record.tenantId
          );
        }
      }
    }
  }

  return result;
});
```

---

## Validation Rules

### Database Constraints

```sql
-- Email format validation
ALTER TABLE patients ADD CONSTRAINT check_email_format
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Phone number format (10 digits, optional dashes/spaces)
ALTER TABLE patients ADD CONSTRAINT check_phone_format
  CHECK (phone ~* '^\d{10}$|^\d{3}-\d{3}-\d{4}$|^\(\d{3}\) \d{3}-\d{4}$');

-- Date of birth (must be in the past, max 120 years old)
ALTER TABLE patients ADD CONSTRAINT check_dob_valid
  CHECK (date_of_birth < CURRENT_DATE AND date_of_birth > CURRENT_DATE - INTERVAL '120 years');

-- Appointment times (end > start, duration between 15min and 4 hours)
ALTER TABLE appointments ADD CONSTRAINT check_appointment_duration
  CHECK (end_time > start_time AND end_time - start_time BETWEEN INTERVAL '15 minutes' AND INTERVAL '4 hours');

-- Invoice amount (positive, max $10,000)
ALTER TABLE invoices ADD CONSTRAINT check_invoice_amount
  CHECK (amount > 0 AND amount <= 1000000); -- $10,000 in cents
```

### Application-Level Validation (Prisma + Class Validator)

```typescript
// DTOs with class-validator decorators
export class CreatePatientDto {
  @IsString()
  @Length(1, 255)
  fullName: string;

  @IsDate()
  @IsPast()
  @MaxDate(() => new Date(Date.now() - 18 * 365 * 24 * 60 * 60 * 1000)) // Must be 18+ for self-registration
  dateOfBirth: Date;

  @IsEmail()
  email: string;

  @Matches(/^\d{10}$|^\d{3}-\d{3}-\d{4}$/)
  phone: string;

  @IsString()
  @Length(1, 255)
  emergencyContactName: string;

  @Matches(/^\d{10}$|^\d{3}-\d{3}-\d{4}$/)
  emergencyContactPhone: string;

  @IsString()
  @Length(1, 100)
  emergencyContactRelationship: string;
}
```

---

## Sample Data for Testing

```typescript
// Seed script for development/testing
async function seed() {
  // Create test tenant
  const tenant = await prisma.tenant.create({
    data: {
      practiceName: 'Maya Wellness Clinic',
      subscriptionPlan: 'BASIC',
      status: 'ACTIVE'
    }
  });

  // Create practitioner user
  const practitionerUser = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'maya@wellnessclinic.com',
      role: 'PRACTITIONER',
      authProviderId: 'auth0|test-practitioner',
      mfaEnabled: true,
      status: 'ACTIVE'
    }
  });

  // Create practitioner profile
  const practitioner = await prisma.practitioner.create({
    data: {
      userId: practitionerUser.id,
      tenantId: tenant.id,
      fullName: 'Dr. Maya Thompson',
      specialty: 'Physical Therapy',
      licenseNumber: 'PT-12345',
      availableHours: {
        monday: [{ start: '09:00', end: '17:00' }],
        tuesday: [{ start: '09:00', end: '17:00' }],
        wednesday: [{ start: '09:00', end: '17:00' }],
        thursday: [{ start: '09:00', end: '17:00' }],
        friday: [{ start: '09:00', end: '15:00' }]
      }
    }
  });

  // Create test patient
  const patient = await prisma.patient.create({
    data: {
      tenantId: tenant.id,
      fullName: 'John Doe',
      dateOfBirth: new Date('1985-05-15'),
      phone: '555-0123',
      email: 'john.doe@example.com',
      emergencyContactName: 'Jane Doe',
      emergencyContactPhone: '555-0124',
      emergencyContactRelationship: 'Spouse'
    }
  });

  // Create test allergy
  await prisma.allergy.create({
    data: {
      patientId: patient.id,
      tenantId: tenant.id,
      allergen: 'Penicillin',
      reaction: 'Severe rash and breathing difficulty',
      severity: 'LIFE_THREATENING'
    }
  });

  // Create test appointment
  const appointment = await prisma.appointment.create({
    data: {
      tenantId: tenant.id,
      patientId: patient.id,
      practitionerId: practitioner.id,
      startTime: new Date('2025-11-10T10:00:00Z'),
      endTime: new Date('2025-11-10T11:00:00Z'),
      status: 'SCHEDULED'
    }
  });

  console.log('Seed data created successfully');
}
```

---

## Summary

### Key Design Decisions

1. **Multi-Tenant with RLS**: PostgreSQL Row-Level Security enforces isolation at database level, validated by application-level checks
2. **Field-Level Encryption**: AWS KMS with per-tenant keys for SSN and SOAP notes
3. **Optimistic Locking**: `version` field on Appointment prevents double-booking race conditions
4. **Soft Delete**: PHI records marked deleted (not hard-deleted) to maintain audit trail
5. **UUID Primary Keys**: Globally unique, non-sequential IDs prevent enumeration attacks
6. **Comprehensive Indexing**: Tenant-scoped indexes optimize query performance with RLS
7. **State Machines**: Explicit status enums with documented transition rules prevent invalid states
8. **Audit Trail**: Every entity change logged to `AuditEvent` table + CloudWatch

### Next Steps

1. Initialize Prisma: `npx prisma init`
2. Apply schema: `npx prisma migrate dev --name init`
3. Apply RLS policies: Run SQL scripts in `database/rls-policies/`
4. Generate Prisma Client: `npx prisma generate`
5. Seed test data: `npx prisma db seed`
6. Verify RLS: Run integration tests for tenant isolation

### Files to Create

- `backend/prisma/schema.prisma` (this schema)
- `backend/database/rls-policies/01-enable-rls.sql`
- `backend/database/rls-policies/02-tenant-isolation.sql`
- `backend/database/seeds/dev.seed.ts`
- `backend/src/common/encryption/encryption.service.ts`
- `backend/src/common/tenant/tenant.context.ts`
