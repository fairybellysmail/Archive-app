import React, { useState, useEffect } from 'react';
import { AuditLog, AuditVerificationResult, User } from '../types/judicial.js';
import { api } from '../services/api.js';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  AlertTriangle,
  Play,
  RotateCcw,
  CheckCircle2,
  Lock,
  FileCode,
  Hash,
  Activity,
  Layers,
  Clock,
  UserCheck
} from 'lucide-react';

interface AuditLedgerViewProps {
  currentUser: User | null;
  onRefreshStats: () => void;
}

export const AuditLedgerView: React.FC<AuditLedgerViewProps> = ({
  currentUser,
  onRefreshStats
}) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState<AuditVerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedTarget, setSelectedTarget] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Tamper lab state
  const [tamperStatus, setTamperStatus] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const data = await api.getAuditLogs({
        action: selectedAction !== 'all' ? selectedAction : undefined,
        targetType: selectedTarget !== 'all' ? selectedTarget : undefined
      });
      setLogs(data.logs);
    } catch (err: any) {
      console.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const { result } = await api.verifyAuditChain();
      setVerification(result);
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateTamper = async () => {
    try {
      const res = await api.tamperTest('simulate', Math.floor(logs.length / 2), 'action', 'MALICIOUS_TAMPERED_ACTION');
      setTamperStatus(`Block #${res.simulation.tamperedBlockIndex + 1} action field altered in-memory to simulate database corruption.`);
      await fetchAuditLogs();
      await handleVerifyChain();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Tamper simulation failed.');
    }
  };

  const handleRestoreChain = async () => {
    try {
      await api.tamperTest('restore');
      setTamperStatus(null);
      await fetchAuditLogs();
      await handleVerifyChain();
      onRefreshStats();
    } catch (err: any) {
      alert(err.message || 'Restore failed.');
    }
  };

  useEffect(() => {
    fetchAuditLogs();
    handleVerifyChain();
  }, [selectedAction, selectedTarget]);

  const filteredLogs = logs.filter(l => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.current_hash.toLowerCase().includes(q) ||
      (l.user?.name && l.user.name.toLowerCase().includes(q)) ||
      l.target_type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono-code font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
              Cryptographic Chained Ledger
            </span>
            <span className="text-xs text-slate-500">• SHA-256 Chained Blocks</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 font-judicial-display tracking-wide mt-1">
            Immutable Audit Trail & Forensics Laboratory
          </h1>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleVerifyChain}
            disabled={isVerifying}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            {isVerifying ? 'Running Cryptographic Verification...' : 'Run Deep Chain Verification'}
          </button>
        </div>
      </div>

      {/* Verification Status Banner / Certificate */}
      {verification && (
        <div
          className={`p-5 rounded-2xl border transition-all ${
            verification.is_valid
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/60 text-rose-200 shadow-2xl animate-pulse'
          }`}
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div
                className={`p-3 rounded-xl border shrink-0 ${
                  verification.is_valid
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}
              >
                {verification.is_valid ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold font-judicial-display">
                    {verification.is_valid
                      ? 'OFFICIAL CERTIFICATE OF CRYPTOGRAPHIC CHAIN INTEGRITY'
                      : 'CRITICAL ALERT: CRYPTOGRAPHIC AUDIT CHAIN COMPROMISED'}
                  </h3>
                  <span className="text-[10px] font-mono-code px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    {verification.total_blocks} Blocks Verified in {verification.verification_time_ms}ms
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-judicial-serif">
                  {verification.is_valid
                    ? 'Every historical mutation hash matches its calculated canonical SHA-256 digest from genesis to current block head. Zero data alteration or record injection detected.'
                    : verification.failure_reason}
                </p>
              </div>
            </div>

            {/* Quick Hashes */}
            <div className="text-right text-[11px] font-mono-code space-y-1 bg-slate-950/80 p-3 rounded-xl border border-slate-800 shrink-0">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Genesis Hash:</span>
                <span className="text-slate-300 truncate max-w-[140px]">{verification.genesis_hash?.substring(0, 16)}...</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-amber-400">Head Hash:</span>
                <span className="text-amber-300 truncate max-w-[140px]">{verification.head_hash?.substring(0, 16)}...</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tamper Simulation Laboratory Box */}
      <div className="p-5 bg-slate-900/80 rounded-xl border border-slate-800/90 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs sm:text-sm font-semibold text-slate-100 font-judicial-display">
              Tamper-Evidence Laboratory & Fault Injection
            </h3>
          </div>
          <span className="text-[11px] text-slate-400">
            Simulate historical mutation alteration to test mathematical immutability.
          </span>
        </div>

        <p className="text-xs text-slate-400">
          The cryptographic audit service enforces canonical string formatting: <code className="text-slate-300 font-mono-code text-[11px] bg-slate-950 px-1.5 py-0.5 rounded">SHA256(id | user_id | action | target_id | created_at | previous_hash)</code>.
          Tampering with any historical block breaks all subsequent link hashes.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={handleSimulateTamper}
            className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Simulate Tamper on Historical Block
          </button>
          <button
            onClick={handleRestoreChain}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Restore Original Pristine Ledger
          </button>
          {tamperStatus && (
            <span className="text-xs text-rose-300 font-mono-code">{tamperStatus}</span>
          )}
        </div>
      </div>

      {/* Filter Controls */}
      <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, actor officer, hash snippet, or target type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder:text-slate-500 font-mono-code focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedAction}
            onChange={e => setSelectedAction(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none"
          >
            <option value="all">All Audit Actions</option>
            <option value="CASE_CREATED">Case Created</option>
            <option value="CASE_STATUS_TRANSITION">Status Transition</option>
            <option value="CASE_SEALED">Case Sealed</option>
            <option value="DOCUMENT_UPLOADED">Document Uploaded</option>
            <option value="DOCUMENT_DOWNLOADED">Document Downloaded</option>
            <option value="PROCEEDING_RECORDED">Proceeding Recorded</option>
            <option value="AUDIT_CHAIN_VERIFIED">Chain Verified</option>
          </select>

          <button
            onClick={fetchAuditLogs}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition-colors"
            title="Refresh Audit Logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Visual Chained Block Explorer */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
            <p className="text-xs">Traversing Cryptographic Audit Chain...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 bg-slate-900/40 rounded-xl border border-slate-800 text-center text-xs text-slate-500">
            No audit log entries matching filters.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log, index) => {
              const blockNumber = logs.length - index;
              return (
                <div
                  key={log.id}
                  className="p-5 bg-slate-900/90 rounded-xl border border-slate-800/90 shadow-md space-y-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="text-xs font-mono-code font-bold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                        BLOCK #{blockNumber}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {log.action}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded uppercase font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        Target: {log.target_type}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 font-mono-code flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{new Date(log.created_at).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Officer & Network Attributes */}
                  <div className="text-xs text-slate-300 flex flex-wrap items-center gap-4 pt-1">
                    <span>
                      Officer: <strong className="text-slate-100">{log.user?.name || log.user_id || 'System Genesis'}</strong> ({log.user?.role || 'Daemon'})
                    </span>
                    <span>•</span>
                    <span className="font-mono-code text-slate-400">IP: {log.ip_address}</span>
                  </div>

                  {/* Cryptographic Linkage Box */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800/90 space-y-1.5 font-mono-code text-[11px]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-400">
                      <span className="text-slate-500">PREVIOUS BLOCK LINK (previous_hash):</span>
                      <span className="text-slate-300 break-all">{log.previous_hash || '0000000000000000000000000000000000000000000000000000000000000000 (GENESIS)'}</span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-amber-300 border-t border-slate-900 pt-1">
                      <span className="text-amber-500/80 font-bold">CURRENT HASH DIGEST (current_hash):</span>
                      <span className="text-amber-300 font-bold break-all">{log.current_hash}</span>
                    </div>
                  </div>

                  {/* Metadata JSON payload */}
                  {log.metadata && (
                    <div className="p-2.5 bg-slate-950/60 rounded border border-slate-900 text-[11px] font-mono-code text-slate-400 overflow-x-auto">
                      <span className="text-slate-600 block text-[10px] uppercase font-semibold">Canonical Payload Metadata:</span>
                      <pre className="text-slate-300">{JSON.stringify(log.metadata, null, 2)}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
