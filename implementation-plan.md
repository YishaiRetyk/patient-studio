# Patient & Studio Scheduler - Implementation Plan

This document captures all accepted architectural and development decisions for the Patient & Studio Scheduler healthcare SaaS platform. The implementation plan prioritizes HIPAA compliance and secure handling of patient data throughout all aspects of the application.

## 1. Architecture Decisions

### Multi-Tenancy Architecture

**Implemented Approach**: Hybrid approach starting with row-level security while designing for potential migration to schema-per-tenant for larger clients.

**Implementation Guidelines**:
- Add `tenant_id` to all relevant tables as a foreign key to the tenants table
- Create database policies for row-level security enforcement
- Design application service layer to always filter by tenant_id
- Create a tenant context middleware for API requests
- Implement database connection architecture that would support future schema-per-tenant
- Document upgrade path for migrating specific tenants to dedicated schemas

### PHI Security Implementation

**Implemented Approach**: Field-level encryption with AWS KMS for PHI data, providing a balance of security, compliance, and performance.

**Implementation Guidelines**:
- Identify all PHI fields requiring encryption
- Create an encryption service using AWS KMS for key management
- Implement automatic encryption/decryption in the repository layer
- Set up key rotation policies (quarterly rotation)
- Implement audit logging for all encryption/decryption operations
- Use deterministic encryption for fields that need to be searchable
- Create indexes on frequently queried encrypted fields to optimize performance
- Cache decrypted data where appropriate to minimize KMS API calls

### Optimistic Locking Strategy

**Implemented Approach**: Field-level conflict detection for calendar events, combined with version tracking for integrity verification.

**Implementation Guidelines**:
- Add version field to appointment and related entities
- Track the original state of the entity when fetched
- On update, compare current database state with original fetch state
- Allow partial updates where non-conflicting fields can be saved
- Develop a conflict resolution UI pattern for user-friendly handling of conflicts
- Implement specific conflict resolution strategies for different entity types
- Use WebSockets to notify users of concurrent edits in real-time
- Implement retry mechanisms for failed updates

### Authentication Implementation

**Implemented Approach**: Hybrid approach with Auth0 for user authentication and API keys for service-to-service communication.

**Implementation Guidelines**:
- Set up Auth0 tenant with appropriate application types
- Configure Auth0 for RBAC with custom claims for roles and permissions
- Implement JWT validation middleware in NestJS
- Create API key management system for service-to-service communication
- Establish clear token refresh strategy
- Implement Auth0 Actions for custom onboarding logic and role mapping
- Set up MFA requirement for admin and clinician roles
- Create AuthService to abstract provider-specific details

### Database Schema Design

**Implemented Approach**: Balanced approach with normalized base schema and materialized views for performance optimization.

**Implementation Guidelines**:
- Design core schema following normalization principles with tenant_id in relevant tables
- Create foreign key constraints with cascading updates/deletes where appropriate
- Add comprehensive indexes for tenant_id combined with frequently queried fields
- Create materialized views for complex reporting queries
- Implement scheduled refresh for materialized views
- Follow consistent naming conventions
- Use JSONB columns for flexible attributes with validation constraints
- Implement proper index strategy for JSONB columns (GIN indexes)

### React State Management

**Implemented Approach**: React Query for server state and Zustand for local state management.

**Implementation Guidelines**:
- Set up React Query for all API data fetching with standardized configurations
- Implement Zustand stores for UI state
- Create custom hooks to abstract state management details
- Establish patterns for coordinated updates
- Implement proper loading state handling
- Set up persistence where needed

## 2. Development Environment

### Docker Container Configuration

**Implementation Details**:
- PostgreSQL 16 with required extensions (uuid-ossp, pgcrypto, pg_stat_statements, temporal_tables)
- Redis 7.2 with configuration for caching and BullMQ job queues
- MinIO for S3-compatible storage with separate buckets for different data types
- Mailpit for email testing with web interface
- Dedicated network and volumes for all services with proper security settings
- Health checks and resource limits for all containers

### Environment Variables Management

**Implementation Details**:
- Prefixed environment variables by service for clear organization
- External secret manager with local fallback for secure secret management
- Base + override pattern for environment differentiation
- Schema-based validation using Zod for environment variables
- Comprehensive documentation with examples
- Security considerations including encryption, least privilege access, and audit logging

### Local Development Workflow

**Implementation Details**:
- Hybrid approach with development proxy for hot reloading
- Explicit migration commands with status tracking for database management
- Service groups with dependencies for startup orchestration
- Hybrid approach with data snapshots for local data management
- Debugging setup with structured logging
- TDD approach with watch mode for local testing
- Generated developer portal for documentation access

## 3. IDE Configuration

### VS Code Dev Container

**Implementation Details**:
- Base container with customization layers for different developer roles
- Docker Compose configuration for development environment
- Post-creation commands for setup automation

### VS Code Extensions

**Implementation Details**:
- Tiered extension approach with core extensions automatically installed
- Role-specific extension packs for frontend, backend, and database development
- Documentation and collaboration tools included

### Workspace Settings

**Implementation Details**:
- Core settings enforced through settings.json
- Additional recommended settings provided but not enforced
- Consistent formatting and linting configurations

### Debugging Configuration

**Implementation Details**:
- Modular debug configurations for different services
- Compound debug configurations for full-stack debugging
- Source map configurations for accurate debugging

### Task Automation

**Implementation Details**:
- Hybrid approach integrating with Makefile commands
- Common development tasks configured with keyboard shortcuts
- Standardized command structure for consistency

### Code Snippets

**Implementation Details**:
- Progressive integration of snippets for common patterns
- Framework-specific snippets for increased productivity
- Standardized structure following project conventions

## 4. Code Quality Tools

### Linting Standards

**Implementation Details**:
- Tiered ESLint configuration with shared core rules
- Frontend-specific configuration for React
- Backend-specific configuration for NestJS
- TypeScript-specific rules for type safety
- Security-focused rules for HIPAA compliance

### Formatting Standards

**Implementation Details**:
- Minimal Prettier customization with clear guidelines
- EditorConfig for IDE consistency
- Formatting decisions documented with rationale
- Special case formatting guidelines for specific file types

### Static Analysis

**Implementation Details**:
- Strategic tool selection including SonarCloud, ESLint with typescript-eslint, and React-specific analyzers
- Security-focused analysis with NodeJsScan, npm audit, OWASP Dependency-Check, and Bearer
- Performance analysis with Lighthouse CI and TypeScript Project References
- Healthcare-specific severity levels for different types of issues

### Pre-commit Hooks

**Implementation Details**:
- Staged files plus critical checks approach
- Husky for pre-commit and pre-push hooks
- Lint-staged for efficient linting of changed files
- Critical checks scripts for PHI detection and security verification
- Healthcare-specific validations
- Commit message standards following conventional commits

### Testing Tools and Quality Gates

**Implementation Details**:
- Jest configuration with coverage thresholds
- Frontend testing extensions including Testing Library, MSW, and Jest-axe
- Backend testing extensions including Supertest, Testcontainers, and Pactum
- E2E testing with Cypress
- Testing quality gates with higher thresholds for PHI-handling components

### Code Quality Metrics

**Implementation Details**:
- Core metrics including test coverage, static analysis issues, accessibility scores, bundle size, performance metrics, and technical debt ratio
- SonarCloud configuration for continuous monitoring
- Quality gates with context-sensitive thresholds
- Healthcare-specific metrics for PHI data exposure risk, authentication correctness, and HIPAA compliance
- Regular review process for continuous improvement

## 5. CI/CD Pipeline

### Continuous Integration

**Implementation Details**:
- GitHub Actions for automated builds, tests, and deployments
- Separate workflows for development, staging, and production
- Enhanced security scanning for healthcare-related requirements
- HIPAA compliance verification steps
- Scheduled security audits
- Custom PHI detection scripts

### Deployment Strategy

**Implementation Details**:
- Environment-specific deployment configurations
- Blue-green deployment strategy for zero-downtime updates
- Automated rollback capabilities
- Production safeguards requiring manual approval
- Database migration safety measures

## 6. Next Steps

1. Implement Docker Compose setup for local development environment
2. Set up VS Code Dev Container configuration
3. Configure ESLint and Prettier with agreed standards
4. Create initial database schema with tenant isolation
5. Implement NestJS application with authentication integration
6. Set up React application with state management pattern
7. Configure CI/CD pipeline with security focus

## 7. Success Criteria

1. Development environment fully functional with all required services
2. IDE configuration standardized and documented
3. Code quality tools enforcing security and HIPAA requirements
4. Initial multi-tenant database schema with row-level security
5. Authentication with Auth0 working for user login
6. Frontend and backend applications communicating correctly
7. CI/CD pipeline performing all required security checks 