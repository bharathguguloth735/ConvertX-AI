// DocuFlow AI — Smart PII Masking & AI Document Redaction Studio
import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldAlert,
  Flame,
  Upload,
  Download,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Square,
  Lock,
} from 'lucide-react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface PIIEntity {
  id: string;
  type: string;
  label: string;
  text: string;
  page: number;
  bbox: [number, number, number, number]; // [x0, y0, x1, y1] in 595x842 space
  selected: boolean;
}

interface PagePreview {
  page_number: number;
  width: number;
  height: number;
  image_data: string;
}

export const PDFRedactStudioPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [entities, setEntities] = useState<PIIEntity[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [isBurning, setIsBurning] = useState<boolean>(false);
  const [isRedacted, setIsRedacted] = useState<boolean>(false);
  const [redactedDownloadUrl, setRedactedDownloadUrl] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isDrawMode, setIsDrawMode] = useState<boolean>(false);

  // Manual box drawing refs
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const [tempBox, setTempBox] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);

  useEffect(() => {
    loadSampleDocument();
  }, []);

  const loadSampleDocument = () => {
    // Generate high-resolution sample medical/legal statement containing PII
    const cvs = document.createElement('canvas');
    cvs.width = 595;
    cvs.height = 842;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 595, 842);

      // Header
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(40, 40, 515, 6);

      ctx.font = 'bold 20px system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('CONFIDENTIAL MEDICAL & FINANCIAL RECORD', 40, 80);

      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Sanitized Telemetry Document • Healthcare Privacy Act Form H-401', 40, 105);

      ctx.strokeStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(40, 120);
      ctx.lineTo(555, 120);
      ctx.stroke();

      // Body containing realistic test PII
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#334155';

      const lines = [
        'Patient Full Name: Bharath G. (Age: 32)',
        'Primary Email Address: bharath.care@healthcorp-medical.com',
        'Direct Phone / Mobile: +1 (415) 555-2671',
        'Indian Aadhaar Identification: 3456 7890 1234',
        'National Tax Identifier (PAN): ABCDE1234F',
        'Social Security Number (SSN): 456-78-9012',
        'Billing Credit Card: 4532 8912 3456 7890 (Exp: 08/29)',
        'Home IP Address: 192.168.1.104',
        '',
        'Clinical Summary:',
        'The patient attended an annual diagnostic consultation. All vitals were within normal',
        'tolerances. Blood panels and biochemical biomarkers revealed optimal cardiovascular metrics.',
        '',
        'Billing Details:',
        'Consultation Fee: $450.00 (Paid via Credit Card ending in 7890).',
        'Invoice Reference: MED-2026-0911-0042',
      ];

      let y = 160;
      lines.forEach(l => {
        ctx.fillText(l, 40, y);
        y += 26;
      });

      // Warning Box
      ctx.fillStyle = '#fef2f2';
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1;
      ctx.fillRect(40, 680, 515, 75);
      ctx.strokeRect(40, 680, 515, 75);

      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.fillStyle = '#991b1b';
      ctx.fillText('PRIVACY COMPLIANCE NOTICE (GDPR / HIPAA)', 55, 705);
      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = '#7f1d1d';
      ctx.fillText('This document contains protected health information (PHI) and PII. It must be redacted', 55, 725);
      ctx.fillText('before distribution or archiving in public repositories.', 55, 740);

      // Footer
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Page 1 of 1 • DocuFlow AI Enterprise Compliance Engine', 40, 810);
    }

    setPages([
      {
        page_number: 1,
        width: 595,
        height: 842,
        image_data: cvs.toDataURL('image/png'),
      }
    ]);

    // Pre-populate realistic scan coordinates matching the sample text lines
    setEntities([
      { id: 'pii-1', type: 'email', label: 'Email Address', text: 'bharath.care@healthcorp-medical.com', page: 1, bbox: [175, 172, 420, 187], selected: true },
      { id: 'pii-2', type: 'phone', label: 'Phone Number', text: '+1 (415) 555-2671', page: 1, bbox: [175, 198, 305, 213], selected: true },
      { id: 'pii-3', type: 'aadhaar', label: 'Aadhaar Number', text: '3456 7890 1234', page: 1, bbox: [225, 224, 340, 239], selected: true },
      { id: 'pii-4', type: 'pan', label: 'PAN Card ID', text: 'ABCDE1234F', page: 1, bbox: [225, 250, 315, 265], selected: true },
      { id: 'pii-5', type: 'ssn', label: 'Social Security Number', text: '456-78-9012', page: 1, bbox: [225, 276, 315, 291], selected: true },
      { id: 'pii-6', type: 'credit_card', label: 'Credit Card', text: '4532 8912 3456 7890', page: 1, bbox: [170, 302, 335, 317], selected: true },
      { id: 'pii-7', type: 'ip_address', label: 'IP Address', text: '192.168.1.104', page: 1, bbox: [155, 328, 255, 343], selected: true },
    ]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsScanning(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('dpi', '140');
      const previewRes = await apiClient.post('/pdf/render-preview', fd);
      if (previewRes.data.pages) {
        setPages(previewRes.data.pages);
        setCurrentPage(1);
      }

      // Automatically trigger PII scan
      const scanFd = new FormData();
      scanFd.append('file', f);
      const scanRes = await apiClient.post('/pdf/scan-pii', scanFd);
      setEntities(scanRes.data.entities || []);
      setIsRedacted(false);
      setRedactedDownloadUrl(null);
      toast.success(`Scanned! Found ${scanRes.data.total_entities_found || 0} sensitive entities.`);
    } catch {
      toast.error('Scan failed. Loaded sample document.');
      loadSampleDocument();
    } finally {
      setIsScanning(false);
    }
  };

  const toggleEntity = (id: string) => {
    setEntities(prev => prev.map(e => e.id === id ? { ...e, selected: !e.selected } : e));
  };

  const toggleCategoryAll = (cat: string, selectAll: boolean) => {
    setEntities(prev => prev.map(e => (cat === 'all' || e.type === cat) ? { ...e, selected: selectAll } : e));
  };

  const handleBurnRedactions = async () => {
    const selectedItems = entities.filter(e => e.selected);
    if (selectedItems.length === 0) {
      toast.error('No entities selected for redaction.');
      return;
    }

    setIsBurning(true);
    try {
      const fd = new FormData();
      if (file) {
        fd.append('file', file);
      } else {
        // Create PDF blob from sample
        const cvs = document.createElement('canvas');
        cvs.width = 595;
        cvs.height = 842;
        const img = new Image();
        img.src = pages[0].image_data;
        await new Promise(r => { img.onload = r; });
        const ctx = cvs.getContext('2d');
        ctx?.drawImage(img, 0, 0);
        const blob = await new Promise<Blob>(r => cvs.toBlob(b => r(b!), 'image/png'));
        const dummyPdf = new File([blob], 'medical_statement.png', { type: 'image/png' });
        fd.append('file', dummyPdf);
      }

      fd.append('redactions_json', JSON.stringify(selectedItems));
      fd.append('strip_metadata', 'true');

      const { data } = await apiClient.post('/pdf/apply-redactions', fd);
      setIsRedacted(true);
      setRedactedDownloadUrl(data.download_url);
      toast.success('Redactions permanently burned into pixel layer! Safe PDF ready.');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to burn redactions.');
    } finally {
      setIsBurning(false);
    }
  };

  // Manual Redaction Drawing on Canvas
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawMode) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;
    drawStartRef.current = { x, y };
    setTempBox({ x0: x, y0: y, x1: x, y1: y });
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDrawMode || !drawStartRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / zoom;
    const currentY = (e.clientY - rect.top) / zoom;
    const x0 = Math.min(drawStartRef.current.x, currentX);
    const y0 = Math.min(drawStartRef.current.y, currentY);
    const x1 = Math.max(drawStartRef.current.x, currentX);
    const y1 = Math.max(drawStartRef.current.y, currentY);
    setTempBox({ x0, y0, x1, y1 });
  };

  const handleCanvasMouseUp = () => {
    if (isDrawMode && tempBox && (tempBox.x1 - tempBox.x0 > 10) && (tempBox.y1 - tempBox.y0 > 5)) {
      const newEntity: PIIEntity = {
        id: `manual-${Date.now()}`,
        type: 'custom',
        label: 'Custom Redaction',
        text: 'Custom Area',
        page: currentPage,
        bbox: [Math.round(tempBox.x0), Math.round(tempBox.y0), Math.round(tempBox.x1), Math.round(tempBox.y1)],
        selected: true,
      };
      setEntities(prev => [...prev, newEntity]);
      toast.success('Custom redaction box added!');
    }
    drawStartRef.current = null;
    setTempBox(null);
  };

  const currentPagePreview = pages.find(p => p.page_number === currentPage) || pages[0];
  const filteredEntities = entities.filter(e => activeCategory === 'all' || e.type === activeCategory);
  const selectedCount = entities.filter(e => e.selected).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pt-16">
      {/* Top Header */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-16 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                Smart PII Masking & AI Document Redaction
                <span className="text-[10px] bg-rose-500/20 text-rose-300 font-semibold px-2 py-0.5 rounded-full border border-rose-500/30">
                  GDPR & HIPAA Zero-Leak
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Permanently burn out sensitive personal data from PDF pixel layers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition">
              {isScanning ? <RotateCcw className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Upload className="w-3.5 h-3.5" />}
              {isScanning ? 'Scanning...' : 'Upload Document'}
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </label>

            <button
              onClick={() => setIsDrawMode(!isDrawMode)}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition ${
                isDrawMode
                  ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                  : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300'
              }`}
            >
              <Square className="w-3.5 h-3.5" />
              {isDrawMode ? 'Exit Draw Mode' : 'Draw Custom Box'}
            </button>

            <button
              onClick={handleBurnRedactions}
              disabled={isBurning || selectedCount === 0}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-xs shadow-lg shadow-rose-600/20 flex items-center gap-1.5 disabled:opacity-50 transition"
            >
              {isBurning ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Flame className="w-3.5 h-3.5" />}
              Burn {selectedCount} Redactions
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Sidebar: Detected PII Entities */}
        <div className="w-full md:w-80 shrink-0 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Detected PII ({entities.length})
              </h2>
              <div className="flex gap-2 text-[10px]">
                <button
                  onClick={() => toggleCategoryAll(activeCategory, true)}
                  className="text-rose-400 hover:underline"
                >
                  Select All
                </button>
                <button
                  onClick={() => toggleCategoryAll(activeCategory, false)}
                  className="text-slate-400 hover:underline"
                >
                  Deselect
                </button>
              </div>
            </div>

            {/* Category Filters */}
            <div className="flex flex-wrap gap-1 text-[11px]">
              {['all', 'email', 'phone', 'credit_card', 'aadhaar', 'ssn', 'pan'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2 py-1 rounded-md capitalize font-medium transition ${
                    activeCategory === cat
                      ? 'bg-rose-500 text-white'
                      : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                  }`}
                >
                  {cat.replace('_', ' ')}
                </button>
              ))}
            </div>

            {/* Entities List */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {filteredEntities.map((ent) => (
                <div
                  key={ent.id}
                  onClick={() => toggleEntity(ent.id)}
                  className={`flex items-start gap-2.5 p-2 rounded-lg text-xs cursor-pointer border transition ${
                    ent.selected
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={ent.selected}
                    onChange={() => toggleEntity(ent.id)}
                    className="mt-0.5 rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] mb-0.5">
                      <span className="font-semibold text-rose-400 uppercase tracking-wide">
                        {ent.label}
                      </span>
                      <span className="text-slate-500">Page {ent.page}</span>
                    </div>
                    <p className="font-mono text-[11px] truncate text-slate-200">{ent.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Guarantee Box */}
          <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-rose-400">
              <Lock className="w-4 h-4" />
              Zero Text Leak Guarantee
            </div>
            <p className="text-[11px] text-rose-200/80 leading-relaxed">
              Unlike superficial CSS black banners, DocuFlow's redaction engine burns into the PDF raster pixel layer and purges underlying text glyphs. Redacted strings cannot be selected, copied, or extracted via OCR.
            </p>
          </div>
        </div>

        {/* Center Canvas Workspace */}
        <div className="flex-1 flex flex-col items-center">
          {/* Zoom & Page Controls */}
          <div className="flex items-center justify-between w-full max-w-[595px] mb-3 text-xs bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-semibold text-slate-300">
                Page {currentPage} of {pages.length}
              </span>
              <button
                disabled={currentPage >= pages.length}
                onClick={() => setCurrentPage(p => Math.min(pages.length, p + 1))}
                className="p-1 text-slate-300 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setZoom(z => Math.max(0.7, z - 0.1))} className="p-1 text-slate-400 hover:text-white">
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="font-mono text-slate-400">{Math.round(zoom * 100)}%</span>
              <button onClick={() => setZoom(z => Math.min(1.4, z + 0.1))} className="p-1 text-slate-400 hover:text-white">
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive Document Redaction Canvas */}
          <div
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            className={`relative bg-white shadow-2xl rounded overflow-hidden select-none border border-slate-700 ${
              isDrawMode ? 'cursor-crosshair' : 'cursor-default'
            }`}
            style={{
              width: `${595 * zoom}px`,
              height: `${842 * zoom}px`,
            }}
          >
            {currentPagePreview && (
              <img
                src={currentPagePreview.image_data}
                alt={`Page ${currentPage}`}
                className="w-full h-full pointer-events-none object-contain"
              />
            )}

            {/* Rendered Redaction Highlight Overlays */}
            {entities
              .filter(e => e.page === currentPage && e.selected)
              .map(e => {
                const [x0, y0, x1, y1] = e.bbox;
                const width = (x1 - x0) * zoom;
                const height = (y1 - y0) * zoom;

                return (
                  <div
                    key={e.id}
                    style={{
                      position: 'absolute',
                      left: `${x0 * zoom}px`,
                      top: `${y0 * zoom}px`,
                      width: `${Math.max(20, width)}px`,
                      height: `${Math.max(14, height)}px`,
                    }}
                    className="bg-black/90 hover:bg-black border border-rose-500 shadow-sm flex items-center justify-center group cursor-pointer transition"
                    onClick={() => toggleEntity(e.id)}
                    title={`Click to un-redact: ${e.text}`}
                  >
                    <span className="text-[9px] text-white/70 font-mono select-none px-1 uppercase tracking-wider">
                      [REDACTED]
                    </span>
                  </div>
                );
              })}

            {/* Active Drawing Preview Box */}
            {tempBox && (
              <div
                style={{
                  position: 'absolute',
                  left: `${tempBox.x0 * zoom}px`,
                  top: `${tempBox.y0 * zoom}px`,
                  width: `${(tempBox.x1 - tempBox.x0) * zoom}px`,
                  height: `${(tempBox.y1 - tempBox.y0) * zoom}px`,
                }}
                className="border-2 border-rose-500 bg-rose-500/20 pointer-events-none"
              />
            )}
          </div>

          {/* Success Download Card */}
          {isRedacted && redactedDownloadUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 w-full max-w-[595px] p-4 rounded-xl border border-rose-500/40 bg-rose-950/40 flex items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Document Sanitized & Redacted</h4>
                  <p className="text-xs text-rose-300">Underlying text destroyed. Metadata stripped.</p>
                </div>
              </div>
              <a
                href={redactedDownloadUrl}
                download
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition shadow"
              >
                <Download className="w-4 h-4" />
                Download Redacted PDF
              </a>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PDFRedactStudioPage;
