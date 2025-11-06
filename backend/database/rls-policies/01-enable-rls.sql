-- Row-Level Security (RLS) Enablement Script
-- Patient & Studio Scheduler - Simplified MVP
-- Purpose: Enable RLS on all tenant-scoped tables to enforce multi-tenant isolation
-- Requirements: FR-038 (multi-tenant isolation), FR-041 (row-level security)

-- =============================================================================
-- Enable PostgreSQL Extensions
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" SCHEMA extensions;

-- =============================================================================
-- Enable Row-Level Security on All Tenant-Scoped Tables
-- =============================================================================

-- User management tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE practitioners ENABLE ROW LEVEL SECURITY;

-- Patient management tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

-- Appointment scheduling tables
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE waitlist_entries ENABLE ROW LEVEL SECURITY;

-- Clinical documentation tables
ALTER TABLE clinical_notes ENABLE ROW LEVEL SECURITY;

-- Billing tables
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Audit logging tables
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- Create Application Role for Tenant Context
-- =============================================================================

-- This role is used by the NestJS application to set the current tenant
-- The application must execute: SET LOCAL app.current_tenant_id = '<tenant_uuid>';

-- Grant usage to the application database user
-- Replace 'patient_studio_app' with your actual application database user
-- GRANT USAGE ON SCHEMA public TO patient_studio_app;
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO patient_studio_app;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO patient_studio_app;
