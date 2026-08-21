import React from 'react';
import {
  Search,
  Filter,
  FileText,
  Gavel,
  Shield,
  ShieldAlert,
  RotateCcw,
  PlusCircle,
  Hash,
  Users,
  Lock,
  ArrowRight,
  Sparkles,
  BookOpen
} from 'lucide-react';

interface JudicialEmptyStateProps {
  searchQuery: string;
  normalizedQuery: string;
  selectedDocType: string;
  selectedStatus: string;
  selectedSealed: string;
  onClearFilters: () => void;
  onSelectSuggestedQuery: (query: string) => void;
  onOpenCreateCase?: () => void;
  isAuditor?: boolean;
}

export const JudicialEmptyState: React.FC<JudicialEmptyStateProps> = ({
  searchQuery,
  normalizedQuery,
  selectedDocType,
  selectedStatus,
  selectedSealed,
  onClearFilters,
  onSelectSuggestedQuery,
  onOpenCreateCase,
  isAuditor
}) => {
  const hasActiveFilters = Boolean(
    searchQuery ||
    selectedDocType !== 'all' ||
    selectedStatus !== 'all' ||
    selectedSealed !== 'all'
  );

  const suggestedSearches = [
    { label: 'FHC/ABJ/CR/2024/104', type: 'Criminal Docket' },
    { label: 'Hon. Justice Binta Nyako', type: 'Presiding Bench' },
    { label: 'Originating Summons', type: 'Doc Type' },
    { label: 'Central Bank of Nigeria', type: 'Litigant' },
    { label: 'Economic and Financial Crimes', type: 'Prosecution' }
  ];

  return (
    <div className="bg-slate-900/90 rounded-2xl border border-slate-800/90 p-6 sm:p-8 lg:p-10 shadow-2xl relative overflow-hidden">
      {/* Subtle Background Judicial Watermark / Pattern */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 max-w-4xl mx-auto space-y-8">
        {/* Top Section: Subtle Professional SVG Placeholder Artwork & Primary Notice */}
        <div className="text-center space-y-4">
          {/* Custom Subtle Institutional Judicial Vector Illustration */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 mx-auto relative flex items-center justify-center">
            <svg
              className="w-full h-full text-slate-700 drop-shadow-md"
              viewBox="0 0 120 120"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer Geometric Verification Ring */}
              <circle
                cx="60"
                cy="60"
                r="54"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeDasharray="4 3"
                className="text-slate-700 opacity-60"
              />
              <circle
                cx="60"
                cy="60"
                r="46"
                stroke="currentColor"
                strokeWidth="1"
                className="text-slate-800 opacity-80"
              />

              {/* Judicial Pediment / Courthouse Archetype Header */}
              <path
                d="M60 22L36 34V37H84V34L60 22Z"
                fill="currentColor"
                className="text-slate-800"
                stroke="#f59e0b"
                strokeWidth="1.2"
                strokeOpacity="0.8"
              />
              {/* Architrave Bar */}
              <rect
                x="34"
                y="37"
                width="52"
                height="3"
                rx="0.5"
                fill="#f59e0b"
                fillOpacity="0.6"
              />

              {/* Classic Judicial Pillars */}
              <rect x="38" y="42" width="4" height="26" rx="1" fill="currentColor" className="text-slate-700" />
              <rect x="49" y="42" width="4" height="26" rx="1" fill="currentColor" className="text-slate-700" />
              <rect x="67" y="42" width="4" height="26" rx="1" fill="currentColor" className="text-slate-700" />
              <rect x="78" y="42" width="4" height="26" rx="1" fill="currentColor" className="text-slate-700" />

              {/* Plinth Base */}
              <rect x="32" y="70" width="56" height="4" rx="1" fill="currentColor" className="text-slate-700" stroke="#f59e0b" strokeWidth="0.75" strokeOpacity="0.5" />

              {/* Center Scale Balance Emblem */}
              <path
                d="M60 44V64M52 49H68M52 49L47 58H57L52 49ZM68 49L63 58H73L68 49Z"
                stroke="#f59e0b"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Foreground Magnifying Lens with Search Projection */}
              <g className="filter drop-shadow">
                <circle
                  cx="76"
                  cy="76"
                  r="18"
                  fill="currentColor"
                  className="text-slate-900"
                  stroke="#38bdf8"
                  strokeWidth="2"
                />
                <circle
                  cx="76"
                  cy="76"
                  r="13"
                  stroke="#38bdf8"
                  strokeWidth="1"
                  strokeDasharray="2 2"
                  strokeOpacity="0.6"
                />
                {/* Search Lens Crosshair */}
                <path
                  d="M71 76H81M76 71V81"
                  stroke="#38bdf8"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeOpacity="0.8"
                />
                {/* Magnifier Handle */}
                <path
                  d="M89 89L101 101"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <path
                  d="M89 89L101 101"
                  stroke="#0284c7"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </g>

              {/* Subtle Sparkle Particles */}
              <circle cx="28" cy="48" r="1.5" fill="#f59e0b" fillOpacity="0.6" />
              <circle cx="92" cy="38" r="1.5" fill="#38bdf8" fillOpacity="0.6" />
            </svg>

            {/* Glowing Accent Indicator */}
            <div className="absolute -bottom-1 -right-1 bg-amber-500/20 p-1.5 rounded-full border border-amber-500/40 text-amber-400">
              <Search className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base sm:text-lg font-bold text-slate-100 font-judicial-display tracking-wide">
              No Matching Judicial Records Found
            </h3>
            <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
              {searchQuery ? (
                <>
                  The master docket registry found no active or archived cases matching{' '}
                  <span className="font-mono-code text-amber-400 font-semibold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/30">
                    &ldquo;{searchQuery}&rdquo;
                  </span>
                  .
                </>
              ) : (
                'No judicial cases match the current filter criteria applied to the registry.'
              )}
            </p>
          </div>

          {/* Active Filter Criteria Diagnostics */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="text-[11px] text-slate-500 uppercase tracking-wider font-mono-code font-semibold">
                Active Filter Parameters:
              </span>
              {searchQuery && (
                <span className="bg-slate-800 text-slate-200 text-[11px] font-mono-code px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1.5">
                  <Search className="w-3 h-3 text-amber-400" />
                  Query: {searchQuery}
                </span>
              )}
              {selectedDocType !== 'all' && (
                <span className="bg-slate-800 text-slate-200 text-[11px] font-mono-code px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3 h-3 text-sky-400" />
                  Type: {selectedDocType.replace('_', ' ')}
                </span>
              )}
              {selectedStatus !== 'all' && (
                <span className="bg-slate-800 text-slate-200 text-[11px] font-mono-code px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1.5">
                  <Gavel className="w-3 h-3 text-amber-400" />
                  Status: {selectedStatus.replace('_', ' ')}
                </span>
              )}
              {selectedSealed !== 'all' && (
                <span className="bg-slate-800 text-slate-200 text-[11px] font-mono-code px-2.5 py-1 rounded-md border border-slate-700 flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-rose-400" />
                  Sealing: {selectedSealed === 'sealed' ? 'In-Camera Only' : 'Public Dockets'}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Middle Section: Structured Institutional Search Guidance Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* Guidance Card 1: Canonical Docket Number Format */}
          <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4 space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Hash className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono-code">
              1. Docket Suit Format
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Input canonical Nigerian Federal High Court suit numbers (e.g. <code className="text-amber-300 font-mono-code">FHC/ABJ/CR/2024/104</code>) or tokenized alphanumeric numbers.
            </p>
          </div>

          {/* Guidance Card 2: Bench & Litigant Indexing */}
          <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4 space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20">
              <Users className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono-code">
              2. Litigants & Bench
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Queries search across presiding Judges (e.g. <em>Hon. Justice Binta Nyako</em>) and institutional parties (e.g. <em>FRN, CBN, EFCC</em>).
            </p>
          </div>

          {/* Guidance Card 3: RBAC & In-Camera Sealing */}
          <div className="bg-slate-950/70 rounded-xl border border-slate-800 p-4 space-y-2.5 hover:border-slate-700 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
              <Lock className="w-4 h-4" />
            </div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono-code">
              3. In-Camera Sealing
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sealed proceedings require clearance. Presiding Judges and Chief Registrars have clearance to inspect sealed matters.
            </p>
          </div>
        </div>

        {/* Bottom Section: Quick-Click Suggestions & Primary Actions */}
        <div className="space-y-4 pt-2 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Suggested Quick Queries:
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {suggestedSearches.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onSelectSuggestedQuery(item.label)}
                  className="px-2.5 py-1 rounded-md bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-amber-300 font-mono-code text-[11px] transition-all cursor-pointer flex items-center gap-1 group"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity text-amber-400" />
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onClearFilters}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700 flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Reset All Search Filters
            </button>

            {onOpenCreateCase && !isAuditor && (
              <button
                onClick={onOpenCreateCase}
                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                File / Register New Docket
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
