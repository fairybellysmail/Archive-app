import React from 'react';
import { User } from '../types/judicial.js';
import { useTheme } from '../context/ThemeContext.js';
import {
  Scale,
  Shield,
  Layers,
  FileText,
  Clock,
  Database,
  GitBranch,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react';

export type NavTab = 'dashboard' | 'cases' | 'proceedings' | 'audit' | 'schema' | 'events';

interface NavigationProps {
  currentTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: User | null;
  onOpenOfficerSwitcher: () => void;
  isAuditChainValid: boolean;
  onSelectCase?: (caseId: string | null) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentTab,
  onTabChange,
  currentUser,
  onOpenOfficerSwitcher,
  isAuditChainValid
}) => {
  const { theme, toggleTheme } = useTheme();

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'chief_registrar':
        return { label: 'Chief Registrar (SAN)', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' };
      case 'judge':
        return { label: 'Presiding Judge', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' };
      case 'clerk':
        return { label: 'Principal Clerk', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30' };
      case 'auditor':
        return { label: 'Judicial Auditor', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' };
      case 'system_admin':
        return { label: 'System Admin', color: 'bg-rose-500/10 text-rose-300 border-rose-500/30' };
      default:
        return { label: 'Judicial Officer', color: 'bg-slate-800 text-slate-300 border-slate-700' };
    }
  };

  const roleMeta = getRoleBadge(currentUser?.role);

  return (
    <header className="border-b border-slate-800 bg-slate-950/95 sticky top-0 z-40 backdrop-blur-md">
      {/* Top Institutional Banner */}
      <div className="px-4 lg:px-8 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 font-semibold text-slate-200 tracking-wider font-judicial-display uppercase text-[11px]">
            <Scale className="w-4 h-4 text-amber-400" />
            Federal High Court of Justice
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 hidden sm:inline text-[11px]">
            Official Judicial Document Archive & Case Proceedings System
          </span>
        </div>

        <div className="flex items-center gap-3">
          {/* Day / Night Mode Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 transition-all cursor-pointer text-xs group"
            title={`Switch to ${theme === 'dark' ? 'Day / Light' : 'Night / Dark'} Mode`}
            aria-label="Toggle Day / Night theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
                <span className="text-[11px] font-medium hidden sm:inline text-slate-300">Day Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 group-hover:-rotate-12 transition-transform duration-300" />
                <span className="text-[11px] font-medium hidden sm:inline text-slate-700">Night Mode</span>
              </>
            )}
          </button>

          {/* Cryptographic Ledger Health Chip */}
          <button
            onClick={() => onTabChange('audit')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono-code font-semibold border transition-all ${
              isAuditChainValid
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 hover:border-emerald-500/60'
                : 'bg-rose-950/40 text-rose-300 border-rose-500/40 hover:border-rose-500 animate-pulse'
            }`}
          >
            {isAuditChainValid ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">AUDIT CHAIN: VERIFIED</span>
                <span className="sm:hidden">VERIFIED</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span className="hidden sm:inline">AUDIT CHAIN: COMPROMISED</span>
                <span className="sm:hidden">ALERT</span>
              </>
            )}
          </button>

          {/* Active Judicial Officer Session Button */}
          <button
            onClick={onOpenOfficerSwitcher}
            className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-slate-600 text-slate-200 transition-all cursor-pointer"
            title="Switch Simulated Judicial Identity"
          >
            <div className="w-5 h-5 rounded bg-amber-500/20 text-amber-300 flex items-center justify-center font-bold text-[10px] border border-amber-500/40">
              {currentUser?.name ? currentUser.name[0] : 'J'}
            </div>
            <div className="text-left hidden md:block">
              <span className="font-semibold text-slate-200 block text-[11px] leading-tight">
                {currentUser?.name || 'Loading Officer...'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono-code leading-tight block">
                {roleMeta.label}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Main Navigation Bar */}
      <div className="px-4 lg:px-8 flex items-center justify-between overflow-x-auto">
        <nav className="flex items-center space-x-1 py-2 text-sm font-medium">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all text-xs font-semibold ${
              currentTab === 'dashboard'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-amber-400" />
            Executive Dashboard
          </button>

          <button
            onClick={() => onTabChange('cases')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all text-xs font-semibold ${
              currentTab === 'cases'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4 text-sky-400" />
            Case Registry & Dockets
          </button>

          <button
            onClick={() => onTabChange('proceedings')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all text-xs font-semibold ${
              currentTab === 'proceedings'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            Proceedings & Transcripts
          </button>

          <button
            onClick={() => onTabChange('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all text-xs font-semibold ${
              currentTab === 'audit'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Shield className="w-4 h-4 text-emerald-400" />
            Chained Audit Ledger & Forensics
          </button>

          <button
            onClick={() => onTabChange('schema')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all text-xs font-semibold ${
              currentTab === 'schema'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Database className="w-4 h-4 text-amber-400" />
            PostgreSQL DDL & Architecture
          </button>

          <button
            onClick={() => onTabChange('events')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all text-xs font-semibold ${
              currentTab === 'events'
                ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <GitBranch className="w-4 h-4 text-rose-400" />
            Event Hooks & Queue Stubs
          </button>
        </nav>
      </div>
    </header>
  );
};
