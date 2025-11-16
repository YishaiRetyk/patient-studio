# Developer Quickstart: Simplified MVP

**Feature**: 001-simplified-mvp
**Date**: 2025-11-06
**Target Audience**: Backend and frontend developers joining the project

This guide will help you set up your local development environment and understand the project structure.

---

## Prerequisites

- **Node.js**: v20 LTS or higher
- **pnpm**: v8 or higher (`npm install -g pnpm`)
- **Docker**: v24 or higher (for local PostgreSQL)
- **AWS CLI**: v2 (for KMS encryption testing)
- **Auth0 Account**: Developer account with HIPAA BAA (for testing)

---

## Quick Start (5 Minutes)

### 1. Clone and Install

```bash
# Clone repository
git clone <repository-url>
cd patient-studio

# Switch to feature branch
git checkout 001-simplified-mvp

# Install dependencies (backend + frontend)
pnpm install
```

### 2. Start Local Services

```bash
# Start PostgreSQL + Redis + MinIO (S3 mock) via Docker Compose
docker-compose up -d

# Verify services are running
docker-compose ps

# Expected output:
# - postgres: healthy (port 5432)
# - redis: healthy (port 6379)
# - minio: healthy (port 9000)
```

### 3. Configure Environment

```bash
# Backend environment
cd backend
cp .env.example .env

# Edit .env with your Auth0 credentials
# Required variables:
# - DATABASE_URL
# - AUTH0_DOMAIN
# - AUTH0_CLIENT_ID
# - AUTH0_CLIENT_SECRET
# - AWS_KMS_KEY_ID (for field-level encryption)
# - STRIPE_API_KEY
# - OPENAI_API_KEY
```

### 4. Run Database Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations (creates tables, enables RLS)
npx prisma migrate dev --name init

# Seed test data
npx prisma db seed
```

### 5. Start Development Servers

```bash
# Terminal 1: Backend API (NestJS)
cd backend
pnpm run start:dev
# Runs on http://localhost:3000

# Terminal 2: Frontend (Next.js)
cd frontend
pnpm run dev
# Runs on http://localhost:3001
```

### 6. Verify Setup

```bash
# Test backend health check
curl http://localhost:3000/api/health
# Expected: {"status": "ok"}

# Open frontend in browser
open http://localhost:3001
```

---

## Project Structure

```
patient-studio/
├── backend/                 # NestJS backend API
│   ├── src/
│   │   ├── modules/         # Feature modules (auth, patients, appointments, etc.)
│   │   ├── common/          # Shared utilities (guards, decorators, filters)
│   │   ├── database/        # Prisma schema, migrations, RLS policies
│   │   └── config/          # Configuration files
│   ├── tests/               # Contract, integration, unit tests
│   ├── prisma/              # Prisma schema and migrations
│   └── package.json
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js 14 app directory (routes)
│   │   ├── components/      # Reusable React components
│   │   ├── lib/             # API client, utilities
│   │   └── stores/          # Zustand state management
│   ├── tests/               # Playwright E2E tests
│   └── package.json
├── infrastructure/          # Terraform IaC
│   └── terraform/           # AWS Fargate, RDS, S3 config
├── specs/                   # Feature specifications
│   └── 001-simplified-mvp/  # This feature's docs
└── docker-compose.yml       # Local development services
```

---

## Key Development Workflows

### Adding a New API Endpoint

1. **Define contract** in `specs/001-simplified-mvp/contracts/`
2. **Write contract test** in `backend/tests/contract/<module>.contract.spec.ts`
3. **Verify test fails** (Red)
4. **Implement controller** in `backend/src/modules/<module>/<module>.controller.ts`
5. **Implement service** in `backend/src/modules/<module>/<module>.service.ts`
6. **Add unit tests** in `backend/tests/unit/<module>.service.spec.ts`
7. **Verify tests pass** (Green)
8. **Refactor** if needed

Example:
```typescript
// backend/src/modules/patients/patients.controller.ts
@Controller('patients')
@UseGuards(JwtAuthGuard, TenantGuard)
export class PatientsController {
  constructor(
    private patientsService: PatientsService,
    private auditService: AuditService
  ) {}

  @Post()
  @HttpCode(201)
  async createPatient(
    @Body() createPatientDto: CreatePatientDto,
    @Tenant() tenantId: string,
    @User() user: JwtPayload
  ) {
    const patient = await this.patientsService.create(createPatientDto, tenantId);

    // Audit logging (automatic via interceptor, but can be explicit)
    await this.auditService.logPhiAccess({
      userId: user.sub,
      tenantId,
      patientId: patient.id,
      action: 'CREATE',
      entityType: 'patient',
      entityId: patient.id
    });

    return patient;
  }
}
```

### Testing Tenant Isolation

**Integration test example:**
```typescript
// backend/tests/integration/tenant-isolation.spec.ts
describe('Tenant Isolation', () => {
  it('should prevent cross-tenant patient access', async () => {
    // Create two tenants with patients
    const tenant1 = await createTestTenant();
    const tenant2 = await createTestTenant();

    const patient1 = await createTestPatient(tenant1.id);
    const patient2 = await createTestPatient(tenant2.id);

    // Login as tenant1 user
    const token1 = await getAuthToken(tenant1.id);

    // Attempt to access tenant2's patient
    const response = await request(app.getHttpServer())
      .get(`/api/v1/patients/${patient2.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .set('X-Tenant-ID', tenant1.id);

    // Should return 404 (not 403, to prevent enumeration)
    expect(response.status).toBe(404);
  });
});
```

### Running Tests

```bash
# Backend tests
cd backend

# Unit tests (fast, no DB)
pnpm test

# Integration tests (requires test DB)
pnpm test:integration

# Contract tests (API contract validation)
pnpm test:contract

# E2E tests (full backend + DB)
pnpm test:e2e

# Frontend tests
cd frontend

# Unit tests (React components)
pnpm test

# E2E tests (Playwright, requires both backend + frontend running)
pnpm test:e2e
```

### Database Migrations

```bash
# Create new migration
npx prisma migrate dev --name add_notes_table

# Apply migrations to production
npx prisma migrate deploy

# Reset database (WARNING: deletes all data)
npx prisma migrate reset

# View database in Prisma Studio
npx prisma studio
```

### Working with Field-Level Encryption

```typescript
// Encryption happens automatically via Prisma middleware
// Writing encrypted field
await prisma.patient.create({
  data: {
    tenantId: 'tenant-uuid',
    fullName: 'John Doe',
    ssnEncrypted: '123-45-6789', // Automatically encrypted with tenant's KMS key
    // ...
  }
});

// Reading encrypted field
const patient = await prisma.patient.findUnique({
  where: { id: 'patient-uuid' }
});
console.log(patient.ssnEncrypted); // Automatically decrypted: "123-45-6789"

// Encryption service is injectable for manual encryption
@Injectable()
export class MyService {
  constructor(private encryption: EncryptionService) {}

  async encryptSensitiveData(value: string, tenantId: string) {
    return this.encryption.encryptField(value, tenantId);
  }
}
```

---

## Common Tasks

### Adding a New Tenant (Seeding)

```typescript
// Run in Prisma Studio or via seed script
const tenant = await prisma.tenant.create({
  data: {
    practiceName: 'Test Clinic',
    subscriptionPlan: 'BASIC',
    status: 'ACTIVE'
  }
});

// Create admin user for tenant
const user = await prisma.user.create({
  data: {
    tenantId: tenant.id,
    email: 'admin@testclinic.com',
    role: 'ADMIN',
    authProviderId: 'auth0|test-admin',
    status: 'ACTIVE'
  }
});
```

### Testing AI Autocompletion

```bash
# Start backend with OpenAI API key in .env
OPENAI_API_KEY=sk-...

# Test AI completion endpoint
curl -X POST http://localhost:3000/api/v1/notes/ai-complete \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Tenant-ID: $TENANT_ID" \
  -H "Content-Type: application/json" \
  -d '{
    "section": "assessment",
    "context": "Patient presents with lower back pain, duration 3 weeks..."
  }'
```

### Testing Stripe Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local backend
stripe listen --forward-to localhost:3000/api/v1/webhooks/stripe

# Trigger test payment success event
stripe trigger invoice.payment_succeeded
```

---

## Debugging

### Enable Debug Logging

```bash
# Backend (NestJS)
LOG_LEVEL=debug pnpm run start:dev

# Prisma query logging
DEBUG=prisma:query pnpm run start:dev

# All debug output
DEBUG=* pnpm run start:dev
```

### Common Issues

**Issue: "RLS policy violation"**
```
Error: new row violates row security policy
```
**Solution**: Ensure tenant context is set before Prisma query:
```typescript
await prisma.$executeRaw`SET LOCAL app.current_tenant_id = ${tenantId}`;
```

**Issue: "KMS decryption failed"**
```
Error: AccessDeniedException: User is not authorized to perform: kms:Decrypt
```
**Solution**: Check AWS credentials and KMS key permissions:
```bash
aws kms describe-key --key-id alias/tenant-<tenant-id>
```

**Issue: "Auth0 token invalid"**
```
Error: 401 Unauthorized
```
**Solution**: Verify Auth0 configuration and token expiration:
```typescript
// Check token claims
const decoded = jwt.decode(token);
console.log('Token expiration:', new Date(decoded.exp * 1000));
```

---

## Architecture Patterns

### Tenant Context Pattern

Every request MUST set tenant context before data access:

```typescript
// Automatic via TenantContextInterceptor
@UseInterceptors(TenantContextInterceptor)
@Controller('patients')
export class PatientsController {
  // Tenant context is automatically set from JWT + header validation
}

// Manual tenant context (for background jobs)
async function processWaitlist(tenantId: string) {
  await prisma.$executeRaw`SET LOCAL app.current_tenant_id = ${tenantId}`;
  // Now all queries are tenant-scoped
  const waitlist = await prisma.waitlistEntry.findMany({ where: { status: 'ACTIVE' } });
}
```

### Audit Logging Pattern

PHI access is logged automatically via interceptor:

```typescript
// Automatic logging for all @Controller endpoints
@UseInterceptors(AuditLoggingInterceptor)

// Manual logging for service-layer operations
@Injectable()
export class PatientsService {
  constructor(private audit: AuditService) {}

  async updatePatient(id: string, data: UpdatePatientDto, userId: string, tenantId: string) {
    const before = await this.findOne(id);
    const after = await prisma.patient.update({ where: { id }, data });

    await this.audit.logPhiAccess({
      userId,
      tenantId,
      patientId: id,
      action: 'UPDATE',
      entityType: 'patient',
      entityId: id,
      before,
      after
    });

    return after;
  }
}
```

### Rate Limiting Pattern

```typescript
// Apply rate limiting to expensive endpoints
@Controller('notes')
export class NotesController {
  @Post('ai-complete')
  @UseGuards(RateLimitGuard)
  @RateLimit({ limit: 20, window: 60000 }) // 20 requests per minute
  async aiComplete(@Body() dto: AiCompleteDto) {
    return this.aiService.complete(dto);
  }
}
```

---

## Next Steps

1. **Review**: Read through the [feature specification](./spec.md)
2. **Understand**: Review the [data model](./data-model.md) and entity relationships
3. **Explore**: Check the [research document](./research.md) for technology decisions
4. **Plan**: Review the [implementation plan](./plan.md) for overall architecture
5. **Implement**: Start with `/speckit.tasks` to generate task breakdown

---

## Resources

- **Prisma Docs**: https://www.prisma.io/docs/
- **NestJS Docs**: https://docs.nestjs.com/
- **Next.js 14 Docs**: https://nextjs.org/docs
- **Auth0 Docs**: https://auth0.com/docs
- **Stripe API**: https://stripe.com/docs/api
- **OpenAI API**: https://platform.openai.com/docs

---

## Getting Help

- **Technical Questions**: Check `docs/comprehensive-review.md` for architecture rationale
- **HIPAA Questions**: Review `.specify/memory/constitution.md` for compliance principles
- **Bugs**: Create issue with reproduction steps
- **Feature Requests**: Discuss in planning documents before implementation

---

**Last Updated**: 2025-11-06
**Document Owner**: Technical Lead
