/**
 * Judicial Document Archive & Case Proceedings System - Domain Types
 */

export type UserRole = 'chief_registrar' | 'judge' | 'clerk' | 'auditor' | 'system_admin';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  badge_number: string;
  court_jurisdiction: string;
  division: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type DocumentType = 'judgment' | 'ruling' | 'order' | 'case_file';

export type CaseStatus = 'draft' | 'pending_review' | 'published' | 'archived';

export interface Case {
  id: string;
  case_title: string;
  suit_number: string;
  normalized_suit_number: string;
  date_delivered: string | null;
  subject_matter: string;
  document_type: DocumentType;
  status: CaseStatus;
  is_sealed: boolean;
  created_by: string;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Populated relations
  created_by_user?: User;
  updated_by_user?: User | null;
  documents_count?: number;
  proceedings_count?: number;
  presiding_officers?: string[];
}

export type ProceedingStatus = 'draft' | 'published';

export interface CaseProceeding {
  id: string;
  case_id: string;
  session_date: string; // YYYY-MM-DD
  presiding_judge: string;
  summary_notes: string | null;
  status: ProceedingStatus;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
  
  // Populated relations
  created_by_user?: User;
  documents?: DocumentRecord[];
}

export type AttachableType = 'Case' | 'CaseProceeding';

export interface DocumentRecord {
  id: string;
  attachable_type: AttachableType;
  attachable_id: string;
  original_filename: string;
  storage_path: string;
  mime_type: string;
  file_hash: string; // SHA-256 (64 hex characters)
  file_size: number;
  created_by: string;
  deleted_at: string | null;
  created_at: string;
  
  // Populated relation
  created_by_user?: User;
  file_preview_available?: boolean;
}

export type AuditAction = 
  | 'CASE_CREATED'
  | 'CASE_UPDATED'
  | 'CASE_DELETED'
  | 'CASE_STATUS_TRANSITION'
  | 'CASE_SEALED'
  | 'CASE_UNSEALED'
  | 'PROCEEDING_RECORDED'
  | 'PROCEEDING_STATUS_TRANSITION'
  | 'DOCUMENT_UPLOADED'
  | 'DOCUMENT_ACCESSED'
  | 'DOCUMENT_DOWNLOADED'
  | 'AUDIT_CHAIN_VERIFIED'
  | 'AUDIT_TAMPER_SIMULATED'
  | 'AUDIT_TAMPER_RESTORED'
  | 'AUTH_USER_SWITCHED'
  | 'ACCESS_DENIED_VIOLATION';

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: AuditAction | string;
  target_type: string;
  target_id: string;
  ip_address: string;
  user_agent: string | null;
  metadata: Record<string, any> | null;
  previous_hash: string | null;
  current_hash: string;
  created_at: string;
  
  // Populated relations
  user?: User | null;
}

export interface AuditVerificationResult {
  is_valid: boolean;
  total_blocks: number;
  verified_at: string;
  genesis_hash: string | null;
  head_hash: string | null;
  broken_block_index: number | null;
  broken_block_id: string | null;
  failure_reason: string | null;
  verification_time_ms: number;
  is_tampered_simulation: boolean;
}

export interface DashboardStats {
  total_cases: number;
  published_judgments: number;
  pending_review: number;
  sealed_cases: number;
  draft_cases: number;
  archived_cases: number;
  total_proceedings: number;
  total_documents: number;
  audit_chain_length: number;
  audit_chain_valid: boolean;
  recent_cases: Case[];
  recent_proceedings: CaseProceeding[];
  recent_audit_logs: AuditLog[];
}

export interface StateTransitionError {
  error: string;
  current_status: string;
  requested_status: string;
  allowed_transitions: string[];
  required_role?: string[];
}

// -----------------------------------------------------------------------
// Future Extension Hook & Queue Interfaces
// -----------------------------------------------------------------------
export interface BaseDomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  actorId: string;
  payload: Record<string, any>;
}

export interface DocumentUploadedEvent extends BaseDomainEvent {
  eventType: 'DocumentUploadedEvent';
  payload: {
    documentId: string;
    attachableType: AttachableType;
    attachableId: string;
    fileHash: string;
    fileSize: number;
    mimeType: string;
  };
}

export interface CaseStatusChangedEvent extends BaseDomainEvent {
  eventType: 'CaseStatusChangedEvent';
  payload: {
    caseId: string;
    suitNumber: string;
    previousStatus: CaseStatus;
    newStatus: CaseStatus;
  };
}

export interface CaseSealedEvent extends BaseDomainEvent {
  eventType: 'CaseSealedEvent';
  payload: {
    caseId: string;
    suitNumber: string;
    isSealed: boolean;
    reason?: string;
  };
}

export interface ProceedingPublishedEvent extends BaseDomainEvent {
  eventType: 'ProceedingPublishedEvent';
  payload: {
    proceedingId: string;
    caseId: string;
    sessionDate: string;
    presidingJudge: string;
  };
}

export interface BatchCaseStatusItemResult {
  id: string;
  suit_number?: string;
  case_title?: string;
  success: boolean;
  previousStatus?: CaseStatus;
  newStatus?: CaseStatus;
  error?: string;
  message?: string;
}

export interface BatchCaseStatusResult {
  total: number;
  succeeded: number;
  failed: number;
  targetStatus: CaseStatus;
  results: BatchCaseStatusItemResult[];
}

export interface DocumentProcessingQueueItem {
  id: string;
  documentId: string;
  status: 'QUEUED' | 'PROCESSED_STUB' | 'UNAVAILABLE_OCR_BYPASSED';
  enqueuedAt: string;
  processedAt: string | null;
  message: string;
}

export interface DocumentProcessingQueueInterface {
  enqueue(documentId: string, metadata: Record<string, any>): Promise<DocumentProcessingQueueItem>;
  getQueueStatus(): {
    queueLength: number;
    processedCount: number;
    policyStatement: string;
    isAiOcrDisabled: boolean;
  };
}
