import React, { useState, useEffect } from 'react';
import { CaseProceeding, User } from '../types/judicial.js';
import { api } from '../services/api.js';
import {
  Clock,
  Search,
  PlusCircle,
  Calendar,
  User as UserIcon,
  BookOpen,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ProceedingsViewProps {
  currentUser: User | null;
  onSelectCase: (caseId: string) => void;
  onRefreshStats: () => void;
}

export const ProceedingsView: React.FC<ProceedingsViewProps> = ({
  currentUser,
  onSelectCase,
  onRefreshStats
}) => {
  const [proceedings, setProceedings] = useState<CaseProceeding[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  const loadProceedings = async () => {
    setLoading(true);
    try {
      const data = await api.getProceedings({
        status: statusFilter !== 'all' ? statusFilter : undefined
      });
      setProceedings(data.proceedings);
    } catch (err) {
      console.error('Failed to load proceedings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProceedings();
  }, [statusFilter]);

  const handlePublishTranscript = async (id: string) => {
    try {
      await api.transitionProceedingStatus(id, 'published');
      await loadProceedings();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Failed to publish proceeding.');
    }
  };

  const filtered = proceedings.filter(p => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      p.presiding_judge.toLowerCase().includes(q) ||
      (p.summary_notes && p.summary_notes.toLowerCase().includes(q)) ||
      p.session_date.includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">
              Courtroom Session Transcripts
            </span>
            <span className="text-xs text-slate-500">• {filtered.length} Recorded Sessions</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-judicial-display tracking-wide mt-1">
            Judicial Proceedings & Session Records
          </h1>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search proceedings by presiding judge, date (YYYY-MM-DD), or transcript text..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 font-mono-code focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Transcript Statuses</option>
            <option value="draft">Draft Bench Notes</option>
            <option value="published">Published Certified Transcripts</option>
          </select>
        </div>
      </div>

      {/* Proceedings List */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 animate-pulse space-y-2">
          <Clock className="w-8 h-8 mx-auto text-indigo-400/50" />
          <p className="text-xs font-medium">Loading session dockets...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 bg-slate-900/40 rounded-xl border border-slate-800 text-center space-y-2">
          <BookOpen className="w-8 h-8 mx-auto text-slate-600" />
          <p className="text-xs text-slate-400">No courtroom proceedings matching query.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(p => (
            <div
              key={p.id}
              className="p-5 bg-slate-900/90 rounded-xl border border-slate-800/90 space-y-3 shadow-lg hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <span className="font-mono-code text-xs font-bold text-amber-300 bg-slate-950 px-2.5 py-1 rounded border border-slate-800">
                    {p.session_date}
                  </span>
                  <h3 className="text-sm font-semibold text-slate-100 font-judicial-display">
                    {p.presiding_judge}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                      p.status === 'published'
                        ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                    }`}
                  >
                    {p.status} transcript
                  </span>

                  {p.status === 'draft' && (currentUser?.role === 'judge' || currentUser?.role === 'chief_registrar') && (
                    <button
                      onClick={() => handlePublishTranscript(p.id)}
                      className="text-[11px] px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-semibold transition-colors"
                    >
                      Certify & Publish
                    </button>
                  )}

                  <button
                    onClick={() => onSelectCase(p.case_id)}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1 ml-2 cursor-pointer"
                  >
                    Open Case Docket <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 font-judicial-serif leading-relaxed whitespace-pre-wrap bg-slate-950/40 p-3.5 rounded-lg border border-slate-850">
                {p.summary_notes || 'Official courtroom proceedings logged by bench clerk.'}
              </p>

              <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono-code pt-1">
                <span>Intake Clerk: {p.created_by_user?.name || 'Judicial Registrar'}</span>
                <span>Case UUID: {p.case_id.substring(0, 13)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
