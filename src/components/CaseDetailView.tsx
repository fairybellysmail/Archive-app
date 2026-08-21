import React, { useState, useEffect } from 'react';
import {
  Case,
  CaseProceeding,
  DocumentRecord,
  AuditLog,
  CaseStatus,
  User,
  ProceedingStatus
} from '../types/judicial.js';
import { api } from '../services/api.js';
import {
  ArrowLeft,
  Scale,
  Lock,
  Unlock,
  Shield,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  PlusCircle,
  Download,
  Eye,
  Gavel,
  Calendar,
  Layers,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  Copy
} from 'lucide-react';
import { UploadDocumentModal } from './UploadDocumentModal.js';
import { CreateProceedingModal } from './CreateProceedingModal.js';
import { DocumentViewerModal } from './DocumentViewerModal.js';
import { SecurePdfViewer } from './SecurePdfViewer.js';

interface CaseDetailViewProps {
  caseId: string;
  currentUser: User | null;
  onBack: () => void;
  onRefreshStats: () => void;
}

export const CaseDetailView: React.FC<CaseDetailViewProps> = ({
  caseId,
  currentUser,
  onBack,
  onRefreshStats
}) => {
  const [caseData, setCaseData] = useState<Case | null>(null);
  const [proceedings, setProceedings] = useState<CaseProceeding[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [availableTransitions, setAvailableTransitions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'proceedings' | 'documents' | 'previewer' | 'audit' | 'meta'>('proceedings');
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentRecord | null>(null);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateProcOpen, setIsCreateProcOpen] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<DocumentRecord | null>(null);
  const [isSealingModalOpen, setIsSealingModalOpen] = useState(false);
  const [sealingReason, setSealingReason] = useState('');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  const loadCaseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCaseById(caseId);
      setCaseData(data.case);
      setProceedings(data.proceedings);
      setDocuments(data.documents);
      setAuditLogs(data.auditLogs);
      setAvailableTransitions(data.availableTransitions);
      if (data.documents && data.documents.length > 0) {
        setSelectedDocForPreview(prev => prev || data.documents[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load case dossier.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCaseDetails();
  }, [caseId]);

  // Handle State Machine Transition
  const handleTransition = async (targetStatus: CaseStatus) => {
    if (!caseData) return;
    setIsTransitioning(true);
    setTransitionError(null);
    try {
      await api.transitionCaseStatus(caseData.id, targetStatus);
      await loadCaseDetails();
      onRefreshStats();
    } catch (err: any) {
      setTransitionError(err.message || 'State transition rejected.');
    } finally {
      setIsTransitioning(false);
    }
  };

  // Handle Seal Toggle
  const handleToggleSeal = async () => {
    if (!caseData) return;
    const targetSealed = !caseData.is_sealed;
    try {
      await api.toggleCaseSeal(caseData.id, targetSealed, sealingReason || undefined);
      setIsSealingModalOpen(false);
      setSealingReason('');
      await loadCaseDetails();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Failed to update sealing classification.');
    }
  };

  // Handle Proceeding Status Transition
  const handleProceedingTransition = async (procId: string, targetStatus: ProceedingStatus) => {
    try {
      await api.transitionProceedingStatus(procId, targetStatus);
      await loadCaseDetails();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Failed to update proceeding status.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-24"></div>
        <div className="h-40 bg-slate-800/50 rounded-xl border border-slate-800"></div>
        <div className="h-80 bg-slate-800/40 rounded-xl border border-slate-800"></div>
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 bg-slate-900 border border-slate-800 rounded-xl text-center space-y-4 shadow-2xl">
        <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-rose-500/30">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-100 font-judicial-display">
          Judicial Access Restricted or Record Unavailable
        </h2>
        <p className="text-xs text-slate-400">
          {error || 'The requested docket could not be retrieved from the repository.'}
        </p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Case Registry
        </button>
      </div>
    );
  }

  // Lifecycle steps
  const steps: { key: CaseStatus; label: string; description: string }[] = [
    { key: 'draft', label: 'Draft', description: 'Registry Intake' },
    { key: 'pending_review', label: 'Pending Review', description: 'Bench Scrutiny' },
    { key: 'published', label: 'Published', description: 'Certified Record' },
    { key: 'archived', label: 'Archived', description: 'Perpetual Archive' }
  ];

  const currentStepIndex = steps.findIndex(s => s.key === caseData.status);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Back button & quick bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-xs font-semibold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Master Registry
        </button>
        <span className="text-[11px] font-mono-code text-slate-500">
          Record UUID: {caseData.id}
        </span>
      </div>

      {/* Sealed Banner (If Sealed) */}
      {caseData.is_sealed && (
        <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-200 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-rose-500/20 text-rose-300 rounded-lg border border-rose-500/30 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold font-mono-code uppercase tracking-wider">
                IN-CAMERA SEALED JUDICIAL DOCKET
              </h3>
              <p className="text-[11px] text-rose-200/80 mt-0.5">
                Restricted by Order of Court. Access granted strictly to Authorized Presiding Judges and the Chief Registrar.
              </p>
            </div>
          </div>

          {(currentUser?.role === 'chief_registrar' || currentUser?.role === 'judge' || currentUser?.role === 'system_admin') && (
            <button
              onClick={() => setIsSealingModalOpen(true)}
              className="px-3 py-1.5 bg-rose-900/60 hover:bg-rose-800 text-rose-100 border border-rose-700/80 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 self-start sm:self-auto shrink-0"
            >
              <Unlock className="w-3.5 h-3.5" /> Modify Seal Classification
            </button>
          )}
        </div>
      )}

      {/* Top Dossier Card */}
      <div className="p-6 bg-slate-900/90 rounded-2xl border border-slate-800/90 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono-code text-sm font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                {caseData.suit_number}
              </span>
              <span className="text-[11px] font-mono-code text-slate-400 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                NORM: {caseData.normalized_suit_number}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded font-medium uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                {caseData.document_type}
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded font-semibold uppercase ${
                  caseData.status === 'published'
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : caseData.status === 'pending_review'
                    ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    : caseData.status === 'archived'
                    ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {caseData.status.replace('_', ' ')}
              </span>
            </div>

            <h1 className="text-lg sm:text-2xl font-bold text-slate-100 font-judicial-display leading-snug">
              {caseData.case_title}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 font-judicial-serif">
              <strong className="text-slate-300">Subject Matter:</strong> {caseData.subject_matter}
            </p>
          </div>

          {/* Quick Actions (Upload & Sealing) */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" /> Upload Filing (PDF/DOCX)
            </button>
            <button
              onClick={() => setIsCreateProcOpen(true)}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" /> Log Session
            </button>
            {!caseData.is_sealed && (currentUser?.role === 'chief_registrar' || currentUser?.role === 'judge' || currentUser?.role === 'system_admin') && (
              <button
                onClick={() => setIsSealingModalOpen(true)}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-4 h-4" /> Seal Docket
              </button>
            )}
          </div>
        </div>

        {/* State Machine Transition Engine Bar */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-400" />
              State Machine Lifecycle Progression:
            </span>
            <span className="text-[11px] text-slate-400 font-mono-code">
              Current: <strong className="text-amber-300 uppercase">{caseData.status}</strong>
            </span>
          </div>

          {/* Transition Visual Steps */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex;
              const isCurrent = idx === currentStepIndex;
              return (
                <div
                  key={step.key}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    isCurrent
                      ? 'bg-amber-500/10 border-amber-500/40 text-amber-300 ring-1 ring-amber-500/30'
                      : isPast
                      ? 'bg-slate-950/70 border-slate-800 text-emerald-400'
                      : 'bg-slate-950/30 border-slate-900 text-slate-600'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-xs font-semibold uppercase">
                    {isPast && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{step.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">{step.description}</span>
                </div>
              );
            })}
          </div>

          {/* Action Trigger Buttons for State Machine */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {caseData.status === 'draft' && (
                <button
                  onClick={() => handleTransition('pending_review')}
                  disabled={isTransitioning}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ChevronRight className="w-3.5 h-3.5" /> Submit for Judicial Review (Draft → Pending Review)
                </button>
              )}

              {caseData.status === 'pending_review' && (
                <>
                  <button
                    onClick={() => handleTransition('published')}
                    disabled={isTransitioning}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Gavel className="w-3.5 h-3.5" /> Deliver & Publish Record (Pending → Published)
                  </button>
                  <button
                    onClick={() => handleTransition('draft')}
                    disabled={isTransitioning}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-all"
                  >
                    Return to Registry for Revision (Pending → Draft)
                  </button>
                </>
              )}

              {caseData.status === 'published' && (
                <button
                  onClick={() => handleTransition('archived')}
                  disabled={isTransitioning}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" /> Close & Archive Docket (Published → Archived)
                </button>
              )}
            </div>

            <span className="text-[11px] text-slate-500">
              Transitions enforced server-side via RBAC authorization.
            </span>
          </div>

          {transitionError && (
            <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-lg text-rose-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{transitionError}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="border-b border-slate-800 flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('proceedings')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'proceedings'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Clock className="w-4 h-4" />
          Proceedings Timeline ({proceedings.length})
        </button>

        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'documents'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Document Registry ({documents.length})
        </button>

        <button
          onClick={() => {
            if (!selectedDocForPreview && documents.length > 0) {
              setSelectedDocForPreview(documents[0]);
            }
            setActiveTab('previewer');
          }}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'previewer'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Eye className="w-4 h-4 text-sky-400" />
          Embedded PDF Viewer
          {documents.length > 0 && (
            <span className="text-[10px] bg-sky-500/20 text-sky-300 font-mono-code px-1.5 py-0.5 rounded border border-sky-500/30">
              Watermarked
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'audit'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-4 h-4" />
          Docket Audit Trail ({auditLogs.length})
        </button>

        <button
          onClick={() => setActiveTab('meta')}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'meta'
              ? 'border-amber-400 text-amber-300'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          Judicial Metadata
        </button>
      </div>

      {/* Tab 1: Chronological Proceedings Timeline */}
      {activeTab === 'proceedings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 font-judicial-display">
                Chronological Court Proceedings & Session Transcripts
              </h3>
              <p className="text-xs text-slate-400">
                Sorted chronologically by session date pursuant to composite index <code className="text-slate-300">idx_proceedings_chronological</code>.
              </p>
            </div>
            <button
              onClick={() => setIsCreateProcOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <PlusCircle className="w-3.5 h-3.5" /> Log Court Session
            </button>
          </div>

          {proceedings.length === 0 ? (
            <div className="p-8 bg-slate-900/40 rounded-xl border border-slate-800 text-center space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs text-slate-400">No courtroom session proceedings recorded for this docket yet.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
              {proceedings.map((proc, idx) => (
                <div key={proc.id} className="relative group">
                  {/* Timeline bullet */}
                  <div className="absolute -left-6 top-1.5 w-4 h-4 rounded-full bg-slate-900 border-2 border-amber-500/80 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400"></div>
                  </div>

                  <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800/90 space-y-3 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-code text-xs font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {proc.session_date}
                        </span>
                        <span className="text-xs font-semibold text-slate-200">
                          {proc.presiding_judge}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            proc.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                          }`}
                        >
                          {proc.status} transcript
                        </span>

                        {proc.status === 'draft' && (currentUser?.role === 'judge' || currentUser?.role === 'chief_registrar') && (
                          <button
                            onClick={() => handleProceedingTransition(proc.id, 'published')}
                            className="text-[11px] px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition-colors"
                          >
                            Publish Transcript
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs sm:text-sm text-slate-300 font-judicial-serif leading-relaxed whitespace-pre-wrap">
                      {proc.summary_notes || 'Official proceedings recorded in courtroom bench notes.'}
                    </p>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500 font-mono-code">
                      <span>Logged by: {proc.created_by_user?.name || 'Court Clerk'}</span>
                      <span>Recorded: {new Date(proc.created_at).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Document Filing Registry */}
      {activeTab === 'documents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-200 font-judicial-display">
                Registered Judicial Filings & Certified True Copies
              </h3>
              <p className="text-xs text-slate-400">
                All records stored with deterministic SHA-256 byte hashes and tamper-evident metadata.
              </p>
            </div>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <UploadCloud className="w-3.5 h-3.5" /> Upload Filing
            </button>
          </div>

          {documents.length === 0 ? (
            <div className="p-8 bg-slate-900/40 rounded-xl border border-slate-800 text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-slate-600" />
              <p className="text-xs text-slate-400">No document filings attached to this case yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map(doc => (
                <div
                  key={doc.id}
                  className="p-5 bg-slate-900/80 rounded-xl border border-slate-800/90 space-y-3 shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-xs sm:text-sm font-semibold text-slate-100 line-clamp-1">
                            {doc.original_filename}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {(doc.file_size / 1024).toFixed(1)} KB • {doc.mime_type.split('/')[1]?.toUpperCase() || 'DOCUMENT'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* SHA-256 Digest Box */}
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                      <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center gap-1">
                        <Shield className="w-3 h-3 text-amber-400" /> Deterministic SHA-256 Digest:
                      </span>
                      <div className="font-mono-code text-[10px] text-amber-300 break-all select-all">
                        {doc.file_hash}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 font-mono-code">
                      Registered: {new Date(doc.created_at).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => {
                          setSelectedDocForPreview(doc);
                          setActiveTab('previewer');
                        }}
                        className="px-2.5 py-1 bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                        title="Stream to Embedded PDF Viewer with Officer Watermark"
                      >
                        <Eye className="w-3.5 h-3.5" /> Secure Stream
                      </button>
                      <button
                        onClick={() => setViewingDoc(doc)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" /> Digest
                      </button>
                      <a
                        href={api.getDocumentDownloadUrl(doc.id)}
                        download={doc.original_filename}
                        className="px-2.5 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded text-xs font-medium transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Embedded Secure PDF Viewer with Forensic Watermarking */}
      {activeTab === 'previewer' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-xl border border-slate-800">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold text-slate-100 font-judicial-display">
                  Secure Embedded PDF Previewer & Data-Stream Vault
                </h3>
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  OBJECT-URL STREAM
                </span>
                <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  ZERO DISK PATH EXPOSURE
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Delivers certified binary PDF bytes directly into an in-memory client Blob, protected with dynamic forensic Officer ID overlay.
              </p>
            </div>

            {/* Document Selector if multiple filings exist */}
            {documents.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Active Filing:</span>
                <select
                  value={selectedDocForPreview?.id || documents[0]?.id}
                  onChange={e => {
                    const found = documents.find(d => d.id === e.target.value);
                    if (found) setSelectedDocForPreview(found);
                  }}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 max-w-xs truncate cursor-pointer"
                >
                  {documents.map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.original_filename} ({(doc.file_size / 1024).toFixed(0)} KB)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <SecurePdfViewer
            document={selectedDocForPreview || documents[0] || null}
            currentUser={currentUser}
            onOpenFullModal={() => {
              if (selectedDocForPreview || documents[0]) {
                setViewingDoc(selectedDocForPreview || documents[0]);
              }
            }}
          />
        </div>
      )}

      {/* Tab 4: Case-Specific Audit Trail */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-200 font-judicial-display">
              Case Docket Cryptographic Audit Trail
            </h3>
            <p className="text-xs text-slate-400">
              Immutable ledger blocks recording all case mutations, document uploads, and state transitions.
            </p>
          </div>

          <div className="space-y-3">
            {auditLogs.map(log => (
              <div key={log.id} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono-code font-bold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                      {log.action}
                    </span>
                    <span className="text-xs text-slate-300 font-medium">
                      by Officer: {log.user?.name || log.user_id || 'System'}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono-code">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono-code pt-1">
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 truncate">
                    <span className="text-slate-500">Prev Hash: </span>
                    <span className="text-slate-400">{log.previous_hash || 'GENESIS_HEAD'}</span>
                  </div>
                  <div className="p-2 bg-slate-950 rounded border border-slate-800 truncate">
                    <span className="text-amber-400">Block Hash: </span>
                    <span className="text-amber-300">{log.current_hash}</span>
                  </div>
                </div>

                {log.metadata && (
                  <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-900 font-mono-code">
                    Metadata: {JSON.stringify(log.metadata)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4: Judicial Metadata */}
      {activeTab === 'meta' && (
        <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-100 font-judicial-display">
            Judicial Architecture & Entity Attributes
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase font-semibold text-[10px]">Registry Intake Officer</span>
              <p className="text-slate-200 font-medium">{caseData.created_by_user?.name || 'Clerk'}</p>
              <p className="text-slate-500 font-mono-code text-[11px]">{caseData.created_by_user?.court_jurisdiction}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase font-semibold text-[10px]">Last Judicial Officer Modifier</span>
              <p className="text-slate-200 font-medium">{caseData.updated_by_user?.name || 'N/A'}</p>
              <p className="text-slate-500 font-mono-code text-[11px]">{caseData.updated_by_user?.badge_number || 'N/A'}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase font-semibold text-[10px]">Created Timestamp (TIMESTAMPTZ)</span>
              <p className="text-slate-200 font-mono-code">{caseData.created_at}</p>
            </div>

            <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
              <span className="text-slate-400 uppercase font-semibold text-[10px]">Updated Timestamp (TIMESTAMPTZ)</span>
              <p className="text-slate-200 font-mono-code">{caseData.updated_at}</p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        attachableType="Case"
        attachableId={caseData.id}
        attachableLabel={caseData.suit_number}
        onUploadSuccess={() => {
          loadCaseDetails();
          onRefreshStats();
        }}
      />

      {/* Create Proceeding Modal */}
      <CreateProceedingModal
        isOpen={isCreateProcOpen}
        onClose={() => setIsCreateProcOpen(false)}
        caseId={caseData.id}
        suitNumber={caseData.suit_number}
        onSubmit={async data => {
          await api.createProceeding(caseData.id, data);
          loadCaseDetails();
          onRefreshStats();
        }}
      />

      {/* Document Inspector Modal */}
      <DocumentViewerModal
        isOpen={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        document={viewingDoc}
        currentUser={currentUser}
      />

      {/* Sealing Classification Modal */}
      {isSealingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-md w-full shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-100 font-judicial-display">
                  {caseData.is_sealed ? 'Unseal Judicial Docket' : 'Place Docket Under Seal'}
                </h3>
                <p className="text-xs text-slate-400">
                  Authorized Judicial Action under High Bench Order
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Order / Sealing Justification Note
              </label>
              <textarea
                rows={3}
                placeholder="Cite bench order or in-camera protective motion grounds..."
                value={sealingReason}
                onChange={e => setSealingReason(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setIsSealingModalOpen(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleToggleSeal}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-semibold"
              >
                Confirm {caseData.is_sealed ? 'Unseal' : 'Sealing Order'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
