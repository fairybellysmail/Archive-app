import React, { useState } from 'react';
import { Database, FileCode, CheckCircle2, Copy, Shield, Layers, Key, Table } from 'lucide-react';

export const SchemaInspectorView: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const ddlSql = `-- ============================================================================
-- FEDERAL HIGH COURT OF JUSTICE - JUDICIAL DOCUMENT ARCHIVE
-- Native PostgreSQL Relational DDL & Constraints Migration (001_judicial_schema.sql)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS & RBAC ROLES TABLE
CREATE TYPE judicial_role AS ENUM (
    'chief_registrar',
    'judge',
    'clerk',
    'auditor',
    'system_admin'
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role judicial_role NOT NULL DEFAULT 'clerk',
    badge_number VARCHAR(64) NOT NULL UNIQUE,
    court_jurisdiction VARCHAR(255) NOT NULL DEFAULT 'Federal High Court, HQ',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL
);

-- 2. CASE STATUS & DOCUMENT TYPES
CREATE TYPE case_status AS ENUM ('draft', 'pending_review', 'published', 'archived');
CREATE TYPE judicial_doc_type AS ENUM ('judgment', 'ruling', 'order', 'case_file');

-- 3. CORE CASES TABLE
CREATE TABLE cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_title VARCHAR(512) NOT NULL,
    suit_number VARCHAR(128) NOT NULL UNIQUE,
    normalized_suit_number VARCHAR(128) NOT NULL,
    date_delivered DATE NULL,
    subject_matter VARCHAR(255) NOT NULL,
    document_type judicial_doc_type NOT NULL,
    status case_status NOT NULL DEFAULT 'draft',
    is_sealed BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    updated_by UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_cases_normalized_suit ON cases (normalized_suit_number);
CREATE INDEX idx_cases_subject_matter ON cases (subject_matter);
CREATE INDEX idx_cases_doc_type ON cases (document_type);
CREATE INDEX idx_cases_status ON cases (status);
CREATE INDEX idx_cases_filter_composite ON cases (status, document_type, is_sealed, created_at DESC);

-- 4. COURT PROCEEDINGS TABLE
CREATE TYPE proceeding_status AS ENUM ('draft', 'published');

CREATE TABLE proceedings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES cases(id) ON DELETE RESTRICT,
    session_date DATE NOT NULL,
    presiding_judge VARCHAR(255) NOT NULL,
    summary_notes TEXT NULL,
    status proceeding_status NOT NULL DEFAULT 'draft',
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL,
    CONSTRAINT uq_case_session_date UNIQUE (case_id, session_date)
);

CREATE INDEX idx_proceedings_case_id ON proceedings (case_id);
CREATE INDEX idx_proceedings_chronological ON proceedings (case_id, session_date ASC);

-- 5. DOCUMENT REGISTRY TABLE
CREATE TABLE document_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    attachable_type VARCHAR(64) NOT NULL,
    attachable_id UUID NOT NULL,
    original_filename VARCHAR(512) NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    file_hash CHAR(64) NOT NULL, -- Deterministic SHA-256 Checksum
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ NULL
);

CREATE INDEX idx_doc_registry_attachable ON document_registry (attachable_type, attachable_id);
CREATE INDEX idx_doc_registry_hash ON document_registry (file_hash);

-- 6. CRYPTOGRAPHIC AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES users(id) ON DELETE RESTRICT,
    action VARCHAR(128) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id UUID NULL,
    previous_hash CHAR(64) NULL, -- SHA-256 Pointer to previous block
    current_hash CHAR(64) NOT NULL,  -- SHA-256(id|user_id|action|target_id|created_at|previous_hash)
    metadata JSONB NULL,
    ip_address VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_created_at ON audit_logs (created_at DESC);
CREATE INDEX idx_audit_target ON audit_logs (target_type, target_id);
CREATE INDEX idx_audit_user_id ON audit_logs (user_id);
CREATE INDEX idx_audit_action ON audit_logs (action);`;

  const copyDdl = () => {
    navigator.clipboard.writeText(ddlSql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Database DDL & Relational Schema
            </span>
            <span className="text-xs text-slate-500">• Native PostgreSQL Migration</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-judicial-display tracking-wide mt-1">
            PostgreSQL Relational Schema & Constraints
          </h1>
        </div>

        <button
          onClick={copyDdl}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
        >
          {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Migration DDL Copied!' : 'Copy PostgreSQL DDL'}
        </button>
      </div>

      {/* Relational Table Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-400">
            <Table className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase font-mono-code">cases</h3>
          </div>
          <p className="text-xs text-slate-400 font-judicial-serif">
            Stores case title, suit number, normalized search token, document type, status, and sealed flags. Protected with composite indices.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-indigo-400">
            <Table className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase font-mono-code">proceedings</h3>
          </div>
          <p className="text-xs text-slate-400 font-judicial-serif">
            Court session logs linked to cases. Enforces <code className="text-slate-300">UNIQUE(case_id, session_date)</code> and chronological ordering.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-sky-400">
            <Table className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase font-mono-code">document_registry</h3>
          </div>
          <p className="text-xs text-slate-400 font-judicial-serif">
            Polymorphic attachment store with deterministic SHA-256 byte digests, MIME types, file sizes, and intake officer tracking.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400">
            <Shield className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase font-mono-code">audit_logs</h3>
          </div>
          <p className="text-xs text-slate-400 font-judicial-serif">
            Deterministic cryptographically chained ledger. Each block stores <code className="text-slate-300">previous_hash</code> and canonical SHA-256 digest.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-rose-400">
            <Key className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase font-mono-code">users (RBAC)</h3>
          </div>
          <p className="text-xs text-slate-400 font-judicial-serif">
            Judicial roles enum (Chief Registrar, Judge, Clerk, Auditor, Admin) with official badge numbers and court jurisdiction assignments.
          </p>
        </div>

        <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center gap-2 text-amber-300">
            <Layers className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase font-mono-code">Constraints & Indexing</h3>
          </div>
          <p className="text-xs text-slate-400 font-judicial-serif">
            Enforces strict foreign key referential integrity with <code className="text-slate-300">ON DELETE RESTRICT</code> to prevent orphan judicial records.
          </p>
        </div>
      </div>

      {/* SQL Migration Code Box */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <div className="p-4 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCode className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-mono-code font-semibold text-slate-200">
              /migrations/001_judicial_schema.sql
            </span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono-code">PostgreSQL 15+ Compatible</span>
        </div>
        <pre className="p-5 text-xs font-mono-code text-slate-300 overflow-x-auto leading-relaxed max-h-[500px]">
          {ddlSql}
        </pre>
      </div>
    </div>
  );
};
