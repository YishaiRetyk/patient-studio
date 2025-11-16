-- Tenant Isolation Policies
-- Patient & Studio Scheduler - Simplified MVP
-- Purpose: Create RLS policies to enforce tenant-level data isolation
-- Requirements: FR-038 (multi-tenant isolation), FR-041 (row-level security)

-- =============================================================================
-- Helper Function: Get Current Tenant ID from Session Variable
-- =============================================================================

CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN NULLIF(current_setting('app.current_tenant_id', TRUE), '')::UUID;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- =============================================================================
-- Tenant Isolation Policies
-- =============================================================================

-- Users Table
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_users_insert ON users
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Practitioners Table
CREATE POLICY tenant_isolation_practitioners ON practitioners
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_practitioners_insert ON practitioners
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Patients Table
CREATE POLICY tenant_isolation_patients ON patients
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_patients_insert ON patients
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Allergies Table
CREATE POLICY tenant_isolation_allergies ON allergies
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_allergies_insert ON allergies
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Medications Table
CREATE POLICY tenant_isolation_medications ON medications
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_medications_insert ON medications
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Appointments Table
CREATE POLICY tenant_isolation_appointments ON appointments
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_appointments_insert ON appointments
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Waitlist Entries Table
CREATE POLICY tenant_isolation_waitlist_entries ON waitlist_entries
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_waitlist_entries_insert ON waitlist_entries
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Clinical Notes Table
CREATE POLICY tenant_isolation_clinical_notes ON clinical_notes
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_clinical_notes_insert ON clinical_notes
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Invoices Table
CREATE POLICY tenant_isolation_invoices ON invoices
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_invoices_insert ON invoices
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- Audit Events Table
CREATE POLICY tenant_isolation_audit_events ON audit_events
  USING (tenant_id = current_tenant_id());

CREATE POLICY tenant_isolation_audit_events_insert ON audit_events
  FOR INSERT
  WITH CHECK (tenant_id = current_tenant_id());

-- =============================================================================
-- Verification Queries
-- =============================================================================

-- To verify RLS is working, connect as the application user and run:
/*
-- Set tenant context
SET app.current_tenant_id = 'your-tenant-uuid-here';

-- Test queries - should only return rows for the current tenant
SELECT * FROM patients;
SELECT * FROM appointments;

-- Reset tenant context
RESET app.current_tenant_id;

-- Test queries - should return zero rows (RLS blocks access)
SELECT * FROM patients; -- Should return 0 rows
*/
