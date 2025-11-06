<!--
Sync Impact Report:
Version Change: New Constitution → 1.0.0
Modified Principles: None (initial version)
Added Sections:
  - Core Principles (5 principles)
  - Security & Compliance Requirements
  - Development Workflow
  - Governance
Templates Status:
  ✅ spec-template.md - Aligned (user stories, requirements structure matches principles)
  ✅ plan-template.md - Aligned (Constitution Check gate exists, technical context supports principles)
  ✅ tasks-template.md - Aligned (phased approach, test-first structure matches principles)
Follow-up TODOs: None
-->

# Patient & Studio Scheduler Constitution

## Core Principles

### I. HIPAA Compliance First (NON-NEGOTIABLE)

All development decisions MUST prioritize HIPAA compliance and PHI protection above convenience or speed. This principle supersedes all others.

**Requirements:**
- All PHI data MUST use encryption at rest (AES-256) and in transit (TLS 1.3)
- Every data access operation MUST be logged in audit trail with actor, timestamp, and entity
- Multi-tenant data isolation MUST be enforced at database level (RLS or per-tenant schemas)
- All third-party services handling PHI MUST have signed Business Associate Agreements (BAAs)
- Security vulnerabilities MUST be addressed within 24 hours for critical, 7 days for high severity
- All authentication MUST enforce MFA for administrative access

**Rationale:** Healthcare data breaches carry severe penalties ($50k+ per record), legal liability, and reputational damage. HIPAA compliance is not optional and cannot be retrofitted easily.

### II. Simplicity Over Scale

Start simple and scale only when proven necessary. Avoid premature optimization and over-engineering.

**Requirements:**
- Choose the simplest technology that meets current requirements (not projected future needs)
- New complexity MUST be justified against simpler alternatives in writing before adoption
- Infrastructure decisions MUST be based on current scale (MVP: <100 tenants, not 10k+ projections)
- Default to managed services over self-hosted solutions unless cost or compliance requires otherwise
- YAGNI principle applies: "You Aren't Gonna Need It" until you actually do

**Rationale:** Over-engineering delays time-to-market, increases costs, and adds operational burden. The comprehensive review identified this as the primary risk: planning for 10k tenants while targeting 50. Start simple, validate market fit, then scale.

### III. Data Isolation & Security

Multi-tenant architecture MUST enforce strict data isolation to prevent cross-tenant data leakage.

**Requirements:**
- Database MUST enforce tenant isolation via Row-Level Security (RLS) policies or per-tenant schemas
- All queries MUST include tenant context validation
- API endpoints MUST verify tenant authorization before data access
- File storage MUST use tenant-specific prefixes with IAM policies preventing cross-tenant access
- Session tokens MUST include and validate tenant_id claims
- All PII fields (SSN, payment cards) MUST use application-level encryption with tenant-specific keys

**Rationale:** A single misconfigured RLS policy or missing tenant filter could expose PHI across tenants—a catastrophic HIPAA violation with severe legal and financial consequences. Defense in depth is critical.

### IV. Test-First for Healthcare (NON-NEGOTIABLE)

Tests MUST be written before implementation for all features handling PHI or business-critical operations.

**Requirements:**
- Security-critical features MUST have contract tests written first that FAIL before implementation
- All data access logic MUST have integration tests validating tenant isolation
- PHI encryption/decryption MUST have unit tests verifying correct implementation
- Authentication and authorization flows MUST have end-to-end tests
- Audit logging MUST have tests verifying all required events are captured
- Red-Green-Refactor cycle: Write test → Verify failure → Implement → Verify pass → Refactor

**Rationale:** Healthcare software errors can harm patients and violate compliance. Test-first ensures requirements are clear, testable, and validated. Retrofitting tests after implementation is unreliable for security-critical code.

### V. Cost Transparency & Monitoring

Infrastructure costs MUST be realistic, monitored, and aligned with business model.

**Requirements:**
- All cost estimates MUST include itemized breakdown (compute, storage, networking, third-party services)
- Cost projections MUST be validated against AWS pricing calculator or equivalent
- Budget MUST include 20% contingency for unexpected costs
- Production MUST have cost monitoring alerts at 80% and 100% of monthly budget
- All major infrastructure decisions MUST include cost comparison of alternatives
- Cost-per-tenant metrics MUST be tracked monthly to ensure unit economics work

**Rationale:** The initial plan estimated $80/month for 50 tenants; reality is $1,500+/month—a 19x underestimate. Unrealistic cost projections lead to funding shortfalls and business failure. Transparency prevents surprises.

## Security & Compliance Requirements

### Mandatory Security Controls

All features MUST implement:

1. **Authentication & Authorization**
   - Auth0 OIDC integration with tenant-aware RBAC
   - MFA required for administrative users
   - Session timeout: 15 minutes inactivity, 8 hours absolute
   - Password policy: 12+ characters, complexity requirements, 90-day expiration

2. **Encryption**
   - Database encryption-at-rest (AWS RDS encryption)
   - Field-level encryption for SSN, payment cards (AWS KMS with per-tenant keys)
   - TLS 1.3 for all data in transit
   - Encrypted backups with 30-day retention

3. **Audit Logging**
   - All PHI access logged: who, what, when, tenant
   - All authentication events logged: success, failure, lockout
   - All administrative actions logged: config changes, user management
   - Logs retained for 7 years (HIPAA requirement)
   - Logs stored in tamper-evident format (CloudWatch with retention lock)

4. **Rate Limiting & DDoS Protection**
   - API rate limits per tenant: 600 requests/minute
   - Login attempts limited: 5 per 15 minutes per IP
   - Expensive operations throttled: AI features 20/minute
   - AWS WAF with OWASP Top 10 rules

5. **Data Retention & Deletion**
   - Medical records retained minimum 6 years (HIPAA)
   - Patient data deletion process for GDPR "right to be forgotten" (if applicable)
   - Soft delete with audit trail (not hard delete)

### BAA Requirements

Before using any third-party service that may handle PHI:

1. Verify service is HIPAA-eligible
2. Obtain signed Business Associate Agreement (BAA)
3. Configure service for maximum security (encryption, access controls)
4. Document data flow and PHI exposure in security documentation
5. Review BAA annually and after any service changes

**Prohibited without BAA:** Grafana Cloud, LaunchDarkly, unsecured monitoring tools, analytics platforms

**Approved with BAA:** AWS services (RDS, S3, etc.), Auth0, OpenAI (with zero-retention mode), Stripe

## Development Workflow

### Phased Delivery Approach

All features MUST follow this phased approach:

**Phase 0: Specification**
- User stories with acceptance criteria
- Functional requirements clearly defined
- Edge cases and error scenarios documented
- Success criteria established

**Phase 1: Planning & Design**
- Technical architecture documented
- Database schema designed with tenant isolation
- API contracts defined
- Security controls identified
- Cost estimates validated

**Phase 2: Test-First Implementation**
- Write contract tests for APIs (MUST fail initially)
- Write integration tests for data access (MUST fail initially)
- Implement features to pass tests
- Add unit tests for complex logic
- Security review for PHI handling

**Phase 3: Quality Gates**
- All tests passing (no skipped tests)
- Code review completed (security focus)
- Audit logging verified
- Cost monitoring configured
- Documentation updated

### Constitution Compliance Gates

Before any feature proceeds to implementation:

1. **Security Gate**: Does feature handle PHI? If yes, encryption and audit logging plan required
2. **Isolation Gate**: Does feature access tenant data? If yes, tenant isolation strategy documented
3. **Complexity Gate**: Is architecture simpler than alternatives? If no, written justification required
4. **Cost Gate**: Are infrastructure costs realistic and monitored? If no, revise estimates
5. **Testing Gate**: Are test cases defined and ready to fail? If no, write tests first

Any gate failure BLOCKS implementation until resolved.

### Code Review Requirements

All pull requests MUST:

- Include description of what changed and why
- Reference user story or requirement ID
- Pass all automated tests (no skipped tests)
- Include security reviewer approval if touching PHI or authentication
- Demonstrate tenant isolation testing if querying multi-tenant data
- Update documentation if changing APIs or architecture
- Verify no secrets in code (use Secrets Manager)

## Governance

### Amendment Process

This constitution can be amended through:

1. **Proposal**: Document proposed change with rationale
2. **Review**: Technical lead + security reviewer approval required
3. **Impact Analysis**: Document effects on existing features and templates
4. **Version Bump**: Follow semantic versioning (MAJOR.MINOR.PATCH)
5. **Template Sync**: Update all dependent templates and documentation
6. **Announcement**: Communicate changes to all team members

### Version Semantics

- **MAJOR**: Backward-incompatible changes (e.g., removing a principle, adding new mandatory gate)
- **MINOR**: New principles or sections added, expanded guidance
- **PATCH**: Clarifications, wording improvements, typo fixes

### Compliance Reviews

- **Quarterly**: Review all principles against current implementation
- **Pre-Launch**: Full security audit and HIPAA compliance validation
- **Post-Incident**: Review and update principles after any security incident
- **Annually**: External penetration testing and compliance audit

### Enforcement

- All PRs MUST be checked against constitution principles
- Any principle violation MUST be documented and justified in writing
- Security principle violations (I, III, IV) cannot be overridden without CISO approval
- Repeated violations require process improvement and team training

### Related Documentation

- **Implementation Plans**: Must reference constitution in "Constitution Check" section
- **Specifications**: Must align requirements with security principles
- **Tasks**: Must include security and testing tasks per principles
- **Architecture Decisions**: Must justify complexity against Principle II

**Version**: 1.0.0 | **Ratified**: 2025-11-06 | **Last Amended**: 2025-11-06
