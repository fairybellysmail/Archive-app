import React from 'react';
import { User, UserRole } from '../types/judicial.js';
import { Shield, UserCheck, Lock, Award, FileText, CheckCircle2, X } from 'lucide-react';

interface OfficerSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
  allOfficers?: User[];
  users?: User[];
  onSelectUser: (user: User) => void;
}

const roleDescriptions: Record<UserRole, { title: string; badge: string; color: string; permissions: string[] }> = {
  chief_registrar: {
    title: 'Chief Registrar of Court (SAN)',
    badge: 'Supreme Administrative Authority',
    color: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
    permissions: [
      'Full administrative oversight across all Judicial Divisions',
      'Authority to place dockets under In-Camera Seal or unseal',
      'Final status transition: Published -> Archived',
      'Run cryptographic audit verification & tamper forensics'
    ]
  },
  judge: {
    title: 'Presiding Judge of the High Bench',
    badge: 'Judicial Adjudication Authority',
    color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
    permissions: [
      'Deliver & sign Judgments, Rulings, and Bench Orders',
      'Authorize state transitions: Pending Review -> Published',
      'Preside over Court Proceedings and publish official transcripts',
      'Access Sealed Dockets and In-Camera chamber files'
    ]
  },
  clerk: {
    title: 'Principal Court Clerk & Registrar',
    badge: 'Registry & Filing Authority',
    color: 'bg-sky-500/10 text-sky-300 border-sky-500/30',
    permissions: [
      'Register new case dockets in Draft status',
      'Submit cases for judicial review (Draft -> Pending Review)',
      'Upload official court filings (PDF / DOCX)',
      'Log courtroom session transcripts & daily docket entries'
    ]
  },
  auditor: {
    title: 'Senior Judicial Integrity Auditor',
    badge: 'Independent Oversight Authority',
    color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
    permissions: [
      'Read-only inspection of unsealed judicial dockets',
      'Execute cryptographic SHA-256 audit chain verification',
      'Run tamper detection laboratories and export integrity proofs',
      'Real-time access to security violation & access denial logs'
    ]
  },
  system_admin: {
    title: 'Judicial Infrastructure System Admin',
    badge: 'Cryptographic Security & System Ops',
    color: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
    permissions: [
      'Full technical authority and database DDL migration inspection',
      'Execute audit chain diagnostics and test simulations',
      'Maintain immutable storage registries and queue telemetry'
    ]
  }
};

export const OfficerSwitcherModal: React.FC<OfficerSwitcherModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  allOfficers,
  users,
  onSelectUser
}) => {
  if (!isOpen) return null;

  const officersList = users || allOfficers || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 font-judicial-display tracking-wide">
                Judicial Role & Officer Session Switcher
              </h2>
              <p className="text-xs text-slate-400">
                Switch active judicial officer session to verify server-side RBAC authorization gates.
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

        {/* Body */}
        <div className="p-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {officersList.map(officer => {
            const isCurrent = currentUser?.id === officer.id;
            const meta = roleDescriptions[officer.role] || {
              title: officer.role,
              badge: 'Judicial Officer',
              color: 'bg-slate-800 text-slate-300 border-slate-700',
              permissions: []
            };

            return (
              <div
                key={officer.id}
                onClick={() => {
                  onSelectUser(officer);
                  onClose();
                }}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-800/90 border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/30'
                    : 'bg-slate-950/40 border-slate-800 hover:bg-slate-800/40 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm border shrink-0 ${
                        isCurrent
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {officer.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-100 text-sm">
                          {officer.name}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono-code uppercase font-semibold border ${meta.color}`}>
                          {meta.badge}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active Session
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-3">
                        <span>Badge: <strong className="font-mono-code text-slate-300">{officer.badge_number}</strong></span>
                        <span>•</span>
                        <span>{officer.court_jurisdiction}</span>
                      </div>

                      {/* Permissions overview */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80">
                        <p className="text-[11px] text-slate-400 font-medium mb-1">Authorization Scope:</p>
                        <ul className="text-[11px] text-slate-300 space-y-0.5">
                          {meta.permissions.map((p, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <span className="w-1 h-1 rounded-full bg-slate-500 shrink-0" />
                              {p}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  <button
                    className={`text-xs px-3 py-1.5 rounded-lg font-medium shrink-0 transition-colors ${
                      isCurrent
                        ? 'bg-amber-500 text-slate-950 font-semibold'
                        : 'bg-slate-800 text-slate-200 hover:bg-slate-700'
                    }`}
                  >
                    {isCurrent ? 'Current' : 'Switch To'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/60 border-t border-slate-800 text-center text-xs text-slate-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-slate-400">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Server-side RBAC validates every action and API call.
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
