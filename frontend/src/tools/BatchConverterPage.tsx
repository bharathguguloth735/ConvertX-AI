// DocuFlow AI — High-Performance Batch Processing & Bulk File Converter Studio
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Layers,
  Upload,
  FileText,
  Archive,
  Download,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Play,
  Sparkles,
  RefreshCw,
  Sliders,
  FileSpreadsheet,
  Image as ImageIcon,
  ArrowRight,
  ShieldCheck,
  Zap,
  Info
} from 'lucide-react';
import { uploadWithProgress } from '@/api/client';
import toast from 'react-hot-toast';

interface BatchFileItem {
  id: string;
  file: File;
  name: string;
  size: number;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  error?: string;
  outputName?: string;
  outputSize?: number;
}

interface BatchResultSummary {
  batchId: string;
  operation: string;
  totalFiles: number;
  successfulCount: number;
  failedCount: number;
  zipFilename: string;
  zipSizeBytes: number;
  zipDownloadUrl: string;
  items: Array<{
    filename: string;
    output_name?: string;
    status: string;
    size?: number;
    error?: string;
  }>;
}

const OPERATIONS = [
  {
    id: 'pdf_to_docx',
    title: 'PDF to Word (.docx)',
    description: 'Extract formatted layout, tables, and text into editable Microsoft Word documents',
    icon: FileText,
    accept: '.pdf,application/pdf',
    badge: 'Popular',
  },
  {
    id: 'docx_to_pdf',
    title: 'Word (.docx) to PDF',
    description: 'Render DOCX documents into universal, print-ready PDF files',
    icon: FileSpreadsheet,
    accept: '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    badge: 'Fast',
  },
  {
    id: 'pdf_to_jpg',
    title: 'PDF to High-Res JPG',
    description: 'Render each page as 150 DPI JPEG images packaged in dedicated subfolders',
    icon: ImageIcon,
    accept: '.pdf,application/pdf',
    badge: '150 DPI',
  },
  {
    id: 'pdf_to_txt',
    title: 'PDF to Plain Text (.txt)',
    description: 'High-speed text extraction for LLM datasets, embeddings, and NLP pipelines',
    icon: FileText,
    accept: '.pdf,application/pdf',
    badge: 'Lightweight',
  },
  {
    id: 'image_compress',
    title: 'Bulk Image Compression',
    description: 'Compress JPG, PNG, and WebP images while maintaining crisp visual fidelity',
    icon: Sliders,
    accept: '.jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp',
    badge: 'Smart Lossy',
  },
];

export const BatchConverterPage: React.FC = () => {
  const [selectedOp, setSelectedOp] = useState<string>('pdf_to_docx');
  const [quality, setQuality] = useState<number>(80);
  const [items, setItems] = useState<BatchFileItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [result, setResult] = useState<BatchResultSummary | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeOpConfig = OPERATIONS.find((op) => op.id === selectedOp) || OPERATIONS[0];

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const addFiles = (newFiles: File[]) => {
    const totalCount = items.length + newFiles.length;
    if (totalCount > 50) {
      toast.error('Maximum batch limit is 50 files at once.');
      newFiles = newFiles.slice(0, 50 - items.length);
    }

    const newItems: BatchFileItem[] = newFiles.map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      name: file.name,
      size: file.size,
      status: 'queued',
    }));

    setItems((prev) => [...prev, ...newItems]);
    toast.success(`Added ${newItems.length} file${newItems.length > 1 ? 's' : ''} to batch queue.`);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const removeItem = (id: string) => {
    if (isProcessing) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearQueue = () => {
    if (isProcessing) return;
    setItems([]);
    setResult(null);
    setUploadProgress(0);
  };

  // Quick Demo Preset Loader
  const loadDemoBatch = () => {
    if (isProcessing) return;
    const dummyNames = [
      'Q3_Financial_Audit_Report.pdf',
      'Employment_Contract_NDA_2026.pdf',
      'Technical_Architecture_Overview.pdf',
      'Client_Onboarding_Handbook.pdf',
    ];

    const dummyFiles = dummyNames.map((name) => {
      const content = `%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 595 842]/Parent 2 0 R/Contents 4 0 R>>endobj\n4 0 obj<</Length 55>>stream\nBT /F1 16 Tf 50 750 Td (DocuFlow AI Batch Conversion Demo: ${name}) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000216 00000 n \ntrailer<</Size 5/Root 1 0 R>>\nstartxref\n325\n%%EOF`;
      return new File([content], name, { type: 'application/pdf' });
    });

    setSelectedOp('pdf_to_docx');
    addFiles(dummyFiles);
  };

  const runBatchConversion = async () => {
    if (items.length === 0) {
      toast.error('Please add at least one file to convert');
      return;
    }

    setIsProcessing(true);
    setUploadProgress(10);
    setResult(null);

    // Update item states to processing
    setItems((prev) => prev.map((item) => ({ ...item, status: 'processing' })));

    try {
      const formData = new FormData();
      items.forEach((item) => {
        formData.append('files', item.file);
      });
      formData.append('operation', selectedOp);
      if (selectedOp === 'image_compress') {
        formData.append('quality', quality.toString());
      }

      const res = await uploadWithProgress('/batch/convert', formData, (percent) => {
        setUploadProgress(percent);
      });

      const data = res.data;
      setResult({
        batchId: data.batch_id,
        operation: data.operation,
        totalFiles: data.total_files,
        successfulCount: data.successful_count,
        failedCount: data.failed_count,
        zipFilename: data.zip_filename,
        zipSizeBytes: data.zip_size_bytes,
        zipDownloadUrl: data.zip_download_url,
        items: data.items,
      });

      // Update item statuses based on API result
      const resultMap = new Map<string, { status: string; output_name?: string; size?: number; error?: string }>();
      (data.items || []).forEach((it: any) => {
        resultMap.set(it.filename, it);
      });

      setItems((prev) =>
        prev.map((item) => {
          const resInfo = resultMap.get(item.name);
          if (resInfo) {
            return {
              ...item,
              status: resInfo.status === 'completed' ? 'completed' : 'failed',
              outputName: resInfo.output_name,
              outputSize: resInfo.size,
              error: resInfo.error,
            };
          }
          return { ...item, status: 'completed' };
        })
      );

      toast.success(`Batch complete! ${data.successful_count} of ${data.total_files} files packaged into .ZIP.`);
    } catch (err: any) {
      const msg = err.response?.data?.detail || err.message || 'Batch conversion failed';
      toast.error(`Error: ${msg}`);
      setItems((prev) => prev.map((item) => ({ ...item, status: 'failed', error: msg })));
    } finally {
      setIsProcessing(false);
      setUploadProgress(100);
    }
  };

  const totalQueueSize = items.reduce((acc, it) => acc + it.size, 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-20 pt-8 px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-indigo-300 bg-clip-text text-transparent">
                Batch File Converter & Processing Engine
              </h1>
              <span className="hidden sm:inline-block px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Bulk ZIP Export
              </span>
            </div>
            <p className="text-sm text-slate-400 max-w-3xl">
              Convert up to 50 documents and images simultaneously with parallel multi-threading. Download all converted outputs in an organized, lossless ZIP archive with zero cloud retention.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={loadDemoBatch}
              disabled={isProcessing}
              className="px-3.5 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs font-medium text-slate-300 hover:text-white border border-slate-700 flex items-center space-x-2 transition"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Load 4 Sample PDFs</span>
            </button>
            {items.length > 0 && (
              <button
                onClick={clearQueue}
                disabled={isProcessing}
                className="px-3.5 py-2 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-xs font-medium text-red-300 border border-red-800/50 flex items-center space-x-2 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Queue</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Operation Selector & Upload Area (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Step 1: Select Target Operation */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">1</span>
                <span>Choose Conversion Mode</span>
              </h2>
            </div>

            <div className="space-y-2.5">
              {OPERATIONS.map((op) => {
                const IconComponent = op.icon;
                const isSelected = selectedOp === op.id;
                return (
                  <div
                    key={op.id}
                    onClick={() => {
                      if (!isProcessing) setSelectedOp(op.id);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start space-x-3.5 ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500/80 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg mt-0.5 ${
                        isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-medium text-slate-200">{op.title}</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                          {op.badge}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">{op.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quality Slider for Image Compress */}
            {selectedOp === 'image_compress' && (
              <div className="mt-4 pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-medium text-slate-300 flex items-center space-x-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Compression Quality</span>
                  </label>
                  <span className="text-xs font-bold text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800">
                    {quality}%
                  </span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="95"
                  step="5"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>Smallest Size</span>
                  <span>Balanced (80%)</span>
                  <span>Highest Quality</span>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Upload Zone */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-xl">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs">2</span>
              <span>Upload Source Files</span>
            </h2>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-700/80 hover:border-indigo-500 rounded-xl p-6 text-center cursor-pointer transition bg-slate-950/50 hover:bg-indigo-950/10 group"
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                accept={activeOpConfig.accept}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-full bg-slate-800/80 group-hover:bg-indigo-600/20 text-indigo-400 flex items-center justify-center mx-auto mb-3 transition">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-slate-200 mb-1">
                Click to browse or drop files here
              </p>
              <p className="text-xs text-slate-400">
                Supports up to 50 files simultaneously ({activeOpConfig.accept})
              </p>
            </div>

            {/* Security Assurance */}
            <div className="mt-4 flex items-center space-x-2 text-xs text-slate-400 bg-slate-950/40 p-2.5 rounded-lg border border-slate-800/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>Zero-knowledge privacy: All files processed in volatile memory and purged automatically.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Batch Queue & Results (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-xl flex flex-col min-h-[520px]">
            {/* Queue Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <h2 className="text-base font-semibold text-white flex items-center space-x-2">
                  <span>Batch Processing Queue</span>
                  <span className="text-xs font-normal text-slate-400">({items.length} items)</span>
                </h2>
                {items.length > 0 && (
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    Total: {formatBytes(totalQueueSize)}
                  </span>
                )}
              </div>

              {items.length > 0 && !result && (
                <button
                  onClick={runBatchConversion}
                  disabled={isProcessing}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-medium text-sm shadow-lg shadow-indigo-500/25 flex items-center space-x-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing... {uploadProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Start Conversion ({items.length})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Upload Progress Bar */}
            {isProcessing && (
              <div className="mb-4">
                <div className="flex justify-between text-xs text-slate-300 mb-1 font-medium">
                  <span>Processing batch across CPU worker pool...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-violet-500 h-full transition-all duration-300 rounded-full"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results Banner when finished */}
            {result && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 bg-gradient-to-br from-indigo-950/60 to-slate-900 border border-indigo-500/40 rounded-xl p-5 shadow-xl"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center space-x-2 text-emerald-400 font-semibold text-sm mb-1">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Batch Conversion Completed!</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      Successfully processed <span className="font-bold text-white">{result.successfulCount}</span> of{' '}
                      <span className="font-bold text-white">{result.totalFiles}</span> files. Packaged into a compressed ZIP archive.
                    </p>
                    <div className="mt-2 flex items-center space-x-3 text-xs text-slate-400 font-mono">
                      <span>Archive: {result.zipFilename}</span>
                      <span>•</span>
                      <span>Size: {formatBytes(result.zipSizeBytes)}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <a
                      href={result.zipDownloadUrl}
                      download={result.zipFilename}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold tracking-wide uppercase shadow-lg shadow-emerald-600/30 flex items-center space-x-2 transition"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download .ZIP</span>
                    </a>
                    <button
                      onClick={clearQueue}
                      className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
                      title="Convert Another Batch"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Items List */}
            {items.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800/80 rounded-xl">
                <div className="w-16 h-16 rounded-2xl bg-slate-850 flex items-center justify-center text-slate-600 mb-3 border border-slate-800">
                  <Archive className="w-8 h-8" />
                </div>
                <h3 className="text-sm font-semibold text-slate-300 mb-1">Queue is empty</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  Select a conversion mode on the left and drop up to 50 files here to convert and package them as a unified ZIP archive.
                </p>
                <button
                  onClick={loadDemoBatch}
                  className="px-3 py-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-950/40 hover:bg-indigo-950/70 border border-indigo-800/50 rounded-lg flex items-center space-x-1.5 transition"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Try Demo Batch</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto max-h-[460px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
                <AnimatePresence>
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                        item.status === 'completed'
                          ? 'bg-emerald-950/20 border-emerald-900/40'
                          : item.status === 'failed'
                          ? 'bg-red-950/20 border-red-900/40'
                          : item.status === 'processing'
                          ? 'bg-indigo-950/20 border-indigo-800/50'
                          : 'bg-slate-950/40 border-slate-800/80'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <span className="text-xs font-mono text-slate-500 w-5">{index + 1}.</span>
                        <div className="p-2 rounded-lg bg-slate-800 text-slate-300 flex-shrink-0">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-slate-200 truncate max-w-xs sm:max-w-md">
                            {item.name}
                          </p>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                            <span>{formatBytes(item.size)}</span>
                            {item.outputName && (
                              <>
                                <ArrowRight className="w-3 h-3 text-slate-500" />
                                <span className="text-indigo-300 font-medium">{item.outputName}</span>
                              </>
                            )}
                            {item.error && <span className="text-red-400 italic">Error: {item.error}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3 flex-shrink-0">
                        {item.status === 'queued' && (
                          <span className="text-[11px] font-medium text-slate-400 px-2 py-0.5 rounded bg-slate-800 border border-slate-700">
                            Queued
                          </span>
                        )}
                        {item.status === 'processing' && (
                          <span className="text-[11px] font-medium text-indigo-400 px-2 py-0.5 rounded bg-indigo-950 border border-indigo-800 flex items-center space-x-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Converting</span>
                          </span>
                        )}
                        {item.status === 'completed' && (
                          <span className="text-[11px] font-medium text-emerald-400 px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Ready</span>
                          </span>
                        )}
                        {item.status === 'failed' && (
                          <span className="text-[11px] font-medium text-red-400 px-2 py-0.5 rounded bg-red-950 border border-red-800 flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </span>
                        )}

                        {!isProcessing && (
                          <button
                            onClick={() => removeItem(item.id)}
                            className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-slate-800 transition"
                            title="Remove from batch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* Bottom Action Footer if items exist and not done */}
            {items.length > 0 && !result && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>
                    Ready to convert {items.length} file{items.length > 1 ? 's' : ''} with operation "{activeOpConfig.title}".
                  </span>
                </div>
                <button
                  onClick={runBatchConversion}
                  disabled={isProcessing}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold text-xs tracking-wider uppercase shadow-lg shadow-indigo-500/25 flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Batch...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Process & Package All (.ZIP)</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BatchConverterPage;
