# Patient & Studio Scheduler - Simplified MVP

> HIPAA-compliant healthcare SaaS platform for appointment scheduling, clinical documentation, and billing

**Status**: Implementation in progress (Phase 1 complete)
**Feature Branch**: `001-simplified-mvp`
**Created**: 2025-11-06

---

## Overview

Patient Studio enables therapists, clinics, and wellness studios to:

- **Book appointments** with patient self-service and waitlist auto-fill
- **Document treatments** using SOAP notes with AI autocompletion
- **Handle billing** via Stripe integration with automated invoicing
- **Ensure HIPAA compliance** with encryption, audit logging, and multi-factor authentication

### Key Features (MVP Scope)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Patient Self-Service Booking** | Real-time availability, email confirmations, appointment reminders (48h & 2h) | P1 |
| **Practitioner Calendar** | View appointments, set availability, waitlist management | P2 |
| **SOAP Notes** | Structured clinical documentation with OpenAI-powered autocompletion | P3 |
| **Billing** | Stripe payment processing, invoice generation, email delivery | P4 |
| **Patient Safety** | Allergy & medication tracking with severity indicators | P5 |
| **HIPAA Compliance** | Field-level encryption (KMS), audit logging (7-year retention), MFA | P6 |

---

## Tech Stack

### Backend
- **Runtime**: Node.js 20 LTS with TypeScript 5.3
- **Framework**: NestJS 10.x (REST API)
- **Database**: PostgreSQL 16 with Prisma 5.x ORM
- **Security**: Row-Level Security (RLS) for multi-tenancy, AWS KMS for field-level encryption

### Frontend
- **Framework**: Next.js 14.x with React 18
- **Styling**: Tailwind CSS 3.x
- **State Management**: Zustand + TanStack Query

### Infrastructure
- **Compute**: AWS Fargate (ECS)
- **Database**: RDS PostgreSQL Multi-AZ with automated backups (30-day retention)
- **Storage**: S3 with Object Lock for audit logs
- **Monitoring**: CloudWatch + Sentry
- **IaC**: Terraform

### Third-Party Services
- **Auth**: Auth0 (OIDC + MFA)
- **Payments**: Stripe
- **Email**: SendGrid (with BAA)
- **AI**: OpenAI GPT-4 (with PHI de-identification)

---

## Project Structure

```
patient-studio/
├── backend/                # NestJS API
│   ├── src/
│   │   ├── modules/       # Feature modules (auth, patients, appointments, etc.)
│   │   ├── common/        # Shared utilities (encryption, guards, interceptors)
│   │   └── config/        # Configuration (Auth0, AWS, Sentry, etc.)
│   ├── prisma/            # Database schema and migrations
│   ├── tests/             # Integration and contract tests
│   └── Dockerfile
│
├── frontend/              # Next.js application
│   ├── src/
│   │   ├── app/          # Next.js 14 App Router pages
│   │   ├── components/   # React components
│   │   ├── lib/          # API client, utilities
│   │   └── hooks/        # Custom React hooks
│   ├── tests/e2e/        # Playwright E2E tests
│   └── Dockerfile
│
├── infrastructure/        # Terraform IaC
│   └── terraform/
│       ├── modules/      # Reusable modules (vpc, rds, ecs, security, reminders)
│       └── environments/ # Environment-specific configs (dev, staging, prod)
│
└── specs/                # Design documentation
    └── 001-simplified-mvp/
        ├── spec.md       # Feature requirements (57 FRs, 6 user stories)
        ├── plan.md       # Technical architecture
        ├── tasks.md      # 218 implementation tasks
        ├── data-model.md # Database schema design
        └── research.md   # Third-party integration research
```

---

## Quick Start

### Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose
- PostgreSQL 16 (or use Docker Compose)
- AWS CLI configured (for infrastructure deployment)

### Local Development

1. **Clone repository**
   ```bash
   git clone <repo-url>
   cd patient-studio
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your Auth0, Stripe, OpenAI, SendGrid, AWS credentials
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your Auth0 and Stripe public keys
   ```

4. **Start services with Docker Compose**
   ```bash
   cd ..
   docker-compose -f docker-compose.dev.yml up -d
   ```

   This starts:
   - PostgreSQL 16 on `localhost:5432`
   - Redis on `localhost:6379`
   - Mailpit (email testing) on `localhost:8025`
   - Backend on `localhost:3001`
   - Frontend on `localhost:3000`

5. **Run database migrations**
   ```bash
   cd backend
   npx prisma migrate dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001/api/v1
   - API Docs (Swagger): http://localhost:3001/api/docs
   - Mailpit UI: http://localhost:8025

### Running Tests

#### Backend Tests
```bash
cd backend

# Unit tests
npm run test

# Integration tests
npm run test -- --testMatch="**/tests/integration/**/*.spec.ts"

# Contract tests
npm run test -- --testMatch="**/tests/contract/**/*.spec.ts"

# Test coverage
npm run test:cov
```

#### Frontend Tests
```bash
cd frontend

# Unit tests
npm run test

# E2E tests (Playwright)
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui
```

---

## Development Workflow

### Test-First Development (Constitution Principle IV)

**CRITICAL**: All features handling Protected Health Information (PHI) MUST follow Red-Green-Refactor:

1. **RED**: Write test that FAILS (verifies feature doesn't exist yet)
2. **GREEN**: Implement minimum code to make test pass
3. **REFACTOR**: Clean up code while keeping tests green

Example from `tasks.md`:
```
# Phase 3: US1 - Patient Booking

## Test Tasks (Write First - MUST FAIL Before Implementation)
- [ ] T055 [US1] Write contract test for GET /appointments/availability endpoint
- [ ] T056 [US1] Write contract test for POST /appointments endpoint
- [ ] T057 [US1] Write integration test for appointment booking with optimistic locking
- [ ] T058 [US1] Write integration test for double-booking prevention
- [ ] T059 [US1] Write integration test for tenant isolation on appointments

## Implementation Tasks (After Tests Fail)
- [ ] T066 [US1] Create appointment module...
```

### Git Workflow

- **Main branch**: `main` (protected)
- **Feature branches**: `claude/rate-docs-reviews-011CUrtzSkicxTTxcuEFhnx4`
- **CI/CD**: GitHub Actions runs tests on all branches

---

## API Documentation

### Base URLs
- **Development**: `http://localhost:3001/api/v1`
- **Staging**: `https://api-staging.patient-studio.com/api/v1`
- **Production**: `https://api.patient-studio.com/api/v1`

### Authentication

All endpoints (except public patient booking) require:
- **Authorization**: `Bearer <access_token>` (Auth0 JWT)
- **X-Tenant-ID**: `<tenant-uuid>` (validated against JWT claim)

### Rate Limits (per FR-048, FR-049)
- **General API**: 600 requests/minute per tenant
- **Login attempts**: 5 attempts/15 minutes per IP
- **AI autocompletion**: 20 requests/minute per user

### Key Endpoints

See `specs/001-simplified-mvp/contracts/README.md` for full OpenAPI specifications.

---

## Deployment

### Infrastructure Provisioning (Terraform)

1. **Initialize Terraform**
   ```bash
   cd infrastructure/terraform
   terraform init -backend-config=environments/dev/backend.tfvars
   ```

2. **Plan infrastructure changes**
   ```bash
   terraform plan -var-file=environments/dev/terraform.tfvars
   ```

3. **Apply infrastructure**
   ```bash
   terraform apply -var-file=environments/dev/terraform.tfvars
   ```

### Application Deployment (AWS Fargate)

Backend and frontend Docker images are built via GitHub Actions and deployed to AWS ECR. ECS Fargate services automatically pull and run the latest images.

---

## HIPAA Compliance Features

### Data Protection
- **Encryption at rest**: PostgreSQL encryption via RDS, S3 bucket encryption
- **Encryption in transit**: TLS 1.3 for all API communication
- **Field-level encryption**: SSN, medical record numbers encrypted with AWS KMS (per-tenant keys)

### Access Control
- **Multi-factor authentication** (MFA) for all practitioners
- **Role-based access control** (RBAC): Admin, Practitioner, Patient
- **Row-level security** (RLS) for tenant isolation
- **Session management**: 15-min inactivity timeout, 8-hour absolute timeout

### Audit Logging
- **All PHI access logged** to CloudWatch with 7-year retention
- **Tamper-evident logs** via S3 Object Lock
- **Audit fields**: User ID, Tenant ID, Patient ID, Action, Timestamp, IP Address

### Automated Backups (FR-057)
- **RDS automated backups**: 30-day retention
- **Point-in-time recovery** (PITR) enabled
- **Multi-AZ deployment** for high availability (production)

---

## Documentation

- **[Feature Specification](specs/001-simplified-mvp/spec.md)**: 57 functional requirements, 6 user stories
- **[Technical Plan](specs/001-simplified-mvp/plan.md)**: Architecture decisions, cost estimates
- **[Implementation Tasks](specs/001-simplified-mvp/tasks.md)**: 218 tasks organized by user story
- **[Data Model](specs/001-simplified-mvp/data-model.md)**: Database schema, RLS policies
- **[API Contracts](specs/001-simplified-mvp/contracts/README.md)**: OpenAPI specifications
- **[Research](specs/001-simplified-mvp/research.md)**: Third-party integration patterns

---

## License

UNLICENSED - Proprietary

---

## Support

For questions or issues, contact: support@patient-studio.com
