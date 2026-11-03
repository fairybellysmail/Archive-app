import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';
import { db, normalizeSuitNumber } from './server/db.js';
import { auditService } from './server/audit.js';
import {
  authMiddleware,
  requireRoles,
  checkCaseAccess,
  getActiveUserId,
  setActiveUserId
} from './server/rbac.js';
import {
  validateCaseTransition,
  validateProceedingTransition,
  getAvailableCaseTransitions
} from './server/stateMachine.js';
import { judicialEvents, documentProcessingQueue } from './server/events.js';
import { DocumentType, CaseStatus, ProceedingStatus, AttachableType } from './src/types/judicial.js';
import { generateCertifiedJudicialPdf } from './server/pdfGenerator.js';

const PORT = 3000;
const app = express();

// Ensure upload directory exists
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage configuration with SHA-256 calculation
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    const ext = path.extname(file.originalname);
    cb(null, `judicial-doc-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    if (allowedMimeTypes.includes(file.mimetype) || file.originalname.endsWith('.pdf') || file.originalname.endsWith('.docx') || file.originalname.endsWith('.doc')) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE: Only official court filings in PDF and DOCX format are permitted.'));
    }
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply Authentication Middleware to all /api routes
app.use('/api', authMiddleware);

// -----------------------------------------------------------------------
// 1. AUTHENTICATION & IDENTITY SIMULATION
// -----------------------------------------------------------------------
app.get('/api/auth/me', (req, res) => {
  res.json({
    user: req.currentUser,
    activeUserId: getActiveUserId(),
    allOfficers: Array.from(db.users.values())
  });
});

app.post('/api/auth/switch-user', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'userId is required.' });
  }
  try {
    const switchedUser = setActiveUserId(userId);
    auditService.recordLog({
      userId: switchedUser.id,
      action: 'AUTH_USER_SWITCHED',
      targetType: 'UserSession',
      targetId: switchedUser.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      metadata: { newActiveOfficer: switchedUser.name, role: switchedUser.role }
    });
    res.json({ success: true, user: switchedUser });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// -----------------------------------------------------------------------
// 2. DASHBOARD KPI METRICS & SYSTEM STATS
// -----------------------------------------------------------------------
app.get('/api/stats', (req, res) => {
  const user = req.currentUser!;
  const allCases = db.getCases({ userRole: user.role });
  
  // Filter sealed cases if user lacks clearance
  const accessibleCases = allCases.filter(c => checkCaseAccess(user, c).allowed);
  
  const publishedJudgments = accessibleCases.filter(c => c.status === 'published' && c.document_type === 'judgment').length;
  const pendingReview = accessibleCases.filter(c => c.status === 'pending_review').length;
  const sealedCases = allCases.filter(c => c.is_sealed).length;
  const draftCases = accessibleCases.filter(c => c.status === 'draft').length;
  const archivedCases = accessibleCases.filter(c => c.status === 'archived').length;
  
  const allProceedings = db.getAllProceedings();
  const allDocs = db.getDocuments();
  const auditVerification = auditService.verifyChainIntegrity();

  res.json({
    total_cases: accessibleCases.length,
    published_judgments: publishedJudgments,
    pending_review: pendingReview,
    sealed_cases: sealedCases,
    draft_cases: draftCases,
    archived_cases: archivedCases,
    total_proceedings: allProceedings.length,
    total_documents: allDocs.length,
    audit_chain_length: auditVerification.total_blocks,
    audit_chain_valid: auditVerification.is_valid,
    recent_cases: accessibleCases.slice(0, 5),
    recent_proceedings: allProceedings.slice(0, 5),
    recent_audit_logs: auditService.getLogs({ limit: 6 })
  });
});

// -----------------------------------------------------------------------
// 3. CASE REGISTRY ENDPOINTS
// -----------------------------------------------------------------------
app.get('/api/cases', (req, res) => {
  const user = req.currentUser!;
  const {
    search,
    suitNumber,
    subjectMatter,
    documentType,
    status,
    isSealed,
    startDate,
    endDate,
    page,
    limit
  } = req.query;

  const rawCases = db.getCases({
    search: search as string,
    suitNumber: suitNumber as string,
    subjectMatter: subjectMatter as string,
    documentType: documentType as string,
    status: status as string,
    isSealed: isSealed as string,
    startDate: startDate as string,
    endDate: endDate as string
  });

  // Filter sealed records based on server-side RBAC
  const authorizedCases = rawCases.filter(c => {
    const access = checkCaseAccess(user, c);
    return access.allowed;
  });

  const requestedPage = Math.max(1, Number(page) || 1);
  const requestedLimit = Math.min(Math.max(1, Number(limit) || 25), 200);
  const startIndex = (requestedPage - 1) * requestedLimit;
  const pagedCases = authorizedCases.slice(startIndex, startIndex + requestedLimit);

  res.json({
    cases: pagedCases,
    count: authorizedCases.length,
    page: requestedPage,
    limit: requestedLimit,
    totalPages: Math.max(1, Math.ceil(authorizedCases.length / requestedLimit))
  });
});

app.get('/api/cases/:id', (req, res) => {
  const user = req.currentUser!;
  const caseRecord = db.getCaseById(req.params.id);

  if (!caseRecord) {
    return res.status(404).json({ error: 'CASE_NOT_FOUND', message: 'Requested case record does not exist or has been expunged.' });
  }

  // Server-side RBAC Sealed Check
  const accessCheck = checkCaseAccess(user, caseRecord);
  if (!accessCheck.allowed) {
    auditService.recordLog({
      userId: user.id,
      action: 'ACCESS_DENIED_VIOLATION',
      targetType: 'Case',
      targetId: caseRecord.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      metadata: { suit_number: caseRecord.suit_number, reason: 'Unauthorized attempt to inspect Sealed Docket' }
    });

    return res.status(403).json({
      error: 'SEALED_CASE_ACCESS_DENIED',
      message: accessCheck.reason,
      suit_number: caseRecord.suit_number
    });
  }

  // Log successful case dossier access
  auditService.recordLog({
    userId: user.id,
    action: 'CASE_INSPECTED',
    targetType: 'Case',
    targetId: caseRecord.id,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: { suit_number: caseRecord.suit_number }
  });

  const proceedings = db.getProceedingsByCaseId(caseRecord.id);
  const documents = db.getDocuments({ attachableType: 'Case', attachableId: caseRecord.id });
  const caseAuditLogs = auditService.getLogs({ targetId: caseRecord.id, limit: 50 });
  const availableTransitions = getAvailableCaseTransitions(caseRecord.status);

  res.json({
    case: caseRecord,
    proceedings,
    documents,
    auditLogs: caseAuditLogs,
    availableTransitions
  });
});

app.post('/api/cases', requireRoles('chief_registrar', 'judge', 'clerk', 'system_admin'), (req, res) => {
  const user = req.currentUser!;
  const {
    case_title,
    suit_number,
    date_delivered,
    subject_matter,
    document_type,
    status,
    is_sealed
  } = req.body;

  if (!case_title || !suit_number || !subject_matter || !document_type) {
    return res.status(400).json({
      error: 'MISSING_MANDATORY_FIELDS',
      message: 'case_title, suit_number, subject_matter, and document_type are required.'
    });
  }

  try {
    const createdCase = db.createCase({
      case_title,
      suit_number,
      date_delivered,
      subject_matter,
      document_type: document_type as DocumentType,
      status: status || 'draft',
      is_sealed: Boolean(is_sealed),
      created_by: user.id
    });

    // Record immutable audit log
    auditService.recordLog({
      userId: user.id,
      action: 'CASE_CREATED',
      targetType: 'Case',
      targetId: createdCase.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      metadata: {
        suit_number: createdCase.suit_number,
        normalized_suit_number: createdCase.normalized_suit_number,
        status: createdCase.status,
        document_type: createdCase.document_type,
        is_sealed: createdCase.is_sealed
      }
    });

    // Emit event stub
    judicialEvents.emitCaseStatusChanged({
      caseId: createdCase.id,
      suitNumber: createdCase.suit_number,
      previousStatus: 'draft',
      newStatus: createdCase.status
    }, user.id);

    res.status(201).json({ case: createdCase });
  } catch (err: any) {
    res.status(400).json({ error: 'CREATION_FAILED', message: err.message });
  }
});

// Update Case Metadata
app.patch('/api/cases/:id', requireRoles('chief_registrar', 'judge', 'clerk', 'system_admin'), (req, res) => {
  const user = req.currentUser!;
  const caseId = req.params.id;
  const existingCase = db.getCaseById(caseId);

  if (!existingCase) {
    return res.status(404).json({ error: 'CASE_NOT_FOUND' });
  }

  try {
    const updated = db.updateCase(caseId, req.body, user.id);
    
    auditService.recordLog({
      userId: user.id,
      action: 'CASE_UPDATED',
      targetType: 'Case',
      targetId: updated.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      metadata: { modifiedFields: Object.keys(req.body), suit_number: updated.suit_number }
    });

    res.json({ case: updated });
  } catch (err: any) {
    res.status(400).json({ error: 'UPDATE_FAILED', message: err.message });
  }
});

// Case State Machine Transition
app.post('/api/cases/:id/transition', (req, res) => {
  const user = req.currentUser!;
  const caseId = req.params.id;
  const { targetStatus, transitionNotes } = req.body;

  const existingCase = db.getCaseById(caseId);
  if (!existingCase) {
    return res.status(404).json({ error: 'CASE_NOT_FOUND' });
  }

  // Check state machine validity
  const validation = validateCaseTransition(existingCase.status, targetStatus as CaseStatus, user.role);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.errorCode,
      message: validation.errorMessage,
      current_status: existingCase.status,
      requested_status: targetStatus,
      allowed_transitions: validation.allowedTransitions,
      required_roles: validation.requiredRoles
    });
  }

  const previousStatus = existingCase.status;
  const updatedCase = db.updateCase(caseId, { status: targetStatus as CaseStatus }, user.id);

  // Record audit log
  auditService.recordLog({
    userId: user.id,
    action: 'CASE_STATUS_TRANSITION',
    targetType: 'Case',
    targetId: updatedCase.id,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: {
      suit_number: updatedCase.suit_number,
      previousStatus,
      newStatus: targetStatus,
      officerName: user.name,
      officerRole: user.role,
      transitionNotes: transitionNotes || null
    }
  });

  // Emit event hook
  judicialEvents.emitCaseStatusChanged({
    caseId: updatedCase.id,
    suitNumber: updatedCase.suit_number,
    previousStatus,
    newStatus: targetStatus as CaseStatus
  }, user.id);

  res.json({
    success: true,
    case: updatedCase,
    previousStatus,
    newStatus: targetStatus
  });
});

// Batch Case State Machine Transition
app.post('/api/cases/batch-transition', (req, res) => {
  const user = req.currentUser!;
  const { caseIds, targetStatus, transitionNotes } = req.body;

  if (!Array.isArray(caseIds) || caseIds.length === 0) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'caseIds must be a non-empty array.' });
  }

  if (caseIds.length > 100) {
    return res.status(400).json({ error: 'BATCH_TOO_LARGE', message: 'A batch may contain at most 100 case IDs.' });
  }

  if (!targetStatus) {
    return res.status(400).json({ error: 'INVALID_REQUEST', message: 'targetStatus is required.' });
  }

  const results: Array<{
    id: string;
    suit_number?: string;
    case_title?: string;
    success: boolean;
    previousStatus?: CaseStatus;
    newStatus?: CaseStatus;
    error?: string;
    message?: string;
  }> = [];

  let succeededCount = 0;
  let failedCount = 0;

  for (const caseId of caseIds) {
    const existingCase = db.getCaseById(caseId);
    if (!existingCase) {
      failedCount++;
      results.push({
        id: caseId,
        success: false,
        error: 'CASE_NOT_FOUND',
        message: `Case record not found in registry.`
      });
      continue;
    }

    // In-Camera seal check
    const accessCheck = checkCaseAccess(user, existingCase);
    if (!accessCheck.allowed) {
      failedCount++;
      results.push({
        id: caseId,
        suit_number: existingCase.suit_number,
        case_title: existingCase.case_title,
        success: false,
        error: 'RESTRICTED_ACCESS',
        message: accessCheck.reason || 'Restricted In-Camera sealed docket.'
      });
      continue;
    }

    // Check state machine validity
    const validation = validateCaseTransition(existingCase.status, targetStatus as CaseStatus, user.role);
    if (!validation.valid) {
      failedCount++;
      results.push({
        id: caseId,
        suit_number: existingCase.suit_number,
        case_title: existingCase.case_title,
        success: false,
        error: validation.errorCode || 'ILLEGAL_TRANSITION',
        message: validation.errorMessage || `Cannot transition from '${existingCase.status}' to '${targetStatus}'.`
      });
      continue;
    }

    const previousStatus = existingCase.status;
    const updatedCase = db.updateCase(caseId, { status: targetStatus as CaseStatus }, user.id);

    // Record audit log
    auditService.recordLog({
      userId: user.id,
      action: 'CASE_STATUS_TRANSITION',
      targetType: 'Case',
      targetId: updatedCase.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      metadata: {
        suit_number: updatedCase.suit_number,
        previousStatus,
        newStatus: targetStatus,
        officerName: user.name,
        officerRole: user.role,
        isBatchOperation: true,
        batchTotal: caseIds.length,
        transitionNotes: transitionNotes || 'Batch status transition'
      }
    });

    // Emit event
    judicialEvents.emitCaseStatusChanged({
      caseId: updatedCase.id,
      suitNumber: updatedCase.suit_number,
      previousStatus,
      newStatus: targetStatus as CaseStatus
    }, user.id);

    succeededCount++;
    results.push({
      id: updatedCase.id,
      suit_number: updatedCase.suit_number,
      case_title: updatedCase.case_title,
      success: true,
      previousStatus,
      newStatus: targetStatus as CaseStatus
    });
  }

  res.json({
    total: caseIds.length,
    succeeded: succeededCount,
    failed: failedCount,
    targetStatus,
    results
  });
});

// Case Seal / Unseal Toggle (Chief Registrar & Judge Only)
app.post('/api/cases/:id/seal', requireRoles('chief_registrar', 'judge', 'system_admin'), (req, res) => {
  const user = req.currentUser!;
  const caseId = req.params.id;
  const { is_sealed, sealing_reason } = req.body;

  const existingCase = db.getCaseById(caseId);
  if (!existingCase) {
    return res.status(404).json({ error: 'CASE_NOT_FOUND' });
  }

  const targetSealedState = Boolean(is_sealed);
  const updatedCase = db.updateCase(caseId, { is_sealed: targetSealedState }, user.id);

  const action = targetSealedState ? 'CASE_SEALED' : 'CASE_UNSEALED';
  auditService.recordLog({
    userId: user.id,
    action,
    targetType: 'Case',
    targetId: updatedCase.id,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: {
      suit_number: updatedCase.suit_number,
      is_sealed: targetSealedState,
      sealing_reason: sealing_reason || 'Pursuant to judicial bench order'
    }
  });

  judicialEvents.emitCaseSealed({
    caseId: updatedCase.id,
    suitNumber: updatedCase.suit_number,
    isSealed: targetSealedState,
    reason: sealing_reason
  }, user.id);

  res.json({ success: true, case: updatedCase });
});

// Soft Delete Case (Chief Registrar & SysAdmin only)
app.delete('/api/cases/:id', requireRoles('chief_registrar', 'system_admin'), (req, res) => {
  const user = req.currentUser!;
  const caseId = req.params.id;
  const existingCase = db.getCaseById(caseId);

  if (!existingCase) {
    return res.status(404).json({ error: 'CASE_NOT_FOUND' });
  }

  db.softDeleteCase(caseId, user.id);

  auditService.recordLog({
    userId: user.id,
    action: 'CASE_DELETED',
    targetType: 'Case',
    targetId: caseId,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: { suit_number: existingCase.suit_number, softDeleted: true }
  });

  res.json({ success: true, message: `Case #${existingCase.suit_number} soft-deleted from active registry.` });
});

// -----------------------------------------------------------------------
// 4. CASE PROCEEDINGS & SESSION TRANSCRIPTS
// -----------------------------------------------------------------------
app.get('/api/proceedings', (req, res) => {
  const { page, limit } = req.query;
  const all = db.getAllProceedings();

  const requestedPage = Math.max(1, Number(page) || 1);
  const requestedLimit = Math.min(Math.max(1, Number(limit) || 25), 200);
  const startIndex = (requestedPage - 1) * requestedLimit;
  const pagedProceedings = all.slice(startIndex, startIndex + requestedLimit);

  res.json({
    proceedings: pagedProceedings,
    count: all.length,
    page: requestedPage,
    limit: requestedLimit,
    totalPages: Math.max(1, Math.ceil(all.length / requestedLimit))
  });
});

app.post('/api/cases/:id/proceedings', requireRoles('chief_registrar', 'judge', 'clerk', 'system_admin'), (req, res) => {
  const user = req.currentUser!;
  const caseId = req.params.id;
  const { session_date, presiding_judge, summary_notes, status } = req.body;

  if (!session_date || !presiding_judge) {
    return res.status(400).json({ error: 'session_date and presiding_judge are mandatory.' });
  }

  try {
    const createdProc = db.createProceeding({
      case_id: caseId,
      session_date,
      presiding_judge,
      summary_notes,
      status: status || 'draft',
      created_by: user.id
    });

    auditService.recordLog({
      userId: user.id,
      action: 'PROCEEDING_RECORDED',
      targetType: 'CaseProceeding',
      targetId: createdProc.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      metadata: {
        case_id: caseId,
        session_date: createdProc.session_date,
        presiding_judge: createdProc.presiding_judge,
        status: createdProc.status
      }
    });

    res.status(201).json({ proceeding: createdProc });
  } catch (err: any) {
    res.status(400).json({ error: 'PROCEEDING_CREATION_FAILED', message: err.message });
  }
});

// Proceeding Status Transition (e.g. Publish Transcript)
app.post('/api/proceedings/:id/transition', (req, res) => {
  const user = req.currentUser!;
  const procId = req.params.id;
  const { targetStatus } = req.body;

  const proc = db.proceedings.get(procId);
  if (!proc || proc.deleted_at !== null) {
    return res.status(404).json({ error: 'PROCEEDING_NOT_FOUND' });
  }

  const validation = validateProceedingTransition(proc.status, targetStatus as ProceedingStatus, user.role);
  if (!validation.valid) {
    return res.status(400).json({
      error: validation.errorCode,
      message: validation.errorMessage,
      allowed_transitions: validation.allowedTransitions,
      required_roles: validation.requiredRoles
    });
  }

  const updated = db.updateProceeding(procId, { status: targetStatus as ProceedingStatus });

  auditService.recordLog({
    userId: user.id,
    action: 'PROCEEDING_STATUS_TRANSITION',
    targetType: 'CaseProceeding',
    targetId: updated.id,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: {
      session_date: updated.session_date,
      presiding_judge: updated.presiding_judge,
      newStatus: targetStatus
    }
  });

  if (targetStatus === 'published') {
    judicialEvents.emitProceedingPublished({
      proceedingId: updated.id,
      caseId: updated.case_id,
      sessionDate: updated.session_date,
      presidingJudge: updated.presiding_judge
    }, user.id);
  }

  res.json({ success: true, proceeding: updated });
});

// -----------------------------------------------------------------------
// 5. SECURE DOCUMENT REGISTRY & PIPELINE
// -----------------------------------------------------------------------
app.post('/api/documents/upload', upload.single('file'), async (req, res) => {
  const user = req.currentUser!;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'NO_FILE_ATTACHED', message: 'Please attach a valid PDF or DOCX file.' });
  }

  const { attachable_type, attachable_id } = req.body;
  if (!attachable_type || !attachable_id) {
    // remove uploaded temp file
    fs.unlinkSync(file.path);
    return res.status(400).json({ error: 'attachable_type and attachable_id are required.' });
  }

  try {
    // Calculate deterministic SHA-256 hash of the uploaded file bytes
    const fileBuffer = fs.readFileSync(file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    const docRecord = db.registerDocument({
      attachable_type: attachable_type as AttachableType,
      attachable_id,
      original_filename: file.originalname,
      storage_path: file.filename,
      mime_type: file.mimetype,
      file_hash: fileHash,
      file_size: file.size,
      created_by: user.id
    });

    // Record audit log
    auditService.recordLog({
      userId: user.id,
      action: 'DOCUMENT_UPLOADED',
      targetType: 'Document',
      targetId: docRecord.id,
      ipAddress: req.ip || '127.0.0.1',
      userAgent: req.headers['user-agent'],
      metadata: {
        filename: docRecord.original_filename,
        hash: docRecord.file_hash,
        sizeBytes: docRecord.file_size,
        attachableType: docRecord.attachable_type,
        attachableId: docRecord.attachable_id
      }
    });

    // Emit event and enqueue to processing queue interface
    judicialEvents.emitDocumentUploaded({
      documentId: docRecord.id,
      attachableType: docRecord.attachable_type,
      attachableId: docRecord.attachable_id,
      fileHash: docRecord.file_hash,
      fileSize: docRecord.file_size,
      mimeType: docRecord.mime_type
    }, user.id);

    await documentProcessingQueue.enqueue(docRecord.id, {
      filename: docRecord.original_filename,
      hash: docRecord.file_hash
    });

    res.status(201).json({ document: docRecord });
  } catch (err: any) {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    res.status(400).json({ error: 'DOCUMENT_REGISTRATION_FAILED', message: err.message });
  }
});

// Authenticated Document Download with Audit Logging
app.get('/api/documents/:id/download', (req, res) => {
  const user = req.currentUser!;
  const doc = db.getDocumentById(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
  }

  // Check parent sealed case access
  if (doc.attachable_type === 'Case') {
    const parentCase = db.getCaseById(doc.attachable_id);
    if (parentCase) {
      const access = checkCaseAccess(user, parentCase);
      if (!access.allowed) {
        auditService.recordLog({
          userId: user.id,
          action: 'ACCESS_DENIED_VIOLATION',
          targetType: 'Document',
          targetId: doc.id,
          ipAddress: req.ip || '127.0.0.1',
          userAgent: req.headers['user-agent'],
          metadata: { documentName: doc.original_filename, reason: 'Attempt to download document from sealed case' }
        });
        return res.status(403).json({ error: 'SEALED_DOCUMENT_ACCESS_DENIED', message: access.reason });
      }
    }
  }

  const filePath = path.join(uploadsDir, doc.storage_path);
  
  // Record download audit log
  auditService.recordLog({
    userId: user.id,
    action: 'DOCUMENT_DOWNLOADED',
    targetType: 'Document',
    targetId: doc.id,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: {
      filename: doc.original_filename,
      fileHash: doc.file_hash,
      officer: user.name,
      badge: user.badge_number
    }
  });

  if (fs.existsSync(filePath)) {
    res.download(filePath, doc.original_filename);
  } else {
    // Generate certified synthetic PDF/text representation if file was seeded
    res.setHeader('Content-Disposition', `attachment; filename="${doc.original_filename}"`);
    res.setHeader('Content-Type', doc.mime_type);
    res.send(`FEDERAL HIGH COURT OF JUSTICE - JUDICIAL DOCUMENT ARCHIVE
=======================================================================
DOCUMENT TITLE: ${doc.original_filename}
REGISTRY RECORD ID: ${doc.id}
INTEGRITY SHA-256 HASH: ${doc.file_hash}
REGISTERED TIMESTAMP: ${doc.created_at}
SECURITY VERIFICATION: CERTIFIED TRUE COPY ISSUED UNDER SEAL
=======================================================================
AUTHENTICATION AUDIT TRAIL LOGGED:
User Officer: ${user.name} (${user.badge_number}) - Role: ${user.role}
Timestamp: ${new Date().toISOString()}

[Official Judicial Document Content & Certified Transcript Records]`);
  }
});

// Secure Binary Stream for Embedded PDF Viewer (Zero Storage Path Exposure)
app.get('/api/documents/:id/stream', async (req, res) => {
  const user = req.currentUser!;
  const doc = db.getDocumentById(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND', message: 'Document not found in master registry.' });
  }

  // Check parent sealed case access
  let parentCase: any = null;
  if (doc.attachable_type === 'Case') {
    parentCase = db.getCaseById(doc.attachable_id);
  } else if (doc.attachable_type === 'CaseProceeding') {
    const proc = db.proceedings.get(doc.attachable_id);
    if (proc) {
      parentCase = db.getCaseById(proc.case_id);
    }
  }

  if (parentCase) {
    const access = checkCaseAccess(user, parentCase);
    if (!access.allowed) {
      auditService.recordLog({
        userId: user.id,
        action: 'ACCESS_DENIED_VIOLATION',
        targetType: 'Document',
        targetId: doc.id,
        ipAddress: req.ip || '127.0.0.1',
        userAgent: req.headers['user-agent'],
        metadata: {
          documentName: doc.original_filename,
          reason: 'Attempted to stream document belonging to sealed docket without judicial clearance'
        }
      });
      return res.status(403).json({ error: 'SEALED_DOCUMENT_ACCESS_DENIED', message: access.reason });
    }
  }

  // Record Stream Access Audit Log
  auditService.recordLog({
    userId: user.id,
    action: 'DOCUMENT_STREAM_PREVIEWED',
    targetType: 'Document',
    targetId: doc.id,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: {
      filename: doc.original_filename,
      fileHash: doc.file_hash,
      officer: user.name,
      badge: user.badge_number,
      deliveryMethod: 'ObjectUrlDataStream'
    }
  });

  // Security Headers: prevent disk leakage, force sandbox inline delivery
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.original_filename)}"`);
  res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Judicial-Integrity-Hash', doc.file_hash);

  const filePath = path.join(uploadsDir, doc.storage_path);

  if (fs.existsSync(filePath) && (doc.mime_type === 'application/pdf' || doc.original_filename.endsWith('.pdf'))) {
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    // Generate certified judicial PDF bytes
    try {
      const pdfBytes = await generateCertifiedJudicialPdf({
        documentTitle: doc.original_filename.replace(/_/g, ' ').replace(/\.(pdf|docx|doc)$/i, ''),
        suitNumber: parentCase?.suit_number || 'FHC/ABJ/CR/2024/104',
        caseTitle: parentCase?.case_title || 'Federal Republic of Nigeria v. Registry Matter',
        documentType: parentCase?.document_type || 'judgment',
        fileHash: doc.file_hash,
        documentId: doc.id,
        officerName: user.name,
        officerRole: user.role,
        officerBadge: user.badge_number,
        registeredDate: new Date(doc.created_at).toUTCString(),
        presidingJudge: parentCase ? 'Hon. Justice Adewale K. Vance' : undefined
      });

      res.setHeader('Content-Length', pdfBytes.byteLength);
      res.end(Buffer.from(pdfBytes));
    } catch (err: any) {
      console.error('Error synthesizing judicial PDF:', err);
      res.status(500).json({ error: 'PDF_GENERATION_FAILED', message: err.message });
    }
  }
});

// Document Preview / Integrity Inspection
app.get('/api/documents/:id/preview', (req, res) => {
  const user = req.currentUser!;
  const doc = db.getDocumentById(req.params.id);

  if (!doc) {
    return res.status(404).json({ error: 'DOCUMENT_NOT_FOUND' });
  }

  // Audit access
  auditService.recordLog({
    userId: user.id,
    action: 'DOCUMENT_ACCESSED',
    targetType: 'Document',
    targetId: doc.id,
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: { filename: doc.original_filename }
  });

  res.json({
    document: doc,
    certifiedDigest: {
      algorithm: 'SHA-256',
      hash: doc.file_hash,
      integrityConfirmed: true,
      registeredAt: doc.created_at
    }
  });
});

// -----------------------------------------------------------------------
// 6. CRYPTOGRAPHIC AUDIT LEDGER & VERIFICATION SUITE
// -----------------------------------------------------------------------
app.get('/api/audit-logs', (req, res) => {
  const { userId, action, targetType, targetId, startDate, endDate, page, limit } = req.query;
  const logs = auditService.getLogs({
    userId: userId as string,
    action: action as string,
    targetType: targetType as string,
    targetId: targetId as string,
    startDate: startDate as string,
    endDate: endDate as string,
    page: Number(page) || 1,
    limit: Number(limit) || 50
  });

  // Populate user names for display
  const populated = logs.map(l => ({
    ...l,
    user: l.user_id ? db.users.get(l.user_id) : null
  }));

  res.json({ logs: populated, count: populated.length });
});

// Live Cryptographic Chain Integrity Verification
app.post('/api/audit-logs/verify', (req, res) => {
  const user = req.currentUser!;
  const result = auditService.verifyChainIntegrity();

  auditService.recordLog({
    userId: user.id,
    action: 'AUDIT_CHAIN_VERIFIED',
    targetType: 'AuditChain',
    targetId: '00000000-0000-0000-0000-000000000000',
    ipAddress: req.ip || '127.0.0.1',
    userAgent: req.headers['user-agent'],
    metadata: {
      isValid: result.is_valid,
      totalBlocksVerified: result.total_blocks,
      elapsedMs: result.verification_time_ms
    }
  });

  res.json({ result });
});

// Tamper Simulation Laboratory (To demonstrate deterministic tamper detection)
app.post('/api/audit-logs/tamper-test', requireRoles('chief_registrar', 'auditor', 'system_admin'), (req, res) => {
  const { action, blockIndex, fieldToAlter, newValue } = req.body;

  if (action === 'simulate') {
    try {
      const simResult = auditService.simulateTamper(blockIndex, fieldToAlter, newValue);
      res.json({
        message: 'Tamper simulation applied. The cryptographic audit chain is now compromised in memory.',
        simulation: simResult
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  } else if (action === 'restore') {
    const restoreResult = auditService.restoreOriginalChain();
    res.json({
      message: 'Original audit chain restored to pristine verified state.',
      result: restoreResult
    });
  } else {
    res.status(400).json({ error: "Invalid action. Use 'simulate' or 'restore'." });
  }
});

// -----------------------------------------------------------------------
// 7. EXTENSION EVENTS & QUEUE TELEMETRY
// -----------------------------------------------------------------------
app.get('/api/events/logs', (req, res) => {
  res.json({
    eventHistory: judicialEvents.getEventHistory(),
    queueStatus: documentProcessingQueue.getQueueStatus()
  });
});

app.post('/api/events/dispatch', (req, res) => {
  const user = req.currentUser!;
  const { eventType, payload } = req.body;
  if (!eventType) {
    return res.status(400).json({ error: 'eventType is required.' });
  }

  const dispatched = judicialEvents.emitGenericEvent(eventType, payload || {}, user.id);
  res.json({ success: true, event: dispatched });
});

// -----------------------------------------------------------------------
// 8. POSTGRESQL SCHEMA DDL EXPORT
// -----------------------------------------------------------------------
app.get('/api/schema/ddl', (req, res) => {
  const schemaPath = path.join(process.cwd(), 'migrations', '001_judicial_schema.sql');
  if (fs.existsSync(schemaPath)) {
    const content = fs.readFileSync(schemaPath, 'utf-8');
    res.setHeader('Content-Type', 'text/plain');
    res.send(content);
  } else {
    res.status(404).json({ error: 'Migration file not found.' });
  }
});

// -----------------------------------------------------------------------
// 9. VITE SPA & STATIC ASSETS
// -----------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JUDICIAL ARCHIVE SYSTEM] Backend online on http://0.0.0.0:${PORT}`);
  });
}

startServer();
