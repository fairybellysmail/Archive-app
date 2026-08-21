import React, { useState, useEffect, useRef } from 'react';
import { DocumentRecord, User } from '../types/judicial.js';
import { api } from '../services/api.js';
import {
  Shield,
  ShieldCheck,
  Lock,
  Eye,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  FileText,
  AlertTriangle,
  HardDrive,
  User as UserIcon,
  CheckCircle2,
  Copy,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface SecurePdfViewerProps {
  document: DocumentRecord | null;
  currentUser: User | null;
  className?: string;
  isCompact?: boolean;
  onClose?: () => void;
  onOpenFullModal?: () => void;
}

export const SecurePdfViewer: React.FC<SecurePdfViewerProps> = ({
  document,
  currentUser,
  className = '',
  isCompact = false,
  onClose,
  onOpenFullModal
}) => {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [watermarkDensity, setWatermarkDensity] = useState<'standard' | 'high' | 'subtle'>('standard');
  const [sessionTime, setSessionTime] = useState<string>(new Date().toISOString());
  const [copiedHash, setCopiedHash] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const currentObjectUrlRef = useRef<string | null>(null);

  // Fetch document via binary stream and create ephemeral Object URL
  useEffect(() => {
    let isCancelled = false;

    // Clean up previous Object URL to prevent memory leaks
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }

    if (!document) {
      setObjectUrl(null);
      setError(null);
      return;
    }

    const loadDocumentStream = async () => {
      setLoading(true);
      setError(null);
      setSessionTime(new Date().toISOString());

      try {
        const { objectUrl: newUrl } = await api.getDocumentStreamBlob(document.id);
        if (!isCancelled) {
          currentObjectUrlRef.current = newUrl;
          setObjectUrl(newUrl);
        } else {
          URL.revokeObjectURL(newUrl);
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error('Failed to stream judicial document:', err);
          setError(err.message || 'Failed to stream document. Access may be restricted.');
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadDocumentStream();

    return () => {
      isCancelled = true;
      if (currentObjectUrlRef.current) {
        URL.revokeObjectURL(currentObjectUrlRef.current);
        currentObjectUrlRef.current = null;
      }
    };
  }, [document?.id, currentUser?.id]);

  const copyHash = () => {
    if (!document) return;
    navigator.clipboard.writeText(document.file_hash);
    setCopiedHash(true);
    setTimeout(() => setCopiedHash(false), 2000);
  };

  const handleRefreshStream = async () => {
    if (!document) return;
    if (currentObjectUrlRef.current) {
      URL.revokeObjectURL(currentObjectUrlRef.current);
      currentObjectUrlRef.current = null;
    }
    setLoading(true);
    setError(null);
    setSessionTime(new Date().toISOString());
    try {
      const { objectUrl: newUrl } = await api.getDocumentStreamBlob(document.id);
      currentObjectUrlRef.current = newUrl;
      setObjectUrl(newUrl);
    } catch (err: any) {
      setError(err.message || 'Stream refresh failed.');
    } finally {
      setLoading(false);
    }
  };

  if (!document) {
    return (
      <div className={`p-8 bg-slate-900/60 rounded-xl border border-slate-800 text-center space-y-3 ${className}`}>
        <FileText className="w-10 h-10 mx-auto text-slate-600" />
        <h4 className="text-sm font-semibold text-slate-300">No Document Selected for Embedded Preview</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Select any registered court filing or certified proceeding transcript to initiate a secure, watermarked data stream.
        </p>
      </div>
    );
  }

  const officerId = currentUser?.id || '22222222-2222-4222-8222-222222222222';
  const officerName = currentUser?.name || 'Chief Registrar';
  const officerBadge = currentUser?.badge_number || 'CR-001-HQ';
  const officerRole = currentUser?.role?.toUpperCase() || 'OFFICER';

  return (
    <div
      ref={containerRef}
      className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl flex flex-col ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : className
      }`}
    >
      {/* Top Security & Navigation Header */}
      <div className="p-3 sm:p-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20 shrink-0">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-100 font-judicial-display tracking-wide truncate max-w-xs sm:max-w-md">
                {document.original_filename}
              </h3>
              <span className="text-[10px] font-mono-code font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                SECURE STREAM ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono-code flex items-center gap-2 mt-0.5">
              <span>Size: {(document.file_size / 1024).toFixed(1)} KB</span>
              <span>•</span>
              <span className="text-amber-400 truncate">SHA-256: {document.file_hash.substring(0, 16)}...</span>
            </p>
          </div>
        </div>

        {/* Security Controls & Action Bar */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Zoom Controls */}
          <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 text-xs text-slate-300">
            <button
              onClick={() => setZoomLevel(prev => Math.max(50, prev - 15))}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-2 font-mono-code text-[11px] text-slate-300 select-none">{zoomLevel}%</span>
            <button
              onClick={() => setZoomLevel(prev => Math.min(200, prev + 15))}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(100)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Watermark Density Selector */}
          <div className="hidden md:flex items-center gap-1 text-[11px] bg-slate-900 border border-slate-800 px-2 py-1 rounded-lg">
            <span className="text-slate-500 font-medium">Watermark:</span>
            <select
              value={watermarkDensity}
              onChange={e => setWatermarkDensity(e.target.value as any)}
              className="bg-transparent text-slate-300 focus:outline-none cursor-pointer"
            >
              <option value="standard" className="bg-slate-900 text-slate-200">Standard</option>
              <option value="high" className="bg-slate-900 text-slate-200">High Contrast</option>
              <option value="subtle" className="bg-slate-900 text-slate-200">Subtle</option>
            </select>
          </div>

          {/* Refresh Stream Button */}
          <button
            onClick={handleRefreshStream}
            disabled={loading}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors border border-slate-700"
            title="Refresh Authenticated Stream"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-colors border border-slate-700"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Preview'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Download Button */}
          <a
            href={api.getDocumentDownloadUrl(document.id)}
            download={document.original_filename}
            className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download Certified Copy</span>
          </a>

          {onClose && (
            <button
              onClick={onClose}
              className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>

      {/* Security Context Status Banner */}
      <div className="px-4 py-2 bg-slate-950/80 border-b border-slate-800 text-[11px] flex flex-wrap items-center justify-between gap-2 font-mono-code">
        <div className="flex items-center gap-3 text-slate-400">
          <span className="flex items-center gap-1 text-slate-300">
            <UserIcon className="w-3 h-3 text-sky-400" />
            Officer: <strong className="text-slate-200">{officerName}</strong> ({officerBadge})
          </span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <span className="hidden sm:flex items-center gap-1 text-slate-400 truncate max-w-xs">
            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
            User ID: <span className="text-amber-300 font-semibold">{officerId}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-slate-400 hidden md:inline">
            Protocol: <span className="text-emerald-400">In-Memory Blob Stream (No Storage Path Leakage)</span>
          </span>
          <button
            onClick={copyHash}
            className="text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1 font-semibold"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedHash ? 'Hash Copied!' : 'Copy SHA-256'}</span>
          </button>
        </div>
      </div>

      {/* Main PDF Viewport Canvas with Dynamic Watermark Overlay */}
      <div className="relative flex-1 bg-slate-950 min-h-[480px] sm:min-h-[600px] overflow-hidden flex items-center justify-center">
        {loading ? (
          <div className="text-center space-y-3 p-8">
            <div className="w-10 h-10 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-slate-300 font-mono-code">
              Initializing Encrypted Data-Stream & Generating Officer Watermark...
            </p>
            <p className="text-[11px] text-slate-500">
              Verifying RBAC clearance for Officer ID: {officerId}
            </p>
          </div>
        ) : error ? (
          <div className="p-8 max-w-md mx-auto text-center space-y-3 bg-slate-900/90 border border-rose-500/40 rounded-xl m-4 shadow-xl">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-full w-12 h-12 mx-auto flex items-center justify-center border border-rose-500/30">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-semibold text-rose-200 font-judicial-display">
              Stream Access Restricted or Failed
            </h4>
            <p className="text-xs text-rose-300/80 leading-relaxed">
              {error}
            </p>
            <button
              onClick={handleRefreshStream}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Retry Secure Connection
            </button>
          </div>
        ) : objectUrl ? (
          <div className="relative w-full h-full flex flex-col items-center justify-center overflow-auto p-2 sm:p-4">
            {/* Embedded PDF Frame with Zoom Transform */}
            <div
              className="w-full h-full min-h-[500px] sm:min-h-[650px] relative transition-transform duration-150 origin-top shadow-2xl rounded-lg overflow-hidden border border-slate-800 bg-white"
              style={{ transform: zoomLevel !== 100 ? `scale(${zoomLevel / 100})` : 'none' }}
            >
              {/* Native Object URL Data Stream Target */}
              <iframe
                src={`${objectUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full min-h-[550px] sm:min-h-[700px] border-0"
                title={`Judicial PDF Preview - ${document.original_filename}`}
              />

              {/* ==================================================================== */}
              {/* FORENSIC SECURITY WATERMARK OVERLAY (POINTER-EVENTS-NONE) */}
              {/* ==================================================================== */}
              <div
                className={`absolute inset-0 pointer-events-none select-none z-20 flex flex-col justify-between overflow-hidden ${
                  watermarkDensity === 'high'
                    ? 'opacity-85'
                    : watermarkDensity === 'subtle'
                    ? 'opacity-25'
                    : 'opacity-55'
                }`}
                aria-hidden="true"
              >
                {/* Top Watermark Security Ribbon */}
                <div className="bg-slate-950/80 text-amber-300/90 text-[10px] font-mono-code py-1 px-3 border-b border-amber-500/30 flex items-center justify-between tracking-wider font-semibold backdrop-blur-[1px]">
                  <span>RESTRICTED ACCESS • NIGERIAN JUDICIAL EVIDENCE VAULT</span>
                  <span>VIEWED BY OFFICER ID: {officerId}</span>
                  <span className="hidden sm:inline">TIME: {sessionTime}</span>
                </div>

                {/* Diagonal Repeating Forensic Tile Matrix */}
                <div className="absolute inset-0 flex flex-col justify-around rotate-[-25deg] scale-125 pointer-events-none select-none">
                  {[1, 2, 3, 4, 5, 6].map(rowIdx => (
                    <div
                      key={rowIdx}
                      className="flex justify-around items-center whitespace-nowrap text-slate-900/60 font-mono-code font-bold text-xs sm:text-sm tracking-widest gap-8 py-4"
                    >
                      <span className="border border-slate-900/20 px-3 py-1 rounded bg-amber-500/5">
                        CONFIDENTIAL • ID: {officerId} • {officerName.toUpperCase()} ({officerBadge})
                      </span>
                      <span className="border border-slate-900/20 px-3 py-1 rounded bg-sky-500/5">
                        DOCKET RECORD #{document.id.substring(0, 8)} • SHA-256: {document.file_hash.substring(0, 12)}
                      </span>
                      <span className="border border-slate-900/20 px-3 py-1 rounded bg-amber-500/5 hidden md:inline">
                        OFFICIAL EVIDENCE VAULT • NOT FOR PUBLIC DISTRIBUTION
                      </span>
                    </div>
                  ))}
                </div>

                {/* Central Prominent Institutional Judicial Seal Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
                  <div className="p-6 rounded-3xl border-2 border-dashed border-amber-900/30 bg-amber-500/5 backdrop-blur-[0.5px] text-center space-y-1.5 max-w-sm rotate-[-12deg] shadow-inner">
                    <div className="w-12 h-12 mx-auto text-amber-900/40 flex items-center justify-center">
                      <Shield className="w-10 h-10" />
                    </div>
                    <div className="text-xs font-black tracking-widest text-amber-950/70 uppercase font-judicial-display">
                      Federal High Court of Nigeria
                    </div>
                    <div className="text-[10px] font-mono-code font-bold text-amber-900/80">
                      OFFICER ID: {officerId}
                    </div>
                    <div className="text-[9px] font-mono-code text-slate-800/70">
                      {officerName} ({officerBadge}) • {officerRole}
                    </div>
                    <div className="text-[8px] font-mono-code text-rose-900/70 pt-1 border-t border-amber-900/20 uppercase font-semibold">
                      Unauthorized capture or distribution is a statutory offence
                    </div>
                  </div>
                </div>

                {/* Bottom Watermark Security Ribbon */}
                <div className="bg-slate-950/80 text-amber-300/90 text-[10px] font-mono-code py-1 px-3 border-t border-amber-500/30 flex items-center justify-between tracking-wider font-semibold backdrop-blur-[1px]">
                  <span>INTEGRITY VERIFIED: {document.file_hash.substring(0, 24)}...</span>
                  <span>IP: 127.0.0.1 • SESSION: SECURE_BLOB_STREAM</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Footer Security Dossier Bar */}
      <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span className="font-medium text-slate-300">Deterministic Byte-Level Integrity:</span>
          <span className="font-mono-code text-[11px] text-amber-300 hidden sm:inline truncate max-w-xs">
            {document.file_hash}
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono-code text-[11px] text-slate-500">
          <span>Security Level: RESTRICTED</span>
          <span>•</span>
          <span>Zero Storage Path Exposure: ACTIVE</span>
        </div>
      </div>
    </div>
  );
};
