// DocuFlow AI — AI Tools Pages (Summarizer, Ask Document, Invoice AI)
import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  Send,
  Bot,
  Loader2,
  Download,
  Sparkles,
  Brain,
  AlertCircle,
  ArrowLeft,
  Copy,
  Check,
  FileSpreadsheet,
  Receipt,
  MessageSquare,
  Briefcase,
  GraduationCap,
  Award,
  Globe,
  Volume2,
  Languages,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import apiClient, { uploadWithProgress } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';

// ─── AI Summarizer ────────────────────────────────────────────────────────────

export const AISummarizerPage: React.FC = () => {
  const [text, setText] = useState('');
  const [style, setStyle] = useState('detailed');
  const [result, setResult] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const summarizeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await apiClient.post('/ai/summarize', {
        text: text.slice(0, 12000),
        style,
      });
      return data;
    },
    onSuccess: (data) => {
      setResult(data.summary);
      toast.success('Summary generated!');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.detail || 'Summarization failed. Please try again.';
      toast.error(msg);
    },
  });

  const onDrop = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('style', style);
      const { data } = await uploadWithProgress('/ai/summarize-file', fd, () => {});
      setResult(data.summary);
      toast.success('Document summarized!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to process file';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  });

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Summary copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 relative">
      <div className="max-w-3xl mx-auto">
        {/* Navigation & Header Status */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Neural Summarizer</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Bot className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            AI Document <span className="gradient-text">Summarizer</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Extract high-value insights, key bullet points, and condensed summaries in seconds.
          </p>
        </div>

        {!isAuthenticated && (
          <div className="glass-card rounded-2xl p-4 mb-6 border border-amber-500/20 bg-amber-500/5 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <p className="text-amber-300 text-sm">
              <Link to="/login" className="font-semibold underline hover:text-amber-200">Login</Link> to unlock higher character limits and save summaries to your dashboard.
            </p>
          </div>
        )}

        {/* Style Selector Pills */}
        <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
          {[
            { id: 'short', label: '⚡ Short' },
            { id: 'detailed', label: '📖 Detailed' },
            { id: 'bullets', label: '• Bullets' },
            { id: 'key_points', label: '🎯 Key Points' },
          ].map((s) => (
            <button
              key={s.id}
              id={`summary-style-${s.id}`}
              onClick={() => setStyle(s.id)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                style === s.id
                  ? 'bg-blue-600 text-white shadow-glow border border-blue-400/40 scale-105'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-white/5 hover:border-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Input Card Container */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl backdrop-blur-xl space-y-6">
          {/* File upload zone */}
          <div
            {...getRootProps()}
            className={`upload-zone p-6 text-center cursor-pointer transition-all ${
              isDragActive ? 'active border-blue-500 bg-blue-500/10' : ''
            }`}
            id="summarize-dropzone"
          >
            <input {...getInputProps()} />
            <div className="flex flex-col items-center gap-2 text-slate-400">
              {uploading ? (
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              ) : (
                <Upload className="w-6 h-6 text-blue-400" />
              )}
              <span className="text-sm font-medium text-slate-200">
                {isDragActive ? 'Drop file here' : 'Drop a PDF or TXT file to summarize directly'}
              </span>
              <span className="text-xs text-slate-500">Supports PDF, TXT (up to 25MB)</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
            <div className="h-px flex-1 bg-white/10" />
            <span>OR PASTE TEXT</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {/* Text input area */}
          <div className="bg-slate-950/60 rounded-xl p-4 border border-white/5 focus-within:border-blue-500/40 transition-colors">
            <textarea
              id="summarize-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your text, articles, or transcripts here to summarize... (max 12,000 chars)"
              className="w-full bg-transparent text-slate-200 text-sm resize-none outline-none placeholder:text-slate-500 h-40 leading-relaxed"
              maxLength={12000}
            />
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
              <span className="text-slate-500 text-xs font-mono">
                {text.length.toLocaleString()} / 12,000 characters
              </span>
              <button
                id="summarize-btn"
                onClick={() => summarizeMutation.mutate()}
                disabled={!text.trim() || summarizeMutation.isPending}
                className="btn-primary flex items-center gap-2 text-sm py-2 px-5 shadow-glow"
              >
                {summarizeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Summarize Text</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Result Card */}
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 glass-card rounded-2xl p-6 border border-emerald-500/30 bg-emerald-500/5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-emerald-300 text-sm">AI Executive Summary</span>
                  <p className="text-[11px] text-slate-400">Key insights extracted</p>
                </div>
              </div>
              <button
                onClick={handleCopy}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                id="copy-summary-btn"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap bg-slate-950/40 p-4 rounded-xl border border-white/5">
              {result}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Ask Your Document ─────────────────────────────────────────────────────────

export const AskDocumentPage: React.FC = () => {
  const [indexed, setIndexed] = useState(false);
  const [indexing, setIndexing] = useState(false);
  const [docId, setDocId] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([]);
  const [asking, setAsking] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const { isAuthenticated } = useAuthStore();

  const onDrop = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setIndexing(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await uploadWithProgress('/ai/index-document', fd, () => {});
      setDocId(data.document_id);
      setIndexed(true);
      setMessages([{ role: 'assistant', text: `Document "${f.name}" analyzed successfully! Ask me anything about it.` }]);
      toast.success('Document indexed!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to index document';
      toast.error(msg);
    } finally {
      setIndexing(false);
    }
  };

  const askQuestion = async () => {
    if (!question.trim() || !docId || asking) return;
    const q = question;
    setQuestion('');
    setMessages((prev) => [...prev, { role: 'user', text: q }]);
    setAsking(true);
    try {
      const { data } = await apiClient.post('/ai/ask-document', { document_id: docId, question: q });
      setMessages((prev) => [...prev, { role: 'assistant', text: data.answer }]);
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to get answer';
      toast.error(msg);
    } finally {
      setAsking(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  });

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 relative">
      <div className="max-w-3xl mx-auto">
        {/* Navigation & Header Status */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <MessageSquare className="w-3.5 h-3.5 text-blue-400" />
            <span>Document Q&A</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Brain className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            Ask Your <span className="gradient-text">Document</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Upload any PDF or document and have an interactive, intelligent Q&A chat.
          </p>
        </div>

        {!isAuthenticated ? (
          <div className="glass-card rounded-2xl p-8 text-center border border-white/10 shadow-2xl">
            <Brain className="w-12 h-12 mx-auto mb-4 text-blue-400 opacity-60" />
            <p className="text-slate-200 font-semibold mb-2">Login Required</p>
            <p className="text-slate-400 text-sm mb-6 max-w-sm mx-auto">
              Please login or register to upload and query documents using AI.
            </p>
            <Link to="/login" className="btn-primary inline-flex">
              Login to Continue
            </Link>
          </div>
        ) : !indexed ? (
          <div
            {...getRootProps()}
            className={`upload-zone p-16 text-center cursor-pointer glass-card border border-white/10 rounded-2xl ${
              isDragActive ? 'active' : ''
            }`}
            id="ask-doc-dropzone"
          >
            <input {...getInputProps()} />
            {indexing ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                <p className="text-white font-medium">Processing your document with AI...</p>
                <p className="text-slate-500 text-sm">Building neural semantic index</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-2">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-white font-bold text-lg">
                  {isDragActive ? 'Drop here!' : 'Upload your document'}
                </p>
                <p className="text-slate-400 text-sm">PDF or TXT files (max 50MB)</p>
              </div>
            )}
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden flex flex-col h-[600px] border border-white/10 shadow-2xl backdrop-blur-xl">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white shadow-glow'
                        : 'bg-slate-900/90 text-slate-200 border border-white/10'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}
              {asking && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-sm text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                    <span>Analyzing document...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input Bar */}
            <div className="p-4 border-t border-white/10 bg-slate-950/60 flex gap-3">
              <input
                id="doc-question-input"
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && askQuestion()}
                placeholder="Ask a question about this document..."
                className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
              />
              <button
                id="doc-question-btn"
                onClick={askQuestion}
                disabled={!question.trim() || asking}
                className="btn-primary px-4 py-2.5 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Invoice AI ───────────────────────────────────────────────────────────────

export const InvoiceAIPage: React.FC = () => {
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const onDrop = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await uploadWithProgress('/ai/extract-invoice', fd, () => {});
      setResult(data);
      toast.success('Invoice data extracted!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to analyze invoice';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const saveToDashboard = async () => {
    if (!result || saving) return;
    setSaving(true);
    try {
      await apiClient.post('/invoices/save', result);
      toast.success('Saved to your Invoices dashboard!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to save invoice';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice_extracted_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxFiles: 1,
  });

  const extracted = (result as { extracted?: Record<string, unknown> })?.extracted;
  const validation = (result as {
    validation?: { flags: { type: string; message: string }[]; flag_count: number };
  })?.validation;
  const invoiceId = (result as { invoice_id?: string })?.invoice_id;

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 relative">
      <div className="max-w-4xl mx-auto">
        {/* Navigation & Header Status */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Receipt className="w-3.5 h-3.5 text-blue-400" />
            <span>AI Invoice Extractor</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Receipt className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            AI <span className="gradient-text">Invoice Extractor</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Extract vendors, line items, totals, and tax breakdowns into structured JSON or Excel.
          </p>
        </div>

        {!result ? (
          <div
            {...getRootProps()}
            className={`upload-zone p-16 text-center cursor-pointer glass-card border border-white/10 rounded-2xl ${
              isDragActive ? 'active' : ''
            }`}
            id="invoice-dropzone"
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
                <p className="text-white font-medium">Analyzing invoice with AI...</p>
                <p className="text-slate-500 text-sm">Extracting line items and financial metrics</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-2">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-white font-bold text-lg">
                  {isDragActive ? 'Drop invoice here!' : 'Upload Invoice (PDF or Image)'}
                </p>
                <p className="text-slate-400 text-sm">Supports PDF, JPG, PNG (up to 25MB)</p>
              </div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Validation flags */}
            {validation && validation.flag_count > 0 && (
              <div className="glass-card rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  <span className="font-semibold text-amber-300 text-sm">
                    {validation.flag_count} Discrepancies Flagged
                  </span>
                </div>
                <div className="space-y-1">
                  {validation.flags.map((f, i) => (
                    <p key={i} className="text-xs text-amber-400/80">
                      • {f.message}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Extracted fields */}
            {extracted && (
              <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div>
                    <h2 className="text-lg font-bold text-white">Extracted Invoice Details</h2>
                    {invoiceId && (
                      <p className="text-xs text-slate-400 font-mono">Invoice #{invoiceId}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={downloadJson}
                      className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" /> JSON
                    </button>
                    {isAuthenticated && (
                      <button
                        onClick={saveToDashboard}
                        disabled={saving}
                        className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow-glow"
                      >
                        {saving ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        )}
                        Save
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  {Object.entries(extracted)
                    .filter(([, v]) => typeof v !== 'object')
                    .map(([k, v]) => (
                      <div key={k} className="bg-slate-900/60 p-3 rounded-xl border border-white/5">
                        <span className="text-[11px] text-slate-400 uppercase tracking-wider block font-medium">
                          {k.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-semibold text-white mt-1 block truncate">
                          {String(v)}
                        </span>
                      </div>
                    ))}
                </div>

                {/* Reset button */}
                <button
                  onClick={() => setResult(null)}
                  className="btn-ghost text-xs text-slate-400 hover:text-white"
                >
                  ← Analyze another invoice
                </button>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── AI Resume Analyzer ───────────────────────────────────────────────────────

export const ResumeAIPage: React.FC = () => {
  const [result, setResult] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const onDrop = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      const { data } = await uploadWithProgress('/ai/analyze-resume', fd, () => {});
      setResult(data);
      toast.success('Resume analyzed successfully!');
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Failed to analyze resume';
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    maxFiles: 1,
  });

  const extracted = result?.extracted || {};
  const skills: string[] = Array.isArray(extracted.skills) ? extracted.skills : [];
  const experience: any[] = Array.isArray(extracted.experience) ? extracted.experience : [];
  const education: any[] = Array.isArray(extracted.education) ? extracted.education : [];
  const strengths: string[] = Array.isArray(extracted.strengths) ? extracted.strengths : [];

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(extracted, null, 2));
    setCopied(true);
    toast.success('Resume data copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadJson = () => {
    if (!result) return;
    const blob = new Blob([JSON.stringify(extracted, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resume_analysis_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 relative">
      <div className="max-w-4xl mx-auto">
        {/* Navigation & Header Status */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-accent-500/10 text-accent-400 border border-accent-500/20">
            <Sparkles className="w-3.5 h-3.5 text-accent-400" />
            <span>AI Resume Intelligence</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            AI <span className="gradient-text">Resume Analyzer</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Extract candidate profiles, technical competencies, work history, and education automatically.
          </p>
        </div>

        {!result ? (
          <div
            {...getRootProps()}
            className={`upload-zone p-16 text-center cursor-pointer glass-card border border-white/10 rounded-2xl ${
              isDragActive ? 'active' : ''
            }`}
            id="resume-dropzone"
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
                <p className="text-white font-medium">Parsing resume with DocuFlow AI...</p>
                <p className="text-slate-500 text-sm">Extracting skills, timeline, and candidate insights</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-2">
                  <Upload className="w-8 h-8" />
                </div>
                <p className="text-white font-bold text-lg">
                  {isDragActive ? 'Drop resume here!' : 'Upload Resume (PDF, DOCX, TXT)'}
                </p>
                <p className="text-slate-400 text-sm">Supports PDF, Word (.docx), and Plain Text</p>
              </div>
            )}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Top Candidate Card */}
            <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl backdrop-blur-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-glow">
                    <User className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white">
                      {extracted.candidate_name || 'Candidate Profile'}
                    </h2>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400 mt-1">
                      {extracted.email && (
                        <span className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-indigo-400" /> {extracted.email}
                        </span>
                      )}
                      {extracted.phone && (
                        <span className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-indigo-400" /> {extracted.phone}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                  <button
                    onClick={downloadJson}
                    className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 shadow-glow"
                  >
                    <Download className="w-3.5 h-3.5" /> JSON
                  </button>
                </div>
              </div>

              {/* Summary */}
              {extracted.summary && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Executive Summary
                  </h3>
                  <p className="text-sm text-slate-200 leading-relaxed bg-slate-900/60 p-4 rounded-xl border border-white/5">
                    {extracted.summary}
                  </p>
                </div>
              )}

              {/* Skills */}
              {skills.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Identified Skills ({skills.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Work Experience */}
              {experience.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Professional Experience
                  </h3>
                  <div className="space-y-3">
                    {experience.map((exp, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/50 p-4 rounded-xl border border-white/5 space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-sm">
                            {exp.role || exp.title || 'Role'}
                          </span>
                          <span className="text-xs text-indigo-400 font-mono">
                            {exp.duration || exp.dates || ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium">{exp.company}</p>
                        {(exp.highlights || exp.description) && (
                          <p className="text-xs text-slate-300 leading-relaxed pt-1">
                            {exp.highlights || exp.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {education.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                    Education & Credentials
                  </h3>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {education.map((edu, idx) => (
                      <div
                        key={idx}
                        className="bg-slate-900/50 p-3.5 rounded-xl border border-white/5 flex items-start gap-3"
                      >
                        <GraduationCap className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold text-white text-xs">{edu.degree}</p>
                          <p className="text-xs text-slate-400">{edu.institution}</p>
                          {edu.year && <p className="text-[11px] text-slate-500">{edu.year}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {strengths.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Key Strengths
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {strengths.map((st, idx) => (
                      <span
                        key={idx}
                        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      >
                        <Award className="w-3.5 h-3.5 text-emerald-400" />
                        {st}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset */}
              <div className="mt-8 pt-4 border-t border-white/10">
                <button
                  onClick={() => setResult(null)}
                  className="btn-ghost text-xs text-slate-400 hover:text-white"
                >
                  ← Analyze another resume
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── AI Translator ────────────────────────────────────────────────────────────

const SUPPORTED_LANGUAGES = [
  { code: 'Hindi', label: 'Hindi (हिन्दी)' },
  { code: 'Spanish', label: 'Spanish (Español)' },
  { code: 'French', label: 'French (Français)' },
  { code: 'German', label: 'German (Deutsch)' },
  { code: 'Japanese', label: 'Japanese (日本語)' },
  { code: 'Chinese', label: 'Chinese (Simplified)' },
  { code: 'Arabic', label: 'Arabic (العربية)' },
  { code: 'Telugu', label: 'Telugu (తెలుగు)' },
  { code: 'Tamil', label: 'Tamil (தமிழ்)' },
  { code: 'Kannada', label: 'Kannada (ಕನ್ನಡ)' },
  { code: 'Malayalam', label: 'Malayalam (മലയാളം)' },
  { code: 'Portuguese', label: 'Portuguese (Português)' },
  { code: 'Russian', label: 'Russian (Русский)' },
  { code: 'Italian', label: 'Italian (Italiano)' },
  { code: 'English', label: 'English' },
];

export const AITranslatorPage: React.FC = () => {
  const [text, setText] = useState('');
  const [targetLang, setTargetLang] = useState('Hindi');
  const [sourceLang, setSourceLang] = useState('auto');
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [translating, setTranslating] = useState(false);

  const handleTranslate = async () => {
    if (!text.trim()) return;
    setTranslating(true);
    try {
      const { data } = await apiClient.post('/ai/translate', {
        text: text.slice(0, 10000),
        target_language: targetLang,
        source_language: sourceLang,
      });
      setResult(data.translated_text);
      toast.success(`Translated into ${targetLang}!`);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Translation failed';
      toast.error(msg);
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    toast.success('Translation copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    if (!result || typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(result);
    window.speechSynthesis.speak(utterance);
    toast.success('Playing audio...');
  };

  const downloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translated_${targetLang.toLowerCase()}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen pt-24 pb-16 px-4 sm:px-6 relative">
      <div className="max-w-4xl mx-auto">
        {/* Navigation & Header Status */}
        <div className="flex items-center justify-between mb-8">
          <Link
            to="/tools"
            className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Tools
          </Link>
          <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Globe className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Multilingual Engine</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-glow">
            <Languages className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white mb-2 tracking-tight">
            AI <span className="gradient-text">Document & Text Translator</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
            Translate documents and text across Indian and international languages with context awareness.
          </p>
        </div>

        {/* Translation Card */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl backdrop-blur-xl">
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">From:</span>
                <select
                  value={sourceLang}
                  onChange={(e) => setSourceLang(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="auto">Auto-Detect</option>
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase">To:</span>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-1.5 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.code} value={lang.code} className="bg-slate-900 text-white">
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              onClick={handleTranslate}
              disabled={!text.trim() || translating}
              className="btn-primary flex items-center justify-center gap-2 text-sm py-2 px-5 shadow-glow"
            >
              {translating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Translating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Translate Now</span>
                </>
              )}
            </button>
          </div>

          {/* Side by Side or Stacked Editor */}
          <div className="grid md:grid-cols-2 gap-4 mt-6">
            {/* Input Box */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-white/5 flex flex-col justify-between h-72">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter or paste text to translate... (e.g. contracts, articles, correspondence)"
                className="w-full bg-transparent text-slate-200 text-sm resize-none outline-none placeholder:text-slate-500 h-full leading-relaxed"
                maxLength={10000}
              />
              <div className="pt-2 border-t border-white/5 flex items-center justify-between text-slate-500 text-xs font-mono">
                <span>{text.length.toLocaleString()} / 10,000 characters</span>
                {text && (
                  <button
                    onClick={() => setText('')}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Output Box */}
            <div className="bg-slate-950/60 rounded-xl p-4 border border-white/5 flex flex-col justify-between h-72">
              <div className="h-full overflow-y-auto pr-1">
                {result ? (
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                    {result}
                  </p>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-500 text-sm">
                    <Globe className="w-8 h-8 mb-2 opacity-40 text-cyan-400" />
                    <span>Translation output will appear here</span>
                  </div>
                )}
              </div>

              {result && (
                <div className="pt-3 border-t border-white/5 flex items-center justify-between">
                  <span className="text-xs text-cyan-400 font-semibold">{targetLang}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSpeak}
                      title="Read aloud"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleCopy}
                      className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                    <button
                      onClick={downloadTxt}
                      className="btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> TXT
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AISummarizerPage;
