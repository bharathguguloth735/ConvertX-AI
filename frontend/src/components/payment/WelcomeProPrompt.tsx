// DocuFlow AI — "Welcome to DocuFlow AI" Onboarding Celebration Prompt
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, CheckCircle2, FileText, Download, ArrowRight,
  Zap, Bot, HardDrive, ShieldCheck, Star,
  Layers, X
} from 'lucide-react';
import toast from 'react-hot-toast';

interface WelcomeProPromptProps {
  isOpen: boolean;
  onClose: () => void;
  transactionData: {
    plan?: string;
    plan_name?: string;
    transaction_id?: string;
    order_id?: string;
    bank_ref?: string;
    invoice_number?: string;
    amount?: number;
    currency?: string;
    payment_method?: string;
    timestamp?: string;
    billing_name?: string;
  } | null;
}

export const WelcomeProPrompt: React.FC<WelcomeProPromptProps> = ({
  isOpen,
  onClose,
  transactionData,
}) => {
  const navigate = useNavigate();

  if (!isOpen || !transactionData) return null;

  const planName = transactionData.plan_name || 'Pro Plan';
  const planKey = (transactionData.plan || 'pro').toLowerCase();
  const amount = transactionData.amount || (planKey === 'student' ? 99 : planKey === 'business' ? 1999 : 499);
  const txnId = transactionData.transaction_id || `TXN_DF_${Date.now().toString().slice(-8)}`;
  const orderId = transactionData.order_id || `DF_ORD_${Date.now().toString().slice(-6)}`;
  const bankRef = transactionData.bank_ref || `UTR_${Date.now().toString().slice(-10)}`;
  const invoiceNum = transactionData.invoice_number || `INV-DF-2026-${txnId.slice(-6)}`;
  const dateStr = transactionData.timestamp || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // Plan perks configuration
  const perks = planKey === 'business' ? [
    { title: 'Unlimited Conversions', desc: 'Convert unlimited files with zero throttling', icon: <Zap className="w-4 h-4 text-amber-400" /> },
    { title: 'Unlimited AI Requests', desc: 'RAG Q&A, invoice parsing, and summarization', icon: <Bot className="w-4 h-4 text-purple-400" /> },
    { title: '100 GB Cloud Storage', desc: 'Permanent secure storage with 24h retention options', icon: <HardDrive className="w-4 h-4 text-blue-400" /> },
    { title: '500 MB Max File Size', desc: 'Process massive PDFs, 4K videos, and raw images', icon: <Layers className="w-4 h-4 text-emerald-400" /> },
  ] : planKey === 'student' ? [
    { title: '100 Conversions / Mo', desc: 'High-speed document & media conversions', icon: <Zap className="w-4 h-4 text-blue-400" /> },
    { title: '50 AI Requests / Mo', desc: 'Analyze study guides, textbooks, and receipts', icon: <Bot className="w-4 h-4 text-purple-400" /> },
    { title: '5 GB Cloud Storage', desc: 'Keep your converted academic files accessible', icon: <HardDrive className="w-4 h-4 text-emerald-400" /> },
    { title: '50 MB Max File Size', desc: 'Large slide decks, thesis PDFs, and audio recordings', icon: <Layers className="w-4 h-4 text-amber-400" /> },
  ] : [
    { title: '1,000 Conversions / Mo', desc: 'High-speed document, PDF & media processing', icon: <Zap className="w-4 h-4 text-brand-400" /> },
    { title: '500 AI Document Requests', desc: 'Interactive split-view document Q&A & summarization', icon: <Bot className="w-4 h-4 text-purple-400" /> },
    { title: '25 GB Secure Cloud Storage', desc: 'Saved files, instant downloads & version history', icon: <HardDrive className="w-4 h-4 text-emerald-400" /> },
    { title: '200 MB File Upload Quota', desc: 'Upload large multi-page reports, scans, and audio', icon: <Layers className="w-4 h-4 text-blue-400" /> },
  ];

  // Download printable official tax invoice
  const handleDownloadInvoice = () => {
    const subtotal = (amount / 1.18).toFixed(2);
    const tax = (amount - Number(subtotal)).toFixed(2);
    const cgst = (Number(tax) / 2).toFixed(2);
    const sgst = (Number(tax) / 2).toFixed(2);

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tax Invoice - ${invoiceNum}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1e293b; padding: 40px; margin: 0; background: #fff; }
          .invoice-box { max-width: 800px; margin: auto; border: 1px solid #e2e8f0; padding: 30px; border-radius: 12px; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #3b5bfc; padding-bottom: 20px; margin-bottom: 25px; }
          .logo { font-size: 24px; font-weight: 900; color: #0f172a; }
          .logo span { color: #3b5bfc; }
          .badge { background: #dcfce7; color: #15803d; font-weight: 700; padding: 4px 10px; border-radius: 20px; font-size: 12px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 25px; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 25px; font-size: 13px; }
          th { background: #f8fafc; padding: 10px; text-align: left; border-bottom: 1px solid #cbd5e1; font-weight: 700; }
          td { padding: 12px 10px; border-bottom: 1px solid #f1f5f9; }
          .total-box { margin-left: auto; width: 300px; font-size: 13px; }
          .total-row { display: flex; justify-content: space-between; padding: 5px 0; }
          .grand-total { font-size: 16px; font-weight: 800; color: #1e1b4b; border-top: 2px solid #e2e8f0; padding-top: 8px; margin-top: 8px; }
          .footer { text-align: center; margin-top: 35px; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="invoice-box">
          <div class="header">
            <div>
              <div class="logo">DocuFlow <span>AI</span></div>
              <p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">DocuFlow AI Technologies Pvt. Ltd.</p>
              <p style="margin: 2px 0; font-size: 11px; color: #64748b;">GSTIN: 29AAACD4918K1ZZ • PAN: AAACD4918K</p>
              <p style="margin: 2px 0; font-size: 11px; color: #64748b;">Bengaluru, Karnataka - 560034, India</p>
            </div>
            <div style="text-align: right;">
              <span class="badge">TAX INVOICE - PAID</span>
              <h3 style="margin: 10px 0 2px 0; font-size: 16px;">${invoiceNum}</h3>
              <p style="margin: 0; font-size: 12px; color: #64748b;">Date: ${dateStr}</p>
              <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">Order: ${orderId}</p>
            </div>
          </div>

          <div class="grid">
            <div>
              <strong style="color: #475569; font-size: 11px; text-transform: uppercase;">Billed To:</strong>
              <p style="margin: 4px 0; font-weight: 700; font-size: 14px;">${transactionData.billing_name || 'Valued Customer'}</p>
              <p style="margin: 0; color: #64748b;">Payment Method: ${transactionData.payment_method || 'Online Payment'}</p>
              <p style="margin: 2px 0; color: #64748b;">Bank Ref / UTR: ${bankRef}</p>
            </div>
            <div style="text-align: right;">
              <strong style="color: #475569; font-size: 11px; text-transform: uppercase;">Transaction ID:</strong>
              <p style="margin: 4px 0; font-family: monospace; font-weight: 700;">${txnId}</p>
              <p style="margin: 0; color: #15803d; font-weight: 600;">Status: Completed & Authorized</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>HSN / SAC</th>
                <th>Qty</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>DocuFlow AI ${planName}</strong><br><span style="font-size: 11px; color: #64748b;">30 Days High-Speed Document & Media AI Suite</span></td>
                <td>998313</td>
                <td>1</td>
                <td style="text-align: right;">₹${subtotal}</td>
              </tr>
            </tbody>
          </table>

          <div class="total-box">
            <div class="total-row"><span>Subtotal</span><span>₹${subtotal}</span></div>
            <div class="total-row"><span>CGST (9%)</span><span>₹${cgst}</span></div>
            <div class="total-row"><span>SGST (9%)</span><span>₹${sgst}</span></div>
            <div class="total-row grand-total"><span>Total Paid</span><span>₹${amount}.00</span></div>
          </div>

          <div class="footer">
            This is a computer-generated official tax invoice and requires no physical signature.<br>
            DocuFlow AI Support: support@docuflowai.com | www.docuflowai.com
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const blob = new Blob([invoiceHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
    } else {
      // Fallback direct download
      const a = document.createElement('a');
      a.href = url;
      a.download = `${invoiceNum}.html`;
      a.click();
    }
    toast.success('Official Tax Invoice opened for printing/downloading!');
  };

  const handleAction = (route: string) => {
    onClose();
    navigate(route);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 25 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 25 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-xl bg-slate-900 border border-brand-500/40 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 text-slate-100 max-h-[95vh] overflow-y-auto"
      >
        {/* Background celebration radial glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-r from-brand-500/25 via-purple-500/25 to-pink-500/20 blur-3xl rounded-full pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Celebratory Icon & Badge */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 rounded-3xl bg-gradient-to-tr from-brand-500 via-indigo-600 to-purple-500 p-0.5 shadow-glow flex items-center justify-center">
            <div className="w-full h-full bg-slate-900 rounded-[22px] flex items-center justify-center">
              <Sparkles className="w-8 h-8 sm:w-10 sm:h-10 text-amber-400 animate-bounce" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide uppercase bg-gradient-to-r from-brand-500/20 to-purple-500/20 text-brand-300 border border-brand-500/30 mb-2">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>{planName} Successfully Activated</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Welcome to <span className="gradient-text">DocuFlow AI</span>!
          </h2>

          <p className="text-slate-300 text-xs sm:text-sm mt-2 max-w-md mx-auto leading-relaxed">
            Your transaction was approved and your workspace has been unlocked with full {planName} capabilities.
          </p>
        </div>

        {/* Unlocked Package Perks */}
        <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 mb-5 space-y-3">
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Active Package Privileges
            </span>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> High-Speed Tier
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {perks.map((p) => (
              <div key={p.title} className="flex items-start gap-2.5 p-2 rounded-xl bg-white/[0.03] border border-white/5">
                <div className="w-7 h-7 rounded-lg bg-slate-900 border border-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {p.icon}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white leading-tight">{p.title}</h4>
                  <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Official Transaction Receipt Details Card */}
        <div className="bg-slate-950/90 border border-brand-500/20 rounded-2xl p-4 mb-6 text-xs text-slate-300 space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-2">
            <span className="font-semibold text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Official Transaction Receipt
            </span>
            <span className="font-mono text-emerald-400 font-bold">PAID ₹{amount}.00</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <div>
              <span className="text-slate-500">Transaction ID:</span>
              <p className="font-mono text-slate-200 font-semibold truncate">{txnId}</p>
            </div>
            <div>
              <span className="text-slate-500">Bank UTR / Ref:</span>
              <p className="font-mono text-slate-200 font-semibold truncate">{bankRef}</p>
            </div>
            <div>
              <span className="text-slate-500">Order ID:</span>
              <p className="font-mono text-slate-200 font-semibold truncate">{orderId}</p>
            </div>
            <div>
              <span className="text-slate-500">Payment Date:</span>
              <p className="text-slate-200 font-semibold">{dateStr}</p>
            </div>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">GST Invoice: {invoiceNum}</span>
            <button
              onClick={handleDownloadInvoice}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-brand-300 border border-white/10 text-xs font-semibold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Tax Invoice (PDF)</span>
            </button>
          </div>
        </div>

        {/* Workflow Quick Action Launchers */}
        <div className="space-y-2.5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 text-center mb-1">
            Dive Right Into Your Workflow
          </p>

          <button
            onClick={() => handleAction('/tools/ai/analyzer')}
            className="w-full btn-primary py-3 px-4 rounded-xl font-bold text-sm shadow-glow flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-amber-300" />
              <span>Start Using AI Document Analyser</span>
            </div>
            <ArrowRight className="w-4 h-4" />
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleAction('/tools')}
              className="btn-secondary py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 text-brand-400" />
              <span>Explore All Tools</span>
            </button>

            <button
              onClick={() => handleAction('/dashboard')}
              className="btn-secondary py-2.5 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-2"
            >
              <FileText className="w-4 h-4 text-purple-400" />
              <span>Open Dashboard</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
