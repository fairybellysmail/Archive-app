import React, { useState } from 'react';
import { ProceedingStatus } from '../types/judicial.js';
import { X, Clock, AlertCircle } from 'lucide-react';

interface CreateProceedingModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  suitNumber: string;
  defaultJudge?: string;
  onSubmit: (data: {
    session_date: string;
    presiding_judge: string;
    summary_notes?: string | null;
    status?: ProceedingStatus;
  }) => Promise<void>;
}

export const CreateProceedingModal: React.FC<CreateProceedingModalProps> = ({
  isOpen,
  onClose,
  caseId,
  suitNumber,
  defaultJudge,
  onSubmit
}) => {
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [presidingJudge, setPresidingJudge] = useState(defaultJudge || 'Hon. Justice Adewale K. Vance');
  const [summaryNotes, setSummaryNotes] = useState('');
  const [status, setStatus] = useState<ProceedingStatus>('draft');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionDate || !presidingJudge.trim()) {
      setError('Session date and presiding judge are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSubmit({
        session_date: sessionDate,
        presiding_judge: presidingJudge.trim(),
        summary_notes: summaryNotes.trim() || null,
        status
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record proceeding.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-lg w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg border border-indigo-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 font-judicial-display tracking-wide">
                Log Court Proceeding / Session
              </h2>
              <p className="text-xs text-slate-400">
                Docket: <span className="font-mono-code text-amber-300 font-semibold">{suitNumber}</span>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 rounded-lg text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Session Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Court Session Date *
            </label>
            <input
              type="date"
              value={sessionDate}
              onChange={e => setSessionDate(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Enforces DB constraint: <code className="text-slate-300">UNIQUE(case_id, session_date)</code>
            </p>
          </div>

          {/* Presiding Judge */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Presiding Judge / Bench *
            </label>
            <input
              type="text"
              placeholder="e.g. Hon. Justice Adewale K. Vance"
              value={presidingJudge}
              onChange={e => setPresidingJudge(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Transcript Status
            </label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as ProceedingStatus)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
            >
              <option value="draft">Draft (Clerk Session Notes)</option>
              <option value="published">Published (Bench Certified Record)</option>
            </select>
          </div>

          {/* Summary Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Session Summary Notes & Bench Directions
            </label>
            <textarea
              rows={4}
              placeholder="Record appearances of counsel, applications argued, orders made, and adjournment date..."
              value={summaryNotes}
              onChange={e => setSummaryNotes(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Footer */}
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
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
            >
              {loading ? 'Recording...' : 'Record Court Proceeding'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
