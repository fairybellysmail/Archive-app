import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Case, DocumentType, CaseStatus, User, BatchCaseStatusResult } from '../types/judicial.js';
import { api } from '../services/api.js';
import { JudicialEmptyState } from './JudicialEmptyState.js';
import {
  Search,
  Filter,
  PlusCircle,
  Lock,
  FileText,
  Gavel,
  Calendar,
  Layers,
  LayoutGrid,
  List,
  ChevronRight,
  ShieldAlert,
  ArrowUpDown,
  BookOpen,
  Scale,
  X,
  Loader2,
  UserCheck,
  CheckSquare,
  Square,
  MinusSquare,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  RefreshCw
} from 'lucide-react';

interface CaseRegistryViewProps {
  cases: Case[];
  loading: boolean;
  currentUser: User | null;
  onSelectCase: (caseId: string) => void;
  onOpenCreateCase: () => void;
  onRefresh: () => void;
}

export const CaseRegistryView: React.FC<CaseRegistryViewProps> = ({
  cases: initialCases,
  loading: initialLoading,
  currentUser,
  onSelectCase,
  onOpenCreateCase,
  onRefresh
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [serverCases, setServerCases] = useState<Case[]>(initialCases);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSealed, setSelectedSealed] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'suit'>('date_desc');

  // Bulk Selection State
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());
  const [batchTargetStatus, setBatchTargetStatus] = useState<CaseStatus>('published');
  const [batchTransitionNotes, setBatchTransitionNotes] = useState('');
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchCaseStatusResult | null>(null);
  const [isResultModalOpen, setIsResultModalOpen] = useState(false);

  // Track request sequence to prevent race conditions
  const searchRequestIdRef = useRef(0);
  const selectAllCheckboxRef = useRef<HTMLInputElement>(null);

  // Synchronize when initialCases prop changes (e.g. initial load or officer switch)
  useEffect(() => {
    if (!debouncedSearch && selectedDocType === 'all' && selectedStatus === 'all' && selectedSealed === 'all') {
      setServerCases(initialCases);
    }
  }, [initialCases, debouncedSearch, selectedDocType, selectedStatus, selectedSealed]);

  // Debounce the search input by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Execute server-side search whenever debouncedSearch, filters, or currentUser changes
  useEffect(() => {
    let isCancelled = false;
    const currentReqId = ++searchRequestIdRef.current;

    const performServerSearch = async () => {
      setIsSearching(true);
      try {
        const response = await api.getCases({
          search: debouncedSearch || undefined,
          documentType: selectedDocType !== 'all' ? selectedDocType : undefined,
          status: selectedStatus !== 'all' ? selectedStatus : undefined,
          isSealed: selectedSealed !== 'all' ? selectedSealed : undefined
        });

        if (!isCancelled && currentReqId === searchRequestIdRef.current) {
          setServerCases(response.cases || []);
        }
      } catch (err) {
        console.error('Server search failed:', err);
      } finally {
        if (!isCancelled && currentReqId === searchRequestIdRef.current) {
          setIsSearching(false);
        }
      }
    };

    performServerSearch();

    return () => {
      isCancelled = true;
    };
  }, [debouncedSearch, selectedDocType, selectedStatus, selectedSealed, currentUser]);

  // Sort the server-returned cases
  const displayedCases = useMemo(() => {
    return [...serverCases].sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      }
      if (sortBy === 'suit') {
        return a.suit_number.localeCompare(b.suit_number);
      }
      return 0;
    });
  }, [serverCases, sortBy]);

  // Selection Metrics
  const displayedIds = useMemo(() => displayedCases.map(c => c.id), [displayedCases]);
  const selectedCount = selectedCaseIds.size;
  const isAllDisplayedSelected = displayedCases.length > 0 && displayedCases.every(c => selectedCaseIds.has(c.id));
  const isPartiallySelected = selectedCount > 0 && !isAllDisplayedSelected;

  useEffect(() => {
    if (selectAllCheckboxRef.current) {
      selectAllCheckboxRef.current.indeterminate = isPartiallySelected;
    }
  }, [isPartiallySelected]);

  // Toggle single case selection
  const handleToggleSelect = (caseId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setSelectedCaseIds(prev => {
      const next = new Set(prev);
      if (next.has(caseId)) {
        next.delete(caseId);
      } else {
        next.add(caseId);
      }
      return next;
    });
  };

  // Toggle select all visible
  const handleToggleSelectAll = () => {
    if (isAllDisplayedSelected) {
      // Clear visible from selection
      setSelectedCaseIds(prev => {
        const next = new Set(prev);
        displayedIds.forEach(id => next.delete(id));
        return next;
      });
    } else {
      // Add all visible to selection
      setSelectedCaseIds(prev => {
        const next = new Set(prev);
        displayedIds.forEach(id => next.add(id));
        return next;
      });
    }
  };

  const handleClearSelection = () => {
    setSelectedCaseIds(new Set());
  };

  // Analyze selected items
  const selectedItemsData = useMemo(() => {
    const list = displayedCases.filter(c => selectedCaseIds.has(c.id));
    const statusCounts: Record<string, number> = {};
    list.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });
    return { list, statusCounts };
  }, [displayedCases, selectedCaseIds]);

  // Execute Batch Transition
  const handleExecuteBatch = async () => {
    if (selectedCaseIds.size === 0) return;
    setIsBatchProcessing(true);

    try {
      const caseIdsArray: string[] = Array.from(selectedCaseIds);
      const res = await api.batchTransitionCaseStatuses(
        caseIdsArray,
        batchTargetStatus,
        batchTransitionNotes.trim() || undefined
      );

      setBatchResult(res);
      setIsResultModalOpen(true);

      // Deselect successfully transitioned cases, keep failed for review
      const successfulIds = new Set(res.results.filter(r => r.success).map(r => r.id));
      setSelectedCaseIds(prev => {
        const remaining = new Set<string>();
        prev.forEach(id => {
          if (!successfulIds.has(id)) {
            remaining.add(id);
          }
        });
        return remaining;
      });

      // Reload registry and statistics
      onRefresh();
    } catch (err: any) {
      console.error('Batch transition failed:', err);
      alert(`Batch transition error: ${err.message || 'Server-side validation failure.'}`);
    } finally {
      setIsBatchProcessing(false);
    }
  };

  const normalizedSearchPreview = searchInput.trim() ? searchInput.trim().toUpperCase().replace(/[^A-Z0-9]/g, '-') : '';

  const handleClearSearch = () => {
    setSearchInput('');
    setDebouncedSearch('');
  };

  const hasActiveFilters = Boolean(
    debouncedSearch ||
    selectedDocType !== 'all' ||
    selectedStatus !== 'all' ||
    selectedSealed !== 'all'
  );

  // Role permissions check
  const isAuditor = currentUser?.role === 'auditor';
  const isClerk = currentUser?.role === 'clerk';
  const isJudgeOrRegistrar = currentUser?.role === 'judge' || currentUser?.role === 'chief_registrar' || currentUser?.role === 'system_admin';

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/30">
              Master Registry Index
            </span>
            <span className="text-xs text-slate-500">• {displayedCases.length} Dockets Located</span>
            {isSearching && (
              <span className="inline-flex items-center gap-1 text-[11px] text-amber-400 font-mono-code bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30 animate-pulse">
                <Loader2 className="w-3 h-3 animate-spin" /> Server Querying...
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-judicial-display tracking-wide mt-1">
            Judicial Case Registry & Certified Dockets
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenCreateCase}
            className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-amber-500/10 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            Register New Case Docket
          </button>
        </div>
      </div>

      {/* Multidimensional Search & Filters Bar */}
      <div className="bg-slate-900/80 rounded-xl border border-slate-800/90 p-4 space-y-3.5 shadow-lg">
        {/* Server-Side Debounced Search Input */}
        <div className="relative">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
            ) : (
              <Search className="w-4 h-4 text-slate-400" />
            )}
          </div>

          <input
            type="text"
            placeholder="Search by Docket No. (e.g. FHC/ABJ/CR/2024/104), Title, or Presiding Officer / Judge..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-24 py-2.5 bg-slate-950 border border-slate-700/80 rounded-lg text-slate-100 placeholder:text-slate-500 text-xs sm:text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-mono-code transition-colors"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {searchInput && (
              <button
                onClick={handleClearSearch}
                className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                title="Clear search query"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {normalizedSearchPreview && (
              <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 border-l border-slate-800 pl-2">
                <span>Norm:</span>
                <span className="bg-slate-800 text-amber-300 px-2 py-0.5 rounded font-mono-code text-[10px] border border-slate-700">
                  {normalizedSearchPreview}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Scope Indicators Strip */}
        {debouncedSearch && (
          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 bg-slate-950/60 px-3 py-1.5 rounded-lg border border-slate-800/80">
            <span className="font-semibold text-amber-400 font-mono-code">Server Scope:</span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Docket / Suit #
            </span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Case Title
            </span>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
              Presiding Judge / Officer
            </span>
            <span className="text-slate-500 ml-auto font-mono-code">
              Matching: &quot;{debouncedSearch}&quot;
            </span>
          </div>
        )}

        {/* Filter Pills & View Selectors */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            {/* Document Type */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Type:</span>
              <select
                value={selectedDocType}
                onChange={e => setSelectedDocType(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Document Types</option>
                <option value="judgment">Judgments</option>
                <option value="ruling">Rulings</option>
                <option value="order">Court Orders</option>
                <option value="case_file">Case Files</option>
              </select>
            </div>

            {/* Lifecycle Status */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Status:</span>
              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Statuses</option>
                <option value="draft">Draft</option>
                <option value="pending_review">Pending Review</option>
                <option value="published">Published</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            {/* Sealed Classification */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-slate-400 font-medium">Seal:</span>
              <select
                value={selectedSealed}
                onChange={e => setSelectedSealed(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              >
                <option value="all">All Classifications</option>
                <option value="sealed">Sealed Dockets Only</option>
                <option value="unsealed">Unsealed Public Only</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button
                onClick={() => {
                  handleClearSearch();
                  setSelectedDocType('all');
                  setSelectedStatus('all');
                  setSelectedSealed('all');
                }}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline underline-offset-2 ml-1 cursor-pointer"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* View Mode Toggle & Sort */}
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-700 rounded-md px-2.5 py-1 text-slate-300 text-xs focus:outline-none"
            >
              <option value="date_desc">Newest Intake First</option>
              <option value="date_asc">Oldest Intake First</option>
              <option value="suit">Suit Number (A-Z)</option>
            </select>

            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded cursor-pointer ${viewMode === 'table' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
                title="Table View"
              >
                <List className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded cursor-pointer ${viewMode === 'cards' ? 'bg-slate-800 text-amber-300' : 'text-slate-400 hover:text-slate-200'}`}
                title="Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Case List Display */}
      {initialLoading && displayedCases.length === 0 ? (
        <div className="p-12 text-center text-slate-400 animate-pulse space-y-3">
          <Scale className="w-8 h-8 mx-auto text-amber-400/50" />
          <p className="text-sm font-medium">Querying Master Judicial Registry & Verifying Permissions...</p>
        </div>
      ) : displayedCases.length === 0 ? (
        <JudicialEmptyState
          searchQuery={debouncedSearch}
          normalizedQuery={normalizedSearchPreview}
          selectedDocType={selectedDocType}
          selectedStatus={selectedStatus}
          selectedSealed={selectedSealed}
          onClearFilters={() => {
            handleClearSearch();
            setSelectedDocType('all');
            setSelectedStatus('all');
            setSelectedSealed('all');
          }}
          onSelectSuggestedQuery={(query) => {
            setSearchInput(query);
            setSelectedDocType('all');
            setSelectedStatus('all');
            setSelectedSealed('all');
          }}
          onOpenCreateCase={onOpenCreateCase}
          isAuditor={isAuditor}
        />
      ) : viewMode === 'table' ? (
        /* High-Density Judicial Table View with Bulk Selection Column */
        <div className="bg-slate-900/80 rounded-xl border border-slate-800/90 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 text-[11px] font-semibold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  {/* Bulk Checkbox Column Header */}
                  <th className="py-3 px-3.5 w-10 text-center">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        ref={selectAllCheckboxRef}
                        checked={isAllDisplayedSelected}
                        onChange={handleToggleSelectAll}
                        className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer accent-amber-500"
                        title={isAllDisplayedSelected ? 'Deselect all visible cases' : 'Select all visible cases'}
                      />
                    </div>
                  </th>
                  <th className="py-3 px-4">Suit / Docket No.</th>
                  <th className="py-3 px-4">Case Title & Subject</th>
                  <th className="py-3 px-4">Presiding / Officer</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Delivered</th>
                  <th className="py-3 px-4 text-center">Files & Sessions</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {displayedCases.map(c => {
                  const isSealed = c.is_sealed;
                  const isSelected = selectedCaseIds.has(c.id);
                  const presidingJudge = c.presiding_officers && c.presiding_officers.length > 0
                    ? c.presiding_officers[0]
                    : null;
                  const registeringOfficer = c.created_by_user?.name;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => onSelectCase(c.id)}
                      className={`hover:bg-slate-800/50 transition-colors cursor-pointer group ${
                        isSelected ? 'bg-amber-500/5' : ''
                      }`}
                    >
                      {/* Bulk Selection Checkbox */}
                      <td
                        className="py-3.5 px-3.5 text-center"
                        onClick={e => handleToggleSelect(c.id, e)}
                      >
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}} // Handled by container onClick with stopPropagation
                            className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer accent-amber-500"
                          />
                        </div>
                      </td>

                      {/* Suit Number */}
                      <td className="py-3.5 px-4 font-mono-code whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`font-semibold ${isSelected ? 'text-amber-400' : 'text-amber-300'} group-hover:text-amber-200`}>
                            {c.suit_number}
                          </span>
                          {isSealed && (
                            <span className="p-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30" title="Sealed Docket">
                              <Lock className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 block font-mono-code">
                          {c.normalized_suit_number}
                        </span>
                      </td>

                      {/* Case Title */}
                      <td className="py-3.5 px-4 max-w-sm">
                        <span className="font-medium text-slate-200 line-clamp-1 block group-hover:text-white">
                          {c.case_title}
                        </span>
                        <span className="text-[11px] text-slate-400 line-clamp-1 block">
                          {c.subject_matter}
                        </span>
                      </td>

                      {/* Presiding Officer / Judge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {presidingJudge ? (
                          <div className="flex items-center gap-1.5">
                            <Gavel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span className="text-slate-200 text-xs font-medium">
                              {presidingJudge}
                            </span>
                          </div>
                        ) : registeringOfficer ? (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span className="text-slate-300 text-xs">
                              {registeringOfficer}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs">—</span>
                        )}
                      </td>

                      {/* Doc Type */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                          {c.document_type}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                            c.status === 'published'
                              ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                              : c.status === 'pending_review'
                              ? 'bg-amber-500/10 text-amber-300 border border-amber-500/30'
                              : c.status === 'archived'
                              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {c.status.replace('_', ' ')}
                        </span>
                      </td>

                      {/* Date Delivered */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 font-mono-code text-[11px]">
                        {c.date_delivered || '—'}
                      </td>

                      {/* File Counts */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="text-[11px] text-slate-400 font-mono-code bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          {c.documents_count || 0} Docs • {c.proceedings_count || 0} Sessions
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button className="text-slate-400 group-hover:text-amber-300 transition-colors p-1">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Card View with Bulk Selection Capability */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedCases.map(c => {
            const isSealed = c.is_sealed;
            const isSelected = selectedCaseIds.has(c.id);
            const presidingJudge = c.presiding_officers && c.presiding_officers.length > 0
              ? c.presiding_officers[0]
              : null;
            const registeringOfficer = c.created_by_user?.name;

            return (
              <div
                key={c.id}
                onClick={() => onSelectCase(c.id)}
                className={`p-5 bg-slate-900/80 rounded-xl border transition-all cursor-pointer space-y-3 shadow-lg group flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-amber-500 bg-slate-900/95 ring-1 ring-amber-500/30'
                    : 'border-slate-800/90 hover:border-amber-500/50 hover:bg-slate-850'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        onClick={e => handleToggleSelect(c.id, e)}
                        className="p-1 -m-1 rounded hover:bg-slate-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-4 h-4 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900 cursor-pointer accent-amber-500"
                        />
                      </div>
                      <span className="font-mono-code text-xs font-semibold text-amber-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        {c.suit_number}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSealed && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono-code font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <Lock className="w-3 h-3" /> SEALED
                        </span>
                      )}
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
                  </div>

                  <h3 className="text-sm font-semibold text-slate-100 line-clamp-2 group-hover:text-amber-200 transition-colors">
                    {c.case_title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-2">
                    {c.subject_matter}
                  </p>

                  {/* Presiding Judge / Officer Info */}
                  <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-300">
                    <Gavel className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="truncate">
                      {presidingJudge || registeringOfficer || 'Unassigned Bench'}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span className="text-[11px] font-mono-code">
                    {c.documents_count || 0} Docs • {c.proceedings_count || 0} Sessions
                  </span>
                  <span className="text-amber-400 text-xs font-semibold flex items-center gap-0.5 group-hover:translate-x-1 transition-transform">
                    Dossier <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Bulk Action Toolbar */}
      {selectedCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-4xl animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div className="bg-slate-900/95 backdrop-blur-xl border border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-slate-950/90 text-slate-100 space-y-3.5">
            {/* Top row: Metrics, Summary, and Dismiss */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/30">
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold font-mono-code">
                    {selectedCount} {selectedCount === 1 ? 'Docket' : 'Dockets'} Selected
                  </span>
                </div>

                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
                  <span>Breakdown:</span>
                  {Object.entries(selectedItemsData.statusCounts).map(([st, cnt]) => (
                    <span key={st} className="bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono-code text-slate-300 border border-slate-700">
                      {cnt} {st.replace('_', ' ')}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleSelectAll}
                  className="text-xs text-slate-400 hover:text-slate-200 px-2 py-1 rounded hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isAllDisplayedSelected ? 'Deselect All' : `Select All (${displayedCases.length})`}
                </button>
                <button
                  onClick={handleClearSelection}
                  className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Dismiss Selection Toolbar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Batch Status Transition Controls */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Gavel className="w-3.5 h-3.5 text-amber-400" /> Target Status:
                </span>

                <select
                  value={batchTargetStatus}
                  onChange={e => setBatchTargetStatus(e.target.value as CaseStatus)}
                  disabled={isBatchProcessing || isAuditor}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="pending_review">Pending Review (Intake &rarr; Review)</option>
                  <option value="published">Published (Review &rarr; Archive / Bench Ready)</option>
                  <option value="draft">Draft (Return for Correction)</option>
                  <option value="archived">Archived (Final Judicial Sealing)</option>
                </select>

                <input
                  type="text"
                  placeholder="Optional Transition Order / Bench Note..."
                  value={batchTransitionNotes}
                  onChange={e => setBatchTransitionNotes(e.target.value)}
                  disabled={isBatchProcessing || isAuditor}
                  className="bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500 w-full sm:w-64 font-mono-code"
                />
              </div>

              <div className="flex items-center gap-2 justify-end">
                {isAuditor ? (
                  <span className="text-[11px] text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/30 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5" /> Auditor Role: Read-Only
                  </span>
                ) : (
                  <button
                    onClick={handleExecuteBatch}
                    disabled={isBatchProcessing}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isBatchProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Validating & Updating Server...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5" />
                        Execute Batch Transition ({selectedCount})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* State Machine Guard Info Notice */}
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Server enforces strict RBAC & sequential progression (e.g. <code>draft</code> &rarr; <code>pending_review</code> &rarr; <code>published</code>). Invalid transitions will be safely validated and reported individually.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Batch Result Report Modal */}
      {isResultModalOpen && batchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden my-8 animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-lg ${
                  batchResult.failed === 0
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}>
                  <Gavel className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100 font-judicial-display">
                    Judicial Batch Transition Execution Report
                  </h3>
                  <p className="text-xs text-slate-400">
                    Target State: <span className="font-mono-code uppercase font-semibold text-amber-300">{batchResult.targetStatus.replace('_', ' ')}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsResultModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Metrics Summary Strip */}
            <div className="grid grid-cols-3 divide-x divide-slate-800 border-b border-slate-800 bg-slate-950/40 text-center py-3 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-mono-code">Total Processed</span>
                <span className="text-base font-bold text-slate-100 font-mono-code">{batchResult.total}</span>
              </div>
              <div>
                <span className="text-emerald-400 block text-[10px] uppercase font-mono-code">Succeeded</span>
                <span className="text-base font-bold text-emerald-400 font-mono-code">{batchResult.succeeded}</span>
              </div>
              <div>
                <span className="text-rose-400 block text-[10px] uppercase font-mono-code">Failed / Blocked</span>
                <span className="text-base font-bold text-rose-400 font-mono-code">{batchResult.failed}</span>
              </div>
            </div>

            {/* Individual Item Results List */}
            <div className="p-5 max-h-80 overflow-y-auto space-y-2.5 divide-y divide-slate-800/40">
              {batchResult.results.map((resItem, idx) => (
                <div key={resItem.id || idx} className="pt-2.5 first:pt-0 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {resItem.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span className="font-mono-code font-semibold text-slate-200">
                        {resItem.suit_number || resItem.id}
                      </span>
                      {resItem.case_title && (
                        <span className="text-slate-400 line-clamp-1 max-w-xs text-[11px]">
                          ({resItem.case_title})
                        </span>
                      )}
                    </div>

                    {resItem.success ? (
                      <p className="text-[11px] text-emerald-300/90 font-mono-code pl-6">
                        Transitioned: <code>{resItem.previousStatus}</code> &rarr; <code>{resItem.newStatus}</code> • Cryptographic audit block appended
                      </p>
                    ) : (
                      <p className="text-[11px] text-rose-300/90 font-mono-code pl-6 bg-rose-500/5 p-1 rounded border border-rose-500/20">
                        {resItem.message || resItem.error || 'Server validation rejected transition.'}
                      </p>
                    )}
                  </div>

                  <span className={`text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded shrink-0 ${
                    resItem.success
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'
                  }`}>
                    {resItem.success ? 'APPLIED' : 'BLOCKED'}
                  </span>
                </div>
              ))}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-mono-code">
                Audit Trail Recorded • Certified Registry
              </span>
              <button
                onClick={() => setIsResultModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Close & Return to Registry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

