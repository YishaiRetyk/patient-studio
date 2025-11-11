# API Contracts: Simplified MVP

**Feature**: 001-simplified-mvp
**Date**: 2025-11-06
**Status**: Ready for implementation

This directory will contain OpenAPI 3.1 specifications for all REST API endpoints.

## API Structure

### Base URL

- **Development**: `http://localhost:3000/api/v1`
- **Staging**: `https://api-staging.patient-studio.com/api/v1`
- **Production**: `https://api.patient-studio.com/api/v1`

### Authentication

All API endpoints (except public patient booking) require:
- **Authorization**: `Bearer <access_token>` (Auth0 JWT)
- **X-Tenant-ID**: `<tenant-uuid>` (validated against JWT claim)

### API Modules

| Module | Base Path | Description | OpenAPI Spec |
|--------|-----------|-------------|--------------|
| **Authentication** | `/auth` | Login, logout, token refresh, MFA | `auth.yaml` |
| **Patients** | `/patients` | Patient CRUD, search, allergies, medications | `patients.yaml` |
| **Appointments** | `/appointments` | Scheduling, availability, cancellation, waitlist | `appointments.yaml` |
| **Clinical Notes** | `/notes` | SOAP note creation, AI autocompletion, PDF export | `notes.yaml` |
| **Billing** | `/billing` | Invoice generation, payments, Stripe webhooks | `billing.yaml` |
| **Practitioners** | `/practitioners` | Profile management, availability settings, calendar export | `practitioners.yaml` |

### Common Patterns

#### Tenant Isolation

All requests automatically filtered by tenant context:
```http
GET /api/v1/patients
Authorization: Bearer eyJ...
X-Tenant-ID: 550e8400-e29b-41d4-a716-446655440000

Response:
{
  "data": [...], // Only patients for this tenant
  "meta": { "total": 42, "page": 1 }
}
```

#### Error Responses

Standard error format (RFC 7807):
```json
{
  "type": "https://patient-studio.com/errors/validation-error",
  "title": "Validation Failed",
  "status": 400,
  "detail": "One or more fields contain invalid values",
  "instance": "/api/v1/patients",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format",
      "code": "INVALID_EMAIL"
    }
  ]
}
```

#### Pagination

Query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sort`: Sort field (e.g., `created_at:desc`)

Response meta:
```json
{
  "data": [...],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Key Endpoints

#### Authentication
- `POST /auth/login` - Initiate Auth0 login flow
- `POST /auth/callback` - Auth0 callback handler
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Invalidate session

#### Patients
- `GET /patients` - List patients (with search)
- `POST /patients` - Create patient
- `GET /patients/:id` - Get patient details
- `PATCH /patients/:id` - Update patient
- `DELETE /patients/:id` - Soft delete patient
- `POST /patients/:id/allergies` - Add allergy
- `POST /patients/:id/medications` - Add medication

#### Appointments
- `GET /appointments/availability` - Get available slots
- `POST /appointments` - Book appointment
- `PATCH /appointments/:id` - Reschedule appointment
- `DELETE /appointments/:id` - Cancel appointment
- `POST /appointments/waitlist` - Add to waitlist
- `GET /calendar/export` - Get iCal feed URL

#### Clinical Notes
- `POST /notes` - Create SOAP note
- `PATCH /notes/:id` - Update SOAP note
- `POST /notes/ai-complete` - Get AI autocompletion suggestion
- `GET /notes/:id/pdf` - Export note as PDF
- `PATCH /notes/:id/share` - Share note with patient

#### Billing
- `POST /invoices` - Generate invoice
- `GET /invoices/:id` - Get invoice details
- `POST /invoices/:id/send` - Send invoice to patient
- `GET /invoices/export` - Export billing data (CSV)
- `POST /webhooks/stripe` - Stripe payment webhook

### Rate Limits

Per Constitution requirements (FR-048, FR-049):
- **General API**: 600 requests/minute per tenant
- **Login attempts**: 5 attempts/15 minutes per IP
- **AI autocompletion**: 20 requests/minute per user

Rate limit headers:
```http
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 542
X-RateLimit-Reset: 1699564800
```

### HIPAA Compliance

All API requests accessing PHI automatically logged to audit trail:
- User ID
- Tenant ID
- Patient ID (if applicable)
- Action (READ/CREATE/UPDATE/DELETE)
- Timestamp
- IP address
- User agent

### Next Steps

1. Generate full OpenAPI specs for each module
2. Set up API documentation (Swagger UI)
3. Generate TypeScript SDK from OpenAPI specs
4. Configure API Gateway rate limiting
5. Set up Stripe webhook endpoints
6. Implement contract tests (Pact)

### Development Commands

```bash
# Generate OpenAPI specs
npm run openapi:generate

# Validate OpenAPI specs
npm run openapi:validate

# Generate TypeScript client
npm run openapi:codegen

# Start Swagger UI (development)
npm run docs:serve
```
