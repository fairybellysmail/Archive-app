import React, { useState, useRef } from 'react';
import { AttachableType, DocumentRecord } from '../types/judicial.js';
import { X, UploadCloud, FileText, CheckCircle2, Shield, AlertCircle } from 'lucide-react';

interface UploadDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachableType: AttachableType;
  attachableId: string;
  attachableLabel: string;
  onUploadSuccess: (doc: DocumentRecord) => void;
}

export const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  isOpen,
  onClose,
  attachableType,
  attachableId,
  attachableLabel,
  onUploadSuccess
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [clientHash, setClientHash] = useState<string | null>(null);
  const [isHashing, setIsHashing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Compute Client-side SHA-256
  const computeFileHash = async (file: File) => {
    setIsHashing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      setClientHash(hashHex);
    } catch (e) {
      console.error('Client hash error', e);
    } finally {
      setIsHashing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setError(null);
      computeFileHash(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      setError(null);
      computeFileHash(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select a PDF or DOCX judicial filing.');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('attachable_type', attachableType);
    formData.append('attachable_id', attachableId);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'x-judicial-user-id': localStorage.getItem('judicial_active_user_id') || '22222222-2222-4222-8222-222222222222'
        },
        body: formData
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: res.statusText }));
        throw new Error(errorData.message || errorData.error || 'Failed to upload document.');
      }

      const data = await res.json();
      onUploadSuccess(data.document);
      onClose();
    } catch (err: any) {
      setError(err.message || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl max-w-xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-500/10 text-sky-400 rounded-lg border border-sky-500/20">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-100 font-judicial-display tracking-wide">
                Secure Judicial Filing Upload
              </h2>
              <p className="text-xs text-slate-400">
                Attaching to: <span className="font-mono-code text-amber-300 font-semibold">{attachableLabel}</span>
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
        <form onSubmit={handleUpload} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-950/50 border border-rose-500/40 rounded-lg text-rose-200 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              dragActive
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-700 bg-slate-950/40 hover:border-slate-600 hover:bg-slate-950/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="flex flex-col items-center">
              <div className="p-3 bg-slate-800 rounded-full text-slate-300 mb-3 border border-slate-700">
                <FileText className="w-6 h-6 text-sky-400" />
              </div>
              <p className="text-sm font-semibold text-slate-200 mb-1">
                Click to browse or drag & drop court filing
              </p>
              <p className="text-xs text-slate-400">
                Strict format whitelist: <strong className="text-slate-300">PDF (.pdf)</strong> or <strong className="text-slate-300">Word (.docx)</strong> up to 25 MB
              </p>
            </div>
          </div>

          {/* Selected File Details & Client SHA-256 Digest */}
          {selectedFile && (
            <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-sky-500/10 text-sky-400 rounded border border-sky-500/20">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-slate-200 block truncate max-w-xs">
                      {selectedFile.name}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Document'}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Ready
                </span>
              </div>

              {/* SHA-256 Integrity Verification Box */}
              <div className="pt-2 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="text-slate-400 flex items-center gap-1 font-medium">
                    <Shield className="w-3 h-3 text-amber-400" /> Client-Side SHA-256 Integrity Hash:
                  </span>
                  {isHashing && <span className="text-amber-400 animate-pulse">Calculating Digest...</span>}
                </div>
                <div className="font-mono-code text-[10px] p-2 bg-slate-900 rounded border border-slate-800 text-amber-300 break-all select-all">
                  {clientHash || 'Computing deterministic SHA-256 hash...'}
                </div>
              </div>
            </div>
          )}

          {/* Policy Notice */}
          <div className="p-3 bg-slate-950/50 border border-slate-800/80 rounded-lg text-[11px] text-slate-400">
            <p>
              <strong className="text-slate-300">Deterministic Tamper-Proof Storage:</strong> The server computes an authoritative SHA-256 digest upon intake, registers the record in the <code className="text-slate-300">document_registry</code> table, and records a cryptographic block in the audit ledger.
            </p>
          </div>

          {/* Footer Buttons */}
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
              disabled={!selectedFile || uploading || isHashing}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {uploading ? 'Registering File...' : 'Upload & Compute Certified Digest'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
