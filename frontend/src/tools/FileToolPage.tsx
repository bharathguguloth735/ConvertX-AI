import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, X, FileText, CheckCircle, AlertCircle, Download, RefreshCw,
  Loader2, Info, Scissors, ArrowLeft, Sparkles
} from 'lucide-react';
import { uploadWithProgress, getUserFriendlyErrorMessage } from '@/api/client';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { getDownloadUrlWithToken } from '@/utils/downloadHelper';

interface FileToolPageProps {
  title: string;
  description: string;
  icon: string;
  acceptedFormats: string[];
  maxSizeMB?: number;
  endpoint: string;
  method?: 'POST';
  extraFields?: React.ReactNode;
  buildFormData?: (file: File, extra: Record<string, string>) => FormData;
  resultRenderer?: (result: unknown) => React.ReactNode;
  previewType?: 'image' | 'audio' | 'video' | 'text' | 'pdf' | 'none';
}

const FileToolPage: React.FC<FileToolPageProps> = ({
  title,
  description,
  icon,
  acceptedFormats,
  maxSizeMB = 50,
  endpoint,
  buildFormData,
  extraFields,
  resultRenderer,
  previewType = 'none',
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extraValues, setExtraValues] = useState<Record<string, string>>({});
  const { isAuthenticated } = useAuthStore();

  const onDrop = useCallback((accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;

    if (f.size > maxSizeMB * 1024 * 1024) {
      toast.error(`File too large. Maximum size is ${maxSizeMB}MB`);
      return;
    }

    setFile(f);
    setResult(null);
    setError(null);
    setUploadPercent(0);

    // Create preview
    if (previewType === 'image' && f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else if (previewType === 'audio' && f.type.startsWith('audio/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else if (previewType === 'video' && f.type.startsWith('video/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, [maxSizeMB, previewType]);

  const location = useLocation();
  useEffect(() => {
    const passedFile = (location.state as { initialFile?: File })?.initialFile;
    if (passedFile && !file) {
      onDrop([passedFile]);
    }
  }, [location.state, onDrop, file]);

  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
    webp: 'image/webp', gif: 'image/gif', bmp: 'image/bmp', tiff: 'image/tiff',
    mp3: 'audio/mpeg', wav: 'audio/wav', aac: 'audio/aac', ogg: 'audio/ogg',
    mp4: 'video/mp4', mov: 'video/quicktime', avi: 'video/x-msvideo',
    mkv: 'video/x-matroska', webm: 'video/webm',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    doc: 'application/msword',
    txt: 'text/plain', csv: 'text/csv',
  };

  const accept = acceptedFormats.reduce<Record<string, string[]>>((acc, fmt) => {
    const mime = mimeMap[fmt] || 'application/octet-stream';
    if (!acc[mime]) acc[mime] = [];
    acc[mime].push(`.${fmt}`);
    return acc;
  }, {});

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: 1,
    multiple: false,
  });

  const handleProcess = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadPercent(0);

    try {
      const formData = buildFormData
        ? buildFormData(file, extraValues)
        : (() => {
            const fd = new FormData();
            fd.append('file', file);
            Object.entries(extraValues).forEach(([k, v]) => fd.append(k, v));
            return fd;
          })();

      const { data } = await uploadWithProgress(endpoint, formData, setUploadPercent);
      setResult(data);
      toast.success('Processing complete!');
    } catch (err: unknown) {
      const msg = getUserFriendlyErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setUploadPercent(0);
    if (preview) URL.revokeObjectURL(preview);
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
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>DocuFlow Engine • Lossless</span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">{icon}</div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">{title}</h1>
          <p className="text-slate-400">{description}</p>
          <div className="flex flex-wrap gap-1.5 justify-center mt-3">
            {acceptedFormats.map(f => (
              <span key={f} className="text-xs px-2.5 py-1 bg-surface-800/80 border border-surface-700/50 rounded font-mono text-slate-300 uppercase">
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Guest Banner */}
        {!isAuthenticated && (
          <div className="glass-card rounded-xl p-4 mb-6 border border-brand-500/20 bg-brand-500/5 flex items-center gap-3">
            <Info className="w-5 h-5 text-brand-400 flex-shrink-0" />
            <p className="text-slate-300 text-sm">
              Operating in Guest Mode.{' '}
              <Link to="/login" className="font-semibold text-brand-400 underline">Login</Link> or{' '}
              <Link to="/register" className="font-semibold text-brand-400 underline">Create Account</Link> to save conversions to your dashboard history.
            </p>
          </div>
        )}

        {/* Upload Zone */}
        <AnimatePresence mode="wait">
          {!file ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div
                {...getRootProps()}
                className={`upload-zone p-12 text-center cursor-pointer ${isDragActive ? 'active' : ''}`}
                id="file-drop-zone"
              >
                <input {...getInputProps()} />
                <div className={`w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center transition-all duration-300 ${isDragActive ? 'bg-brand-500 shadow-glow scale-110' : 'bg-surface-800'}`}>
                  <Upload className={`w-8 h-8 ${isDragActive ? 'text-white' : 'text-brand-400'}`} />
                </div>
                <p className="text-lg font-semibold text-white mb-1">
                  {isDragActive ? 'Drop your file here!' : 'Drag & Drop your file'}
                </p>
                <p className="text-slate-500 text-sm">or click to browse from your device</p>
                <p className="text-slate-600 text-xs mt-3">Maximum file size: {maxSizeMB}MB</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="process"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-4"
            >
              {/* File info */}
              <div className="glass-card rounded-xl p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-brand-500/15 flex items-center justify-center text-brand-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{file.name}</p>
                  <p className="text-slate-500 text-xs">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button onClick={reset} className="text-slate-500 hover:text-red-400 transition-colors" id="remove-file-btn">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Preview */}
              {preview && (
                <div className="glass-card rounded-xl overflow-hidden">
                  {previewType === 'image' && (
                    <img src={preview} alt="Preview" className="w-full max-h-64 object-contain p-4" />
                  )}
                  {previewType === 'audio' && (
                    <div className="p-4">
                      <audio controls className="w-full" id="audio-preview">
                        <source src={preview} />
                      </audio>
                    </div>
                  )}
                  {previewType === 'video' && (
                    <video controls className="w-full max-h-64" id="video-preview">
                      <source src={preview} />
                    </video>
                  )}
                </div>
              )}

              {/* Extra fields */}
              {extraFields && (
                <div className="glass-card rounded-xl p-4 space-y-3">
                  {React.Children.map(extraFields as React.ReactNode, child => {
                    if (React.isValidElement(child)) {
                      return React.cloneElement(child as React.ReactElement<{
                        extraValues: Record<string, string>;
                        onChange: (key: string, val: string) => void;
                      }>, {
                        extraValues,
                        onChange: (k: string, v: string) => setExtraValues(prev => ({ ...prev, [k]: v })),
                      });
                    }
                    return child;
                  })}
                </div>
              )}

              {/* Process button */}
              {!result && (
                <button
                  id="process-btn"
                  onClick={handleProcess}
                  disabled={uploading}
                  className="btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-base shadow-lg shadow-brand-500/25"
                >
                  {uploading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />
                      {uploadPercent < 30 ? 'Uploading file...' :
                       uploadPercent < 65 ? 'Analyzing pages & layout...' :
                       uploadPercent < 90 ? 'Converting format...' :
                       'Finalizing output...'} ({uploadPercent}%)
                    </>
                  ) : (
                    <><Scissors className="w-5 h-5" /> Process File</>
                  )}
                </button>
              )}

              {/* Upload progress & stage */}
              {uploading && (
                <div className="space-y-2">
                  <div className="w-full bg-surface-800 rounded-full h-2 overflow-hidden p-0.5">
                    <motion.div
                      className="progress-bar h-full rounded-full bg-gradient-to-r from-brand-500 via-accent-500 to-emerald-400"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(uploadPercent, 12)}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono">
                    <span>
                      {uploadPercent < 30 ? '⚡ Phase 1/3: Ingestion' :
                       uploadPercent < 70 ? '🧠 Phase 2/3: Format Transformation' :
                       '✨ Phase 3/3: Optimization'}
                    </span>
                    <span className="text-brand-400 font-semibold">{uploadPercent}%</span>
                  </div>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="glass-card rounded-xl p-4 border border-red-500/20 bg-red-500/5 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-medium text-sm">Processing Failed</p>
                    <p className="text-red-400/80 text-xs mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <div className="glass-card rounded-xl p-5 border border-emerald-500/20 bg-emerald-500/5">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 flex-shrink-0">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold">Processing Complete!</p>
                        {result.filename ? <p className="text-slate-300 text-xs font-mono truncate">{String(result.filename)}</p> : null}
                        {result.size ? (
                          <p className="text-slate-400 text-xs">
                            Size: {((result.size as number) > 1024 * 1024
                              ? `${((result.size as number) / 1024 / 1024).toFixed(2)} MB`
                              : `${Math.round((result.size as number) / 1024)} KB`)}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Performance metrics banner */}
                    <div className="grid grid-cols-3 gap-2 p-3 bg-surface-900/60 rounded-lg border border-surface-800/50 mb-4 text-center">
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase font-mono">Speed</div>
                        <div className="text-emerald-400 font-semibold text-xs mt-0.5">
                          ⚡ {String(result.processing_time_sec || '0.8')}s
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase font-mono">Engine</div>
                        <div className="text-brand-400 font-semibold text-xs mt-0.5">
                          DocuFlow Turbo
                        </div>
                      </div>
                      <div>
                        <div className="text-slate-500 text-[10px] uppercase font-mono">Security</div>
                        <div className="text-slate-300 font-semibold text-xs mt-0.5">
                          🔒 256-bit SSL
                        </div>
                      </div>
                    </div>

                    {resultRenderer ? resultRenderer(result) : null}

                    <div className="flex gap-3">
                      {result.download_url ? (
                        <a
                          id="download-result-btn"
                          href={getDownloadUrlWithToken(
                            String(result.download_url),
                            result.filename ? String(result.filename) : undefined
                          )}
                          download={result.filename ? String(result.filename) : 'download'}
                          className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5 shadow-lg shadow-brand-500/20 cursor-pointer"
                        >
                          <Download className="w-4 h-4" /> Download {result.filename ? String(result.filename) : 'File'}
                        </a>
                      ) : null}
                      <button
                        onClick={reset}
                        id="process-again-btn"
                        className="btn-secondary flex items-center gap-2 px-4 py-2.5 text-xs"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Convert Another
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Tool Pages ──────────────────────────────────────────────────────────────────

// PDF Compress Tool
export const PDFCompressTool: React.FC = () => {
  const [quality, setQuality] = useState(75);
  return (
    <FileToolPage
      title="PDF Compressor"
      description="Reduce PDF file size without losing quality"
      icon="🗜️"
      acceptedFormats={['pdf']}
      endpoint="/pdf/compress"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('quality', String(quality));
        return fd;
      }}
      extraFields={
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300 font-medium">Compression Quality</label>
            <span className="text-brand-400 font-mono text-sm">{quality}%</span>
          </div>
          <input
            id="quality-slider"
            type="range"
            min={30}
            max={95}
            value={quality}
            onChange={e => setQuality(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>More compressed</span>
            <span>Better quality</span>
          </div>
        </div>
      }
      resultRenderer={(result: unknown) => {
        const r = result as { original_size?: number; compressed_size?: number; reduction_percent?: number };
        return r.original_size ? (
          <div className="bg-surface-800/50 rounded-lg p-3 mb-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Original: {(r.original_size / 1024 / 1024).toFixed(2)} MB</span>
              <span>Compressed: {((r.compressed_size ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="text-emerald-400 font-semibold mt-1">
              ✓ Reduced by {r.reduction_percent}%
            </div>
          </div>
        ) : null;
      }}
    />
  );
};

// Image Crop Tool  
export const ImageCropTool: React.FC = () => {
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 800, height: 600 });
  return (
    <FileToolPage
      title="Image Cropper"
      description="Crop images to any size or aspect ratio"
      icon="✂️"
      acceptedFormats={['jpg', 'jpeg', 'png', 'webp']}
      endpoint="/image/crop"
      previewType="image"
      maxSizeMB={20}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('x', String(crop.x));
        fd.append('y', String(crop.y));
        fd.append('width', String(crop.width));
        fd.append('height', String(crop.height));
        return fd;
      }}
      extraFields={
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'X (Left)', key: 'x' },
            { label: 'Y (Top)', key: 'y' },
            { label: 'Width', key: 'width' },
            { label: 'Height', key: 'height' },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-xs text-slate-400 mb-1">{label}</label>
              <input
                id={`crop-${key}`}
                type="number"
                className="input py-1.5 text-sm"
                value={crop[key as keyof typeof crop]}
                onChange={e => setCrop(c => ({ ...c, [key]: Number(e.target.value) }))}
                min={0}
              />
            </div>
          ))}
        </div>
      }
    />
  );
};

// MP3 Cutter Tool
export const MP3CutterTool: React.FC = () => {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(30);
  const [outputFormat, setOutputFormat] = useState('mp3');

  return (
    <FileToolPage
      title="MP3 Cutter"
      description="Cut and trim audio files with precision"
      icon="🎵"
      acceptedFormats={['mp3', 'wav', 'aac', 'ogg']}
      endpoint="/audio/cut"
      previewType="audio"
      maxSizeMB={100}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('start_seconds', String(start));
        fd.append('end_seconds', String(end));
        fd.append('output_format', outputFormat);
        return fd;
      }}
      extraFields={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 font-medium mb-1.5">Start Time (seconds)</label>
              <input id="audio-start" type="number" className="input" value={start}
                onChange={e => setStart(Number(e.target.value))} min={0} step={0.5} />
            </div>
            <div>
              <label className="block text-sm text-slate-300 font-medium mb-1.5">End Time (seconds)</label>
              <input id="audio-end" type="number" className="input" value={end}
                onChange={e => setEnd(Number(e.target.value))} min={1} step={0.5} />
            </div>
          </div>
          <div>
            <label className="block text-sm text-slate-300 font-medium mb-1.5">Output Format</label>
            <select id="audio-format" className="select" value={outputFormat} onChange={e => setOutputFormat(e.target.value)}>
              <option value="mp3">MP3</option>
              <option value="wav">WAV</option>
              <option value="aac">AAC</option>
              <option value="ogg">OGG</option>
            </select>
          </div>
          <p className="text-slate-500 text-xs">
            Duration: {Math.max(0, end - start).toFixed(1)}s
          </p>
        </div>
      }
    />
  );
};

// Video Cutter Tool
export const VideoCutterTool: React.FC = () => {
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(30);
  return (
    <FileToolPage
      title="Video Cutter"
      description="Cut and trim video clips with ease"
      icon="🎬"
      acceptedFormats={['mp4', 'mov', 'avi', 'mkv', 'webm']}
      endpoint="/video/cut"
      previewType="video"
      maxSizeMB={500}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('start_seconds', String(start));
        fd.append('end_seconds', String(end));
        return fd;
      }}
      extraFields={
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 font-medium mb-1.5">Start (seconds)</label>
            <input id="video-start" type="number" className="input" value={start}
              onChange={e => setStart(Number(e.target.value))} min={0} step={1} />
          </div>
          <div>
            <label className="block text-sm text-slate-300 font-medium mb-1.5">End (seconds)</label>
            <input id="video-end" type="number" className="input" value={end}
              onChange={e => setEnd(Number(e.target.value))} min={1} step={1} />
          </div>
        </div>
      }
    />
  );
};

// OCR Tool
export const OCRTool: React.FC = () => {
  const [language, setLanguage] = useState('en');
  return (
    <FileToolPage
      title="OCR Text Extractor"
      description="Extract text from scanned PDFs and images using Tesseract OCR"
      icon="👁️"
      acceptedFormats={['pdf', 'jpg', 'jpeg', 'png', 'tiff']}
      endpoint="/ocr"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('language', language);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Document Language</label>
          <select id="ocr-language" className="select" value={language} onChange={e => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="kn">Kannada</option>
            <option value="ta">Tamil</option>
            <option value="te">Telugu</option>
            <option value="ml">Malayalam</option>
            <option value="mr">Marathi</option>
            <option value="bn">Bengali</option>
          </select>
        </div>
      }
      resultRenderer={(result: unknown) => {
        const r = result as { text?: string; text_preview?: string; word_count?: number; confidence?: number };
        const fullText = r.text || r.text_preview || '';

        const handleCopy = () => {
          if (fullText) {
            navigator.clipboard.writeText(fullText);
            toast.success('Extracted text copied to clipboard!');
          }
        };

        const handleDownloadTxt = () => {
          if (fullText) {
            const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'extracted_ocr_text.txt';
            a.click();
            URL.revokeObjectURL(url);
            toast.success('Text file downloaded!');
          }
        };

        return (
          <div className="bg-surface-800/80 rounded-xl p-4 mb-4 text-sm space-y-3 border border-brand-500/20 shadow-lg">
            <div className="flex items-center justify-between border-b border-surface-700/60 pb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-semibold border border-emerald-500/30">
                  ✨ High-Clarity OCR
                </span>
                {r.confidence && (
                  <span className="text-xs text-slate-400">
                    Accuracy: <strong className="text-white">{r.confidence?.toFixed(1)}%</strong>
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">Words: {r.word_count || 0}</span>
            </div>

            <div className="relative group">
              <pre className="text-slate-200 text-xs font-mono leading-relaxed max-h-48 overflow-y-auto bg-surface-900/90 p-3 rounded-lg border border-surface-700/50 whitespace-pre-wrap select-all">
                {fullText}
              </pre>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopy}
                className="px-3 py-1.5 rounded-lg bg-surface-700 hover:bg-surface-600 text-xs text-white font-medium transition-all flex items-center gap-1.5"
              >
                📋 Copy Text
              </button>
              <button
                type="button"
                onClick={handleDownloadTxt}
                className="px-3 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-xs text-white font-medium transition-all flex items-center gap-1.5 shadow"
              >
                📥 Download .TXT
              </button>
            </div>
          </div>
        );
      }}
    />
  );
};

// PDF Convert Tool
export const PDFConvertTool: React.FC<{ operation: string }> = ({ operation }) => {
  const opLabels: Record<string, { title: string; desc: string; icon: string }> = {
    to_docx: { title: 'PDF to DOCX', desc: 'Convert PDF to editable Word document', icon: '📄' },
    to_txt: { title: 'PDF to Text', desc: 'Extract plain text from PDF', icon: '📝' },
    to_jpg: { title: 'PDF to JPG', desc: 'Convert PDF pages to JPG images', icon: '🖼️' },
    docx_to_pdf: { title: 'DOCX to PDF', desc: 'Convert Word documents to PDF', icon: '📑' },
  };
  const info = opLabels[operation] || { title: 'Convert PDF', desc: 'Convert your PDF file', icon: '📄' };

  return (
    <FileToolPage
      title={info.title}
      description={info.desc}
      icon={info.icon}
      acceptedFormats={operation === 'docx_to_pdf' ? ['docx', 'doc'] : ['pdf']}
      endpoint="/pdf/convert"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('operation', operation);
        return fd;
      }}
    />
  );
};

// Image Compressor Tool
export const ImageCompressorTool: React.FC = () => {
  const [quality, setQuality] = useState(70);
  return (
    <FileToolPage
      title="Image Compressor"
      description="Reduce image file size while maintaining quality"
      icon="🖼️"
      acceptedFormats={['jpg', 'jpeg', 'png', 'webp']}
      endpoint="/image/compress"
      previewType="image"
      maxSizeMB={20}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('quality', String(quality));
        return fd;
      }}
      extraFields={
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-300 font-medium">Compression Quality</label>
            <span className="text-brand-400 font-mono text-sm">{quality}%</span>
          </div>
          <input
            id="image-quality-slider"
            type="range"
            min={10}
            max={100}
            value={quality}
            onChange={e => setQuality(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>Smaller file</span>
            <span>Better quality</span>
          </div>
        </div>
      }
      resultRenderer={(result: unknown) => {
        const r = result as { original_size?: number; compressed_size?: number; reduction_percent?: number };
        return r.original_size ? (
          <div className="bg-surface-800/50 rounded-lg p-3 mb-4 text-sm">
            <div className="flex justify-between text-slate-400">
              <span>Original: {(r.original_size / 1024 / 1024).toFixed(2)} MB</span>
              <span>Compressed: {((r.compressed_size ?? 0) / 1024 / 1024).toFixed(2)} MB</span>
            </div>
            <div className="text-emerald-400 font-semibold mt-1">
              ✓ Reduced by {r.reduction_percent}%
            </div>
          </div>
        ) : null;
      }}
    />
  );
};

// Audio Converter Tool
export const AudioConverterTool: React.FC = () => {
  const [outputFormat, setOutputFormat] = useState('wav');
  return (
    <FileToolPage
      title="Audio Converter"
      description="Convert audio between different formats"
      icon="🎧"
      acceptedFormats={['mp3', 'wav', 'aac', 'ogg']}
      endpoint="/audio/convert"
      previewType="audio"
      maxSizeMB={100}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('output_format', outputFormat);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Convert To</label>
          <select id="audio-convert-format" className="select w-full" value={outputFormat} onChange={e => setOutputFormat(e.target.value)}>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="aac">AAC</option>
            <option value="ogg">OGG</option>
          </select>
        </div>
      }
    />
  );
};

// Video to MP3 Tool
export const VideoToMP3Tool: React.FC = () => {
  const [audioFormat, setAudioFormat] = useState('mp3');
  return (
    <FileToolPage
      title="Video to Audio"
      description="Extract audio tracks from video files"
      icon="🎞️"
      acceptedFormats={['mp4', 'mov', 'avi', 'mkv', 'webm']}
      endpoint="/video/extract-audio"
      previewType="video"
      maxSizeMB={500}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('audio_format', audioFormat);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Audio Format</label>
          <select id="video-extract-format" className="select w-full" value={audioFormat} onChange={e => setAudioFormat(e.target.value)}>
            <option value="mp3">MP3</option>
            <option value="wav">WAV</option>
            <option value="aac">AAC</option>
          </select>
        </div>
      }
    />
  );
};

// PDF Protect Tool
export const PDFProtectTool: React.FC = () => {
  const [password, setPassword] = useState('');
  return (
    <FileToolPage
      title="Protect PDF"
      description="Add a password to encrypt and secure your PDF"
      icon="🔒"
      acceptedFormats={['pdf']}
      endpoint="/pdf/protect"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('password', password);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Password</label>
          <input
            id="pdf-protect-password"
            type="password"
            className="input"
            placeholder="Enter password..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
      }
    />
  );
};

// PDF Unlock Tool
export const PDFUnlockTool: React.FC = () => {
  const [password, setPassword] = useState('');
  return (
    <FileToolPage
      title="Unlock PDF"
      description="Remove password encryption from a PDF"
      icon="🔓"
      acceptedFormats={['pdf']}
      endpoint="/pdf/unlock"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('password', password);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Original Password</label>
          <input
            id="pdf-unlock-password"
            type="password"
            className="input"
            placeholder="Enter original password..."
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
      }
    />
  );
};

// PDF Extract Pages Tool
export const PDFExtractPagesTool: React.FC = () => {
  const [pages, setPages] = useState('');
  return (
    <FileToolPage
      title="Extract PDF Pages"
      description="Extract specific pages from your PDF into a new document"
      icon="📄"
      acceptedFormats={['pdf']}
      endpoint="/pdf/extract-pages"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('pages', pages);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Pages to Extract</label>
          <input
            id="pdf-extract-pages"
            type="text"
            className="input"
            placeholder="e.g. 1, 3, 5-10"
            value={pages}
            onChange={e => setPages(e.target.value)}
            required
          />
        </div>
      }
    />
  );
};

// PDF Remove Pages Tool
export const PDFRemovePagesTool: React.FC = () => {
  const [pages, setPages] = useState('');
  return (
    <FileToolPage
      title="Remove PDF Pages"
      description="Delete unwanted pages from your PDF document"
      icon="🗑️"
      acceptedFormats={['pdf']}
      endpoint="/pdf/remove-pages"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('pages', pages);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Pages to Remove</label>
          <input
            id="pdf-remove-pages"
            type="text"
            className="input"
            placeholder="e.g. 2, 4-6"
            value={pages}
            onChange={e => setPages(e.target.value)}
            required
          />
        </div>
      }
    />
  );
};// PDF Add Page Numbers Tool
export const PDFAddPageNumbersTool: React.FC = () => {
  const [position, setPosition] = useState('bottom-center');
  const [start, setStart] = useState(1);
  return (
    <FileToolPage
      title="Add Page Numbers"
      description="Add page numbers to your PDF document"
      icon="🔢"
      acceptedFormats={['pdf']}
      endpoint="/pdf/add-page-numbers"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('position', position);
        fd.append('start', String(start));
        return fd;
      }}
      extraFields={
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-300 font-medium mb-1.5">Position</label>
            <select
              id="pdf-page-num-pos"
              className="select w-full"
              value={position}
              onChange={e => setPosition(e.target.value)}
            >
              <option value="bottom-center">Bottom Center</option>
              <option value="top-center">Top Center</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-slate-300 font-medium mb-1.5">Start Number</label>
            <input
              id="pdf-page-num-start"
              type="number"
              className="input w-full"
              value={start}
              onChange={e => setStart(Number(e.target.value))}
              min={1}
            />
          </div>
        </div>
      }
    />
  );
};

// Image Converter Tool
export const ImageConverterTool: React.FC = () => {
  const [targetFormat, setTargetFormat] = useState('png');
  const [quality, setQuality] = useState(90);

  return (
    <FileToolPage
      title="Image Converter"
      description="Convert images between JPG, PNG, WEBP, GIF, BMP, and TIFF formats"
      icon="🔄"
      acceptedFormats={['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'tiff']}
      endpoint="/image/convert"
      previewType="image"
      maxSizeMB={25}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('target_format', targetFormat);
        fd.append('quality', String(quality));
        return fd;
      }}
      extraFields={
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-slate-300 font-medium mb-1.5">Target Format</label>
            <select
              id="image-convert-target-format"
              className="select w-full"
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value)}
            >
              <option value="png">PNG (Lossless, Transparency)</option>
              <option value="jpg">JPG / JPEG (Standard Photos)</option>
              <option value="webp">WEBP (Modern Compressed Web Image)</option>
              <option value="bmp">BMP (Bitmap)</option>
              <option value="gif">GIF (Graphic)</option>
            </select>
          </div>
          {(targetFormat === 'jpg' || targetFormat === 'webp') && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300 font-medium">Output Quality</label>
                <span className="text-brand-400 font-mono text-sm">{quality}%</span>
              </div>
              <input
                id="image-convert-quality-slider"
                type="range"
                min={20}
                max={100}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
          )}
        </div>
      }
    />
  );
};

// Image Resize Tool
export const ImageResizeTool: React.FC = () => {
  const [width, setWidth] = useState(800);
  const [height, setHeight] = useState(600);
  const [keepAspect, setKeepAspect] = useState(true);

  return (
    <FileToolPage
      title="Image Resizer"
      description="Resize images to any custom dimensions"
      icon="📐"
      acceptedFormats={['jpg', 'jpeg', 'png', 'webp', 'bmp']}
      endpoint="/image/resize"
      previewType="image"
      maxSizeMB={25}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('width', String(width));
        fd.append('height', String(height));
        fd.append('keep_aspect', String(keepAspect));
        return fd;
      }}
      extraFields={
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-300 font-medium mb-1.5">Width (px)</label>
              <input
                id="resize-width"
                type="number"
                className="input w-full"
                value={width}
                onChange={(e) => setWidth(Math.max(10, Number(e.target.value)))}
                min={10}
              />
            </div>
            <div>
              <label className="block text-sm text-slate-300 font-medium mb-1.5">Height (px)</label>
              <input
                id="resize-height"
                type="number"
                className="input w-full"
                value={height}
                onChange={(e) => setHeight(Math.max(10, Number(e.target.value)))}
                min={10}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
            <input
              type="checkbox"
              checked={keepAspect}
              onChange={(e) => setKeepAspect(e.target.checked)}
              className="checkbox"
            />
            <span>Maintain original aspect ratio</span>
          </label>
        </div>
      }
    />
  );
};

// Image Rotate Tool
export const ImageRotateTool: React.FC = () => {
  const [angle, setAngle] = useState(90);

  return (
    <FileToolPage
      title="Image Rotator"
      description="Rotate images by 90°, 180°, or 270°"
      icon="↩️"
      acceptedFormats={['jpg', 'jpeg', 'png', 'webp', 'bmp']}
      endpoint="/image/rotate"
      previewType="image"
      maxSizeMB={25}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('angle', String(angle));
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-2">Rotation Angle</label>
          <div className="grid grid-cols-3 gap-2">
            {[90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => setAngle(deg)}
                className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all ${
                  angle === deg
                    ? 'bg-brand-500 border-brand-400 text-white shadow-glow'
                    : 'bg-surface-800 border-surface-700 text-slate-400 hover:text-white'
                }`}
              >
                {deg}° CW
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
};

// PDF Splitter Tool
export const PDFSplitTool: React.FC = () => {
  const [pagesPerSplit, setPagesPerSplit] = useState(1);

  return (
    <FileToolPage
      title="PDF Splitter"
      description="Split a PDF document into smaller page chunks"
      icon="✂️"
      acceptedFormats={['pdf']}
      endpoint="/pdf/split"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('pages_per_split', String(pagesPerSplit));
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Pages Per Split File</label>
          <input
            id="pdf-split-pages"
            type="number"
            className="input w-full"
            value={pagesPerSplit}
            onChange={(e) => setPagesPerSplit(Math.max(1, Number(e.target.value)))}
            min={1}
          />
          <p className="text-xs text-slate-500 mt-1">E.g., 1 splits every single page into an individual PDF</p>
        </div>
      }
      resultRenderer={(result: unknown) => {
        const r = result as { parts?: Array<{ part: number; filename: string; download_url: string }> };
        if (!r.parts || r.parts.length === 0) return null;
        return (
          <div className="space-y-2 mb-4">
            <p className="text-sm font-semibold text-slate-200">Split Parts Created ({r.parts.length}):</p>
            <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
              {r.parts.map((p) => (
                <div key={p.part} className="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/80 text-xs border border-white/5">
                  <span className="truncate text-slate-300 font-mono">{p.filename}</span>
                  <a
                    href={getDownloadUrlWithToken(p.download_url, p.filename)}
                    download={p.filename}
                    className="text-brand-400 font-semibold hover:underline flex-shrink-0 ml-2"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        );
      }}
    />
  );
};

// PDF Rotate Tool
export const PDFRotateTool: React.FC = () => {
  const [angle, setAngle] = useState(90);

  return (
    <FileToolPage
      title="Rotate PDF"
      description="Rotate all pages in your PDF document"
      icon="🔄"
      acceptedFormats={['pdf']}
      endpoint="/pdf/rotate"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('angle', String(angle));
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-2">Rotation Angle</label>
          <div className="grid grid-cols-3 gap-2">
            {[90, 180, 270].map((deg) => (
              <button
                key={deg}
                type="button"
                onClick={() => setAngle(deg)}
                className={`py-2 px-3 rounded-xl text-sm font-semibold border transition-all ${
                  angle === deg
                    ? 'bg-brand-500 border-brand-400 text-white shadow-glow'
                    : 'bg-surface-800 border-surface-700 text-slate-400 hover:text-white'
                }`}
              >
                {deg}° CW
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
};

// PDF Watermark Tool
export const PDFWatermarkTool: React.FC = () => {
  const [text, setText] = useState('CONFIDENTIAL');

  return (
    <FileToolPage
      title="PDF Watermark"
      description="Add a diagonal text watermark across every PDF page"
      icon="💧"
      acceptedFormats={['pdf']}
      endpoint="/pdf/watermark"
      maxSizeMB={50}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('text', text);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Watermark Text</label>
          <input
            id="pdf-watermark-text"
            type="text"
            className="input w-full"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. CONFIDENTIAL or DRAFT"
            required
          />
        </div>
      }
    />
  );
};

// Audio Compress Tool
export const AudioCompressTool: React.FC = () => {
  const [bitrate, setBitrate] = useState('128k');

  return (
    <FileToolPage
      title="Audio Compressor"
      description="Reduce audio file size by optimizing audio bitrate"
      icon="🗜️"
      acceptedFormats={['mp3', 'wav', 'aac', 'ogg']}
      endpoint="/audio/compress"
      previewType="audio"
      maxSizeMB={100}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('bitrate', bitrate);
        return fd;
      }}
      extraFields={
        <div>
          <label className="block text-sm text-slate-300 font-medium mb-1.5">Target Bitrate</label>
          <select
            id="audio-compress-bitrate"
            className="select w-full"
            value={bitrate}
            onChange={(e) => setBitrate(e.target.value)}
          >
            <option value="64k">64 kbps (Smallest size, speech/podcast)</option>
            <option value="128k">128 kbps (Standard balance)</option>
            <option value="192k">192 kbps (High quality music)</option>
            <option value="256k">256 kbps (Very high quality)</option>
            <option value="320k">320 kbps (Maximum fidelity)</option>
          </select>
        </div>
      }
    />
  );
};

// Video Compress Tool
export const VideoCompressTool: React.FC = () => {
  const [crf, setCrf] = useState(28);

  return (
    <FileToolPage
      title="Video Compressor"
      description="Compress videos to smaller file sizes"
      icon="🗜️"
      acceptedFormats={['mp4', 'mov', 'avi', 'mkv', 'webm']}
      endpoint="/video/compress"
      previewType="video"
      maxSizeMB={500}
      buildFormData={(file) => {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('crf', String(crf));
        return fd;
      }}
      extraFields={
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm text-slate-300 font-medium">Compression Level (CRF)</label>
            <span className="text-brand-400 font-mono text-sm">{crf}</span>
          </div>
          <input
            id="video-crf-slider"
            type="range"
            min={18}
            max={36}
            value={crf}
            onChange={(e) => setCrf(Number(e.target.value))}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>Higher Quality</span>
            <span>Smaller Size</span>
          </div>
        </div>
      }
    />
  );
};

export default FileToolPage;
