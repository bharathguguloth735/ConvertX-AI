// DocuFlow AI — Digital Signature & Form Fill Studio
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Type,
  Calendar,
  CheckSquare,
  Upload,
  Download,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Check,
  X,
  Lock
} from 'lucide-react';
import apiClient from '@/api/client';
import toast from 'react-hot-toast';

interface PlacedElement {
  id: string;
  type: 'signature' | 'text' | 'date' | 'checkbox';
  page: number;
  x: number; // in PDF points (0 - 595)
  y: number; // in PDF points (0 - 842)
  width: number;
  height: number;
  data?: string; // base64 for signature
  text?: string;
  font_size?: number;
  color?: string;
  checked?: boolean;
}

interface PagePreview {
  page_number: number;
  width: number;
  height: number;
  image_data: string;
}

export const PDFSignatureStudioPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [elements, setElements] = useState<PlacedElement[]>([]);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [signedDownloadUrl, setSignedDownloadUrl] = useState<string | null>(null);

  // Signature Modal State
  const [showSigModal, setShowSigModal] = useState<boolean>(false);
  const [sigMode, setSigMode] = useState<'draw' | 'type' | 'upload'>('draw');
  const [typedName, setTypedName] = useState<string>('Bharath G');
  const [typedFont, setTypedFont] = useState<string>('cursive');
  const [inkColor, setInkColor] = useState<string>('#1e3a8a'); // dark blue ink
  const [uploadedSigUrl, setUploadedSigUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef<boolean>(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  // Load initial sample document if no file uploaded
  useEffect(() => {
    loadSampleDoc();
  }, []);

  const loadSampleDoc = () => {
    // High-resolution SVG-rendered sample contract canvas
    const sampleCanvas = document.createElement('canvas');
    sampleCanvas.width = 595;
    sampleCanvas.height = 842;
    const ctx = sampleCanvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 595, 842);

      // Header Banner
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(40, 40, 515, 6);

      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('MUTUAL NON-DISCLOSURE AGREEMENT', 40, 80);

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#475569';
      ctx.fillText('DocuFlow AI Security Verified Template • Reference: NDA-2026-09-V1', 40, 105);

      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(40, 120);
      ctx.lineTo(555, 120);
      ctx.stroke();

      // Body text
      ctx.fillStyle = '#334155';
      ctx.font = '11px system-ui, sans-serif';
      const bodyLines = [
        '1. Purpose: The parties wish to explore a business opportunity concerning AI-driven digital transformation.',
        '2. Confidential Information: All technical, commercial, financial, and product data disclosed shall be kept strictly secret.',
        '3. Non-Disclosure Obligations: The receiving party agrees to hold all confidential information in strict confidence and',
        '   shall not disclose it to any third party without prior written consent from the disclosing party.',
        '4. Term: This Agreement and the obligations concerning confidentiality shall remain in effect for a period of three (3) years.',
        '5. Signatures: In witness whereof, the parties hereto have executed this Agreement by their authorized representatives.'
      ];
      let y = 155;
      bodyLines.forEach(line => {
        ctx.fillText(line, 40, y);
        y += 28;
      });

      // Signature blocks
      ctx.strokeStyle = '#cbd5e1';
      ctx.strokeRect(40, 520, 240, 160);
      ctx.strokeRect(315, 520, 240, 160);

      ctx.font = 'bold 12px system-ui, sans-serif';
      ctx.fillStyle = '#0f172a';
      ctx.fillText('DISCLOSING PARTY', 55, 545);
      ctx.fillText('RECEIVING PARTY (You)', 330, 545);

      ctx.font = '10px system-ui, sans-serif';
      ctx.fillStyle = '#64748b';
      ctx.fillText('Entity: DocuFlow Technologies Inc.', 55, 570);
      ctx.fillText('Signer: Elena Vance (CTO)', 55, 590);
      ctx.fillText('Date: 2026-09-11', 55, 610);

      ctx.fillText('Place your signature and date below:', 330, 570);

      // Footer
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px system-ui, sans-serif';
      ctx.fillText('Page 1 of 1 • Digitally prepared via ConvertX AI Security Suite', 40, 810);
    }

    setPages([
      {
        page_number: 1,
        width: 595,
        height: 842,
        image_data: sampleCanvas.toDataURL('image/png'),
      }
    ]);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setIsProcessing(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
      fd.append('dpi', '140');
      const { data } = await apiClient.post('/pdf/render-preview', fd);
      if (data.pages && data.pages.length > 0) {
        setPages(data.pages);
        setCurrentPage(1);
        setElements([]);
        setIsSigned(false);
        setSignedDownloadUrl(null);
        toast.success(`Loaded ${data.pages.length} pages ready for signing`);
      }
    } catch {
      toast.error('Failed to load PDF pages. Using sample document.');
      loadSampleDoc();
    } finally {
      setIsProcessing(false);
    }
  };

  // Canvas Drawing logic
  useEffect(() => {
    if (showSigModal && sigMode === 'draw' && canvasRef.current) {
      const cvs = canvasRef.current;
      const ctx = cvs.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = inkColor;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
    }
  }, [showSigModal, sigMode, inkColor]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDrawingRef.current = true;
    const cvs = canvasRef.current;
    if (!cvs) return;
    const rect = cvs.getBoundingClientRect();
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canvasRef.current) return;
    const cvs = canvasRef.current;
    const rect = cvs.getBoundingClientRect();
    const ctx = cvs.getContext('2d');
    if (!ctx) return;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
  };

  const stopDrawing = () => {
    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    if (!canvasRef.current) return;
    const cvs = canvasRef.current;
    const ctx = cvs.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, cvs.width, cvs.height);
    }
  };

  const handleCreateSignature = () => {
    let sigDataUrl = '';
    if (sigMode === 'draw' && canvasRef.current) {
      sigDataUrl = canvasRef.current.toDataURL('image/png');
    } else if (sigMode === 'type') {
      const tempCvs = document.createElement('canvas');
      tempCvs.width = 350;
      tempCvs.height = 120;
      const tctx = tempCvs.getContext('2d');
      if (tctx) {
        tctx.font = `italic bold 36px ${typedFont === 'cursive' ? 'Brush Script MT, cursive' : 'Georgia, serif'}`;
        tctx.fillStyle = inkColor;
        tctx.fillText(typedName, 20, 75);
        sigDataUrl = tempCvs.toDataURL('image/png');
      }
    } else if (sigMode === 'upload' && uploadedSigUrl) {
      sigDataUrl = uploadedSigUrl;
    }

    if (!sigDataUrl) {
      toast.error('Please create or draw a signature first.');
      return;
    }

    // Add signature element to page
    const newEl: PlacedElement = {
      id: `sig-${Date.now()}`,
      type: 'signature',
      page: currentPage,
      x: 330,
      y: 600,
      width: 160,
      height: 60,
      data: sigDataUrl,
    };

    setElements(prev => [...prev, newEl]);
    setSelectedElementId(newEl.id);
    setShowSigModal(false);
    toast.success('Signature placed! You can drag it to any position.');
  };

  const addTextField = () => {
    const newEl: PlacedElement = {
      id: `text-${Date.now()}`,
      type: 'text',
      page: currentPage,
      x: 330,
      y: 680,
      width: 180,
      height: 24,
      text: 'Bharath G (Authorized Signer)',
      font_size: 11,
      color: '#0f172a',
    };
    setElements(prev => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const addDateField = () => {
    const today = new Date().toISOString().split('T')[0];
    const newEl: PlacedElement = {
      id: `date-${Date.now()}`,
      type: 'date',
      page: currentPage,
      x: 330,
      y: 710,
      width: 120,
      height: 22,
      text: `Date: ${today}`,
      font_size: 10,
      color: '#334155',
    };
    setElements(prev => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const addCheckbox = () => {
    const newEl: PlacedElement = {
      id: `check-${Date.now()}`,
      type: 'checkbox',
      page: currentPage,
      x: 330,
      y: 530,
      width: 18,
      height: 18,
      checked: true,
    };
    setElements(prev => [...prev, newEl]);
    setSelectedElementId(newEl.id);
  };

  const removeElement = (id: string) => {
    setElements(prev => prev.filter(e => e.id !== id));
    if (selectedElementId === id) setSelectedElementId(null);
  };

  const handleSignAndFlatten = async () => {
    if (elements.length === 0) {
      toast.error('Please place at least one signature or field before saving.');
      return;
    }

    setIsProcessing(true);
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
        const dummyPdf = new File([blob], 'agreement.png', { type: 'image/png' });
        fd.append('file', dummyPdf);
      }

      fd.append('elements_json', JSON.stringify(elements));
      fd.append('signer_name', typedName || 'Authorized Signer');

      const { data } = await apiClient.post('/pdf/sign-and-fill', fd);
      setIsSigned(true);
      setSignedDownloadUrl(data.download_url);
      toast.success('Document successfully signed, cryptographically verified, and flattened!');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail || 'Failed to sign document. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const currentPagePreview = pages.find(p => p.page_number === currentPage) || pages[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col pt-16">
      {/* Top Header & Action Bar */}
      <div className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-16 z-30 px-4 py-3">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                Digital Signature & Form Fill Studio
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-semibold px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Tamper-Evident SHA-256
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Sign, fill form fields, and flatten contracts without printing
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="cursor-pointer px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition">
              <Upload className="w-3.5 h-3.5" />
              Upload PDF
              <input type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
            </label>

            <button
              onClick={handleSignAndFlatten}
              disabled={isProcessing || elements.length === 0}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 disabled:opacity-50 transition"
            >
              {isProcessing ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              Sign & Flatten PDF
            </button>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 py-6 flex-1 flex flex-col md:flex-row gap-6">
        {/* Left Toolbar / Tools Panel */}
        <div className="w-full md:w-64 shrink-0 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm space-y-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Add Form Elements
            </h2>

            <button
              onClick={() => setShowSigModal(true)}
              className="w-full py-2.5 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2.5 transition"
            >
              <PenTool className="w-4 h-4" />
              Add Signature / Initials
            </button>

            <button
              onClick={addTextField}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2.5 transition"
            >
              <Type className="w-4 h-4 text-blue-400" />
              Add Name / Text Box
            </button>

            <button
              onClick={addDateField}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2.5 transition"
            >
              <Calendar className="w-4 h-4 text-amber-400" />
              Add Date Stamp
            </button>

            <button
              onClick={addCheckbox}
              className="w-full py-2.5 px-3 rounded-lg bg-slate-800/80 border border-slate-700 hover:bg-slate-800 text-slate-200 text-xs font-semibold flex items-center gap-2.5 transition"
            >
              <CheckSquare className="w-4 h-4 text-purple-400" />
              Add Checkmark
            </button>
          </div>

          {/* Placed Elements List */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Placed Elements ({elements.length})
              </h2>
              {elements.length > 0 && (
                <button
                  onClick={() => setElements([])}
                  className="text-[10px] text-rose-400 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {elements.length === 0 ? (
              <p className="text-[11px] text-slate-500 py-2 italic">
                No items placed yet. Click above to add a signature or field.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {elements.map((el, i) => (
                  <div
                    key={el.id}
                    onClick={() => setSelectedElementId(el.id)}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs cursor-pointer border ${
                      selectedElementId === el.id
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="capitalize font-medium flex items-center gap-1.5">
                      {el.type === 'signature' && <PenTool className="w-3 h-3 text-emerald-400" />}
                      {el.type === 'text' && <Type className="w-3 h-3 text-blue-400" />}
                      {el.type === 'date' && <Calendar className="w-3 h-3 text-amber-400" />}
                      {el.type === 'checkbox' && <CheckSquare className="w-3 h-3 text-purple-400" />}
                      {el.type} #{i + 1}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                      className="text-slate-400 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Security & Audit Seal Card */}
          <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              Cryptographic Audit Seal
            </div>
            <p className="text-[11px] text-emerald-200/80 leading-relaxed">
              When flattened, this document embeds a SHA-256 integrity hash, certified signer timestamp, and is rendered read-only.
            </p>
          </div>
        </div>

        {/* Center: Interactive Canvas Document Area */}
        <div className="flex-1 flex flex-col items-center">
          {/* Zoom and Page Navigation Bar */}
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

          {/* Canvas Wrapper */}
          <div
            ref={pageContainerRef}
            className="relative bg-white shadow-2xl rounded overflow-hidden select-none border border-slate-700"
            style={{
              width: `${595 * zoom}px`,
              height: `${842 * zoom}px`,
            }}
          >
            {/* Base Document Image */}
            {currentPagePreview && (
              <img
                src={currentPagePreview.image_data}
                alt={`Page ${currentPage}`}
                className="w-full h-full pointer-events-none object-contain"
              />
            )}

            {/* Placed Dynamic Interactive Elements */}
            {elements
              .filter(el => el.page === currentPage)
              .map(el => (
                <div
                  key={el.id}
                  onClick={() => setSelectedElementId(el.id)}
                  style={{
                    position: 'absolute',
                    left: `${el.x * zoom}px`,
                    top: `${el.y * zoom}px`,
                    width: `${el.width * zoom}px`,
                    height: `${el.height * zoom}px`,
                  }}
                  className={`cursor-move group border rounded p-0.5 transition ${
                    selectedElementId === el.id
                      ? 'border-emerald-500 ring-2 ring-emerald-500/40 bg-emerald-500/10'
                      : 'border-dashed border-blue-400/80 hover:border-blue-500 bg-blue-500/5'
                  }`}
                  onMouseDown={(e) => {
                    const startX = e.clientX;
                    const startY = e.clientY;
                    const initialElX = el.x;
                    const initialElY = el.y;

                    const onMouseMove = (moveEvt: MouseEvent) => {
                      const dx = (moveEvt.clientX - startX) / zoom;
                      const dy = (moveEvt.clientY - startY) / zoom;
                      setElements(prev =>
                        prev.map(item =>
                          item.id === el.id
                            ? {
                                ...item,
                                x: Math.max(10, Math.min(595 - item.width - 10, initialElX + dx)),
                                y: Math.max(10, Math.min(842 - item.height - 10, initialElY + dy)),
                              }
                            : item
                        )
                      );
                    };

                    const onMouseUp = () => {
                      window.removeEventListener('mousemove', onMouseMove);
                      window.removeEventListener('mouseup', onMouseUp);
                    };

                    window.addEventListener('mousemove', onMouseMove);
                    window.addEventListener('mouseup', onMouseUp);
                  }}
                >
                  {el.type === 'signature' && el.data && (
                    <img src={el.data} alt="Signature" className="w-full h-full object-contain pointer-events-none" />
                  )}

                  {el.type === 'text' && (
                    <input
                      type="text"
                      value={el.text || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setElements(prev => prev.map(item => item.id === el.id ? { ...item, text: val } : item));
                      }}
                      style={{ fontSize: `${(el.font_size || 11) * zoom}px`, color: el.color || '#000000' }}
                      className="w-full h-full bg-transparent border-none outline-none font-sans font-medium px-1"
                    />
                  )}

                  {el.type === 'date' && (
                    <div
                      style={{ fontSize: `${(el.font_size || 10) * zoom}px`, color: el.color || '#334155' }}
                      className="w-full h-full flex items-center font-mono font-semibold px-1"
                    >
                      {el.text}
                    </div>
                  )}

                  {el.type === 'checkbox' && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setElements(prev => prev.map(item => item.id === el.id ? { ...item, checked: !item.checked } : item));
                      }}
                      className="w-full h-full flex items-center justify-center cursor-pointer"
                    >
                      {el.checked ? (
                        <Check className="w-full h-full text-emerald-600 font-black stroke-[3]" />
                      ) : (
                        <div className="w-3/4 h-3/4 border border-slate-700 rounded-sm" />
                      )}
                    </div>
                  )}

                  {/* Remove pill button when selected */}
                  {selectedElementId === el.id && (
                    <button
                      onClick={(e) => { e.stopPropagation(); removeElement(el.id); }}
                      className="absolute -top-3 -right-3 w-5 h-5 bg-rose-600 text-white rounded-full flex items-center justify-center shadow"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
          </div>

          {/* Success Download Banner */}
          {isSigned && signedDownloadUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6 w-full max-w-[595px] p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/40 flex items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Document Cryptographically Signed</h4>
                  <p className="text-xs text-emerald-300">All fields flattened & locked with SHA-256 seal.</p>
                </div>
              </div>
              <a
                href={signedDownloadUrl}
                download
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Download className="w-4 h-4" />
                Download PDF
              </a>
            </motion.div>
          )}
        </div>
      </div>

      {/* Signature Modal */}
      <AnimatePresence>
        {showSigModal && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-emerald-400" />
                  Create Signature
                </h3>
                <button onClick={() => setShowSigModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="grid grid-cols-3 gap-1 bg-slate-800/80 p-1 rounded-lg text-xs font-semibold">
                <button
                  onClick={() => setSigMode('draw')}
                  className={`py-1.5 rounded-md transition ${sigMode === 'draw' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                >
                  Draw
                </button>
                <button
                  onClick={() => setSigMode('type')}
                  className={`py-1.5 rounded-md transition ${sigMode === 'type' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                >
                  Type
                </button>
                <button
                  onClick={() => setSigMode('upload')}
                  className={`py-1.5 rounded-md transition ${sigMode === 'upload' ? 'bg-emerald-500 text-slate-950' : 'text-slate-300 hover:text-white'}`}
                >
                  Upload
                </button>
              </div>

              {/* Draw Mode */}
              {sigMode === 'draw' && (
                <div className="space-y-2">
                  <div className="border border-slate-700 bg-white rounded-xl overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={380}
                      height={140}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="cursor-crosshair w-full h-[140px]"
                    />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400">Ink:</span>
                      <button
                        onClick={() => setInkColor('#1e3a8a')}
                        className={`w-5 h-5 rounded-full bg-blue-900 border-2 ${inkColor === '#1e3a8a' ? 'border-white' : 'border-transparent'}`}
                      />
                      <button
                        onClick={() => setInkColor('#0f172a')}
                        className={`w-5 h-5 rounded-full bg-slate-900 border-2 ${inkColor === '#0f172a' ? 'border-white' : 'border-transparent'}`}
                      />
                    </div>
                    <button onClick={clearCanvas} className="text-xs text-rose-400 hover:underline">
                      Clear Canvas
                    </button>
                  </div>
                </div>
              )}

              {/* Type Mode */}
              {sigMode === 'type' && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Your Full Name</label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Font Style:</span>
                    {['cursive', 'serif', 'sans-serif'].map((font) => (
                      <button
                        key={font}
                        type="button"
                        onClick={() => setTypedFont(font)}
                        className={`px-2.5 py-1 rounded text-xs capitalize transition ${
                          typedFont === font
                            ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-300 font-semibold'
                            : 'bg-slate-800 border border-slate-700 text-slate-400 hover:text-white'
                        }`}
                      >
                        {font}
                      </button>
                    ))}
                  </div>
                  <div className="p-4 bg-white rounded-xl text-center">
                    <p
                      style={{ color: inkColor, fontFamily: typedFont }}
                      className="text-3xl italic"
                    >
                      {typedName || 'Your Signature'}
                    </p>
                  </div>
                </div>
              )}

              {/* Upload Mode */}
              {sigMode === 'upload' && (
                <div className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center space-y-2">
                  <Upload className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-300">Upload signature image (PNG/JPG with transparent background)</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        const reader = new FileReader();
                        reader.onload = () => setUploadedSigUrl(reader.result as string);
                        reader.readAsDataURL(f);
                      }
                    }}
                    className="text-xs text-slate-400"
                  />
                  {uploadedSigUrl && (
                    <div className="mt-2 p-2 bg-white rounded">
                      <img src={uploadedSigUrl} alt="Preview" className="max-h-16 mx-auto object-contain" />
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowSigModal(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSignature}
                  className="flex-1 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold transition shadow-lg shadow-emerald-500/20"
                >
                  Insert Signature
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PDFSignatureStudioPage;
