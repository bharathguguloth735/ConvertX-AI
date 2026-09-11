import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, CheckCircle, Download, RefreshCw,
  Loader2, AlertCircle, Settings, Image as ImageIcon,
  FileText, Music, Video, Zap
} from 'lucide-react';
import { uploadWithProgress, getUserFriendlyErrorMessage } from '@/api/client';
import { downloadFile } from '@/utils/downloadHelper';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

interface ToolOption {
  id: string;
  label: string;
  endpoint: string;
  buildFormData: (file: File, options: Record<string, any>) => FormData;
  category: 'image' | 'pdf' | 'doc' | 'audio' | 'video' | 'other';
  defaultOptions?: Record<string, any>;
  dedicatedRoute?: string;
}

export const LandingUploader: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedToolId, setSelectedToolId] = useState<string>('');
  const [toolOptions, setToolOptions] = useState<Record<string, any>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [result, setResult] = useState<{
    download_url?: string;
    filename?: string;
    size?: number;
    reduction_percent?: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine available operations based on file extension
  const getAvailableTools = useCallback((f: File): ToolOption[] => {
    const ext = f.name.split('.').pop()?.toLowerCase() || '';

    // Image files
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff'].includes(ext)) {
      return [
        {
          id: 'image-convert-png',
          label: 'Convert to PNG (Lossless)',
          category: 'image',
          endpoint: '/image/convert',
          dedicatedRoute: '/tools/image/convert',
          defaultOptions: { target_format: 'png', quality: 90 },
          buildFormData: (file, opts) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('target_format', opts.target_format || 'png');
            fd.append('quality', String(opts.quality || 90));
            return fd;
          },
        },
        {
          id: 'image-convert-jpg',
          label: 'Convert to JPG (Photos)',
          category: 'image',
          endpoint: '/image/convert',
          dedicatedRoute: '/tools/image/convert',
          defaultOptions: { target_format: 'jpg', quality: 85 },
          buildFormData: (file, opts) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('target_format', 'jpg');
            fd.append('quality', String(opts.quality || 85));
            return fd;
          },
        },
        {
          id: 'image-convert-webp',
          label: 'Convert to WebP (Web Optimized)',
          category: 'image',
          endpoint: '/image/convert',
          dedicatedRoute: '/tools/image/convert',
          defaultOptions: { target_format: 'webp', quality: 85 },
          buildFormData: (file, opts) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('target_format', 'webp');
            fd.append('quality', String(opts.quality || 85));
            return fd;
          },
        },
        {
          id: 'image-compress',
          label: 'Compress Image (Reduce Size)',
          category: 'image',
          endpoint: '/image/compress',
          dedicatedRoute: '/tools/image/compress',
          defaultOptions: { quality: 70 },
          buildFormData: (file, opts) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('quality', String(opts.quality || 70));
            return fd;
          },
        },
        {
          id: 'image-ai-analyze',
          label: 'AI Analyser (Summarize & Chat with Receipt/Image)',
          category: 'image',
          endpoint: '/ai/summarize-file',
          dedicatedRoute: '/tools/ai/analyzer',
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('style', 'bullets');
            return fd;
          },
        },
      ];
    }

    // PDF files
    if (ext === 'pdf') {
      return [
        {
          id: 'pdf-ai-analyze',
          label: 'AI Document Analyser (Summarize & Ask Questions)',
          category: 'pdf',
          endpoint: '/ai/summarize-file',
          dedicatedRoute: '/tools/ai/analyzer',
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('style', 'bullets');
            return fd;
          },
        },
        {
          id: 'pdf-to-docx',
          label: 'Convert to Word Document (DOCX)',
          category: 'pdf',
          endpoint: '/pdf/convert',
          dedicatedRoute: '/tools/pdf/convert?op=to_docx',
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('operation', 'to_docx');
            return fd;
          },
        },
        {
          id: 'pdf-to-jpg',
          label: 'Convert PDF Pages to JPG Images',
          category: 'pdf',
          endpoint: '/pdf/convert',
          dedicatedRoute: '/tools/pdf/convert?op=to_jpg',
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('operation', 'to_jpg');
            return fd;
          },
        },
        {
          id: 'pdf-compress',
          label: 'Compress PDF (Reduce File Size)',
          category: 'pdf',
          endpoint: '/pdf/compress',
          dedicatedRoute: '/tools/pdf/compress',
          defaultOptions: { quality: 75 },
          buildFormData: (file, opts) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('quality', String(opts.quality || 75));
            return fd;
          },
        },
        {
          id: 'pdf-to-txt',
          label: 'Extract Text (TXT)',
          category: 'pdf',
          endpoint: '/pdf/convert',
          dedicatedRoute: '/tools/pdf/convert?op=to_txt',
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('operation', 'to_txt');
            return fd;
          },
        },
      ];
    }

    // Word Documents
    if (['docx', 'doc'].includes(ext)) {
      return [
        {
          id: 'docx-to-pdf',
          label: 'Convert Word to PDF',
          category: 'doc',
          endpoint: '/pdf/convert',
          dedicatedRoute: '/tools/pdf/convert?op=docx_to_pdf',
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('operation', 'docx_to_pdf');
            return fd;
          },
        },
      ];
    }

    // Audio files
    if (['mp3', 'wav', 'aac', 'ogg', 'flac'].includes(ext)) {
      return [
        {
          id: 'audio-convert-mp3',
          label: 'Convert to MP3 Audio',
          category: 'audio',
          endpoint: '/audio/convert',
          dedicatedRoute: '/tools/audio/convert',
          defaultOptions: { output_format: 'mp3' },
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('output_format', 'mp3');
            return fd;
          },
        },
        {
          id: 'audio-convert-wav',
          label: 'Convert to WAV Audio',
          category: 'audio',
          endpoint: '/audio/convert',
          dedicatedRoute: '/tools/audio/convert',
          defaultOptions: { output_format: 'wav' },
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('output_format', 'wav');
            return fd;
          },
        },
      ];
    }

    // Video files
    if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) {
      return [
        {
          id: 'video-extract-audio',
          label: 'Extract Audio to MP3',
          category: 'video',
          endpoint: '/video/extract-audio',
          dedicatedRoute: '/tools/video/extract-audio',
          defaultOptions: { audio_format: 'mp3' },
          buildFormData: (file) => {
            const fd = new FormData();
            fd.append('file', file);
            fd.append('audio_format', 'mp3');
            return fd;
          },
        },
      ];
    }

    // Generic fallback
    return [
      {
        id: 'ocr-extract',
        label: 'OCR Text Extraction',
        category: 'other',
        endpoint: '/ocr',
        dedicatedRoute: '/tools/ocr',
        buildFormData: (file) => {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('language', 'en');
          return fd;
        },
      },
    ];
  }, []);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null);
      setResult(null);

      if (rejectedFiles && rejectedFiles.length > 0) {
        setError('This file cannot be uploaded. Please check size limits (max 100MB).');
        return;
      }

      const f = acceptedFiles[0];
      if (!f) {
        setError('Please select a valid file.');
        return;
      }

      if (f.size > 100 * 1024 * 1024) {
        setError('File exceeds the 100MB maximum size limit.');
        return;
      }

      setFile(f);
      const available = getAvailableTools(f);
      if (available.length > 0) {
        setSelectedToolId(available[0].id);
        setToolOptions(available[0].defaultOptions || {});
      }

      if (f.type.startsWith('image/')) {
        const url = URL.createObjectURL(f);
        setPreviewUrl(url);
      } else {
        setPreviewUrl(null);
      }
    },
    [getAvailableTools]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
    noClick: false,
    maxSize: 100 * 1024 * 1024,
  });

  const handleToolChange = (toolId: string) => {
    setSelectedToolId(toolId);
    if (!file) return;
    const available = getAvailableTools(file);
    const chosen = available.find((t) => t.id === toolId);
    if (chosen) {
      setToolOptions(chosen.defaultOptions || {});
    }
  };

  const handleProcess = async () => {
    if (!file) {
      setError('Please select a file to process.');
      return;
    }

    const available = getAvailableTools(file);
    const tool = available.find((t) => t.id === selectedToolId) || available[0];
    if (!tool) {
      setError('This file type is not supported.');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const formData = tool.buildFormData(file, toolOptions);
      const { data } = await uploadWithProgress(tool.endpoint, formData, setUploadProgress);

      setResult(data);
      toast.success('File processed successfully!');
    } catch (err: unknown) {
      const friendlyMsg = getUserFriendlyErrorMessage(err);
      setError(friendlyMsg);
      toast.error(friendlyMsg);
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setError(null);
    setUploadProgress(0);
  };

  const handleDownload = () => {
    if (!result?.download_url) return;
    downloadFile(result.download_url, result.filename);
  };

  const availableTools = file ? getAvailableTools(file) : [];
  const currentTool = availableTools.find((t) => t.id === selectedToolId);

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getFileCategoryIcon = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext)) {
      return <ImageIcon className="w-5 h-5 text-emerald-400" />;
    }
    if (['pdf', 'docx', 'doc', 'txt'].includes(ext)) {
      return <FileText className="w-5 h-5 text-blue-400" />;
    }
    if (['mp3', 'wav', 'aac', 'ogg'].includes(ext)) {
      return <Music className="w-5 h-5 text-purple-400" />;
    }
    if (['mp4', 'mov', 'avi', 'webm'].includes(ext)) {
      return <Video className="w-5 h-5 text-pink-400" />;
    }
    return <Zap className="w-5 h-5 text-brand-400" />;
  };

  return (
    <div className="w-full max-w-2xl mx-auto mb-10">
      <AnimatePresence mode="wait">
        {!file ? (
          /* Step 1: Initial Upload State */
          <motion.div
            key="upload-zone"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96 }}
          >
            <div
              {...getRootProps()}
              id="landing-file-dropzone"
              className={`p-8 sm:p-10 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 text-center ${
                isDragActive
                  ? 'border-brand-400 bg-brand-500/10 shadow-glow'
                  : 'border-white/15 bg-surface-900/85 hover:border-brand-500/40 hover:bg-surface-800/90 shadow-xl'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-3.5">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                    isDragActive
                      ? 'bg-brand-500 text-white shadow-glow scale-105'
                      : 'bg-surface-800 text-brand-400 border border-white/5'
                  }`}
                >
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-white font-bold text-base sm:text-lg">
                    {isDragActive ? 'Drop your file here!' : 'Click to Upload or Drag & Drop'}
                  </p>
                  <p className="text-slate-400 text-xs sm:text-sm mt-1">
                    PDF, JPG, PNG, WebP, DOCX, MP3, MP4 (Up to 100MB)
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </motion.div>
        ) : (
          /* Step 2: Selected File, Tool Selection, and Processing */
          <motion.div
            key="action-zone"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-6 rounded-2xl bg-surface-900/95 border border-white/15 shadow-2xl backdrop-blur-xl"
          >
            {/* File Info Header */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-surface-800/90 border border-white/5 mb-5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-700/80 flex items-center justify-center flex-shrink-0">
                  {getFileCategoryIcon(file.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-semibold text-sm truncate max-w-xs">{file.name}</p>
                  <p className="text-slate-400 text-xs">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={uploading}
                title="Remove file"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Optional Thumbnail Preview */}
            {previewUrl && (
              <div className="mb-4 flex justify-center">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-36 rounded-xl border border-white/10 object-contain shadow-md"
                />
              </div>
            )}

            {/* Success State */}
            {result ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <h4 className="text-lg font-bold text-white mb-1">File Processed Successfully!</h4>
                <p className="text-slate-400 text-xs mb-5">
                  {result.filename || 'Converted File'} • {formatFileSize(result.size)}
                  {result.reduction_percent !== undefined && (
                    <span className="text-emerald-400 ml-1.5 font-semibold">
                      (Reduced by {result.reduction_percent}%)
                    </span>
                  )}
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={handleDownload}
                    className="btn-primary flex items-center justify-center gap-2 text-sm py-2.5 px-6 shadow-glow"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Processed File</span>
                  </button>
                  <button
                    onClick={handleReset}
                    className="btn-secondary flex items-center justify-center gap-2 text-sm py-2.5 px-4"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Convert Another</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Tool Setup & Execution Controls */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Select Operation:
                  </label>
                  <select
                    id="landing-tool-selector"
                    value={selectedToolId}
                    onChange={(e) => handleToolChange(e.target.value)}
                    disabled={uploading}
                    className="select w-full text-sm font-medium"
                  >
                    {availableTools.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Progress Bar during Upload */}
                {uploading && (
                  <div className="space-y-2 py-2">
                    <div className="flex justify-between text-xs text-slate-300 font-medium">
                      <span>Processing file...</span>
                      <span className="font-mono text-brand-400">{uploadProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-700 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 transition-all duration-300 rounded-full"
                        style={{ width: `${Math.max(5, uploadProgress)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {error && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-2">
                  <button
                    onClick={handleProcess}
                    disabled={uploading}
                    id="landing-process-btn"
                    className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm py-3 font-semibold shadow-glow disabled:opacity-50"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Processing File...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Process File Now</span>
                      </>
                    )}
                  </button>

                  {currentTool?.dedicatedRoute && (
                    <Link
                      to={currentTool.dedicatedRoute}
                      state={{ initialFile: file }}
                      title="Open in dedicated page with extra settings"
                      className="p-3 rounded-xl bg-surface-800 text-slate-300 hover:text-white hover:bg-surface-700 border border-white/5 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="hidden sm:inline">Advanced</span>
                    </Link>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
