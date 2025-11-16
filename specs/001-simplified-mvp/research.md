# Research: Simplified MVP Technology Decisions

**Feature**: 001-simplified-mvp
**Date**: 2025-11-06
**Status**: Complete

This document consolidates research findings for key technology decisions in the Simplified MVP implementation.

---

## 1. Auth0 Integration Best Practices

### Decision

Use **Auth0 Essentials plan** with HIPAA BAA for authentication and authorization with tenant-aware RBAC.

### Configuration

**HIPAA-Compliant Setup:**
- Enable Auth0's HIPAA BAA through Enterprise Support
- Configure secure password policies (12+ chars, complexity, 90-day expiration)
- Enable MFA universally for practitioner roles using TOTP (Time-based One-Time Password)
- Disable unused authentication methods (reduce attack surface)
- Enable anomaly detection and brute force protection

**Tenant-Aware RBAC:**
```javascript
// JWT Custom Claims Structure
{
  "sub": "auth0|user-id",
  "email": "user@example.com",
  "https://patient-studio.com/tenant_id": "tenant-uuid",
  "https://patient-studio.com/roles": ["practitioner"],
  "https://patient-studio.com/permissions": [
    "read:patients",
    "write:appointments",
    "read:notes"
  ]
}
```

**Implementation Pattern:**
- Use Auth0 Actions (post-login flow) to inject tenant_id claim from user metadata
- Store tenant association in Auth0 `app_metadata` (not user-editable)
- Create custom namespace for claims to avoid conflicts
- Use Auth0 Organizations feature to map tenants (alternative approach)

**MFA Enforcement Strategy:**
- Conditional MFA: Required for all practitioner/admin roles
- Optional for patients (reduce friction for self-service booking)
- Use Auth0 Guardian app or SMS-based OTP
- Grace period: 7 days after first login before enforcing MFA

**Session Management:**
- Access token expiration: 15 minutes (short-lived)
- Refresh token expiration: 8 hours absolute (aligns with FR-004)
- Inactivity timeout: Implement client-side with last activity tracking
- Use rotating refresh tokens for enhanced security

### Rationale

- **HIPAA Compliance**: Auth0 provides BAA, is HIPAA-eligible, handles PHI (email, name) securely
- **Reduced Development Time**: Managed authentication eliminates need to build MFA, password reset, account recovery
- **Tenant Isolation**: Custom claims in JWT enable server-side tenant validation on every request
- **Scalability**: Auth0 handles 50-10k tenants without infrastructure changes
- **Cost**: $240/month for Essentials with unlimited users, BAA included

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **AWS Cognito** | Native AWS integration, lower cost ($5/month) | No HIPAA BAA for Standard plan, limited RBAC | ❌ Rejected |
| **Keycloak (self-hosted)** | Open source, full control, no per-user costs | Requires managing HA infrastructure, no BAA by default | ❌ Rejected |
| **Custom Auth** | Maximum control, no third-party dependency | High development cost (4-6 weeks), security risk, no BAA | ❌ Rejected |

---

## 2. Prisma + PostgreSQL RLS

### Decision

Use **Prisma ORM 5.x** with **PostgreSQL Row-Level Security (RLS)** for tenant isolation.

### Implementation Strategy

**RLS Policy Pattern:**
```sql
-- Enable RLS on all tenant-scoped tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- Create policy for tenant isolation
CREATE POLICY tenant_isolation_policy ON patients
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON appointments
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY tenant_isolation_policy ON clinical_notes
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

-- Allow superuser (for migrations/admin) to bypass RLS
-- In application code, always set tenant context before queries
```

**Prisma + RLS Integration:**
```typescript
// Tenant context middleware for NestJS
@Injectable()
export class TenantContextInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.user?.tenant_id; // From Auth0 JWT

    if (!tenantId) {
      throw new UnauthorizedException('Tenant context required');
    }

    // Set PostgreSQL session variable before Prisma query
    return from(this.prisma.$executeRaw`
      SET LOCAL app.current_tenant_id = ${tenantId}
    `).pipe(
      switchMap(() => next.handle())
    );
  }
}

// Prisma Client Extension for automatic tenant context
const prisma = new PrismaClient().$extends({
  query: {
    async $allOperations({ operation, model, args, query }) {
      // Validate tenant_id is always present in where clause
      if (model && !['tenant', 'audit_event'].includes(model)) {
        if (!args.where?.tenant_id) {
          throw new Error(`Query on ${model} missing tenant_id filter`);
        }
      }
      return query(args);
    }
  }
});
```

**Performance Considerations:**
- RLS adds ~5-10ms overhead per query (acceptable for <100 concurrent users)
- Index on tenant_id for all tables: `CREATE INDEX idx_patients_tenant_id ON patients(tenant_id);`
- Connection pooling: Use Prisma with PgBouncer for efficient connection reuse
- Query optimization: Ensure `tenant_id` is always the first filter predicate

**Migration Strategy:**
```typescript
// Prisma migration example
-- CreateTable
CREATE TABLE "patients" (
  "id" UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id"),
  "full_name" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP DEFAULT NOW(),
  UNIQUE("tenant_id", "email") -- Tenant-scoped uniqueness
);

CREATE INDEX "idx_patients_tenant_id" ON "patients"("tenant_id");

-- Enable RLS
ALTER TABLE "patients" ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_policy" ON "patients"
  USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

### Rationale

- **Security**: RLS enforced at database level - even SQL injection can't bypass tenant isolation
- **Simplicity**: Single database, single connection pool, no complex query routing
- **HIPAA Compliance**: Defense-in-depth for multi-tenant PHI protection
- **Prisma Benefits**: Type-safe queries, automatic migrations, excellent DX
- **Cost**: Single RDS instance ($100/month) vs separate databases per tenant (unsustainable at scale)

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Schema-per-tenant** | Better isolation, easier backups | Complex migrations (1000s of schemas), high operational overhead | ⏸ Deferred to Phase 2 |
| **Database-per-tenant** | Ultimate isolation | Unsustainable cost ($100/month × 50 tenants), complex connection management | ❌ Rejected for MVP |
| **Application-level filtering** | Simple to implement | No defense if application bug bypasses filter, not HIPAA-compliant | ❌ Rejected |

---

## 3. OpenAI API for Healthcare

### Decision

Use **OpenAI GPT-4o API** with signed BAA and zero-retention mode for SOAP note autocompletion.

### HIPAA-Compliant Configuration

**BAA Requirements:**
- OpenAI provides HIPAA BAA for API Enterprise customers
- Enable zero-retention mode: Data not used for training, deleted after request
- API calls must not log request/response bodies containing PHI
- Use dedicated API key per environment (dev/staging/prod)

**PHI De-identification Strategy:**
```typescript
// Before sending to OpenAI, de-identify PHI
function deidentifyNoteContext(noteText: string, patientName: string): string {
  return noteText
    .replace(new RegExp(patientName, 'gi'), 'Patient A')
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '###-##-####') // SSN
    .replace(/\b\d{10}\b/g, '##########') // Phone
    .replace(/\b[\w.-]+@[\w.-]+\.\w+\b/g, 'email@redacted'); // Email
}

// OpenAI API call with de-identified context
async function generateSoapSuggestion(partialNote: string, patientName: string): Promise<string> {
  const deidentifiedContext = deidentifyNoteContext(partialNote, patientName);

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are a medical documentation assistant. Complete the SOAP note section based on context. Be concise and clinical.'
      },
      {
        role: 'user',
        content: `Continue this SOAP note:\n\n${deidentifiedContext}`
      }
    ],
    max_tokens: 150,
    temperature: 0.3, // Lower temperature for consistency
    user: 'tenant-id-hashed' // For OpenAI rate limiting
  });

  return response.choices[0].message.content;
}
```

**Rate Limiting & Cost Management:**
- Limit to 20 requests/minute per user (FR-049)
- Implement client-side debouncing (500ms delay after user stops typing)
- Cache suggestions for identical input (Redis with 1-hour TTL)
- Cost estimate: $0.03 per 1k input tokens, $0.06 per 1k output tokens
- Monthly budget: $100-300 for 1,000 appointments with 50% AI usage

**Prompt Engineering for SOAP Notes:**
```typescript
const SOAP_SECTION_PROMPTS = {
  subjective: `Complete the Subjective section. Include patient's chief complaint, symptoms, duration, and relevant history in 2-3 sentences.`,

  objective: `Complete the Objective section. Include vital signs, physical examination findings, and observable data in 2-3 sentences.`,

  assessment: `Complete the Assessment section. Provide clinical impression, differential diagnoses, and severity assessment in 2-3 sentences.`,

  plan: `Complete the Plan section. Include treatment plan, medications, follow-up schedule, and patient education in 3-4 bullet points.`
};
```

### Rationale

- **Time Savings**: 40% reduction in documentation time (SC-006) translates to 10-15 minutes saved per note
- **Clinical Quality**: GPT-4o trained on medical literature, provides clinically appropriate suggestions
- **HIPAA Compliance**: BAA + zero-retention + de-identification meets regulatory requirements
- **User Control**: Practitioners accept/edit/reject suggestions (FR-025) - AI is assistive, not autonomous
- **Cost-Effective**: ~$0.50 per appointment with AI usage, acceptable for $50-100/tenant/month pricing

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Anthropic Claude** | Strong medical reasoning, BAA available | Higher cost ($15/$75 per 1M tokens), newer API | ⏸ Revisit if OpenAI pricing increases |
| **Med-PaLM (Google)** | Medical-specific training | No public API, complex setup, unclear BAA | ❌ Rejected |
| **Open-source LLM (Llama 2)** | No API costs, full control | No BAA, requires significant infrastructure, quality concerns | ❌ Rejected |
| **No AI (manual only)** | No compliance risk | Misses key differentiator, slower documentation | ❌ Rejected - AI is MVP feature |

---

## 4. Stripe Healthcare Payments

### Decision

Use **Stripe** with signed BAA for payment processing, invoicing, and PCI compliance.

### HIPAA & PCI Compliance

**BAA Coverage:**
- Stripe provides HIPAA BAA for healthcare businesses
- Stripe handles PCI DSS Level 1 compliance (no PCI scope for application)
- Use Stripe Checkout or Payment Elements (hosted payment form) - PHI never touches our servers

**Invoice Workflow:**
```typescript
// Create invoice in Stripe
async function createInvoice(appointmentId: string, amount: number, patientEmail: string) {
  // Create customer (idempotent)
  const customer = await stripe.customers.create({
    email: patientEmail,
    metadata: {
      tenant_id: 'tenant-uuid',
      patient_id: 'patient-uuid'
    }
  });

  // Create invoice
  const invoice = await stripe.invoices.create({
    customer: customer.id,
    collection_method: 'send_invoice',
    days_until_due: 30,
    metadata: {
      appointment_id: appointmentId,
      tenant_id: 'tenant-uuid'
    }
  });

  // Add line item
  await stripe.invoiceItems.create({
    customer: customer.id,
    invoice: invoice.id,
    amount: amount * 100, // Convert to cents
    currency: 'usd',
    description: 'Therapy Session - [Date]'
  });

  // Finalize and send
  await stripe.invoices.finalizeInvoice(invoice.id);
  await stripe.invoices.sendInvoice(invoice.id);

  return invoice;
}

// Webhook handling for payment events
@Post('/webhooks/stripe')
async handleStripeWebhook(@Body() body, @Headers('stripe-signature') signature) {
  const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  switch (event.type) {
    case 'invoice.paid':
      // Update invoice status in database
      await this.billingService.markInvoicePaid(event.data.object.id);
      // Send confirmation email to practitioner
      await this.emailService.sendPaymentConfirmation(...);
      break;

    case 'invoice.payment_failed':
      // Notify practitioner and patient
      await this.emailService.sendPaymentFailure(...);
      break;
  }
}
```

**Payment Failure Handling:**
- Retry failed payments automatically (Stripe Smart Retries)
- Send notification to patient after 1st failure
- Allow manual retry through patient portal
- After 3 failures, mark invoice as "collections" and notify practitioner
- Log all payment events in audit trail (FR-043)

**Tax Calculation:**
- Use Stripe Tax for automatic sales tax calculation based on patient location
- Configurable tax rates per state/jurisdiction
- Include tax breakdown in invoice export (FR-036)

### Rationale

- **Compliance**: Stripe's BAA + PCI compliance eliminates 90% of payment security burden
- **User Experience**: Stripe Checkout provides optimal mobile payment UX
- **Reliability**: 99.99% uptime SLA, handles payment routing automatically
- **International**: Supports 135+ currencies (future expansion ready)
- **Cost**: 2.9% + 30¢ per transaction (industry standard, no monthly fees)

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Square** | Simple setup, healthcare focus | Higher fees (3.5% + 15¢), weaker API, unclear BAA | ❌ Rejected |
| **PayPal/Braintree** | Familiar to users | Higher fees, complex API, less reliable webhooks | ❌ Rejected |
| **Authorize.Net** | Healthcare-specific features | Outdated API, poor DX, $25/month + fees | ❌ Rejected |
| **Manual payments (offline)** | No processing fees | Poor UX, no automation, cash flow delays | ❌ Rejected |

---

## 5. AWS Fargate + RDS Deployment

### Decision

Use **AWS Fargate (ECS)** for compute and **RDS PostgreSQL Multi-AZ** for database.

### High Availability Configuration

**RDS Multi-AZ Setup:**
```hcl
# Terraform configuration
resource "aws_db_instance" "postgresql" {
  identifier              = "patient-studio-mvp"
  engine                  = "postgres"
  engine_version          = "16.1"
  instance_class          = "db.t4g.medium"
  allocated_storage       = 100
  storage_type            = "gp3"
  storage_encrypted       = true
  kms_key_id              = aws_kms_key.rds.arn

  multi_az                = true  # Automatic failover
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]

  backup_retention_period = 30
  backup_window           = "03:00-04:00"  # Low traffic window
  maintenance_window      = "Sun:04:00-Sun:05:00"

  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]

  deletion_protection     = true
  skip_final_snapshot     = false
  final_snapshot_identifier = "patient-studio-mvp-final-snapshot"

  tags = {
    Environment = "production"
    HIPAA       = "true"
  }
}
```

**Fargate Auto-Scaling:**
```hcl
resource "aws_ecs_service" "backend" {
  name            = "patient-studio-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 2  # Start with 2 tasks

  launch_type     = "FARGATE"
  platform_version = "LATEST"

  network_configuration {
    subnets          = aws_subnet.private[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.backend.arn
    container_name   = "backend"
    container_port   = 3000
  }

  # Auto-scaling based on CPU and memory
  enable_ecs_managed_tags = true
  propagate_tags          = "SERVICE"
}

resource "aws_appautoscaling_target" "backend" {
  max_capacity       = 10  # Scale up to 10 tasks
  min_capacity       = 2   # Minimum 2 for HA
  resource_id        = "service/${aws_ecs_cluster.main.name}/${aws_ecs_service.backend.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  service_namespace  = "ecs"
}

resource "aws_appautoscaling_policy" "backend_cpu" {
  name               = "backend-cpu-scaling"
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.backend.resource_id
  scalable_dimension = aws_appautoscaling_target.backend.scalable_dimension
  service_namespace  = aws_appautoscaling_target.backend.service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ECSServiceAverageCPUUtilization"
    }
    target_value = 70.0  # Scale when CPU > 70%
    scale_in_cooldown  = 300
    scale_out_cooldown = 60
  }
}
```

**Backup & Disaster Recovery:**
- Automated daily RDS snapshots (30-day retention)
- Point-in-time recovery (PITR) enabled (5-minute RPO)
- Cross-region backup replication (if required for Phase 2)
- Disaster recovery RTO: 4 hours (restore from snapshot + deploy)
- Disaster recovery RPO: 5 minutes (latest transaction replay)

**Cost Optimization Strategies:**
1. **Savings Plans**: 1-year compute savings plan (30% discount) = $42/month savings
2. **Reserved RDS**: 1-year RDS reservation (35% discount) = $35/month savings
3. **Spot Instances**: Not recommended for healthcare (availability risk)
4. **Right-sizing**: Start with t4g.medium RDS, monitor CloudWatch, downgrade to t4g.small if underutilized

### Rationale

- **Simplicity**: Fargate eliminates EC2 management, auto-scaling built-in
- **High Availability**: Multi-AZ RDS provides automatic failover (99.95% uptime)
- **Security**: Private subnets, security groups, no SSH access needed
- **HIPAA Compliance**: AWS provides HIPAA BAA, encryption at rest/transit enabled
- **Cost**: $265-320/month AWS baseline (vs $1,000+ for EKS + Aurora Serverless v2)

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **EKS (Kubernetes)** | Advanced orchestration, industry standard | 10x operational complexity, $300+/month for control plane + nodes | ❌ Rejected per Constitution Principle II |
| **EC2 + Auto Scaling Groups** | Lower cost with Reserved Instances | Requires managing OS patches, security updates, more operational burden | ❌ Rejected - Fargate simplicity preferred |
| **Aurora Serverless v2** | Auto-scaling compute | Cold start delays (20-30s), cost spikes, unpredictable latency | ❌ Rejected per comprehensive review |
| **Heroku/Render** | Fastest deployment | No HIPAA BAA, less control, vendor lock-in | ❌ Rejected - compliance requirement |

---

## 6. HIPAA Audit Logging with CloudWatch

### Decision

Use **AWS CloudWatch Logs** with retention lock and S3 Glacier archival for 7-year HIPAA compliance.

### Tamper-Evident Configuration

**CloudWatch Log Group Setup:**
```hcl
resource "aws_cloudwatch_log_group" "audit_logs" {
  name              = "/patient-studio/audit-logs"
  retention_in_days = 90  # Hot logs for 90 days

  kms_key_id = aws_kms_key.cloudwatch.arn

  tags = {
    HIPAA       = "true"
    Compliance  = "audit-trail"
  }
}

# Prevent accidental deletion
resource "aws_cloudwatch_log_resource_policy" "audit_retention_policy" {
  policy_name = "AuditLogRetentionLock"

  policy_document = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Deny"
        Principal = "*"
        Action = [
          "logs:DeleteLogGroup",
          "logs:DeleteLogStream",
          "logs:DeleteRetentionPolicy"
        ]
        Resource = aws_cloudwatch_log_group.audit_logs.arn
      }
    ]
  })
}
```

**Log Archival to S3 Glacier:**
```hcl
resource "aws_s3_bucket" "audit_archive" {
  bucket = "patient-studio-audit-archive"

  versioning {
    enabled = true
  }

  server_side_encryption_configuration {
    rule {
      apply_server_side_encryption_by_default {
        sse_algorithm     = "aws:kms"
        kms_master_key_id = aws_kms_key.s3.arn
      }
    }
  }

  object_lock_configuration {
    object_lock_enabled = "Enabled"

    rule {
      default_retention {
        mode = "GOVERNANCE"  # Prevent deletion for 7 years
        years = 7
      }
    }
  }

  lifecycle_rule {
    enabled = true

    transition {
      days          = 90
      storage_class = "GLACIER"
    }

    expiration {
      days = 2555  # 7 years + 5 days
    }
  }
}

resource "aws_cloudwatch_log_subscription_filter" "audit_to_s3" {
  name            = "audit-logs-to-s3"
  log_group_name  = aws_cloudwatch_log_group.audit_logs.name
  filter_pattern  = ""  # Ship all logs
  destination_arn = aws_kinesis_firehose_delivery_stream.audit_archive.arn
}

resource "aws_kinesis_firehose_delivery_stream" "audit_archive" {
  name        = "audit-logs-to-s3"
  destination = "extended_s3"

  extended_s3_configuration {
    role_arn   = aws_iam_role.firehose.arn
    bucket_arn = aws_s3_bucket.audit_archive.arn

    buffering_size     = 5   # MB
    buffering_interval = 300  # seconds

    compression_format = "GZIP"

    prefix              = "audit-logs/year=!{timestamp:yyyy}/month=!{timestamp:MM}/day=!{timestamp:dd}/"
    error_output_prefix = "audit-logs-errors/"
  }
}
```

**Application Logging Pattern:**
```typescript
// Audit logging service
@Injectable()
export class AuditService {
  constructor(
    @Inject('WINSTON_LOGGER') private logger: Logger,
    private prisma: PrismaService
  ) {}

  async logPhiAccess(event: {
    userId: string;
    tenantId: string;
    patientId: string;
    action: 'read' | 'create' | 'update' | 'delete';
    entityType: string;
    entityId: string;
    before?: any;
    after?: any;
  }) {
    // Log to CloudWatch (structured JSON)
    this.logger.info('PHI_ACCESS', {
      ...event,
      timestamp: new Date().toISOString(),
      eventType: 'PHI_ACCESS',
      ipAddress: this.getRequestIp(),
      userAgent: this.getUserAgent()
    });

    // Also persist to database for fast querying
    await this.prisma.auditEvent.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        eventType: 'PHI_ACCESS',
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        beforeValue: event.before ? JSON.stringify(event.before) : null,
        afterValue: event.after ? JSON.stringify(event.after) : null,
        timestamp: new Date()
      }
    });
  }

  async logAuthEvent(event: {
    userId?: string;
    email: string;
    action: 'login_success' | 'login_failure' | 'mfa_challenge' | 'logout' | 'lockout';
    ipAddress: string;
    reason?: string;
  }) {
    this.logger.info('AUTH_EVENT', {
      ...event,
      timestamp: new Date().toISOString(),
      eventType: 'AUTH_EVENT'
    });
  }

  async logAdminAction(event: {
    adminId: string;
    tenantId: string;
    action: 'user_created' | 'user_deleted' | 'role_changed' | 'config_updated';
    details: any;
  }) {
    this.logger.info('ADMIN_ACTION', {
      ...event,
      timestamp: new Date().toISOString(),
      eventType: 'ADMIN_ACTION'
    });
  }
}

// NestJS interceptor for automatic PHI access logging
@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body } = request;

    // Detect PHI access patterns
    const isPhiEndpoint = this.detectPhiEndpoint(url);

    if (isPhiEndpoint && user) {
      const action = this.mapHttpMethodToAction(method);

      return next.handle().pipe(
        tap(async (response) => {
          await this.auditService.logPhiAccess({
            userId: user.sub,
            tenantId: user.tenant_id,
            patientId: this.extractPatientId(url, body),
            action,
            entityType: this.extractEntityType(url),
            entityId: this.extractEntityId(url),
            before: method === 'PUT' || method === 'PATCH' ? body : undefined,
            after: response
          });
        })
      );
    }

    return next.handle();
  }
}
```

**Query Patterns for Compliance Audits:**
```typescript
// CloudWatch Insights queries for HIPAA audits

// Query 1: All PHI access by a specific user
const query1 = `
fields @timestamp, eventType, action, entityType, patientId
| filter eventType = "PHI_ACCESS" and userId = "auth0|user-123"
| sort @timestamp desc
`;

// Query 2: Failed login attempts in last 24 hours
const query2 = `
fields @timestamp, email, ipAddress, reason
| filter eventType = "AUTH_EVENT" and action = "login_failure"
| filter @timestamp > ago(24h)
| stats count() by email, ipAddress
| sort count desc
`;

// Query 3: All data access for a specific patient (for patient data request)
const query3 = `
fields @timestamp, userId, action, entityType
| filter eventType = "PHI_ACCESS" and patientId = "patient-uuid"
| sort @timestamp desc
`;

// Query 4: Admin actions in last 30 days
const query4 = `
fields @timestamp, adminId, action, details
| filter eventType = "ADMIN_ACTION"
| filter @timestamp > ago(30d)
| sort @timestamp desc
`;
```

### Cost-Effective Archival

**Cost Breakdown:**
- CloudWatch Logs ingestion: $0.50 per GB
- CloudWatch Logs storage (first 90 days): $0.03 per GB/month
- S3 Glacier storage (after 90 days): $0.004 per GB/month
- S3 Glacier retrieval (rare): $0.03 per GB

**Estimated Costs for 50 Tenants:**
- Audit log volume: ~500 MB/month
- CloudWatch costs: $0.25 ingestion + $0.015 storage = $0.265/month
- S3 Glacier costs (after 90 days): $0.002/month per month of logs
- 7-year total storage cost: ~$5 for entire archive

### Rationale

- **Tamper-Evident**: S3 Object Lock prevents deletion/modification for 7 years
- **Cost-Effective**: Glacier storage 10x cheaper than hot CloudWatch Logs
- **Fast Queries**: CloudWatch Insights for recent logs (90 days), S3 Select for archived
- **Compliance**: Meets HIPAA 7-year retention requirement (FR-046)
- **Automated**: Kinesis Firehose handles archival with no manual intervention

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|------------|------|------|----------|
| **Elasticsearch/Kibana** | Powerful search, dashboards | $300+/month for managed service, no tamper-evident | ❌ Rejected - cost prohibitive |
| **Splunk Cloud** | Industry standard for compliance | $150/GB/month (extremely expensive) | ❌ Rejected - cost |
| **PostgreSQL logging** | Simple, co-located with data | Not tamper-evident, expensive storage at scale, no archival | ❌ Rejected - compliance risk |
| **Third-party SIEM** | Advanced threat detection | $500+/month, overkill for MVP | ⏸ Deferred to Phase 3 |

---

## Summary of Technology Decisions

| Component | Technology | Key Rationale | Monthly Cost |
|-----------|-----------|---------------|--------------|
| **Authentication** | Auth0 Essentials | HIPAA BAA, managed MFA, tenant-aware RBAC | $240 |
| **Database** | RDS PostgreSQL Multi-AZ | Proven HIPAA compliance, RLS support, 99.95% uptime | $100 |
| **Compute** | AWS Fargate (ECS) | No infrastructure management, auto-scaling, simpler than K8s | $60 |
| **ORM** | Prisma 5.x | Type-safe queries, excellent DX, RLS integration | $0 |
| **Payments** | Stripe | BAA + PCI compliance, 99.99% uptime | 2.9% + 30¢/txn |
| **AI** | OpenAI GPT-4o | BAA available, best-in-class quality, cost-effective | $100-300 |
| **Email** | SendGrid | BAA available, reliable delivery | $20 |
| **Audit Logging** | CloudWatch + S3 Glacier | Tamper-evident, 7-year retention, cost-effective | $10-50 |
| **Monitoring** | CloudWatch + Sentry | Native AWS integration, error tracking | $29-79 |

**Total Infrastructure Cost**: $785-1,091/month base (excluding variable Stripe fees)

**Key Decisions Summary**:
1. ✅ Prioritize **HIPAA compliance** with BAAs for all third-party services
2. ✅ Choose **simplicity over complexity** (Fargate over K8s, RLS over schema-per-tenant)
3. ✅ Validate **realistic cost estimates** (19x higher than original plan, but accurate)
4. ✅ Enable **defense-in-depth security** (RLS + app-level validation + audit logging)
5. ✅ Support **test-first development** (Prisma migrations, contract tests, integration tests)

**Next Steps**: Proceed to Phase 1 design artifacts:
- `data-model.md`: Database schema with Prisma
- `contracts/`: OpenAPI specifications for REST API
- `quickstart.md`: Developer onboarding guide
