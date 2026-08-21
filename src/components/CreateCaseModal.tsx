import React, { useState } from 'react';
import { DocumentType, CaseStatus } from '../types/judicial.js';
import { X, Scale, FileText, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface CreateCaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    case_title: string;
    suit_number: string;
    date_delivered?: string | null;
    subject_matter: string;
    document_type: DocumentType;
    status?: CaseStatus;
    is_sealed?: boolean;
  }) => Promise<void>;
}

export const CreateCaseModal: React.FC<CreateCaseModalProps> = ({
  isOpen,
  onClose,
  onSubmit
}) => {
  const [title, setTitle] = useState('');
  const [suitNumber, setSuitNumber] = useState('');
  const [dateDelivered, setDateDelivered] = useState('');
  const [subjectMatter, setSubjectMatter] = useState('Constitutional Law & Fundamental Rights');
  const [documentType, setDocumentType] = useState<DocumentType>('judgment');
  const [status, setStatus] = useState<CaseStatus>('draft');
  const [isSealed, setIsSealed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const normalizedPreview = suitNumber
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '-');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !suitNumber.trim() || !subjectMatter.trim()) {
      setError('Case title, suit number, and subject matter are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        case_title: title.trim(),
        suit_number: suitNumber.trim(),
        date_delivered: dateDelivered || null,
        subject_matter: subjectMatter.trim(),
        document_type: documentType,
        status,
        is_sealed: isSealed
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create case record.');
    } finally {
      setLoading(false);
    }
  };

  const subjectMatterOptions = [
    'Constitutional Law & Fundamental Rights',
    'Admiralty, Maritime Security & Territorial Waters',
    'Corporate Taxation, Sovereign Debt & Statutory Deductions',
    'Commercial Arbitration & International Trade',
    'Telecommunications Licensing & Spectrum Dispute',
    'National Security & Critical Infrastructure Protection',
    'Electoral Petitions & Governance Mandate',
    'Banking, Financial Crimes & Asset Forfeiture'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 font-judicial-display tracking-wide">
                Register New Case Docket
              </h2>
              <p className="text-xs text-slate-400">
                Official Judicial Registry Entry & Cryptographically Logged Mutation
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 rounded-lg text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Suit Number & Normalization */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Suit / Docket Number *
            </label>
            <input
              type="text"
              placeholder="e.g. FHC/ABJ/CS/2024/991 or SC/CV/2024/405"
              value={suitNumber}
              onChange={e => setSuitNumber(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono-code"
              required
            />
            {suitNumber && (
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="font-medium text-slate-500">Normalized Search Key:</span>
                <span className="font-mono-code text-amber-300 bg-slate-800/80 px-1.5 py-0.5 rounded border border-slate-700">
                  {normalizedPreview}
                </span>
              </p>
            )}
          </div>

          {/* Case Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Case Title / Parties *
            </label>
            <textarea
              placeholder="e.g. Federal Republic of Nigeria v. Sovereign Petroleum Exploration Ltd & 2 Ors"
              value={title}
              onChange={e => setTitle(e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 placeholder:text-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              required
            />
          </div>

          {/* Subject Matter */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Subject Matter Classification *
            </label>
            <select
              value={subjectMatter}
              onChange={e => setSubjectMatter(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
            >
              {subjectMatterOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>

          {/* Document Type & Status Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Document Type *
              </label>
              <select
                value={documentType}
                onChange={e => setDocumentType(e.target.value as DocumentType)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="judgment">Judgment (Final)</option>
                <option value="ruling">Ruling (Interlocutory)</option>
                <option value="order">Court Order / Injunction</option>
                <option value="case_file">General Case File / Dossier</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Initial Lifecycle Status
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as CaseStatus)}
                className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              >
                <option value="draft">Draft (Registry Intake)</option>
                <option value="pending_review">Pending Review (Bench)</option>
                <option value="published">Published (Certified Record)</option>
              </select>
            </div>
          </div>

          {/* Date Delivered */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Date Delivered (If Applicable)
            </label>
            <input
              type="date"
              value={dateDelivered}
              onChange={e => setDateDelivered(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Sealed Docket Classification */}
          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Lock className={`w-4 h-4 ${isSealed ? 'text-amber-400' : 'text-slate-500'}`} />
              <div>
                <span className="text-xs font-semibold text-slate-200 block">Classify as Sealed Docket (In-Camera)</span>
                <span className="text-[11px] text-slate-400 block">Restricts viewing strictly to Presiding Judges & Chief Registrar</span>
              </div>
            </div>
            <input
              type="checkbox"
              checked={isSealed}
              onChange={e => setIsSealed(e.target.checked)}
              className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500 bg-slate-900 cursor-pointer"
            />
          </div>

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Registering...' : 'Register Judicial Case'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
