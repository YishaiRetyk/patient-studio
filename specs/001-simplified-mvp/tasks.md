# Tasks: Simplified MVP for Patient & Studio Scheduler

**Input**: Design documents from `/specs/001-simplified-mvp/`
**Prerequisites**: plan.md, spec.md, data-model.md, research.md, contracts/

**Tests**: Per Constitution Principle IV (Test-First for Healthcare), test tasks are included for all PHI-handling features and MUST be written before implementation to ensure they FAIL first (Red-Green-Refactor cycle).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/src/`, `backend/tests/`
- **Frontend**: `frontend/src/`, `frontend/tests/`
- **Infrastructure**: `infrastructure/terraform/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and monorepo structure

- [ ] T001 Create monorepo structure with backend/, frontend/, infrastructure/ directories
- [ ] T002 [P] Initialize backend package.json with NestJS 10.x, Prisma 5.x, TypeScript 5.3, Node.js 20 dependencies
- [ ] T003 [P] Initialize frontend package.json with Next.js 14.x, React 18, Tailwind CSS 3.x, TypeScript 5.3 dependencies
- [ ] T004 [P] Configure TypeScript for backend in backend/tsconfig.json
- [ ] T005 [P] Configure TypeScript for frontend in frontend/tsconfig.json
- [ ] T006 [P] Setup ESLint and Prettier for backend in backend/.eslintrc.js
- [ ] T007 [P] Setup ESLint and Prettier for frontend in frontend/.eslintrc.js
- [ ] T008 [P] Create backend Dockerfile for AWS Fargate deployment
- [ ] T009 [P] Create frontend Dockerfile for production build
- [ ] T010 [P] Setup Docker Compose for local development in docker-compose.yml
- [ ] T011 [P] Configure environment variables template in backend/.env.example
- [ ] T012 [P] Configure environment variables template in frontend/.env.local.example
- [ ] T013 [P] Setup Jest configuration for backend unit tests in backend/jest.config.js
- [ ] T014 [P] Setup Playwright configuration for frontend E2E tests in frontend/playwright.config.ts
- [ ] T015 [P] Create GitHub Actions workflow for backend CI in .github/workflows/backend-ci.yml
- [ ] T016 [P] Create GitHub Actions workflow for frontend CI in .github/workflows/frontend-ci.yml
- [ ] T017 [P] Initialize Terraform structure for AWS infrastructure in infrastructure/terraform/
- [ ] T018 [P] Configure RDS automated backups in infrastructure/terraform/modules/rds/main.tf (30-day retention, PITR enabled, Multi-AZ) per FR-057
- [ ] T019 [P] Create root README.md with quickstart instructions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Database & ORM

- [ ] T020 Initialize Prisma in backend/prisma/schema.prisma with base schema structure
- [ ] T021 Define Tenant model in backend/prisma/schema.prisma per data-model.md
- [ ] T022 [P] Define User model in backend/prisma/schema.prisma per data-model.md
- [ ] T023 [P] Define Practitioner model in backend/prisma/schema.prisma per data-model.md
- [ ] T024 [P] Define Patient model (basic fields) in backend/prisma/schema.prisma per data-model.md
- [ ] T025 [P] Define AuditEvent model in backend/prisma/schema.prisma per data-model.md
- [ ] T026 Create initial Prisma migration in backend/prisma/migrations/
- [ ] T027 [P] Create RLS policy SQL scripts in backend/database/rls-policies/01-enable-rls.sql
- [ ] T028 [P] Create tenant isolation policy scripts in backend/database/rls-policies/02-tenant-isolation.sql
- [ ] T029 Apply RLS policies to PostgreSQL database

### Authentication & Authorization

- [ ] T030 Install Auth0 SDK and configure in backend/src/config/auth.config.ts
- [ ] T031 Create Auth0 authentication strategy in backend/src/modules/auth/strategies/auth0.strategy.ts
- [ ] T032 Create JWT authentication guard in backend/src/modules/auth/guards/jwt-auth.guard.ts
- [ ] T033 [P] Create RBAC guard for role-based access control in backend/src/modules/auth/guards/rbac.guard.ts
- [ ] T034 [P] Create tenant context interceptor in backend/src/common/interceptors/tenant-context.interceptor.ts
- [ ] T035 Create authentication module in backend/src/modules/auth/auth.module.ts
- [ ] T036 [P] Create authentication controller in backend/src/modules/auth/auth.controller.ts
- [ ] T037 [P] Create authentication service in backend/src/modules/auth/auth.service.ts
- [ ] T038 [P] Create patient authentication service for magic link/OTP in backend/src/modules/auth/patient-auth.service.ts per FR-002
- [ ] T039 [P] Implement magic link generation and validation with expiry (15-minute TTL)
- [ ] T040 [P] Implement OTP generation and validation (6-digit code, 5-minute TTL)
- [ ] T041 [P] Create email service integration for magic link/OTP delivery in backend/src/modules/notifications/email.service.ts

### Security & Compliance

- [ ] T042 Create encryption service using AWS KMS in backend/src/common/encryption/encryption.service.ts per research.md
- [ ] T043 [P] Create audit logging service in backend/src/modules/audit/audit.service.ts per research.md
- [ ] T044 [P] Create audit logging interceptor in backend/src/modules/audit/audit.interceptor.ts
- [ ] T045 Create rate limiting guard in backend/src/common/guards/rate-limit.guard.ts
- [ ] T046 Configure CloudWatch logging with Winston in backend/src/config/logger.config.ts
- [ ] T047 [P] Install and configure Sentry SDK in backend/src/config/sentry.config.ts for error tracking per FR-054
- [ ] T048 [P] Setup SendGrid SDK and email templates in backend/src/modules/notifications/ with BAA verification per research.md
- [ ] T049 [P] Configure CloudWatch alarms for cost monitoring at 80% and 100% thresholds per FR-055

### API Infrastructure

- [ ] T050 Create main NestJS application in backend/src/main.ts with middleware pipeline
- [ ] T051 Create app module in backend/src/app.module.ts with all module imports
- [ ] T052 [P] Create global exception filter in backend/src/common/filters/http-exception.filter.ts
- [ ] T053 [P] Create validation pipe in backend/src/common/pipes/validation.pipe.ts
- [ ] T054 Setup API documentation with Swagger in backend/src/config/swagger.config.ts

### Frontend Foundation

- [ ] T055 Setup Next.js app router structure in frontend/src/app/
- [ ] T056 [P] Create root layout component in frontend/src/app/layout.tsx
- [ ] T057 [P] Configure Auth0 for frontend in frontend/src/lib/auth/auth0.ts
- [ ] T058 [P] Create authentication context provider in frontend/src/lib/auth/AuthProvider.tsx
- [ ] T059 [P] Setup Zustand stores structure in frontend/src/stores/
- [ ] T060 [P] Create API client with React Query in frontend/src/lib/api/client.ts
- [ ] T061 [P] Setup shadcn/ui components in frontend/src/components/ui/
- [ ] T062 [P] Configure Tailwind CSS in frontend/tailwind.config.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Patient Self-Service Appointment Booking (Priority: P1) 🎯 MVP

**Goal**: Enable patients to book their own appointments online without phone calls, with double-booking prevention and email confirmations

**Independent Test**: Create test patient account, view available slots for a practitioner, book an appointment, receive confirmation email, verify slot becomes unavailable

**Dependencies**: Requires Patient and Practitioner models from foundational phase

### Test Tasks (Write First - MUST FAIL Before Implementation)

- [ ] T063 [P] [US1] Write contract test for GET /appointments/availability endpoint in backend/tests/contract/appointments-availability.contract.spec.ts
- [ ] T064 [P] [US1] Write contract test for POST /appointments endpoint in backend/tests/contract/appointments-create.contract.spec.ts
- [ ] T065 [P] [US1] Write integration test for appointment booking with optimistic locking in backend/tests/integration/appointments-booking.spec.ts
- [ ] T066 [P] [US1] Write integration test for double-booking prevention in backend/tests/integration/appointments-concurrency.spec.ts
- [ ] T067 [P] [US1] Write integration test for tenant isolation on appointments in backend/tests/integration/appointments-tenant-isolation.spec.ts

### Backend Implementation

- [ ] T068 [P] [US1] Define Appointment model in backend/prisma/schema.prisma with optimistic locking
- [ ] T069 [US1] Create and apply Appointment migration in backend/prisma/migrations/
- [ ] T070 [P] [US1] Create appointment DTOs in backend/src/modules/appointments/dto/
- [ ] T071 [P] [US1] Create AppointmentService in backend/src/modules/appointments/appointments.service.ts
- [ ] T072 [P] [US1] Implement availability query logic with practitioner hours filtering
- [ ] T073 [P] [US1] Implement appointment booking with optimistic locking (version control)
- [ ] T074 [P] [US1] Implement email confirmation service in backend/src/modules/notifications/email.service.ts
- [ ] T075 [P] [US1] Create reminder scheduling service using SQS in backend/src/modules/notifications/reminder.service.ts per FR-015
- [ ] T076 [P] [US1] Implement Lambda function for reminder processing in infrastructure/lambda/appointment-reminders/
- [ ] T077 [P] [US1] Create reminder email templates (48h and 2h before appointment) in backend/src/modules/notifications/templates/
- [ ] T078 [P] [US1] Configure SQS queue and Lambda trigger in infrastructure/terraform/modules/reminders/
- [ ] T079 [US1] Create AppointmentController in backend/src/modules/appointments/appointments.controller.ts
- [ ] T080 [US1] Add appointment endpoints: GET /appointments/availability, POST /appointments
- [ ] T081 [P] [US1] Add validation for 2-hour minimum booking window
- [ ] T082 [P] [US1] Add audit logging for appointment creation
- [ ] T083 [US1] Create Appointments module in backend/src/modules/appointments/appointments.module.ts

### Frontend Implementation

- [ ] T084 [P] [US1] Create appointment booking page in frontend/src/app/(patient)/appointments/book/page.tsx
- [ ] T085 [P] [US1] Create availability calendar component in frontend/src/components/appointments/AvailabilityCalendar.tsx
- [ ] T086 [P] [US1] Create time slot selector component in frontend/src/components/appointments/TimeSlotSelector.tsx
- [ ] T087 [P] [US1] Create booking confirmation modal in frontend/src/components/appointments/BookingConfirmation.tsx
- [ ] T088 [US1] Create appointment API hooks in frontend/src/lib/api/appointments.ts
- [ ] T089 [US1] Implement booking flow with error handling for concurrent bookings

**Checkpoint**: At this point, User Story 1 should be fully functional - patients can book appointments, double-booking is prevented, confirmations are sent

---

## Phase 4: User Story 2 - Practitioner Calendar Management & Scheduling (Priority: P2)

**Goal**: Practitioners can view their calendar, set availability, and manage waitlist with automatic cancellation notifications

**Independent Test**: Log in as practitioner, view calendar with appointments, set available hours, add patient to waitlist, cancel an appointment, verify waitlisted patient receives notification

**Dependencies**: Extends US1 Appointment functionality

### Backend Implementation

- [ ] T090 [P] [US2] Define WaitlistEntry model in backend/prisma/schema.prisma
- [ ] T091 [US2] Create and apply Waitlist migration in backend/prisma/migrations/
- [ ] T092 [P] [US2] Create PractitionerService in backend/src/modules/practitioners/practitioners.service.ts
- [ ] T093 [P] [US2] Implement available hours management (JSON field update)
- [ ] T094 [P] [US2] Create WaitlistService in backend/src/modules/waitlist/waitlist.service.ts
- [ ] T095 [P] [US2] Implement waitlist notification logic (1-hour claim window)
- [ ] T096 [P] [US2] Implement appointment cancellation with waitlist trigger
- [ ] T097 [P] [US2] Implement iCal feed generation in backend/src/modules/calendar/calendar.service.ts
- [ ] T098 [US2] Create PractitionerController in backend/src/modules/practitioners/practitioners.controller.ts
- [ ] T099 [US2] Add practitioner endpoints: PATCH /practitioners/:id/hours, GET /calendar/export
- [ ] T100 [US2] Add waitlist endpoints: POST /appointments/waitlist, GET /appointments/waitlist
- [ ] T101 [US2] Create Practitioners and Calendar modules

### Frontend Implementation

- [ ] T102 [P] [US2] Create practitioner calendar page in frontend/src/app/(practitioner)/calendar/page.tsx
- [ ] T103 [P] [US2] Create full calendar component in frontend/src/components/calendar/FullCalendar.tsx
- [ ] T104 [P] [US2] Create availability settings modal in frontend/src/components/practitioners/AvailabilitySettings.tsx
- [ ] T105 [P] [US2] Create waitlist management panel in frontend/src/components/waitlist/WaitlistPanel.tsx
- [ ] T106 [US2] Create practitioner API hooks in frontend/src/lib/api/practitioners.ts
- [ ] T107 [US2] Implement calendar export link display

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - patients book, practitioners manage schedules and waitlists

---

## Phase 5: User Story 3 - Clinical Documentation with SOAP Notes (Priority: P3)

**Goal**: Practitioners can document sessions using SOAP notes with AI autocompletion to reduce documentation time

**Independent Test**: Log in as practitioner, select completed appointment, create SOAP note with fixed template, use AI autocompletion, save encrypted note, export as PDF

**Dependencies**: Requires Appointment model from US1

### Test Tasks (Write First - MUST FAIL Before Implementation)

- [X] T108 [P] [US3] Write contract test for POST /notes endpoint in backend/tests/contract/notes-create.contract.spec.ts
- [X] T109 [P] [US3] Write contract test for POST /notes/ai-complete endpoint in backend/tests/contract/notes-ai.contract.spec.ts
- [X] T110 [P] [US3] Write integration test for SOAP note encryption/decryption in backend/tests/integration/notes-encryption.spec.ts
- [X] T111 [P] [US3] Write integration test for note versioning and audit trail in backend/tests/integration/notes-versioning.spec.ts
- [X] T112 [P] [US3] Write unit test for PHI de-identification logic in backend/tests/unit/ai-service-phi-deidentification.spec.ts

### Backend Implementation

- [X] T113 [P] [US3] Define ClinicalNote model with encrypted fields in backend/prisma/schema.prisma
- [X] T114 [US3] Create and apply ClinicalNote migration in backend/prisma/migrations/
- [X] T115 [P] [US3] Create OpenAI service integration in backend/src/modules/notes/ai.service.ts per research.md
- [X] T116 [P] [US3] Implement PHI de-identification for AI requests
- [X] T117 [P] [US3] Implement AI autocompletion with rate limiting (20 req/min per user)
- [X] T118 [P] [US3] Create PDF generation service in backend/src/modules/notes/pdf.service.ts
- [X] T119 [P] [US3] Create ClinicalNotesService in backend/src/modules/notes/notes.service.ts
- [X] T120 [P] [US3] Implement note versioning and audit trail
- [X] T121 [P] [US3] Implement note encryption/decryption with per-tenant keys
- [X] T122 [US3] Create ClinicalNotesController in backend/src/modules/notes/notes.controller.ts
- [X] T123 [US3] Add notes endpoints: POST /notes, PATCH /notes/:id, POST /notes/ai-complete, GET /notes/:id/pdf
- [X] T124 [US3] Create ClinicalNotes module
- [X] T125 [P] [US3] Add validation: notes only for past appointments

### Frontend Implementation

- [X] T126 [P] [US3] Create SOAP note editor page in frontend/src/app/(practitioner)/notes/[appointmentId]/page.tsx
- [X] T127 [P] [US3] Create SOAP template component in frontend/src/components/notes/SoapTemplate.tsx
- [X] T128 [P] [US3] Create AI autocompletion UI with keyboard shortcut in frontend/src/components/notes/AIAssistant.tsx
- [X] T129 [P] [US3] Create note version history component in frontend/src/components/notes/VersionHistory.tsx
- [X] T130 [US3] Create clinical notes API hooks in frontend/src/lib/api/notes.ts
- [X] T131 [US3] Implement note save with optimistic updates

**Checkpoint**: All three user stories (booking, calendar, notes) should now be independently functional

---

## Phase 6: User Story 4 - Billing & Payment Processing (Priority: P4)

**Goal**: Automated invoice generation and online payment processing via Stripe with CSV export for accounting

**Independent Test**: Complete appointment, generate invoice, patient pays online via Stripe, practitioner receives confirmation, export billing data to CSV

**Dependencies**: Requires Appointment model from US1

### Test Tasks (Write First - MUST FAIL Before Implementation)

- [ ] T132 [P] [US4] Write contract test for POST /invoices endpoint in backend/tests/contract/invoices-create.contract.spec.ts
- [ ] T133 [P] [US4] Write contract test for POST /webhooks/stripe endpoint in backend/tests/contract/stripe-webhook.contract.spec.ts
- [ ] T134 [P] [US4] Write integration test for Stripe payment flow in backend/tests/integration/billing-payment.spec.ts
- [ ] T135 [P] [US4] Write integration test for invoice audit logging in backend/tests/integration/billing-audit.spec.ts

### Backend Implementation

- [ ] T136 [P] [US4] Define Invoice model in backend/prisma/schema.prisma
- [ ] T137 [US4] Create and apply Invoice migration in backend/prisma/migrations/
- [ ] T138 [P] [US4] Install Stripe SDK and configure in backend/src/config/stripe.config.ts
- [ ] T139 [P] [US4] Create StripeService in backend/src/modules/billing/stripe.service.ts per research.md
- [ ] T140 [P] [US4] Implement invoice creation from completed appointments
- [ ] T141 [P] [US4] Implement Stripe payment intent creation
- [ ] T142 [P] [US4] Implement Stripe webhook handler for payment events
- [ ] T143 [P] [US4] Create BillingService in backend/src/modules/billing/billing.service.ts
- [ ] T144 [P] [US4] Implement CSV export with anonymization option
- [ ] T145 [US4] Create BillingController in backend/src/modules/billing/billing.controller.ts
- [ ] T146 [US4] Add billing endpoints: POST /invoices, GET /invoices/:id, POST /webhooks/stripe, GET /invoices/export
- [ ] T147 [US4] Create Billing module
- [ ] T148 [P] [US4] Add audit logging for all payment events

### Frontend Implementation

- [ ] T149 [P] [US4] Create invoice list page in frontend/src/app/(practitioner)/billing/page.tsx
- [ ] T150 [P] [US4] Create invoice details component in frontend/src/components/billing/InvoiceDetails.tsx
- [ ] T151 [P] [US4] Create Stripe payment form using Stripe Elements in frontend/src/components/billing/PaymentForm.tsx
- [ ] T152 [P] [US4] Create billing export modal in frontend/src/components/billing/ExportModal.tsx
- [ ] T153 [US4] Create billing API hooks in frontend/src/lib/api/billing.ts
- [ ] T154 [US4] Implement payment success/failure handling

**Checkpoint**: Four user stories complete - full booking, scheduling, documentation, and payment flows functional

---

## Phase 7: User Story 5 - Patient Registration with Safety Information (Priority: P5)

**Goal**: Patients provide essential safety information including emergency contacts, allergies, and current medications

**Independent Test**: New patient registers online, completes profile with emergency contact, adds allergies with severity, adds medications, practitioner views profile with prominent allergy warnings

**Dependencies**: Extends Patient model from foundational phase

### Test Tasks (Write First - MUST FAIL Before Implementation)

- [ ] T155 [P] [US5] Write contract test for POST /patients endpoint in backend/tests/contract/patients-create.contract.spec.ts
- [ ] T156 [P] [US5] Write contract test for POST /patients/:id/allergies endpoint in backend/tests/contract/patients-allergies.contract.spec.ts
- [ ] T157 [P] [US5] Write integration test for patient data tenant isolation in backend/tests/integration/patients-tenant-isolation.spec.ts
- [ ] T158 [P] [US5] Write integration test for allergy/medication audit logging in backend/tests/integration/patients-audit.spec.ts

### Backend Implementation

- [ ] T159 [P] [US5] Define Allergy model in backend/prisma/schema.prisma
- [ ] T160 [P] [US5] Define Medication model in backend/prisma/schema.prisma
- [ ] T161 [US5] Create and apply Patient safety fields migration in backend/prisma/migrations/
- [ ] T162 [P] [US5] Update Patient model to include emergency contact fields
- [ ] T163 [P] [US5] Create PatientService in backend/src/modules/patients/patients.service.ts
- [ ] T164 [P] [US5] Implement patient CRUD operations with tenant isolation
- [ ] T165 [P] [US5] Implement allergy management endpoints
- [ ] T166 [P] [US5] Implement medication management endpoints
- [ ] T167 [P] [US5] Add validation for required patient registration fields
- [ ] T168 [US5] Create PatientController in backend/src/modules/patients/patients.controller.ts
- [ ] T169 [US5] Add patient endpoints: POST /patients, GET /patients/:id, PATCH /patients/:id, POST /patients/:id/allergies, POST /patients/:id/medications
- [ ] T170 [US5] Create Patients module
- [ ] T171 [P] [US5] Add audit logging for patient data access

### Frontend Implementation

- [ ] T172 [P] [US5] Create patient registration page in frontend/src/app/(patient)/register/page.tsx
- [ ] T173 [P] [US5] Create patient profile form in frontend/src/components/patients/ProfileForm.tsx
- [ ] T174 [P] [US5] Create allergy input component with severity selector in frontend/src/components/patients/AllergyInput.tsx
- [ ] T175 [P] [US5] Create medication input component in frontend/src/components/patients/MedicationInput.tsx
- [ ] T176 [P] [US5] Create patient details view with allergy warnings in frontend/src/components/patients/PatientDetails.tsx
- [ ] T177 [US5] Create patient API hooks in frontend/src/lib/api/patients.ts
- [ ] T178 [US5] Implement patient profile validation

**Checkpoint**: Five user stories complete - full patient safety tracking integrated with existing booking flows

---

## Phase 8: User Story 6 - HIPAA Compliance Foundation (Priority: P6)

**Goal**: Comprehensive PHI protection through encryption, access controls, audit logging, and secure authentication

**Independent Test**: Security audit validates: (1) all PHI encrypted at rest and in transit, (2) all data access logged, (3) MFA enforced for practitioners, (4) tenant isolation prevents cross-tenant access, (5) BAAs signed with all vendors

**Dependencies**: Cross-cutting enhancements to all previous user stories

### Test Tasks (Write First - MUST FAIL Before Implementation)

- [ ] T179 [P] [US6] Write integration test for MFA enforcement on practitioner login in backend/tests/integration/auth-mfa.spec.ts
- [ ] T180 [P] [US6] Write integration test for session timeout enforcement in backend/tests/integration/auth-session-timeout.spec.ts
- [ ] T181 [P] [US6] Write integration test for failed login lockout in backend/tests/integration/auth-login-lockout.spec.ts
- [ ] T182 [P] [US6] Write integration test for SSN field-level encryption in backend/tests/integration/encryption-ssn.spec.ts
- [ ] T183 [P] [US6] Write integration test for soft delete with audit trail in backend/tests/integration/soft-delete-audit.spec.ts
- [ ] T184 [P] [US6] Write security test for cross-tenant data access prevention in backend/tests/security/tenant-isolation-penetration.spec.ts

### Backend Enhancements

- [ ] T185 [P] [US6] Enable MFA enforcement in Auth0 configuration
- [ ] T186 [P] [US6] Implement session timeout middleware (15 min inactivity, 8 hour absolute)
- [ ] T187 [P] [US6] Add failed login attempt tracking (5 per 15 min lockout)
- [ ] T188 [P] [US6] Create SSN field-level encryption middleware
- [ ] T189 [P] [US6] Implement soft delete for all PHI-containing models
- [ ] T190 [P] [US6] Create data retention policy enforcement scripts
- [ ] T191 [P] [US6] Setup CloudWatch log groups with retention lock
- [ ] T192 [P] [US6] Configure S3 Glacier archival for audit logs
- [ ] T193 [P] [US6] Add AWS WAF rules for OWASP Top 10 protection
- [ ] T194 [P] [US6] Create backup and restore scripts for PostgreSQL
- [ ] T195 [P] [US6] Implement point-in-time recovery testing
- [ ] T196 [US6] Create compliance verification tests in backend/tests/security/
- [ ] T197 [US6] Document BAA requirements checklist in docs/compliance/baas.md

### Frontend Enhancements

- [ ] T198 [P] [US6] Add MFA enrollment flow in frontend/src/app/(auth)/mfa/page.tsx
- [ ] T199 [P] [US6] Implement session timeout warning modal
- [ ] T200 [P] [US6] Add client-side activity tracking for session management
- [ ] T201 [US6] Create compliance documentation page in frontend/src/app/(practitioner)/compliance/page.tsx

**Checkpoint**: All six user stories complete with comprehensive HIPAA compliance measures

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Final improvements that affect multiple user stories

- [ ] T202 [P] Add comprehensive error messages across all API endpoints
- [ ] T203 [P] Implement loading states for all async operations in frontend
- [ ] T204 [P] Add optimistic UI updates across all mutation operations
- [ ] T205 [P] Create user onboarding tutorial flow in frontend
- [ ] T206 [P] Implement search functionality for patients list
- [ ] T207 [P] Add filtering and sorting to appointment calendar
- [ ] T208 [P] Create practitioner dashboard with KPIs in frontend/src/app/(practitioner)/dashboard/page.tsx
- [ ] T209 [P] Add patient dashboard in frontend/src/app/(patient)/dashboard/page.tsx
- [ ] T210 [P] Implement notification preferences management
- [ ] T211 [P] Add email template customization for practice branding
- [ ] T212 [P] Create comprehensive API documentation in docs/api/
- [ ] T213 [P] Create deployment guide in docs/deployment/
- [ ] T214 [P] Run security vulnerability scan with npm audit
- [ ] T215 [P] Run performance audit on critical pages
- [ ] T216 [P] Validate all quickstart.md testing scenarios
- [ ] T217 Code cleanup and refactoring across backend and frontend
- [ ] T218 Final integration testing across all user stories

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phases 3-8)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3 → US4 → US5 → US6)
- **Polish (Phase 9)**: Depends on desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Creates Appointment model
- **User Story 2 (P2)**: Can start after Foundational - Extends Appointment with WaitlistEntry
- **User Story 3 (P3)**: Depends on US1 (needs Appointment) - Creates ClinicalNote model
- **User Story 4 (P4)**: Depends on US1 (needs Appointment) - Creates Invoice model
- **User Story 5 (P5)**: Can start after Foundational - Extends Patient with Allergy/Medication
- **User Story 6 (P6)**: Cross-cutting enhancements to all stories

### Recommended Implementation Order

**For MVP (Fastest Time to Value)**:
1. Setup → Foundational → US1 only
2. Deploy and validate patient booking flow

**For Full Feature Set**:
1. Setup → Foundational (Phases 1-2)
2. US1 (Patient Booking) - Core value proposition
3. US5 (Patient Safety) - Enhances US1 with safety tracking
4. US2 (Practitioner Calendar) - Practitioner productivity
5. US3 (SOAP Notes) - Clinical documentation
6. US4 (Billing) - Revenue collection
7. US6 (HIPAA Polish) - Compliance hardening
8. Polish - Final touches

### Within Each User Story

- Backend models before services
- Services before controllers
- Controllers before module creation
- Backend complete before frontend (or parallel if separate developers)
- Core implementation before integration with other stories

### Parallel Opportunities

**Phase 1 (Setup)**: All 18 tasks marked [P] can run in parallel

**Phase 2 (Foundational)**: Within each subsection, [P] tasks can run in parallel:
- Database models: T020-T024, T026-T027 (7 tasks)
- Auth components: T032-T033, T035-T036 (4 tasks)
- Security services: T038-T039 (2 tasks)
- API infrastructure: T044-T046 (3 tasks)
- Frontend foundation: T048-T054 (7 tasks)

**User Story Phases**: Once Foundational completes, user stories can be developed in parallel by different team members:
- Developer A: US1 (Patient Booking)
- Developer B: US5 (Patient Registration)
- Developer C: US2 (Practitioner Calendar)

**Within Each User Story**: Tasks marked [P] can run in parallel within that story (typically 5-8 tasks per story)

---

## Parallel Example: User Story 1

```bash
# After Foundational phase completes, these US1 tasks can run in parallel:

# Backend parallel tasks:
T055 - Define Appointment model
T057 - Create appointment DTOs
T061 - Implement email confirmation service
T064 - Add validation for 2-hour minimum
T065 - Add audit logging

# Frontend parallel tasks (after backend models exist):
T067 - Create appointment booking page
T068 - Create availability calendar component
T069 - Create time slot selector component
T070 - Create booking confirmation modal
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Goal**: Fastest path to core value (patient booking)

1. Complete Phase 1: Setup (~2-3 days)
2. Complete Phase 2: Foundational (~5-7 days) - CRITICAL blocker
3. Complete Phase 3: User Story 1 (~3-4 days)
4. **STOP and VALIDATE**: Test patient booking flow end-to-end
5. Deploy to staging/demo environment
6. Gather feedback before building US2-US6

**MVP Delivery Time**: 10-14 days for core booking functionality

### Incremental Delivery

**Goal**: Add value progressively while maintaining working product

1. **Week 1-2**: Setup + Foundational → Foundation ready
2. **Week 3**: US1 (Patient Booking) → Test independently → Deploy/Demo (MVP!)
3. **Week 4**: US5 (Patient Safety) → Test independently → Deploy/Demo
4. **Week 5**: US2 (Practitioner Calendar) → Test independently → Deploy/Demo
5. **Week 6**: US3 (SOAP Notes) → Test independently → Deploy/Demo
6. **Week 7**: US4 (Billing) → Test independently → Deploy/Demo
7. **Week 8**: US6 (HIPAA Polish) → Security audit → Deploy/Demo
8. **Week 9**: Polish → Final integration testing → Production launch

**Full MVP Delivery Time**: 8-9 weeks (aligns with spec's 16-20 week timeline for 50 tenants at scale)

### Parallel Team Strategy

**With 3 developers after Foundational phase completes**:

- **Developer A**: US1 → US3 → US6 enhancements
- **Developer B**: US5 → US2 → Frontend polish
- **Developer C**: US4 → Infrastructure setup → Deployment

Stories complete and integrate independently, enabling faster delivery.

---

## Validation Checkpoints

### After Phase 2 (Foundational)

- [ ] Auth0 login/logout works for practitioners with MFA
- [ ] Tenant context is set on every API request
- [ ] RLS policies prevent cross-tenant data access
- [ ] Audit logs capture all authentication events
- [ ] Frontend can authenticate and make API calls
- [ ] Encryption service can encrypt/decrypt test data

### After US1 (Patient Booking)

- [ ] Patients can view available appointment slots
- [ ] Patients can book appointments successfully
- [ ] Double-booking is prevented (concurrent booking test)
- [ ] Email confirmations are sent within 5 minutes
- [ ] Slots become unavailable after booking
- [ ] 2-hour minimum booking window is enforced

### After US2 (Practitioner Calendar)

- [ ] Practitioners can view all their appointments
- [ ] Practitioners can set/update available hours
- [ ] Waitlist entries are created successfully
- [ ] Cancellations trigger waitlist notifications
- [ ] iCal feed exports calendar correctly
- [ ] 1-hour claim window enforced for waitlisted patients

### After US3 (SOAP Notes)

- [ ] Practitioners can create SOAP notes for past appointments
- [ ] AI autocompletion provides relevant suggestions
- [ ] Notes are encrypted in database
- [ ] PDF export includes all SOAP sections
- [ ] Note versioning tracks all changes
- [ ] Only past appointments allow note creation

### After US4 (Billing)

- [ ] Invoices generated for completed appointments
- [ ] Stripe payment flow works end-to-end
- [ ] Payment webhooks update invoice status
- [ ] CSV export includes all required fields
- [ ] Payment failures handled gracefully
- [ ] Duplicate invoices prevented

### After US5 (Patient Safety)

- [ ] Patients can complete registration with all required fields
- [ ] Allergies display with severity indicators
- [ ] Severe/life-threatening allergies show prominent warnings
- [ ] Medications tracked with dosage and frequency
- [ ] Emergency contact information required and validated
- [ ] Patient profiles integrated with booking flow

### After US6 (HIPAA Compliance)

- [ ] MFA enforced for all practitioner accounts
- [ ] Session timeouts work correctly (15 min inactivity, 8 hour absolute)
- [ ] Failed login lockouts after 5 attempts
- [ ] All PHI access logged to audit trail
- [ ] Soft delete preserves audit trail
- [ ] CloudWatch logs retained with proper lifecycle

---

## Task Summary

**Total Tasks**: 218 (increased from 182 to address critical gaps)

**By Phase**:
- Phase 1 (Setup): 19 tasks (+1: RDS backup automation)
- Phase 2 (Foundational): 43 tasks (+7: patient auth, Sentry, SendGrid, cost monitoring)
- Phase 3 (US1 - Patient Booking): 27 tasks (+9: test tasks, reminder scheduling)
- Phase 4 (US2 - Practitioner Calendar): 18 tasks (no change)
- Phase 5 (US3 - SOAP Notes): 24 tasks (+5: test tasks)
- Phase 6 (US4 - Billing): 23 tasks (+4: test tasks)
- Phase 7 (US5 - Patient Safety): 24 tasks (+4: test tasks)
- Phase 8 (US6 - HIPAA Compliance): 23 tasks (+6: test tasks)
- Phase 9 (Polish): 17 tasks (no change)

**Test Tasks Added**: 36 test tasks per Constitution Principle IV (Test-First for Healthcare)
- US1: 5 test tasks (contract, integration, tenant isolation)
- US3: 5 test tasks (encryption, versioning, PHI de-identification)
- US4: 4 test tasks (payments, audit logging)
- US5: 4 test tasks (tenant isolation, audit logging)
- US6: 6 test tasks (MFA, session timeout, soft delete, security penetration)

**Critical Gaps Addressed**:
1. ✅ Test-First principle compliance (Constitution Principle IV)
2. ✅ Patient authentication (magic link/OTP) - FR-002
3. ✅ Email reminder scheduling (SQS/Lambda) - FR-015
4. ✅ Sentry error tracking - FR-054
5. ✅ RDS automated backups - FR-057
6. ✅ SendGrid email service integration
7. ✅ CloudWatch cost monitoring alarms - FR-055

**Parallelizable Tasks**: 138 tasks marked with [P] (63% can run in parallel within their phase)

**MVP Scope**: Phases 1-3 only (89 tasks, ~12-16 days with test-first approach)

**Full Feature Set**: All 218 tasks (~9-11 weeks with incremental delivery and TDD)

---

## Notes

- **[P] marker**: Tasks that can run in parallel because they touch different files and have no inter-dependencies
- **[Story] label**: Maps each task to its user story for traceability and independent testing
- **File paths**: Every implementation task includes exact file path for clarity
- **Checkpoints**: Each user story phase ends with validation criteria to ensure independent functionality
- **Tests**: Not included by default - add if TDD approach requested in spec
- **Constitution compliance**: All tasks align with HIPAA First, Simplicity Over Scale, Data Isolation, and Cost Transparency principles

### Avoid

- Vague tasks without file paths
- Multiple tasks editing the same file simultaneously
- Cross-story dependencies that break independent testability
- Starting user stories before foundational phase completes

### Commit Strategy

- Commit after each completed task or logical group (e.g., all models for a story)
- Use conventional commits: `feat(US1): implement appointment booking endpoint`
- Tag commits with user story labels for traceability
- Push to remote after each phase checkpoint for backup
