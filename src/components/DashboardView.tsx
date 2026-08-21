import React from 'react';
import { DashboardStats, User } from '../types/judicial.js';
import {
  Scale,
  Shield,
  FileText,
  Clock,
  Lock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Database,
  PlusCircle,
  Gavel,
  BookOpen
} from 'lucide-react';
import { NavTab } from './Navigation.js';

interface DashboardViewProps {
  stats: DashboardStats | null;
  loading: boolean;
  currentUser: User | null;
  onNavigate: (tab: NavTab) => void;
  onSelectCase: (caseId: string) => void;
  onOpenCreateCase: () => void;
  onVerifyAuditChain: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  loading,
  currentUser,
  onNavigate,
  onSelectCase,
  onOpenCreateCase,
  onVerifyAuditChain
}) => {
  if (loading || !stats) {
    return (
      <div className="p-8 space-y-6 animate-pulse">
        <div className="h-8 bg-slate-800/60 rounded w-1/3"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-28 bg-slate-800/40 rounded-xl border border-slate-800"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-slate-800/40 rounded-xl border border-slate-800"></div>
          <div className="h-72 bg-slate-800/40 rounded-xl border border-slate-800"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Executive Welcome & Institutional Masthead */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 bg-slate-900/80 rounded-2xl border border-slate-800/90 shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-mono-code font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
              Judicial Administration & Archive Center
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-xs text-slate-400 font-medium">Session Officer: {currentUser?.name}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-judicial-display tracking-wide">
            Document Archive & Case Proceedings
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl font-judicial-serif">
            High-integrity repository for certified court records, authenticated transcripts, and deterministic tamper-evident audit logs.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
          <button
            onClick={onOpenCreateCase}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Register Case Docket
          </button>
          <button
            onClick={onVerifyAuditChain}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Verify Audit Chain
          </button>
        </div>

        {/* Decorative background crest watermark */}
        <div className="absolute right-[-20px] bottom-[-30px] text-slate-800/20 pointer-events-none">
          <Scale className="w-56 h-56" />
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cases */}
        <div
          onClick={() => onNavigate('cases')}
          className="p-5 bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Dockets</span>
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg group-hover:bg-sky-500/20 transition-colors">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono-code mb-1">
            {stats.total_cases}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>{stats.draft_cases} Draft • {stats.archived_cases} Archived</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Published Judgments */}
        <div
          onClick={() => onNavigate('cases')}
          className="p-5 bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Published Judgments</span>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg group-hover:bg-emerald-500/20 transition-colors">
              <Gavel className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-300 font-mono-code mb-1">
            {stats.published_judgments}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Certified Judicial Precedents</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Pending Review */}
        <div
          onClick={() => onNavigate('cases')}
          className="p-5 bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Bench Review</span>
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg group-hover:bg-amber-500/20 transition-colors">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-amber-300 font-mono-code mb-1">
            {stats.pending_review}
          </div>
          <div className="text-[11px] text-slate-400 flex items-center justify-between">
            <span>Awaiting Judicial Clearance</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>

        {/* Sealed Dockets & Audit Ledger */}
        <div
          onClick={() => onNavigate('audit')}
          className="p-5 bg-slate-900/60 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider">Audit Chain Blocks</span>
            <div className={`p-2 rounded-lg ${stats.audit_chain_valid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
              <Shield className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-100 font-mono-code mb-1">
            {stats.audit_chain_length}
          </div>
          <div className="text-[11px] flex items-center justify-between">
            <span className={stats.audit_chain_valid ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
              {stats.audit_chain_valid ? 'Cryptographically Intact' : 'Tamper Detected!'}
            </span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>

      {/* Main Dashboard Two-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Case Dockets & Bench Matters */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/90 overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-100 font-judicial-display tracking-wide">
                  Recent Case Dockets & Certified Filings
                </h3>
              </div>
              <button
                onClick={() => onNavigate('cases')}
                className="text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
              >
                View Full Registry <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {stats.recent_cases.map(c => {
                const isSealed = c.is_sealed;
                return (
                  <div
                    key={c.id}
                    onClick={() => onSelectCase(c.id)}
                    className="p-4 hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono-code text-xs font-semibold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {c.suit_number}
                        </span>
                        {isSealed && (
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono-code font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> SEALED DOCKET
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {c.document_type}
                        </span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            c.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : c.status === 'pending_review'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {c.status.replace('_', ' ')}
                        </span>
                      </div>
                      <h4 className="text-xs sm:text-sm font-medium text-slate-200 line-clamp-1">
                        {c.case_title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        Subject: {c.subject_matter}
                      </p>
                    </div>

                    <div className="text-right shrink-0 text-xs text-slate-400">
                      <span className="block text-[11px] text-slate-500">
                        Delivered: {c.date_delivered || 'Pending'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono-code">
                        {c.documents_count || 0} Docs • {c.proceedings_count || 0} Sessions
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Proceedings Docket */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/90 overflow-hidden shadow-lg">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-2.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100 font-judicial-display tracking-wide">
                  Recent Court Session Transcripts
                </h3>
              </div>
              <button
                onClick={() => onNavigate('proceedings')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                All Proceedings <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-800/60">
              {stats.recent_proceedings.map(p => (
                <div key={p.id} className="p-4 space-y-1.5 hover:bg-slate-800/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-200">
                      {p.presiding_judge}
                    </span>
                    <span className="text-xs font-mono-code text-slate-400">
                      Session Date: {p.session_date}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 font-judicial-serif line-clamp-2">
                    {p.summary_notes || 'Official courtroom proceedings recorded in bench docket notes.'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        p.status === 'published'
                          ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {p.status} transcript
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono-code">
                      Registered by {p.created_by_user?.name || 'Clerk'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Audit Ledger Chained Live Inspector */}
        <div className="space-y-6">
          <div className="bg-slate-900/80 rounded-xl border border-slate-800/90 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-100 font-judicial-display">
                  Audit Chain Status
                </h3>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono-code font-bold ${
                  stats.audit_chain_valid
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                }`}
              >
                {stats.audit_chain_valid ? 'INTACT' : 'TAMPERED'}
              </span>
            </div>

            <p className="text-xs text-slate-400">
              Every database mutation (case filing, document upload, status transition) is canonically hashed with its predecessor via SHA-256.
            </p>

            {/* Recent Audit Blocks */}
            <div className="space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Latest Chained Blocks
              </span>
              {stats.recent_audit_logs.map(log => (
                <div key={log.id} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono-code font-semibold text-amber-300">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-[10px] font-mono-code text-slate-400 truncate">
                    Hash: {log.current_hash.substring(0, 16)}...
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onNavigate('audit')}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Open Audit & Tamper Lab <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Database Schema & Integrity Directives */}
          <div className="bg-slate-900/60 rounded-xl border border-slate-800/90 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-semibold text-slate-100 font-judicial-display">
                PostgreSQL Architecture
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Foreign keys, UUID primary keys, composite indices on <code className="text-slate-300">(normalized_suit_number, subject_matter, document_type, status)</code>, and soft-delete columns are active.
            </p>
            <button
              onClick={() => onNavigate('schema')}
              className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-amber-400 border border-slate-800 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              Inspect PostgreSQL DDL <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
