-- =======================================================================
-- JUDICIAL DOCUMENT ARCHIVE & CASE PROCEEDINGS SYSTEM
-- Native PostgreSQL Database Migration (DDL)
-- Version: 001_judicial_schema.sql
-- =======================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Clean up existing tables in reverse dependency order (if executing a re-run)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS document_registry CASCADE;
DROP TABLE IF EXISTS case_proceedings CASCADE;
DROP TABLE IF EXISTS cases CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- -----------------------------------------------------------------------
-- 1. USERS & ROLES TABLE (RBAC Domain)
-- -----------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(256) NOT NULL,
    email VARCHAR(256) NOT NULL UNIQUE,
    role VARCHAR(64) NOT NULL CHECK (role IN ('chief_registrar', 'judge', 'clerk', 'auditor', 'system_admin')),
    badge_number VARCHAR(64) NOT NULL UNIQUE,
    court_jurisdiction VARCHAR(256) NOT NULL DEFAULT 'Federal High Court of Justice',
    division VARCHAR(128) NOT NULL DEFAULT 'Appellate & Commercial Division',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_email ON users(email);

-- -----------------------------------------------------------------------
-- 2. CORE CASES TABLE
-- -----------------------------------------------------------------------
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_title VARCHAR(512) NOT NULL,
    suit_number VARCHAR(128) NOT NULL UNIQUE,
    normalized_suit_number VARCHAR(128) NOT NULL UNIQUE, -- Strip whitespace/special chars, uppercase
    date_delivered DATE NULL,
    subject_matter VARCHAR(256) NOT NULL,
    document_type VARCHAR(64) NOT NULL CHECK (document_type IN ('judgment', 'ruling', 'order', 'case_file')),
    status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending_review', 'published', 'archived')),
    is_sealed BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
    updated_by UUID REFERENCES users(id) ON UPDATE CASCADE,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Composite Index for fast multidimensional registry search & filtering
CREATE INDEX idx_cases_search ON cases(normalized_suit_number, subject_matter, document_type, status);
CREATE INDEX idx_cases_suit_number ON cases(suit_number);
CREATE INDEX idx_cases_status ON cases(status);
CREATE INDEX idx_cases_sealed ON cases(is_sealed);
CREATE INDEX idx_cases_date_delivered ON cases(date_delivered DESC);
CREATE INDEX idx_cases_deleted_at ON cases(deleted_at) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------------------
-- 3. CASE PROCEEDINGS / SESSION TRANSCRIPTS
-- -----------------------------------------------------------------------
CREATE TABLE case_proceedings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE CASCADE ON UPDATE CASCADE,
    session_date DATE NOT NULL,
    presiding_judge VARCHAR(256) NOT NULL,
    summary_notes TEXT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
    created_by UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_case_session UNIQUE(case_id, session_date)
);

-- Chronological index for fast timeline generation per docket
CREATE INDEX idx_proceedings_chronological ON case_proceedings(case_id, session_date DESC);
CREATE INDEX idx_proceedings_status ON case_proceedings(status);

-- -----------------------------------------------------------------------
-- 4. DOCUMENT FILE STORAGE REGISTRY
-- -----------------------------------------------------------------------
CREATE TABLE document_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachable_type VARCHAR(256) NOT NULL CHECK (attachable_type IN ('Case', 'CaseProceeding')),
    attachable_id UUID NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_path VARCHAR(512) NOT NULL,
    mime_type VARCHAR(128) NOT NULL CHECK (mime_type IN ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword')),
    file_hash CHAR(64) NOT NULL, -- SHA-256 for tamper proofing and deduplication
    file_size BIGINT NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON UPDATE CASCADE,
    deleted_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_file_hash ON document_registry(file_hash);
CREATE INDEX idx_doc_attachable ON document_registry(attachable_type, attachable_id);
CREATE INDEX idx_doc_created_by ON document_registry(created_by);

-- -----------------------------------------------------------------------
-- 5. CRYPTOGRAPHICALLY CHAINED IMMUTABLE AUDIT TRAIL
-- -----------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON UPDATE CASCADE,
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(128) NOT NULL,
    target_id UUID NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    user_agent TEXT NULL,
    metadata JSONB NULL,
    previous_hash CHAR(64) NULL,
    current_hash CHAR(64) NOT NULL, -- SHA256(id | user_id | action | target_id | created_at | previous_hash)
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_audit_created_at ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_current_hash ON audit_logs(current_hash);
CREATE INDEX idx_audit_previous_hash ON audit_logs(previous_hash);

-- -----------------------------------------------------------------------
-- 6. AUDIT INTEGRITY TRIGGER FUNCTION (OPTIONAL DB-LEVEL VALIDATION)
-- -----------------------------------------------------------------------
COMMENT ON TABLE audit_logs IS 'Append-only cryptographically chained ledger where each entry contains SHA256 hash derived from the previous entry.';
COMMENT ON COLUMN audit_logs.current_hash IS 'SHA256(id || ''|'' || coalesce(user_id::text, '''') || ''|'' || action || ''|'' || target_id::text || ''|'' || created_at::text || ''|'' || coalesce(previous_hash, ''''))';
