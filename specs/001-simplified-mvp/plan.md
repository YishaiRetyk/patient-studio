# Implementation Plan: Simplified MVP for Patient & Studio Scheduler

**Branch**: `001-simplified-mvp` | **Date**: 2025-11-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-simplified-mvp/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

The Simplified MVP delivers a HIPAA-compliant healthcare SaaS platform for solo therapists and small clinics, enabling:
- **Patient self-service booking** with calendar view and waitlist auto-fill to maximize utilization
- **Clinical documentation** using fixed SOAP note templates with AI autocompletion (OpenAI GPT-4o)
- **Automated billing** with Stripe payment integration and CSV export for accounting
- **Security foundation** with encryption at rest/transit, audit logging, MFA, and tenant isolation

Technical approach prioritizes **simplicity over scale** per comprehensive review recommendations:
- AWS Fargate + RDS PostgreSQL instead of Kubernetes + Aurora Serverless v2
- REST API only (no GraphQL/gRPC complexity)
- Email reminders only (no SMS/WhatsApp for MVP)
- 1-way calendar export (iCal feed, not 2-way Google sync)
- Fixed SOAP template (no customization for MVP)

Target: 50 tenants in 16-20 weeks with infrastructure costs <$1,500/month.

## Technical Context

**Language/Version**: TypeScript 5.3 with Node.js 20 LTS (backend), TypeScript 5.3 with React 18 (frontend)
**Primary Dependencies**:
- Backend: NestJS 10.x, Prisma ORM 5.x, Auth0 SDK, Stripe SDK, OpenAI SDK, AWS SDK
- Frontend: Next.js 14.x, Tailwind CSS 3.x, shadcn/ui, React Query, Zustand

**Storage**: PostgreSQL 16 on AWS RDS Multi-AZ (t4g.medium)
**Testing**: Jest for unit/integration tests, Playwright for E2E tests, Pact for contract tests
**Target Platform**: AWS Fargate (ECS) for compute, CloudWatch for monitoring, S3 for file storage
**Project Type**: Web application (backend + frontend monorepo)
**Performance Goals**:
- API p95 latency <250ms
- Calendar view render <1 second
- Support 100 concurrent users
- 99.5% uptime (3.6 hours downtime/month acceptable)

**Constraints**:
- HIPAA compliance mandatory (all PHI encrypted, audit logging, BAAs required)
- Multi-tenant with strict isolation (RLS policies + tenant context validation)
- Infrastructure cost target: <$1,500/month for 50 tenants
- Timeline: 16-20 weeks to MVP launch

**Scale/Scope**:
- MVP: 50 tenants, 5,000 patients, 1,000 appointments/month
- Phase 2: 500 tenants, 50,000 patients, 10,000 appointments/month
- Phase 3: 10,000 tenants (deferred architecture decisions)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Gate 1: Security Gate - PHI Handling
**Status**: ✅ PASS

**Evaluation**:
- Feature handles PHI: Yes (patient names, DOB, phone, email, allergies, medications, clinical notes)
- Encryption plan:
  - ✅ TLS 1.3 for data in transit
  - ✅ AWS RDS encryption at rest (AES-256)
  - ✅ Field-level encryption for SSN and payment card data using AWS KMS with per-tenant keys
  - ✅ SOAP notes encrypted with per-tenant keys
- Audit logging plan:
  - ✅ All PHI access logged (FR-043)
  - ✅ All authentication events logged (FR-044)
  - ✅ All admin actions logged (FR-045)
  - ✅ 7-year retention in tamper-evident CloudWatch logs (FR-046, FR-047)

**Action Required**: Obtain signed BAAs before integration: Auth0, Stripe, OpenAI, SendGrid, Sentry, AWS.

### Gate 2: Isolation Gate - Tenant Data Access
**Status**: ✅ PASS

**Evaluation**:
- Feature accesses tenant data: Yes (all entities are tenant-scoped)
- Tenant isolation strategy:
  - ✅ Row-Level Security (RLS) policies on all database tables (FR-041)
  - ✅ Tenant context validation on every API request (FR-042)
  - ✅ All queries include tenant_id filter
  - ✅ Session tokens include tenant_id claim
  - ✅ S3 file storage uses tenant-specific prefixes with IAM policies
- Test plan: Integration tests validate cross-tenant data leakage prevention (SC-014)

**Action Required**: Implement comprehensive RLS policy testing in Phase 2.

### Gate 3: Complexity Gate - Architecture Simplicity
**Status**: ✅ PASS

**Evaluation**:
- Current architecture: AWS Fargate (ECS) + RDS PostgreSQL + REST API
- Simpler than alternatives: Yes
  - ❌ **Rejected**: Kubernetes (EKS) - unnecessary operational complexity for <100 tenants
  - ❌ **Rejected**: Aurora Serverless v2 - cold start latency unacceptable for healthcare
  - ❌ **Rejected**: GraphQL - adds complexity without clear MVP benefit
  - ❌ **Rejected**: BullMQ + Redis - SQS + Lambda simpler for async jobs
  - ❌ **Rejected**: 2-way Google Calendar sync - 1-way iCal export sufficient for MVP
- Justification: Follows Constitution Principle II (Simplicity Over Scale) and comprehensive review recommendations

### Gate 4: Cost Gate - Infrastructure Costs
**Status**: ✅ PASS

**Evaluation**:
- Cost estimate provided: Yes - $1,500/month for 50 tenants
- Itemized breakdown:
  - RDS PostgreSQL Multi-AZ (t4g.medium): $100/month
  - Fargate tasks (2 vCPU, 4GB RAM): $60/month
  - NAT Gateway: $45/month
  - Application Load Balancer: $25/month
  - S3 + backups: $10/month
  - CloudWatch Logs: $10-50/month
  - Secrets Manager: $5/month
  - AWS WAF: $10/month
  - **AWS Subtotal**: $265-320/month
  - Auth0 Essentials: $240/month
  - Stripe (2.9% + 30¢ per transaction): Variable
  - SendGrid (100k emails): $20/month
  - OpenAI API (GPT-4): $100-300/month
  - Sentry: $29/month
  - **Third-Party Subtotal**: $389-589/month
  - Contingency (20%): $131-182/month
  - **TOTAL**: $785-1,091/month base + Stripe fees
- Monitoring: CloudWatch alerts at 80% and 100% of monthly budget (FR-055, FR-056)
- Validated: Yes, against AWS pricing calculator and comprehensive review analysis

**Note**: Original estimate of $80/month was 14-19x too low. This realistic estimate aligns with comprehensive review findings.

### Gate 5: Testing Gate - Test Cases Defined
**Status**: ✅ PASS

**Evaluation**:
- Test cases defined: Yes (6 user stories with 4-5 acceptance scenarios each)
- Ready to fail: Yes (tests will be written before implementation per Constitution Principle IV)
- Coverage:
  - ✅ Contract tests for all API endpoints
  - ✅ Integration tests for tenant isolation (critical for HIPAA)
  - ✅ Unit tests for PHI encryption/decryption
  - ✅ E2E tests for authentication flows
  - ✅ Audit logging verification tests
- Test-first methodology: Red-Green-Refactor cycle mandatory for all PHI-handling features

### Constitution Compliance Summary

| Principle | Status | Notes |
|-----------|--------|-------|
| I. HIPAA Compliance First | ✅ PASS | Encryption, audit logging, MFA, BAAs all planned |
| II. Simplicity Over Scale | ✅ PASS | Fargate + RDS instead of K8s + Aurora, REST only, email only |
| III. Data Isolation & Security | ✅ PASS | RLS policies, tenant context validation, per-tenant encryption keys |
| IV. Test-First for Healthcare | ✅ PASS | Contract/integration/unit tests defined for all PHI features |
| V. Cost Transparency | ✅ PASS | Realistic $785-1,091/month estimate with 20% contingency |

**Overall Status**: ✅ ALL GATES PASSED - Proceed to Phase 0 Research

## Project Structure

### Documentation (this feature)

```text
specs/001-simplified-mvp/
├── spec.md                     # Feature specification (complete)
├── plan.md                     # This file (implementation plan)
├── research.md                 # Phase 0: Technology research & decisions
├── data-model.md               # Phase 1: Database schema & entities
├── quickstart.md               # Phase 1: Developer setup guide
├── contracts/                  # Phase 1: API contracts
│   ├── openapi.yaml           # REST API specification
│   ├── auth.yaml              # Authentication endpoints
│   ├── appointments.yaml      # Appointment management endpoints
│   ├── patients.yaml          # Patient management endpoints
│   ├── notes.yaml             # Clinical notes endpoints
│   └── billing.yaml           # Billing & payments endpoints
├── checklists/                 # Quality validation checklists
│   └── requirements.md        # Spec quality checklist (complete)
└── tasks.md                    # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Web application structure (backend + frontend monorepo)

backend/
├── src/
│   ├── app.module.ts              # NestJS root module
│   ├── main.ts                    # Application entry point
│   ├── modules/
│   │   ├── auth/                  # Authentication & authorization
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── guards/            # RBAC guards
│   │   │   └── strategies/        # Auth0 strategy
│   │   ├── tenants/               # Tenant management
│   │   │   ├── tenants.module.ts
│   │   │   ├── tenants.service.ts
│   │   │   └── tenant.context.ts  # RLS context provider
│   │   ├── patients/              # Patient management
│   │   │   ├── patients.module.ts
│   │   │   ├── patients.service.ts
│   │   │   ├── patients.controller.ts
│   │   │   └── dto/               # Data transfer objects
│   │   ├── appointments/          # Appointment scheduling
│   │   │   ├── appointments.module.ts
│   │   │   ├── appointments.service.ts
│   │   │   ├── appointments.controller.ts
│   │   │   └── waitlist.service.ts
│   │   ├── clinical-notes/        # SOAP notes
│   │   │   ├── notes.module.ts
│   │   │   ├── notes.service.ts
│   │   │   ├── notes.controller.ts
│   │   │   └── ai.service.ts      # OpenAI integration
│   │   ├── billing/               # Invoices & payments
│   │   │   ├── billing.module.ts
│   │   │   ├── billing.service.ts
│   │   │   ├── billing.controller.ts
│   │   │   └── stripe.service.ts
│   │   └── audit/                 # Audit logging
│   │       ├── audit.module.ts
│   │       ├── audit.service.ts
│   │       └── audit.interceptor.ts
│   ├── common/
│   │   ├── decorators/            # Custom decorators (e.g., @Tenant)
│   │   ├── filters/               # Exception filters
│   │   ├── interceptors/          # Logging, transformation
│   │   ├── pipes/                 # Validation pipes
│   │   └── guards/                # Rate limiting, tenant isolation
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma      # Database schema
│   │   │   └── migrations/        # Database migrations
│   │   └── rls-policies/          # RLS policy SQL scripts
│   └── config/
│       ├── app.config.ts
│       ├── database.config.ts
│       ├── auth.config.ts
│       └── aws.config.ts
├── tests/
│   ├── contract/                  # Contract tests (Pact)
│   │   ├── auth.contract.spec.ts
│   │   ├── appointments.contract.spec.ts
│   │   └── notes.contract.spec.ts
│   ├── integration/               # Integration tests
│   │   ├── tenant-isolation.spec.ts
│   │   ├── appointments.spec.ts
│   │   └── audit-logging.spec.ts
│   └── unit/                      # Unit tests
│       ├── patients.service.spec.ts
│       ├── encryption.service.spec.ts
│       └── waitlist.service.spec.ts
├── package.json
├── tsconfig.json
├── jest.config.js
├── Dockerfile
└── .env.example

frontend/
├── src/
│   ├── app/                       # Next.js app directory
│   │   ├── layout.tsx             # Root layout
│   │   ├── page.tsx               # Home page
│   │   ├── (auth)/                # Authentication routes
│   │   │   ├── login/
│   │   │   └── callback/
│   │   ├── (patient)/             # Patient portal routes
│   │   │   ├── dashboard/
│   │   │   ├── appointments/
│   │   │   └── profile/
│   │   └── (practitioner)/        # Practitioner dashboard routes
│   │       ├── dashboard/
│   │       ├── calendar/
│   │       ├── patients/
│   │       ├── notes/
│   │       └── billing/
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── auth/                  # Auth components
│   │   ├── calendar/              # Calendar components
│   │   ├── appointments/          # Appointment components
│   │   ├── notes/                 # SOAP note editor
│   │   └── billing/               # Invoice components
│   ├── lib/
│   │   ├── api/                   # API client (React Query)
│   │   ├── auth/                  # Auth0 integration
│   │   └── utils/                 # Utility functions
│   ├── stores/                    # Zustand stores
│   │   ├── auth.store.ts
│   │   ├── tenant.store.ts
│   │   └── calendar.store.ts
│   └── types/                     # TypeScript types
├── public/
├── tests/
│   └── e2e/                       # Playwright E2E tests
│       ├── booking-flow.spec.ts
│       ├── notes-creation.spec.ts
│       └── payment-flow.spec.ts
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
├── playwright.config.ts
└── .env.local.example

# Infrastructure as Code
infrastructure/
├── terraform/
│   ├── modules/
│   │   ├── networking/            # VPC, subnets, NAT
│   │   ├── ecs/                   # Fargate cluster & services
│   │   ├── rds/                   # PostgreSQL database
│   │   ├── s3/                    # File storage buckets
│   │   └── monitoring/            # CloudWatch, alarms
│   ├── environments/
│   │   ├── dev/
│   │   ├── staging/
│   │   └── prod/
│   └── main.tf
└── scripts/
    ├── deploy.sh
    └── rollback.sh

# CI/CD
.github/
└── workflows/
    ├── backend-ci.yml             # Backend tests & build
    ├── frontend-ci.yml            # Frontend tests & build
    ├── security-scan.yml          # OWASP dependency check, Trivy
    └── deploy.yml                 # Deploy to Fargate
```

**Structure Decision**:

Selected **Option 2: Web application** structure with separate `backend/` and `frontend/` directories in a monorepo. This decision is based on:

1. **Clear separation of concerns**: Backend (NestJS) and frontend (Next.js) have distinct build processes, dependencies, and deployment targets
2. **Team scalability**: Allows backend and frontend developers to work independently
3. **Deployment flexibility**: Backend deploys to Fargate, frontend can deploy to Vercel or S3+CloudFront
4. **Monorepo benefits**: Shared TypeScript types, coordinated versioning, single CI/CD pipeline
5. **Constitution compliance**: Aligns with Principle II (Simplicity) - standard web app pattern, no unnecessary abstraction

The structure avoids Option 3 (Mobile + API) because:
- MVP uses responsive PWA, not native mobile apps
- React PWA sufficient for patient mobile booking experience
- Native mobile apps deferred to Phase 2 if needed

## Complexity Tracking

**No violations** - All architecture decisions align with Constitution principles. This tracking section would only be filled if:
- Using more than 3 projects (we have 2: backend, frontend)
- Introducing complexity without justification (e.g., microservices for MVP)
- Adding non-standard patterns without rationale

---

## Phase 0: Research (Next Steps)

The following research tasks will be documented in `research.md`:

1. **Auth0 Integration Best Practices**
   - HIPAA-compliant configuration
   - Tenant-aware RBAC setup
   - MFA enforcement strategies
   - Session management patterns

2. **Prisma + PostgreSQL RLS**
   - Row-Level Security policy implementation with Prisma
   - Tenant context injection patterns
   - Query performance with RLS overhead
   - Migration strategies for RLS policies

3. **OpenAI API for Healthcare**
   - BAA requirements and zero-retention mode
   - PHI de-identification strategies
   - Rate limiting and cost management
   - Prompt engineering for SOAP note autocompletion

4. **Stripe Healthcare Payments**
   - BAA coverage and PCI compliance
   - Invoice workflow best practices
   - Payment failure handling patterns
   - Tax calculation and reporting

5. **AWS Fargate + RDS Deployment**
   - High availability configuration (Multi-AZ)
   - Auto-scaling strategies for healthcare workloads
   - Cost optimization (Savings Plans, Reserved Capacity)
   - Backup and disaster recovery procedures

6. **HIPAA Audit Logging with CloudWatch**
   - Tamper-evident log storage configuration
   - 7-year retention with lifecycle policies
   - Cost-effective archival to S3 Glacier
   - Query patterns for compliance audits

---

**Next Command**: Research tasks will be executed and consolidated in `research.md`, followed by Phase 1 design artifacts (`data-model.md`, `contracts/`, `quickstart.md`).
