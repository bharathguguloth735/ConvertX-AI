import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, FileText, CheckCircle, AlertCircle, Download, RefreshCw,
  Loader2, Info, Layers, ArrowLeft
} from 'lucide-react';
import { uploadWithProgress } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { getDownloadUrlWithToken } from '@/utils/downloadHelper';

const PDFMergerTool: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated } = useAuthStore();

  const onDrop = useCallback((accepted: File[]) => {
    const validFiles = accepted.filter(f => f.size <= 50 * 1024 * 1024);
    if (validFiles.length < accepted.length) {
      toast.error('Some files were ignored because they exceed 50MB');
    }
    if (files.length + validFiles.length > 20) {
      toast.error('Maximum 20 files allowed');
      return;
    }
    setFiles(prev => [...prev, ...validFiles]);
    setResult(null);
    setError(null);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: true,
  });

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (files.length < 2) {
      toast.error('Please upload at least 2 PDF files to merge');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadPercent(0);

    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const { data } = await uploadWithProgress('/pdf/merge', formData, setUploadPercent);
      setResult(data);
      toast.success('Merge complete!');
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string | Array<{ msg: string }> } } })?.response?.data?.detail;
      let msg = 'Merge failed. Please check your files and try again.';
      if (typeof detail === 'string') {
        msg = detail;
      } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
        msg = detail[0].msg;
      } else if ((err as Error)?.message) {
        msg = (err as Error).message;
      }
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFiles([]);
    setResult(null);
    setError(null);
    setUploadPercent(0);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 relative z-10">
      <div className="max-w-2xl mx-auto">
        {/* Navigation & Header Status */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-brand-500/10 text-brand-400 border border-brand-500/20">
            <Layers className="w-3.5 h-3.5 text-brand-400" />
            <span>PDF Studio • Fast & Lossless</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Layers className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            Merge <span className="gradient-text">PDF Files</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Combine multiple PDF documents into a single, perfectly structured document.
          </p>
        </div>

        {!isAuthenticated && (
          <div className="glass-card rounded-xl p-4 mb-6 border border-brand-500/20 bg-brand-500/5 flex items-center gap-3">
            <Info className="w-5 h-5 text-brand-400 flex-shrink-0" />
            <p className="text-slate-300 text-sm">
              Operating in Guest Mode.{' '}
              <Link to="/login" className="font-semibold text-brand-400 underline">Login</Link> or{' '}
              <Link to="/register" className="font-semibold text-brand-400 underline">Create Account</Link> to save merged PDFs to your dashboard.
            </p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              <div
                {...getRootProps()}
                className={`upload-zone p-8 text-center cursor-pointer transition-all duration-300 rounded-2xl border-2 border-dashed ${
                  isDragActive
                    ? 'border-brand-500 bg-brand-500/10 shadow-glow'
                    : 'border-surface-700/60 hover:border-brand-500/50 bg-surface-900/40 hover:bg-surface-900/70'
                }`}
              >
                <input {...getInputProps()} />
                <div className={`w-14 h-14 rounded-2xl mx-auto mb-3 flex items-center justify-center transition-all duration-300 ${isDragActive ? 'bg-brand-500 shadow-glow scale-110' : 'bg-surface-800'}`}>
                  <Upload className={`w-6 h-6 ${isDragActive ? 'text-white' : 'text-brand-400'}`} />
                </div>
                <p className="text-base font-semibold text-white mb-1">
                  Drag & Drop PDF files here
                </p>
                <p className="text-slate-400 text-xs">or click to browse from device</p>
                <div className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-surface-800/80 border border-surface-700/50">PDF only</span>
                  <span>•</span>
                  <span>Up to 20 files</span>
                  <span>•</span>
                  <span>50MB each</span>
                </div>
              </div>

              {files.length > 0 && (
                <div className="space-y-2 mt-4">
                  <div className="flex items-center justify-between text-sm font-medium text-slate-300 mb-2">
                    <span>Files to merge ({files.length}):</span>
                    <button
                      type="button"
                      onClick={() => setFiles([])}
                      className="text-xs text-red-400 hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="glass-card rounded-xl p-3 flex items-center gap-3 border border-surface-800 bg-surface-900/60"
                    >
                      <div className="w-8 h-8 rounded-lg bg-brand-500/15 flex items-center justify-center text-brand-400 flex-shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-200 font-medium text-sm truncate">{file.name}</p>
                        <p className="text-slate-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-colors"
                        title="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {files.length >= 2 && (
                <button
                  onClick={handleProcess}
                  disabled={uploading}
                  className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-base mt-4 shadow-glow"
                >
                  {uploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Merging... {uploadPercent}%</>
                  ) : (
                    <><Layers className="w-5 h-5" /> Merge {files.length} PDFs</>
                  )}
                </button>
              )}

              {uploading && (
                <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    className="progress-bar h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadPercent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              {error && (
                <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-medium text-sm">Merge Failed</p>
                    <p className="text-red-400/80 text-xs mt-1">{error}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-3"
            >
              <div className="glass-card rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/5">
                <div className="flex items-center gap-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-emerald-400" />
                  <div>
                    <p className="text-white font-semibold">Merge Complete!</p>
                    {result.size ? <p className="text-slate-500 text-xs">{((result.size as number) / 1024 / 1024).toFixed(2)} MB • {String(result.pages || 0)} pages</p> : null}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  {result.download_url ? (
                    <a
                      href={getDownloadUrlWithToken(
                        String(result.download_url),
                        result.filename ? String(result.filename) : 'merged.pdf'
                      )}
                      download={String(result.filename || 'merged.pdf')}
                      className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 shadow-glow"
                    >
                      <Download className="w-4 h-4" /> Download {result.filename ? String(result.filename) : 'Merged PDF'}
                    </a>
                  ) : null}
                  <button
                    onClick={reset}
                    className="btn-secondary flex items-center gap-2 px-4 py-2.5"
                  >
                    <RefreshCw className="w-4 h-4" /> Merge More
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default PDFMergerTool;
