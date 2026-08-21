import React, { useState } from 'react';
import { DocumentRecord, User } from '../types/judicial.js';
import { X, Shield, Download, FileText, CheckCircle2, Copy, Calendar, User as UserIcon, HardDrive, Eye } from 'lucide-react';
import { api } from '../services/api.js';
import { SecurePdfViewer } from './SecurePdfViewer.js';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentRecord | null;
  currentUser?: User | null;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  document,
  currentUser
}) => {
  const [modalTab, setModalTab] = useState<'preview' | 'digest'>('preview');
  const [copied, setCopied] = useState(false);

  if (!isOpen || !document) return null;

  const copyHash = () => {
    navigator.clipboard.writeText(document.file_hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} Bytes`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-5xl w-full shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-100 font-judicial-display tracking-wide truncate max-w-sm sm:max-w-xl">
                {document.original_filename}
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Official Court Evidence Vault</span>
                <span>•</span>
                <span className="font-mono-code text-slate-300">ID: {document.id.substring(0, 12)}...</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Modal Tabs */}
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setModalTab('preview')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalTab === 'preview'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Watermarked Stream</span>
              </button>
              <button
                onClick={() => setModalTab('digest')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalTab === 'digest'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Integrity Digest</span>
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {modalTab === 'preview' ? (
            <SecurePdfViewer
              document={document}
              currentUser={currentUser || null}
              className="w-full"
            />
          ) : (
            <div className="space-y-5">
              {/* Metadata Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5 flex items-center gap-1">
                    <HardDrive className="w-3 h-3 text-slate-400" /> File Size
                  </span>
                  <span className="text-xs font-mono-code font-semibold text-slate-200">
                    {formatBytes(document.file_size)}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Registered On
                  </span>
                  <span className="text-xs text-slate-200">
                    {new Date(document.created_at).toLocaleDateString()} {new Date(document.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block mb-0.5 flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-slate-400" /> Intake Officer
                  </span>
                  <span className="text-xs text-slate-200 truncate block">
                    {document.created_by_user?.name || 'Judicial Registrar'}
                  </span>
                </div>
              </div>

              {/* Cryptographic SHA-256 Digest Badge */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5 font-mono-code">
                    <Shield className="w-4 h-4 text-amber-400" />
                    DETERMINISTIC SHA-256 INTEGRITY DIGEST
                  </span>
                  <button
                    onClick={copyHash}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy Hash</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="font-mono-code text-xs p-3 bg-slate-900 rounded-lg border border-slate-800 text-amber-200 break-all select-all leading-relaxed">
                  {document.file_hash}
                </div>

                <p className="text-[11px] text-slate-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  Cryptographic byte-level checksum registered at intake. Any single bit modification invalidates verification.
                </p>
              </div>

              {/* Certified Seal Banner */}
              <div className="p-4 bg-amber-950/20 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/30 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-amber-200 font-judicial-display uppercase tracking-wider">
                    Certified Judicial True Copy Security Seal
                  </h4>
                  <p className="text-[11px] text-amber-200/70 mt-0.5 leading-normal">
                    This document is secured within the Federal High Court of Justice Electronic Evidence Vault. Every download event generates an immutable cryptographic block appended to the audit ledger.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Authenticated Download */}
        <div className="p-4 bg-slate-950/70 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
          >
            Close Inspector
          </button>
          
          <a
            href={api.getDocumentDownloadUrl(document.id)}
            download={document.original_filename}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Authenticated Certified Copy
          </a>
        </div>
      </div>
    </div>
  );
};

