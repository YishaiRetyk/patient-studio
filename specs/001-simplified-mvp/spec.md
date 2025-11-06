# Feature Specification: Simplified MVP for Patient & Studio Scheduler

**Feature Branch**: `001-simplified-mvp`
**Created**: 2025-11-06
**Status**: Draft
**Input**: User description: "Simplified MVP implementation for Patient & Studio Scheduler: user management with Auth0 + MFA, appointment scheduling with waitlist auto-fill, SOAP notes with AI autocompletion, Stripe billing, HIPAA compliance foundation. Simplified tech stack using AWS Fargate + RDS instead of Kubernetes + Aurora."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Patient Self-Service Appointment Booking (Priority: P1)

Maya (solo therapist) needs patients to book their own appointments online without phone calls or manual scheduling, reducing her administrative burden and filling her calendar efficiently.

**Why this priority**: This is the core value proposition - enabling self-service booking reduces therapist admin time by 70% and is the primary pain point for solo practitioners. Without this, the product has no value.

**Independent Test**: Create a test patient account, navigate to booking page, select a therapist and available time slot, complete booking, and receive confirmation email. Verify appointment appears in therapist's calendar view.

**Acceptance Scenarios**:

1. **Given** a patient has an account, **When** they view available appointment slots for their preferred therapist, **Then** they see only genuinely available times (no double-booking)
2. **Given** a patient selects an appointment time, **When** they complete the booking, **Then** they receive immediate email confirmation and the slot becomes unavailable to others
3. **Given** a patient needs to reschedule, **When** they cancel their appointment at least 24 hours in advance, **Then** the slot becomes available for waitlist auto-fill
4. **Given** multiple patients book simultaneously, **When** they select the same time slot, **Then** only the first completion succeeds and others see an error message

---

### User Story 2 - Practitioner Calendar Management & Scheduling (Priority: P2)

Maya (solo therapist) needs a clear calendar view of all appointments, the ability to set her availability, and automatic management of cancellations through a waitlist system to maximize utilization.

**Why this priority**: After enabling patient booking, practitioners need visibility and control. The waitlist auto-fill feature is a key differentiator that reduces no-shows and maximizes revenue.

**Independent Test**: Log in as practitioner, view calendar with existing appointments, set available hours, add a patient to waitlist, simulate a cancellation, and verify waitlisted patient is automatically notified and can claim the slot.

**Acceptance Scenarios**:

1. **Given** Maya logs into her practitioner dashboard, **When** she views her calendar, **Then** she sees all confirmed appointments with patient names, appointment types, and times
2. **Given** Maya has set her available hours (Mon-Fri 9am-5pm), **When** patients attempt to book, **Then** they can only select slots within those hours
3. **Given** a patient cancels an appointment, **When** there are patients on the waitlist for that time/day, **Then** the first waitlisted patient receives immediate email notification with option to claim the slot
4. **Given** Maya needs to block time for personal reasons, **When** she marks a time slot as unavailable, **Then** patients cannot book that slot and existing appointments are not affected

---

### User Story 3 - Clinical Documentation with SOAP Notes (Priority: P3)

Maya needs to document patient sessions using structured SOAP (Subjective, Objective, Assessment, Plan) notes with AI-assisted autocompletion to reduce documentation time while maintaining clinical quality and compliance.

**Why this priority**: Clinical documentation is legally required and time-consuming. AI autocompletion can reduce documentation time by 40% while ensuring completeness. This is a key feature after scheduling is working.

**Independent Test**: Log in as practitioner, select a completed appointment, create a SOAP note using the fixed template, use AI autocompletion for the Assessment section, save the note, and export as PDF.

**Acceptance Scenarios**:

1. **Given** Maya has completed a patient session, **When** she creates a SOAP note, **Then** she sees a fixed template with sections: Subjective, Objective, Assessment, and Plan
2. **Given** Maya starts typing in any SOAP section, **When** she uses the AI autocompletion trigger (e.g., Ctrl+Space), **Then** she receives contextually relevant suggestions based on previous note content
3. **Given** Maya completes a SOAP note, **When** she saves it, **Then** the note is encrypted, linked to the patient and appointment, and logged in the audit trail
4. **Given** Maya needs to share notes with a patient, **When** she exports to PDF, **Then** the PDF is branded, includes all SOAP sections, and is available for secure download

---

### User Story 4 - Billing & Payment Processing (Priority: P4)

Maya needs to generate invoices for completed sessions, accept online payments via credit card, and export billing data for accounting purposes without manual invoice creation or payment tracking.

**Why this priority**: Revenue collection is critical for business viability. Automated invoicing and payment processing reduce administrative overhead and improve cash flow.

**Independent Test**: Complete a patient appointment, generate an invoice, patient pays online via Stripe, practitioner receives payment confirmation, and practitioner exports billing data to CSV for accounting software.

**Acceptance Scenarios**:

1. **Given** Maya completes a patient session, **When** she generates an invoice, **Then** the invoice includes patient name, session date/time, service description, amount, and unique invoice number
2. **Given** an invoice is generated, **When** the patient receives the invoice link via email, **Then** they can pay securely using credit/debit card through Stripe integration
3. **Given** a patient completes payment, **When** payment is processed, **Then** Maya receives instant notification, the invoice is marked as paid, and payment is logged in audit trail
4. **Given** Maya needs to prepare for tax filing, **When** she exports billing data, **Then** she receives a CSV file with all invoices, payments, dates, patient names (anonymized option available), and amounts

---

### User Story 5 - Patient Registration with Safety Information (Priority: P5)

Maya needs patients to provide essential information during registration including emergency contacts, known allergies, and current medications to ensure safe treatment and meet clinical care standards.

**Why this priority**: This is a legal and safety requirement for healthcare practices. Allergy tracking is standard of care, and emergency contacts are legally required in many jurisdictions.

**Independent Test**: New patient registers online, completes profile including emergency contact, lists allergies, and adds current medications. Practitioner views patient profile before first appointment and sees all safety information prominently displayed.

**Acceptance Scenarios**:

1. **Given** a new patient registers, **When** they complete their profile, **Then** they must provide: full name, date of birth, phone, email, emergency contact name, emergency contact phone, and emergency contact relationship
2. **Given** a patient has known allergies, **When** they add allergy information, **Then** they specify: allergen name, reaction description, and severity level (mild, moderate, severe, life-threatening)
3. **Given** a patient takes medications, **When** they add medication information, **Then** they specify: medication name, dosage, frequency, and prescribing provider
4. **Given** Maya views a patient profile before an appointment, **When** the patient has allergies marked as severe or life-threatening, **Then** these appear prominently with visual warning indicators

---

### User Story 6 - HIPAA Compliance Foundation (Priority: P6)

As a healthcare platform, the system must protect patient health information (PHI) through encryption, access controls, audit logging, and secure authentication to meet HIPAA compliance requirements and prevent data breaches.

**Why this priority**: HIPAA compliance is non-negotiable and legally required. Data breaches carry penalties of $50k+ per record. While this runs in parallel with feature development, it must be complete before any patient data is collected.

**Independent Test**: Security audit validates: (1) all PHI encrypted at rest and in transit, (2) all data access logged with actor/timestamp, (3) multi-factor authentication enforced for practitioners, (4) tenant isolation prevents cross-tenant data access, (5) BAAs signed with all third-party vendors.

**Acceptance Scenarios**:

1. **Given** the system stores any patient data, **When** data is written to the database, **Then** sensitive fields (SSN, payment card data) are encrypted using AES-256 with per-tenant encryption keys
2. **Given** any user accesses patient data, **When** the access occurs, **Then** an audit log entry is created with: user ID, timestamp, patient ID, action type, and data accessed
3. **Given** a practitioner logs in, **When** authentication occurs, **Then** multi-factor authentication (MFA) is required using Auth0 with HIPAA BAA
4. **Given** multiple tenants use the system, **When** any query executes, **Then** tenant isolation is enforced (tenant A cannot access tenant B's data under any circumstances)
5. **Given** the system uses third-party services, **When** any service processes PHI, **Then** a signed Business Associate Agreement (BAA) must be in place and documented

---

### Edge Cases

- **What happens when a patient attempts to book an appointment less than 2 hours in advance?** System displays message: "Appointments must be booked at least 2 hours in advance. Please call [practice phone] for same-day appointments."

- **What happens when two patients are on the waitlist and one cancellation occurs?** First patient on the waitlist (earliest timestamp) receives notification. If they don't claim within 1 hour, the second patient is notified.

- **What happens when a practitioner tries to create a SOAP note for an appointment that hasn't occurred yet?** System prevents note creation and displays message: "Notes can only be created after the appointment date/time has passed."

- **What happens when AI autocompletion fails or times out?** User sees a message "AI suggestions unavailable - please continue typing manually" and can complete the note without AI assistance. Failure is logged for monitoring.

- **What happens when a Stripe payment fails?** Patient sees user-friendly error message, invoice remains unpaid, and practitioner is notified. Patient can retry payment or use alternative payment method.

- **What happens when a patient tries to access another patient's data by manipulating URLs?** System validates tenant and patient authorization on every request. Unauthorized access attempts are blocked and logged as security events.

- **What happens when the database connection fails during appointment booking?** User sees message "Service temporarily unavailable - please try again in a moment." Transaction is rolled back to prevent partial data. Error is logged and alerts are sent to operations team.

- **What happens when audit logs grow to millions of entries?** Logs are partitioned by month. Hot partition (current month) stays online. Older partitions are automatically archived to cold storage after 90 days but retained for 7 years per HIPAA requirements.

## Requirements *(mandatory)*

### Functional Requirements

#### Authentication & User Management

- **FR-001**: System MUST authenticate practitioners using Auth0 OIDC with multi-factor authentication (MFA) required for all practitioner accounts
- **FR-002**: System MUST authenticate patients using email-based magic link or email + OTP (one-time password) without requiring password management
- **FR-003**: System MUST support tenant-aware role-based access control (RBAC) with roles: Admin, Practitioner, Patient
- **FR-004**: System MUST enforce session timeout of 15 minutes inactivity for practitioners and 8 hours absolute session duration
- **FR-005**: System MUST limit failed login attempts to 5 per 15 minutes per IP address, with automatic lockout and notification

#### Patient Registration & Profile Management

- **FR-006**: System MUST collect required patient information: full name, date of birth, phone number, email address, emergency contact name, emergency contact phone, emergency contact relationship
- **FR-007**: System MUST allow patients to add allergy information with fields: allergen name, reaction description, severity level (mild, moderate, severe, life-threatening)
- **FR-008**: System MUST allow patients to add medication information with fields: medication name, dosage, frequency, prescribing provider, start date, end date (optional)
- **FR-009**: System MUST display allergy warnings prominently when severity is marked as "severe" or "life-threatening" on patient profile view
- **FR-010**: System MUST allow patients to update their profile information except date of birth (which requires admin verification)

#### Scheduling & Appointments

- **FR-011**: System MUST allow practitioners to define their available hours by day of week with time ranges (e.g., Monday 9:00 AM - 5:00 PM)
- **FR-012**: System MUST display only genuinely available appointment slots to patients, excluding: booked appointments, practitioner unavailable hours, blocked time, and slots less than 2 hours in the future
- **FR-013**: System MUST prevent double-booking by implementing optimistic locking with version control on appointment slots
- **FR-014**: System MUST send email confirmation immediately upon appointment booking with: appointment date/time, practitioner name, location, cancellation policy
- **FR-015**: System MUST send email reminders at 48 hours before appointment and 2 hours before appointment
- **FR-016**: System MUST allow patients to cancel appointments with minimum 24-hour advance notice
- **FR-017**: System MUST support waitlist functionality where patients can add themselves to a waitlist for specific date/time ranges
- **FR-018**: System MUST automatically notify first waitlisted patient when a matching appointment slot becomes available due to cancellation
- **FR-019**: System MUST give waitlisted patients 1 hour to claim a slot before notifying the next waitlisted patient
- **FR-020**: System MUST allow practitioners to export their calendar as iCal feed for import into external calendar applications (read-only, one-way sync)

#### Clinical Documentation

- **FR-021**: System MUST provide a fixed SOAP note template with four sections: Subjective, Objective, Assessment, Plan
- **FR-022**: System MUST allow practitioners to create SOAP notes only for appointments that have occurred (past date/time)
- **FR-023**: System MUST integrate AI autocompletion using OpenAI GPT-4o API with signed BAA and zero-retention mode enabled
- **FR-024**: System MUST trigger AI autocompletion on user request (e.g., keyboard shortcut or button click) and provide contextually relevant suggestions based on current note content
- **FR-025**: System MUST allow practitioners to accept, edit, or reject AI suggestions before saving to SOAP note
- **FR-026**: System MUST encrypt all SOAP note content at rest using field-level encryption with per-tenant keys
- **FR-027**: System MUST support versioning of SOAP notes with audit trail showing all edits, timestamps, and editing user
- **FR-028**: System MUST allow export of SOAP notes as branded PDF with practitioner logo, practice name, and all SOAP sections
- **FR-029**: System MUST allow practitioners to mark SOAP notes as "shared with patient" which generates secure download link

#### Billing & Payments

- **FR-030**: System MUST generate invoices for completed appointments with fields: invoice number (unique), patient name, session date/time, service description, amount, payment status
- **FR-031**: System MUST integrate with Stripe for payment processing with signed BAA covering PCI compliance
- **FR-032**: System MUST send invoice links to patients via email with secure payment page
- **FR-033**: System MUST support credit card and debit card payments through Stripe hosted payment form (no PCI scope for application)
- **FR-034**: System MUST update invoice status to "paid" immediately upon successful payment with notification to practitioner
- **FR-035**: System MUST handle payment failures gracefully with user-friendly error messages and retry capability
- **FR-036**: System MUST allow practitioners to export billing data as CSV with columns: invoice number, patient name (with anonymization option), date, service, amount, payment status, payment date
- **FR-037**: System MUST prevent duplicate invoices for the same appointment

#### Security & Compliance

- **FR-038**: System MUST encrypt all data in transit using TLS 1.3
- **FR-039**: System MUST encrypt all data at rest using AWS RDS encryption with AES-256
- **FR-040**: System MUST implement field-level encryption for SSN and payment card data using AWS KMS with per-tenant customer master keys
- **FR-041**: System MUST enforce multi-tenant data isolation using Row-Level Security (RLS) policies on all database tables
- **FR-042**: System MUST validate tenant context on every API request and database query to prevent cross-tenant data access
- **FR-043**: System MUST log all PHI access in audit trail with fields: user ID, tenant ID, timestamp, patient ID, action type (read/create/update/delete), entity type, before/after values (for updates)
- **FR-044**: System MUST log all authentication events: successful login, failed login attempts, lockouts, MFA challenges, logout
- **FR-045**: System MUST log all administrative actions: user creation/deletion, role changes, configuration updates
- **FR-046**: System MUST retain audit logs for minimum 7 years per HIPAA requirements
- **FR-047**: System MUST store audit logs in tamper-evident format using CloudWatch with retention lock
- **FR-048**: System MUST implement API rate limiting: 600 requests per minute per tenant, 5 login attempts per 15 minutes per IP
- **FR-049**: System MUST throttle expensive operations: AI autocompletion limited to 20 requests per minute per user
- **FR-050**: System MUST deploy AWS WAF with OWASP Top 10 rules for protection against common web exploits
- **FR-051**: System MUST require signed Business Associate Agreements (BAAs) with all third-party services processing PHI before integration
- **FR-052**: System MUST implement soft delete for all patient data (mark as deleted, don't hard delete) to maintain audit trail
- **FR-053**: System MUST support data retention policies: medical records retained for minimum 6 years per HIPAA

#### Monitoring & Operations

- **FR-054**: System MUST send error tracking to Sentry for real-time bug detection and alerting
- **FR-055**: System MUST use CloudWatch for infrastructure monitoring with alerts at 80% and 100% of resource thresholds
- **FR-056**: System MUST track cost-per-tenant metrics monthly to ensure unit economics
- **FR-057**: System MUST configure automated database backups with 30-day retention and point-in-time recovery enabled

### Key Entities

- **Tenant**: Represents a practice or clinic organization. Each tenant's data is completely isolated. Attributes include: tenant ID, practice name, subscription plan, creation date, status.

- **User**: Represents any system user (practitioner, admin, patient). Linked to tenant. Attributes include: user ID, tenant ID, email, role (admin/practitioner/patient), authentication provider, MFA status, status (active/locked/deleted).

- **Patient**: Represents a patient receiving care. Linked to tenant. Attributes include: patient ID, tenant ID, full name, date of birth, phone, email, emergency contact name/phone/relationship. Has relationships to Allergies and Medications.

- **Allergy**: Represents a patient allergy. Attributes include: allergy ID, patient ID, tenant ID, allergen name, reaction description, severity level (mild/moderate/severe/life-threatening), creation date.

- **Medication**: Represents a patient's current or past medication. Attributes include: medication ID, patient ID, tenant ID, medication name, dosage, frequency, prescribing provider, start date, end date (nullable).

- **Practitioner**: Represents a healthcare provider. Extends User. Attributes include: practitioner ID, user ID, tenant ID, specialty, license number, available hours (JSON), calendar export token.

- **Appointment**: Represents a scheduled appointment. Attributes include: appointment ID, tenant ID, patient ID, practitioner ID, start time, end time, status (scheduled/completed/cancelled/no-show), cancellation reason, waitlist position (if applicable).

- **Waitlist Entry**: Represents a patient waiting for an appointment slot. Attributes include: waitlist ID, tenant ID, patient ID, practitioner ID (optional), desired date range start, desired date range end, creation timestamp, status (active/claimed/expired).

- **Clinical Note**: Represents a SOAP note for a completed appointment. Attributes include: note ID, tenant ID, appointment ID, practitioner ID, subjective section (encrypted), objective section (encrypted), assessment section (encrypted), plan section (encrypted), shared with patient (boolean), version number, creation timestamp, last modified timestamp.

- **Invoice**: Represents a billing invoice for services. Attributes include: invoice ID, tenant ID, patient ID, appointment ID, invoice number (unique), amount, currency (default USD), status (unpaid/paid/cancelled), payment intent ID (Stripe), creation date, payment date.

- **Audit Event**: Represents a security or data access event. Attributes include: event ID, tenant ID, user ID, timestamp, event type (PHI_ACCESS/AUTH_EVENT/ADMIN_ACTION), entity type, entity ID, action (read/create/update/delete), before value (JSON), after value (JSON).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Solo therapists can onboard their practice and configure availability in under 15 minutes
- **SC-002**: Patients can discover available appointment slots and complete booking in under 3 minutes
- **SC-003**: System prevents 100% of double-booking scenarios through optimistic locking mechanism
- **SC-004**: Email reminders are delivered within 5 minutes of scheduled time (48 hours before and 2 hours before appointments)
- **SC-005**: Waitlist auto-fill notifies first eligible patient within 1 minute of cancellation occurring
- **SC-006**: Practitioners complete SOAP notes 40% faster when using AI autocompletion compared to manual entry
- **SC-007**: AI autocompletion provides relevant suggestions with 80% acceptance rate from practitioners
- **SC-008**: PDF export of clinical notes generates within 5 seconds and includes all SOAP sections
- **SC-009**: Payment processing completes within 10 seconds with success rate of 97%+
- **SC-010**: Invoice generation occurs automatically within 1 minute of appointment completion
- **SC-011**: System maintains 99.5% uptime (maximum 3.6 hours downtime per month)
- **SC-012**: All API endpoints respond within 250ms at p95 under normal load (up to 100 concurrent users)
- **SC-013**: Calendar view renders with all appointments visible within 1 second
- **SC-014**: Zero cross-tenant data leakage incidents (validated through security audit and penetration testing)
- **SC-015**: 100% of PHI access events are logged in audit trail with complete information
- **SC-016**: All authentication attempts (success and failure) are logged with no gaps
- **SC-017**: System handles 50 tenants with 100 patients each and 1,000 appointments per month with no performance degradation
- **SC-018**: Infrastructure costs remain under $1,500/month for 50 tenants
- **SC-019**: Database backup and restore process completes within 30 minutes for databases up to 50GB
- **SC-020**: Security vulnerabilities rated critical are patched within 24 hours of discovery

## Assumptions

- Practitioners primarily use desktop/laptop computers for clinical documentation, so mobile practitioner interface is optimized but not primary focus
- Patients use both mobile and desktop for booking, so patient interface must be fully responsive and mobile-first
- All practitioners and patients have reliable internet access (no extensive offline functionality required for MVP)
- Standard appointment duration is 60 minutes unless otherwise specified during booking
- Practice operates during normal business hours (6 AM - 10 PM) in local timezone
- English is the primary language for MVP (internationalization deferred to Phase 2)
- Practices are located in the United States and subject to HIPAA regulations (GDPR compliance deferred to Phase 2)
- Stripe is available and supported in the practitioner's country/region
- Practitioners have basic computer literacy and can complete initial setup with guided onboarding
- AWS services (RDS, Fargate, S3, SQS, Secrets Manager) are available in target deployment regions with HIPAA BAAs
- Auth0 Essentials plan with HIPAA BAA meets authentication requirements for MVP scale
- OpenAI GPT-4o API with signed BAA and zero-retention mode meets AI autocompletion requirements
- SendGrid or similar email service with HIPAA BAA meets email delivery requirements
