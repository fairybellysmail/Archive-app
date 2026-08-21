import {
  Case,
  CaseProceeding,
  DocumentRecord,
  AuditLog,
  AuditVerificationResult,
  DashboardStats,
  User,
  CaseStatus,
  DocumentType,
  ProceedingStatus,
  AttachableType,
  BaseDomainEvent,
  DocumentProcessingQueueItem,
  BatchCaseStatusResult
} from '../types/judicial.js';

let activeUserId: string = '22222222-2222-4222-8222-222222222222'; // Default: Barr. Folasade Craig (Chief Registrar)

export function setClientActiveUserId(id: string) {
  activeUserId = id;
}

export function getClientActiveUserId(): string {
  return activeUserId;
}

const getHeaders = (isMultipart = false): HeadersInit => {
  const headers: Record<string, string> = {
    'x-judicial-user-id': activeUserId
  };
  if (!isMultipart) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ error: 'HTTP_ERROR', message: res.statusText }));
    throw new Error(errorData.message || errorData.error || `Request failed with status ${res.status}`);
  }
  return res.json();
}

export const api = {
  // Auth & Officers
  async getAuthMe(): Promise<{ user: User; activeUserId: string; allOfficers: User[] }> {
    const res = await fetch('/api/auth/me', { headers: getHeaders() });
    return handleResponse(res);
  },

  async getUsers(): Promise<{ users: User[]; currentUserId: string }> {
    const data = await this.getAuthMe();
    return { users: data.allOfficers, currentUserId: data.activeUserId };
  },

  setActiveUserId(id: string) {
    setClientActiveUserId(id);
    localStorage.setItem('judicial_active_user_id', id);
  },

  async switchUser(userId: string): Promise<{ success: boolean; user: User }> {
    const res = await fetch('/api/auth/switch-user', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ userId })
    });
    const data = await handleResponse<{ success: boolean; user: User }>(res);
    setClientActiveUserId(userId);
    localStorage.setItem('judicial_active_user_id', userId);
    return data;
  },

  // Stats
  async getStats(): Promise<DashboardStats> {
    const res = await fetch('/api/stats', { headers: getHeaders() });
    return handleResponse(res);
  },

  async getDashboardStats(): Promise<DashboardStats> {
    return this.getStats();
  },

  // Cases
  async getCases(params?: {
    search?: string;
    suitNumber?: string;
    subjectMatter?: string;
    documentType?: string;
    status?: string;
    isSealed?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ cases: Case[]; count: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== '' && v !== 'all') {
          query.append(k, v);
        }
      });
    }
    const res = await fetch(`/api/cases?${query.toString()}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getCaseById(id: string): Promise<{
    case: Case;
    proceedings: CaseProceeding[];
    documents: DocumentRecord[];
    auditLogs: AuditLog[];
    availableTransitions: string[];
  }> {
    const res = await fetch(`/api/cases/${id}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createCase(data: {
    case_title: string;
    suit_number: string;
    date_delivered?: string | null;
    subject_matter: string;
    document_type: DocumentType;
    status?: CaseStatus;
    is_sealed?: boolean;
  }): Promise<{ case: Case }> {
    const res = await fetch('/api/cases', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async updateCase(id: string, updates: Partial<Case>): Promise<{ case: Case }> {
    const res = await fetch(`/api/cases/${id}`, {
      method: 'PATCH',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    return handleResponse(res);
  },

  async transitionCaseStatus(id: string, targetStatus: CaseStatus, transitionNotes?: string): Promise<{
    success: boolean;
    case: Case;
    previousStatus: CaseStatus;
    newStatus: CaseStatus;
  }> {
    const res = await fetch(`/api/cases/${id}/transition`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetStatus, transitionNotes })
    });
    return handleResponse(res);
  },

  async batchTransitionCaseStatuses(
    caseIds: string[],
    targetStatus: CaseStatus,
    transitionNotes?: string
  ): Promise<BatchCaseStatusResult> {
    const res = await fetch('/api/cases/batch-transition', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ caseIds, targetStatus, transitionNotes })
    });
    return handleResponse(res);
  },

  async toggleCaseSeal(id: string, is_sealed: boolean, sealing_reason?: string): Promise<{ success: boolean; case: Case }> {
    const res = await fetch(`/api/cases/${id}/seal`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ is_sealed, sealing_reason })
    });
    return handleResponse(res);
  },

  async deleteCase(id: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`/api/cases/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  // Proceedings
  async getAllProceedings(): Promise<{ proceedings: CaseProceeding[] }> {
    const res = await fetch('/api/proceedings', { headers: getHeaders() });
    return handleResponse(res);
  },

  async getProceedings(params?: { status?: string }): Promise<{ proceedings: CaseProceeding[] }> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== 'all') {
      query.append('status', params.status);
    }
    const res = await fetch(`/api/proceedings?${query.toString()}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async createProceeding(caseId: string, data: {
    session_date: string;
    presiding_judge: string;
    summary_notes?: string | null;
    status?: ProceedingStatus;
  }): Promise<{ proceeding: CaseProceeding }> {
    const res = await fetch(`/api/cases/${caseId}/proceedings`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(data)
    });
    return handleResponse(res);
  },

  async transitionProceedingStatus(id: string, targetStatus: ProceedingStatus): Promise<{
    success: boolean;
    proceeding: CaseProceeding;
  }> {
    const res = await fetch(`/api/proceedings/${id}/transition`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ targetStatus })
    });
    return handleResponse(res);
  },

  // Documents
  async uploadDocument(formData: FormData): Promise<{ document: DocumentRecord }> {
    const res = await fetch('/api/documents/upload', {
      method: 'POST',
      headers: getHeaders(true),
      body: formData
    });
    return handleResponse(res);
  },

  async getDocumentPreview(id: string): Promise<{
    document: DocumentRecord;
    certifiedDigest: {
      algorithm: string;
      hash: string;
      integrityConfirmed: boolean;
      registeredAt: string;
    };
  }> {
    const res = await fetch(`/api/documents/${id}/preview`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getDocumentStreamBlob(id: string): Promise<{ blob: Blob; objectUrl: string; fileHash?: string }> {
    const res = await fetch(`/api/documents/${id}/stream`, { headers: getHeaders() });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'STREAM_ERROR', message: `Stream request failed (${res.status})` }));
      throw new Error(errorData.message || errorData.error || 'Failed to stream document.');
    }
    const fileHash = res.headers.get('x-judicial-integrity-hash') || undefined;
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    return { blob, objectUrl, fileHash };
  },

  getDocumentStreamUrl(id: string): string {
    return `/api/documents/${id}/stream`;
  },

  getDocumentDownloadUrl(id: string): string {
    return `/api/documents/${id}/download`;
  },

  // Audit Logs & Cryptographic Suite
  async getAuditLogs(params?: {
    userId?: string;
    action?: string;
    targetType?: string;
    targetId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ logs: AuditLog[]; count: number }> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v) query.append(k, v);
      });
    }
    const res = await fetch(`/api/audit-logs?${query.toString()}`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async verifyAuditChain(): Promise<{ result: AuditVerificationResult }> {
    const res = await fetch('/api/audit-logs/verify', {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res);
  },

  async tamperTest(action: 'simulate' | 'restore', blockIndex?: number, fieldToAlter?: string, newValue?: string): Promise<any> {
    const res = await fetch('/api/audit-logs/tamper-test', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ action, blockIndex, fieldToAlter, newValue })
    });
    return handleResponse(res);
  },

  // Extension events & Queue
  async getEventLogs(): Promise<{
    eventHistory: BaseDomainEvent[];
    queueStatus: {
      queueLength: number;
      processedCount: number;
      recentItems: DocumentProcessingQueueItem[];
      policyStatement: string;
      isAiOcrDisabled: boolean;
    };
  }> {
    const res = await fetch('/api/events/logs', { headers: getHeaders() });
    return handleResponse(res);
  },

  async getEvents(): Promise<{ events: any[] }> {
    const data = await this.getEventLogs();
    const formatted = data.eventHistory.map(ev => ({
      id: ev.eventId,
      topic: ev.eventType,
      payload: ev.payload,
      timestamp: ev.occurredAt
    }));
    return { events: formatted };
  },

  async dispatchTestEvent(topic: string, payload: any): Promise<{ success: boolean; event: any }> {
    const res = await fetch('/api/events/dispatch', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ eventType: topic, payload })
    });
    return handleResponse(res);
  },

  // PostgreSQL Schema DDL
  async getSchemaDDL(): Promise<string> {
    const res = await fetch('/api/schema/ddl', { headers: getHeaders() });
    if (!res.ok) throw new Error('Failed to retrieve schema DDL');
    return res.text();
  }
};
