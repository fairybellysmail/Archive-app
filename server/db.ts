import crypto from 'crypto';
import {
  User,
  Case,
  CaseProceeding,
  DocumentRecord,
  CaseStatus,
  DocumentType,
  ProceedingStatus,
  AttachableType
} from '../src/types/judicial.js';
import { auditService } from './audit.js';

export function normalizeSuitNumber(raw: string): string {
  if (!raw) return '';
  // Standardize: strip special chars/punctuation or uniform dash-separated uppercase string
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-');
}

export class JudicialDatabase {
  private static instance: JudicialDatabase;

  public users: Map<string, User> = new Map();
  public cases: Map<string, Case> = new Map();
  public proceedings: Map<string, CaseProceeding> = new Map();
  public documents: Map<string, DocumentRecord> = new Map();

  private constructor() {
    this.seedDatabase();
  }

  public static getInstance(): JudicialDatabase {
    if (!JudicialDatabase.instance) {
      JudicialDatabase.instance = new JudicialDatabase();
    }
    return JudicialDatabase.instance;
  }

  private seedDatabase(): void {
    // 1. Seed Judicial Users (RBAC)
    const seedUsers: User[] = [
      {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'Hon. Justice Adewale K. Vance',
        email: 'justice.vance@judiciary.gov.ng',
        role: 'judge',
        badge_number: 'J-SCN-042',
        court_jurisdiction: 'Supreme Court & Federal High Court',
        division: 'Constitutional & Commercial Bench',
        is_active: true,
        created_at: '2024-01-10T08:00:00.000Z',
        updated_at: '2024-01-10T08:00:00.000Z'
      },
      {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Barr. Folasade O. Craig, SAN',
        email: 'chief.registrar@judiciary.gov.ng',
        role: 'chief_registrar',
        badge_number: 'CR-FHC-001',
        court_jurisdiction: 'Federal High Court Headquarters',
        division: 'Judicial Administration & Seal Custody',
        is_active: true,
        created_at: '2024-01-10T08:00:00.000Z',
        updated_at: '2024-01-10T08:00:00.000Z'
      },
      {
        id: '33333333-3333-4333-8333-333333333333',
        name: 'David M. Okonjo',
        email: 'clerk.docket@judiciary.gov.ng',
        role: 'clerk',
        badge_number: 'CLK-ADM-188',
        court_jurisdiction: 'Federal High Court, Abuja Judicial Division',
        division: 'Registry & Filings Department',
        is_active: true,
        created_at: '2024-01-10T08:00:00.000Z',
        updated_at: '2024-01-10T08:00:00.000Z'
      },
      {
        id: '44444444-4444-4444-8444-444444444444',
        name: 'Dr. Aisha B. Bello',
        email: 'auditor.general@judiciary.gov.ng',
        role: 'auditor',
        badge_number: 'AUD-NJC-019',
        court_jurisdiction: 'National Judicial Council (NJC)',
        division: 'Judicial Integrity & Audit Directorate',
        is_active: true,
        created_at: '2024-01-10T08:00:00.000Z',
        updated_at: '2024-01-10T08:00:00.000Z'
      },
      {
        id: '55555555-5555-4555-8555-555555555555',
        name: 'Marcus Sterling',
        email: 'sysadmin.core@judiciary.gov.ng',
        role: 'system_admin',
        badge_number: 'SYS-SEC-007',
        court_jurisdiction: 'Judicial Information Technology Authority',
        division: 'Infrastructure & Cryptographic Security',
        is_active: true,
        created_at: '2024-01-10T08:00:00.000Z',
        updated_at: '2024-01-10T08:00:00.000Z'
      }
    ];

    seedUsers.forEach(u => this.users.set(u.id, u));

    // 2. Seed Cases
    const case1Id = 'aaaaaaaa-1111-4aaa-8aaa-111111111111';
    const case2Id = 'bbbbbbbb-2222-4bbb-8bbb-222222222222';
    const case3Id = 'cccccccc-3333-4ccc-8ccc-333333333333';
    const case4Id = 'dddddddd-4444-4ddd-8ddd-444444444444';
    const case5Id = 'eeeeeeee-5555-4eee-8eee-555555555555';

    const seedCases: Case[] = [
      {
        id: case1Id,
        case_title: 'Federal Republic of Nigeria v. Horizon Maritime Logistics Ltd & 4 Ors',
        suit_number: 'FHC/ABJ/CR/2024/104',
        normalized_suit_number: normalizeSuitNumber('FHC/ABJ/CR/2024/104'),
        date_delivered: '2024-04-18',
        subject_matter: 'Admiralty, Maritime Security & Territorial Waters Enforcement',
        document_type: 'judgment',
        status: 'published',
        is_sealed: false,
        created_by: seedUsers[1].id, // Chief Registrar
        updated_by: seedUsers[0].id, // Judge Vance
        deleted_at: null,
        created_at: '2024-03-01T09:15:00.000Z',
        updated_at: '2024-04-18T14:30:00.000Z'
      },
      {
        id: case2Id,
        case_title: 'Apex Sovereign Trust Bank Plc v. Central Directorate of Revenue',
        suit_number: 'CA/ABJ/CV/2024/512',
        normalized_suit_number: normalizeSuitNumber('CA/ABJ/CV/2024/512'),
        date_delivered: '2024-06-22',
        subject_matter: 'Corporate Taxation, Sovereign Debt & Statutory Deductions',
        document_type: 'ruling',
        status: 'published',
        is_sealed: false,
        created_by: seedUsers[2].id, // Clerk
        updated_by: seedUsers[0].id, // Judge Vance
        deleted_at: null,
        created_at: '2024-04-12T11:00:00.000Z',
        updated_at: '2024-06-22T16:45:00.000Z'
      },
      {
        id: case3Id,
        case_title: 'State Security Agency v. Classified Entities (In Re: National Critical Infrastructure)',
        suit_number: 'FHC/HQ/SEC/2024/009-S',
        normalized_suit_number: normalizeSuitNumber('FHC/HQ/SEC/2024/009-S'),
        date_delivered: null,
        subject_matter: 'National Security & Classified Strategic Asset Protection',
        document_type: 'case_file',
        status: 'pending_review',
        is_sealed: true, // SEALED CASE
        created_by: seedUsers[1].id, // Chief Registrar
        updated_by: seedUsers[1].id,
        deleted_at: null,
        created_at: '2024-05-15T08:30:00.000Z',
        updated_at: '2024-05-20T10:15:00.000Z'
      },
      {
        id: case4Id,
        case_title: 'Attorney General of the Federation v. 36 State Governments',
        suit_number: 'SC/CV/2024/891',
        normalized_suit_number: normalizeSuitNumber('SC/CV/2024/891'),
        date_delivered: '2024-07-11',
        subject_matter: 'Constitutional Law, Local Government Autonomy & Fiscal Federalism',
        document_type: 'judgment',
        status: 'published',
        is_sealed: false,
        created_by: seedUsers[0].id, // Judge Vance
        updated_by: seedUsers[0].id,
        deleted_at: null,
        created_at: '2024-02-14T10:00:00.000Z',
        updated_at: '2024-07-11T12:00:00.000Z'
      },
      {
        id: case5Id,
        case_title: 'Zenith Telecommunications Infrastructure v. Spectrum Regulatory Commission',
        suit_number: 'FHC/L/CS/2024/771',
        normalized_suit_number: normalizeSuitNumber('FHC/L/CS/2024/771'),
        date_delivered: null,
        subject_matter: 'Telecommunications Licensing & Spectrum Allocation Dispute',
        document_type: 'order',
        status: 'draft',
        is_sealed: false,
        created_by: seedUsers[2].id, // Clerk
        updated_by: null,
        deleted_at: null,
        created_at: '2024-08-01T14:20:00.000Z',
        updated_at: '2024-08-01T14:20:00.000Z'
      }
    ];

    seedCases.forEach(c => this.cases.set(c.id, c));

    // 3. Seed Case Proceedings
    const seedProceedings: CaseProceeding[] = [
      {
        id: 'proc-001-1111-4aaa-8aaa-111111111111',
        case_id: case1Id,
        session_date: '2024-03-15',
        presiding_judge: 'Hon. Justice Adewale K. Vance',
        summary_notes: 'Preliminary hearing on jurisdictional objections filed by 1st Defendant. Arguments entertained from Senior Advocates for both parties. Matter adjourned for ruling.',
        status: 'published',
        created_by: seedUsers[0].id,
        deleted_at: null,
        created_at: '2024-03-15T16:00:00.000Z',
        updated_at: '2024-03-15T16:30:00.000Z'
      },
      {
        id: 'proc-002-1111-4aaa-8aaa-111111111111',
        case_id: case1Id,
        session_date: '2024-04-18',
        presiding_judge: 'Hon. Justice Adewale K. Vance',
        summary_notes: 'Final judgment delivered in open court. The Court upheld the statutory powers of the Federal Maritime Authority. Judgment entered accordingly.',
        status: 'published',
        created_by: seedUsers[0].id,
        deleted_at: null,
        created_at: '2024-04-18T14:00:00.000Z',
        updated_at: '2024-04-18T14:30:00.000Z'
      },
      {
        id: 'proc-003-2222-4bbb-8bbb-222222222222',
        case_id: case2Id,
        session_date: '2024-05-10',
        presiding_judge: 'Hon. Justice Fatima Garba, JCA',
        summary_notes: 'Appellate panel constituted. Adoption of brief of argument by Appellant Counsel and Respondent Counsel. Ruling reserved.',
        status: 'published',
        created_by: seedUsers[2].id,
        deleted_at: null,
        created_at: '2024-05-10T12:00:00.000Z',
        updated_at: '2024-05-10T12:00:00.000Z'
      },
      {
        id: 'proc-004-3333-4ccc-8ccc-333333333333',
        case_id: case3Id,
        session_date: '2024-05-18',
        presiding_judge: 'Hon. Justice Adewale K. Vance (In Camera)',
        summary_notes: 'Ex-parte motion heard in judicial chambers pursuant to Section 38(1) National Security Protocols. Docket placed under Seal by Order of Court.',
        status: 'published',
        created_by: seedUsers[1].id,
        deleted_at: null,
        created_at: '2024-05-18T11:30:00.000Z',
        updated_at: '2024-05-18T11:30:00.000Z'
      },
      {
        id: 'proc-005-5555-4eee-8eee-555555555555',
        case_id: case5Id,
        session_date: '2024-08-10',
        presiding_judge: 'Hon. Justice Chinedu E. Obi',
        summary_notes: 'Initial docket registration. Form 1 Originating Summons served on regulatory respondent. Awaiting counter-affidavit.',
        status: 'draft',
        created_by: seedUsers[2].id,
        deleted_at: null,
        created_at: '2024-08-10T09:00:00.000Z',
        updated_at: '2024-08-10T09:00:00.000Z'
      }
    ];

    seedProceedings.forEach(p => this.proceedings.set(p.id, p));

    // 4. Seed Documents
    const seedDocs: DocumentRecord[] = [
      {
        id: 'doc-001-1111-4aaa-8aaa-111111111111',
        attachable_type: 'Case',
        attachable_id: case1Id,
        original_filename: 'Certified_True_Copy_Judgment_FHC_ABJ_CR_2024_104.pdf',
        storage_path: 'certified_judgment_104.pdf',
        mime_type: 'application/pdf',
        file_hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        file_size: 2458120,
        created_by: seedUsers[1].id,
        deleted_at: null,
        created_at: '2024-04-18T15:00:00.000Z'
      },
      {
        id: 'doc-002-1111-4aaa-8aaa-111111111111',
        attachable_type: 'CaseProceeding',
        attachable_id: 'proc-001-1111-4aaa-8aaa-111111111111',
        original_filename: 'Court_Session_Transcript_15_Mar_2024.docx',
        storage_path: 'session_transcript_mar15.docx',
        mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        file_hash: '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8',
        file_size: 785420,
        created_by: seedUsers[0].id,
        deleted_at: null,
        created_at: '2024-03-15T17:00:00.000Z'
      },
      {
        id: 'doc-003-4444-4ddd-8ddd-444444444444',
        attachable_type: 'Case',
        attachable_id: case4Id,
        original_filename: 'Supreme_Court_En_Banc_Judgment_SC_CV_2024_891.pdf',
        storage_path: 'sc_en_banc_891.pdf',
        mime_type: 'application/pdf',
        file_hash: '4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a',
        file_size: 4120900,
        created_by: seedUsers[0].id,
        deleted_at: null,
        created_at: '2024-07-11T13:30:00.000Z'
      },
      {
        id: 'doc-004-3333-4ccc-8ccc-333333333333',
        attachable_type: 'Case',
        attachable_id: case3Id,
        original_filename: 'Sealed_In_Camera_Interlocutory_Order_009S.pdf',
        storage_path: 'sealed_order_009s.pdf',
        mime_type: 'application/pdf',
        file_hash: 'ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d',
        file_size: 1350400,
        created_by: seedUsers[1].id,
        deleted_at: null,
        created_at: '2024-05-18T12:00:00.000Z'
      }
    ];

    seedDocs.forEach(d => this.documents.set(d.id, d));

    // 5. Initialize Chained Audit Ledger
    // Build initial genesis-to-head cryptographic chain representing the creation of these records
    auditService.recordLog({
      userId: seedUsers[4].id, // SysAdmin
      action: 'SYSTEM_GENESIS_INITIALIZATION',
      targetType: 'System',
      targetId: '00000000-0000-0000-0000-000000000000',
      ipAddress: '10.0.0.1',
      userAgent: 'Judiciary-AuditEngine/1.0.0 (Secure enclave boot)',
      metadata: { genesisBlock: true, courtSystem: 'Federal High Court of Justice Judicial Archive' },
      createdAt: '2024-01-10T08:00:00.000Z'
    });

    auditService.recordLog({
      userId: seedUsers[1].id,
      action: 'CASE_CREATED',
      targetType: 'Case',
      targetId: case1Id,
      ipAddress: '192.168.1.15',
      userAgent: 'JudicialClient/2.4.0 (Windows NT 10.0; Win64)',
      metadata: { suit_number: 'FHC/ABJ/CR/2024/104', title: 'Federal Republic of Nigeria v. Horizon Maritime' },
      createdAt: '2024-03-01T09:15:00.000Z'
    });

    auditService.recordLog({
      userId: seedUsers[0].id,
      action: 'PROCEEDING_RECORDED',
      targetType: 'CaseProceeding',
      targetId: 'proc-001-1111-4aaa-8aaa-111111111111',
      ipAddress: '192.168.1.10',
      userAgent: 'BenchPortal/3.1.2 (Chambers Workstation)',
      metadata: { session_date: '2024-03-15', judge: 'Hon. Justice Adewale K. Vance' },
      createdAt: '2024-03-15T16:00:00.000Z'
    });

    auditService.recordLog({
      userId: seedUsers[0].id,
      action: 'CASE_STATUS_TRANSITION',
      targetType: 'Case',
      targetId: case1Id,
      ipAddress: '192.168.1.10',
      userAgent: 'BenchPortal/3.1.2',
      metadata: { from: 'pending_review', to: 'published', document_type: 'judgment' },
      createdAt: '2024-04-18T14:30:00.000Z'
    });

    auditService.recordLog({
      userId: seedUsers[1].id,
      action: 'DOCUMENT_UPLOADED',
      targetType: 'Document',
      targetId: 'doc-001-1111-4aaa-8aaa-111111111111',
      ipAddress: '192.168.1.15',
      userAgent: 'RegistryUploadService/1.0',
      metadata: { filename: 'Certified_True_Copy_Judgment_FHC_ABJ_CR_2024_104.pdf', hash: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08', sizeBytes: 2458120 },
      createdAt: '2024-04-18T15:00:00.000Z'
    });

    auditService.recordLog({
      userId: seedUsers[1].id,
      action: 'CASE_SEALED',
      targetType: 'Case',
      targetId: case3Id,
      ipAddress: '192.168.1.15',
      userAgent: 'JudicialSealAuthority/2.0',
      metadata: { suit_number: 'FHC/HQ/SEC/2024/009-S', reason: 'Order of Court: National Critical Infrastructure in camera protection' },
      createdAt: '2024-05-18T11:45:00.000Z'
    });

    auditService.recordLog({
      userId: seedUsers[0].id,
      action: 'CASE_STATUS_TRANSITION',
      targetType: 'Case',
      targetId: case4Id,
      ipAddress: '192.168.1.10',
      userAgent: 'SupremeBenchPortal/4.0',
      metadata: { from: 'pending_review', to: 'published', suit_number: 'SC/CV/2024/891' },
      createdAt: '2024-07-11T12:00:00.000Z'
    });
  }

  // --- Case Repository Operations ---

  public getCases(filters?: {
    search?: string;
    suitNumber?: string;
    subjectMatter?: string;
    documentType?: DocumentType | string;
    status?: CaseStatus | string;
    isSealed?: boolean | string;
    startDate?: string;
    endDate?: string;
    includeDeleted?: boolean;
    userRole?: string;
  }): Case[] {
    let result = Array.from(this.cases.values());

    if (!filters?.includeDeleted) {
      result = result.filter(c => c.deleted_at === null);
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase().trim();
      const normalizedQ = normalizeSuitNumber(q);
      result = result.filter(c => {
        const matchesTitle = c.case_title.toLowerCase().includes(q);
        const matchesSuit = c.suit_number.toLowerCase().includes(q) || 
                            c.normalized_suit_number.includes(normalizedQ);
        const matchesSubject = c.subject_matter.toLowerCase().includes(q);
        
        // Match presiding officer from proceedings (Judges)
        let matchesPresidingOfficer = false;
        for (const p of this.proceedings.values()) {
          if (p.case_id === c.id && p.deleted_at === null) {
            if (p.presiding_judge && p.presiding_judge.toLowerCase().includes(q)) {
              matchesPresidingOfficer = true;
              break;
            }
          }
        }

        // Also match registering judicial officer / clerk / registrar
        const creator = this.users.get(c.created_by);
        const updater = c.updated_by ? this.users.get(c.updated_by) : null;
        if ((creator && (creator.name.toLowerCase().includes(q) || creator.badge_number.toLowerCase().includes(q))) || 
            (updater && (updater.name.toLowerCase().includes(q) || updater.badge_number.toLowerCase().includes(q)))) {
          matchesPresidingOfficer = true;
        }

        return matchesTitle || matchesSuit || matchesSubject || matchesPresidingOfficer;
      });
    }

    if (filters?.suitNumber) {
      const norm = normalizeSuitNumber(filters.suitNumber);
      result = result.filter(c => c.normalized_suit_number.includes(norm) || c.suit_number.toLowerCase().includes(filters.suitNumber!.toLowerCase()));
    }

    if (filters?.subjectMatter) {
      result = result.filter(c => c.subject_matter.toLowerCase().includes(filters.subjectMatter!.toLowerCase()));
    }

    if (filters?.documentType && filters.documentType !== 'all') {
      result = result.filter(c => c.document_type === filters.documentType);
    }

    if (filters?.status && filters.status !== 'all') {
      result = result.filter(c => c.status === filters.status);
    }

    if (filters?.isSealed !== undefined && filters.isSealed !== 'all') {
      const isSealedBool = String(filters.isSealed) === 'true';
      result = result.filter(c => c.is_sealed === isSealedBool);
    }

    if (filters?.startDate) {
      result = result.filter(c => c.date_delivered && c.date_delivered >= filters.startDate!);
    }

    if (filters?.endDate) {
      result = result.filter(c => c.date_delivered && c.date_delivered <= filters.endDate!);
    }

    return result.map(c => this.populateCase(c));
  }

  public getCaseById(id: string): Case | null {
    const c = this.cases.get(id);
    if (!c || c.deleted_at !== null) return null;
    return this.populateCase(c);
  }

  public getCaseBySuitNumber(suitNumber: string): Case | null {
    const norm = normalizeSuitNumber(suitNumber);
    for (const c of this.cases.values()) {
      if (c.normalized_suit_number === norm && c.deleted_at === null) {
        return this.populateCase(c);
      }
    }
    return null;
  }

  public createCase(data: {
    case_title: string;
    suit_number: string;
    date_delivered?: string | null;
    subject_matter: string;
    document_type: DocumentType;
    status?: CaseStatus;
    is_sealed?: boolean;
    created_by: string;
  }): Case {
    const norm = normalizeSuitNumber(data.suit_number);

    // Enforce DB unique constraint on suit_number and normalized_suit_number
    for (const c of this.cases.values()) {
      if (c.deleted_at === null && (c.suit_number.toLowerCase() === data.suit_number.toLowerCase() || c.normalized_suit_number === norm)) {
        throw new Error(`Unique constraint violation: Suit number '${data.suit_number}' is already registered in the judicial docket.`);
      }
    }

    // Verify creator exists
    if (!this.users.has(data.created_by)) {
      throw new Error(`Foreign key constraint violation: User with ID '${data.created_by}' does not exist.`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newCase: Case = {
      id,
      case_title: data.case_title.trim(),
      suit_number: data.suit_number.trim(),
      normalized_suit_number: norm,
      date_delivered: data.date_delivered || null,
      subject_matter: data.subject_matter.trim(),
      document_type: data.document_type,
      status: data.status || 'draft',
      is_sealed: Boolean(data.is_sealed),
      created_by: data.created_by,
      updated_by: null,
      deleted_at: null,
      created_at: now,
      updated_at: now
    };

    this.cases.set(id, newCase);
    return this.populateCase(newCase);
  }

  public updateCase(id: string, updates: Partial<Case>, updatedByUserId: string): Case {
    const existing = this.cases.get(id);
    if (!existing || existing.deleted_at !== null) {
      throw new Error(`Case with ID '${id}' not found.`);
    }

    // Check suit number uniqueness if changing
    if (updates.suit_number && updates.suit_number !== existing.suit_number) {
      const norm = normalizeSuitNumber(updates.suit_number);
      for (const [cId, c] of this.cases.entries()) {
        if (cId !== id && c.deleted_at === null && (c.suit_number.toLowerCase() === updates.suit_number.toLowerCase() || c.normalized_suit_number === norm)) {
          throw new Error(`Unique constraint violation: Suit number '${updates.suit_number}' is already registered.`);
        }
      }
      existing.suit_number = updates.suit_number.trim();
      existing.normalized_suit_number = norm;
    }

    if (updates.case_title !== undefined) existing.case_title = updates.case_title.trim();
    if (updates.subject_matter !== undefined) existing.subject_matter = updates.subject_matter.trim();
    if (updates.document_type !== undefined) existing.document_type = updates.document_type;
    if (updates.date_delivered !== undefined) existing.date_delivered = updates.date_delivered;
    if (updates.status !== undefined) existing.status = updates.status;
    if (updates.is_sealed !== undefined) existing.is_sealed = updates.is_sealed;

    existing.updated_by = updatedByUserId;
    existing.updated_at = new Date().toISOString();

    this.cases.set(id, existing);
    return this.populateCase(existing);
  }

  public softDeleteCase(id: string, deletedByUserId: string): boolean {
    const existing = this.cases.get(id);
    if (!existing || existing.deleted_at !== null) {
      return false;
    }
    existing.deleted_at = new Date().toISOString();
    existing.updated_by = deletedByUserId;
    this.cases.set(id, existing);
    return true;
  }

  // --- Case Proceedings Operations ---

  public getProceedingsByCaseId(caseId: string, includeDeleted = false): CaseProceeding[] {
    const list: CaseProceeding[] = [];
    for (const p of this.proceedings.values()) {
      if (p.case_id === caseId && (includeDeleted || p.deleted_at === null)) {
        list.push(this.populateProceeding(p));
      }
    }
    // Sort chronological: newest session date first
    return list.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }

  public getAllProceedings(): CaseProceeding[] {
    const list: CaseProceeding[] = [];
    for (const p of this.proceedings.values()) {
      if (p.deleted_at === null) {
        list.push(this.populateProceeding(p));
      }
    }
    return list.sort((a, b) => new Date(b.session_date).getTime() - new Date(a.session_date).getTime());
  }

  public createProceeding(data: {
    case_id: string;
    session_date: string;
    presiding_judge: string;
    summary_notes?: string | null;
    status?: ProceedingStatus;
    created_by: string;
  }): CaseProceeding {
    // 1. Verify case exists and is not deleted
    const parentCase = this.cases.get(data.case_id);
    if (!parentCase || parentCase.deleted_at !== null) {
      throw new Error(`Foreign key constraint violation: Case ID '${data.case_id}' does not exist.`);
    }

    // 2. Verify creator exists
    if (!this.users.has(data.created_by)) {
      throw new Error(`Foreign key constraint violation: User '${data.created_by}' does not exist.`);
    }

    // 3. Enforce DB constraint unique_case_session UNIQUE(case_id, session_date)
    for (const p of this.proceedings.values()) {
      if (p.case_id === data.case_id && p.session_date === data.session_date && p.deleted_at === null) {
        throw new Error(`Unique constraint violation: A proceeding transcript for Case #${parentCase.suit_number} already exists on session date '${data.session_date}'.`);
      }
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newProc: CaseProceeding = {
      id,
      case_id: data.case_id,
      session_date: data.session_date,
      presiding_judge: data.presiding_judge.trim(),
      summary_notes: data.summary_notes?.trim() || null,
      status: data.status || 'draft',
      created_by: data.created_by,
      deleted_at: null,
      created_at: now,
      updated_at: now
    };

    this.proceedings.set(id, newProc);
    return this.populateProceeding(newProc);
  }

  public updateProceeding(id: string, updates: Partial<CaseProceeding>): CaseProceeding {
    const existing = this.proceedings.get(id);
    if (!existing || existing.deleted_at !== null) {
      throw new Error(`Case proceeding with ID '${id}' not found.`);
    }

    if (updates.session_date && updates.session_date !== existing.session_date) {
      // check unique constraint
      for (const [pId, p] of this.proceedings.entries()) {
        if (pId !== id && p.case_id === existing.case_id && p.session_date === updates.session_date && p.deleted_at === null) {
          throw new Error(`Unique constraint violation: Proceeding for date '${updates.session_date}' already registered on this case.`);
        }
      }
      existing.session_date = updates.session_date;
    }

    if (updates.presiding_judge !== undefined) existing.presiding_judge = updates.presiding_judge.trim();
    if (updates.summary_notes !== undefined) existing.summary_notes = updates.summary_notes;
    if (updates.status !== undefined) existing.status = updates.status;

    existing.updated_at = new Date().toISOString();
    this.proceedings.set(id, existing);
    return this.populateProceeding(existing);
  }

  // --- Document Storage Registry Operations ---

  public getDocuments(filters?: {
    attachableType?: AttachableType;
    attachableId?: string;
    fileHash?: string;
  }): DocumentRecord[] {
    let result = Array.from(this.documents.values()).filter(d => d.deleted_at === null);

    if (filters?.attachableType) {
      result = result.filter(d => d.attachable_type === filters.attachableType);
    }
    if (filters?.attachableId) {
      result = result.filter(d => d.attachable_id === filters.attachableId);
    }
    if (filters?.fileHash) {
      result = result.filter(d => d.file_hash.toLowerCase() === filters.fileHash!.toLowerCase());
    }

    return result.map(d => this.populateDocument(d));
  }

  public getDocumentById(id: string): DocumentRecord | null {
    const doc = this.documents.get(id);
    if (!doc || doc.deleted_at !== null) return null;
    return this.populateDocument(doc);
  }

  public registerDocument(data: {
    attachable_type: AttachableType;
    attachable_id: string;
    original_filename: string;
    storage_path: string;
    mime_type: string;
    file_hash: string;
    file_size: number;
    created_by: string;
  }): DocumentRecord {
    // 1. Verify parent attachable exists
    if (data.attachable_type === 'Case') {
      const c = this.cases.get(data.attachable_id);
      if (!c || c.deleted_at !== null) {
        throw new Error(`Foreign key constraint violation: Case ID '${data.attachable_id}' not found.`);
      }
    } else if (data.attachable_type === 'CaseProceeding') {
      const p = this.proceedings.get(data.attachable_id);
      if (!p || p.deleted_at !== null) {
        throw new Error(`Foreign key constraint violation: CaseProceeding ID '${data.attachable_id}' not found.`);
      }
    }

    // 2. Verify creator exists
    if (!this.users.has(data.created_by)) {
      throw new Error(`Foreign key constraint violation: User '${data.created_by}' not found.`);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const newDoc: DocumentRecord = {
      id,
      attachable_type: data.attachable_type,
      attachable_id: data.attachable_id,
      original_filename: data.original_filename.trim(),
      storage_path: data.storage_path,
      mime_type: data.mime_type,
      file_hash: data.file_hash.toLowerCase(),
      file_size: data.file_size,
      created_by: data.created_by,
      deleted_at: null,
      created_at: now
    };

    this.documents.set(id, newDoc);
    return this.populateDocument(newDoc);
  }

  // --- Helper Population Functions ---

  private populateCase(c: Case): Case {
    const clone = { ...c };
    clone.created_by_user = this.users.get(c.created_by);
    clone.updated_by_user = c.updated_by ? this.users.get(c.updated_by) : null;
    
    // Calculate documents & proceedings count
    let docCount = 0;
    for (const d of this.documents.values()) {
      if (d.attachable_type === 'Case' && d.attachable_id === c.id && d.deleted_at === null) {
        docCount++;
      }
    }
    clone.documents_count = docCount;

    let procCount = 0;
    const presidingOfficers: string[] = [];
    for (const p of this.proceedings.values()) {
      if (p.case_id === c.id && p.deleted_at === null) {
        procCount++;
        if (p.presiding_judge && !presidingOfficers.includes(p.presiding_judge)) {
          presidingOfficers.push(p.presiding_judge);
        }
      }
    }
    clone.proceedings_count = procCount;
    clone.presiding_officers = presidingOfficers;

    return clone;
  }

  private populateProceeding(p: CaseProceeding): CaseProceeding {
    const clone = { ...p };
    clone.created_by_user = this.users.get(p.created_by);
    
    // Attach proceeding docs
    const procDocs: DocumentRecord[] = [];
    for (const d of this.documents.values()) {
      if (d.attachable_type === 'CaseProceeding' && d.attachable_id === p.id && d.deleted_at === null) {
        procDocs.push(this.populateDocument(d));
      }
    }
    clone.documents = procDocs;
    return clone;
  }

  private populateDocument(d: DocumentRecord): DocumentRecord {
    const clone = { ...d };
    clone.created_by_user = this.users.get(d.created_by);
    clone.file_preview_available = true;
    return clone;
  }
}

export const db = JudicialDatabase.getInstance();
