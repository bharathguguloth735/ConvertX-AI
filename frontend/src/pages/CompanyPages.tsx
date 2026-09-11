import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Zap,
  Check,
  Sparkles,
  ArrowRight,
  ExternalLink,
  Mail,
  Clock,
  Send,
  Loader2,
  Copy,
  Terminal,
  BookOpen,
  Lock,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
  Key,
  Trash2,
  ShieldCheck,
  Plus,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import apiClient from '@/api/client';
import { SUBSCRIPTION_PLANS } from '@/utils/tools';
import { useAuthStore } from '@/store/authStore';
import { PaymentModal, PaymentPlan } from '@/components/payment/PaymentModal';
import { WelcomeProPrompt } from '@/components/payment/WelcomeProPrompt';

// ─── ABOUT PAGE ───────────────────────────────────────────────────────────────

export const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 relative z-10">
      <div className="max-w-5xl mx-auto space-y-16">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-brand-300 bg-brand-500/10 border border-brand-500/20 mb-4 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" />
            <span>The All-In-One Document Platform</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4 leading-tight">
            About <span className="gradient-text">DocuFlow AI</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            We are building the modern standard for document transformation, media processing, and document understanding — powered by state-of-the-art AI.
          </p>
        </div>

        {/* Mission Section */}
        <div className="glass-card rounded-2xl p-8 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden">
          <div className="hero-glow w-72 h-72 bg-brand-500/10 -top-10 -right-10 pointer-events-none" />
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">Our Mission</h2>
          <p className="text-slate-300 text-base sm:text-lg leading-relaxed mb-6">
            Every day, millions of professionals and developers struggle with fragmented document utilities — converters that bombard users with ads, desktop software that takes hours to install, and disconnected AI tools.
          </p>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            DocuFlow AI brings PDF manipulation, audio/video encoding, OCR extraction, and generative AI under one unified, lightning-fast workspace. We treat documents not just as static files, but as rich data waiting to be queried, summarized, translated, and automated.
          </p>
        </div>

        {/* 4 Pillars */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-10">
            Engineered on <span className="gradient-text">Core Principles</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <Lock className="w-6 h-6 text-emerald-400" />,
                title: 'Zero Data Retention',
                desc: 'All processed documents are encrypted in-transit and automatically purged after 24 hours. Your sensitive data remains private.',
              },
              {
                icon: <Zap className="w-6 h-6 text-brand-400" />,
                title: 'Instant Execution',
                desc: 'High-performance async backend with PyMuPDF, FFmpeg, and GPU-accelerated inference for sub-second responses.',
              },
              {
                icon: <Cpu className="w-6 h-6 text-accent-400" />,
                title: 'Deep Intelligence',
                desc: 'RAG-powered chat, automated invoice extraction, resume parsing, and multi-language translation at your fingertips.',
              },
              {
                icon: <Layers className="w-6 h-6 text-cyan-400" />,
                title: 'Universal Formats',
                desc: 'Supports 50+ formats including PDF, Word, Excel, JPG, PNG, WEBP, MP3, WAV, MP4, MOV, and direct social URLs.',
              },
            ].map((pillar) => (
              <div
                key={pillar.title}
                className="glass-card rounded-2xl p-6 border border-white/5 hover:border-white/15 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center mb-4">
                  {pillar.icon}
                </div>
                <h3 className="font-bold text-white text-base mb-2">{pillar.title}</h3>
                <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">{pillar.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tech Stack Banner */}
        <div className="glass-card rounded-2xl p-8 border border-white/10 text-center">
          <h3 className="text-xl font-bold text-white mb-2">Built with Modern Architecture</h3>
          <p className="text-slate-400 text-sm max-w-xl mx-auto mb-6">
            FastAPI async backend, React 18 frontend, Whisper AI audio engine, Tesseract OCR, PyMuPDF, and Gemini-grade RAG models.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {['FastAPI', 'React 18', 'TypeScript', 'Whisper AI', 'PyMuPDF', 'FFmpeg', 'TailwindCSS', 'PostgreSQL'].map((t) => (
              <span key={t} className="px-3 py-1 rounded-lg text-xs font-mono bg-slate-900 text-slate-300 border border-white/10">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center pt-4">
          <Link
            to="/tools"
            className="btn-primary inline-flex items-center gap-2 text-base px-8 py-3.5 shadow-glow"
          >
            <Sparkles className="w-5 h-5" /> Explore All Tools
          </Link>
        </div>
      </div>
    </div>
  );
};

// ─── BLOG PAGE ────────────────────────────────────────────────────────────────

interface BlogPost {
  id: string;
  title: string;
  category: string;
  readTime: string;
  date: string;
  snippet: string;
  content: string[];
}

const BLOG_POSTS: BlogPost[] = [
  {
    id: 'rag-document-chat',
    title: 'How RAG & Vector Embeddings Enable Accurate Document Chat',
    category: 'AI & Engineering',
    readTime: '4 min read',
    date: 'Sep 2026',
    snippet: 'Exploring how chunking strategies, semantic indexing, and grounded retrieval eliminate hallucinations when chatting with multi-page legal and financial PDFs.',
    content: [
      'Retrieval-Augmented Generation (RAG) is transforming how professionals interact with dense documents. Unlike standard generative models that attempt to absorb entire PDF files into memory, RAG splits documents into overlapping semantic chunks and scores them against user queries.',
      'At DocuFlow AI, our chunking pipeline preserves table boundaries, headings, and page coordinates so citations can pinpoint the exact page and paragraph where answers originate.',
      'This hybrid approach guarantees verifiable answers without model hallucination, making it dependable for audited financial reports and contracts.',
    ],
  },
  {
    id: 'zero-retention-security',
    title: 'Designing Zero-Retention File Pipelines for Enterprise Security',
    category: 'Security',
    readTime: '3 min read',
    date: 'Aug 2026',
    snippet: 'Why privacy is non-negotiable in document processing: encrypting temporary files, strict memory isolation, and automated 24-hour purge queues.',
    content: [
      'When processing invoices containing confidential customer lists or proprietary resumes with contact details, trust is paramount.',
      'DocuFlow AI implements a zero-retention policy. Temporary upload directories are isolated per session, files are stored with randomly generated cryptographic tokens, and automated cleanup daemons purge expired files after 24 hours.',
      'Furthermore, local-first processing pipelines ensure files never leave the regional cluster without explicit user consent.',
    ],
  },
  {
    id: 'high-speed-media-processing',
    title: 'Optimizing Media Transcoding with FFmpeg and Asynchronous Queues',
    category: 'Architecture',
    readTime: '5 min read',
    date: 'Jul 2026',
    snippet: 'How we achieve instantaneous video trimming, audio conversions, and MP3 extraction in the browser and cloud.',
    content: [
      'Media conversion has traditionally been resource-heavy. By combining FastAPI async I/O with optimized FFmpeg stream copy pipelines, audio tracks can be stripped from 4K videos in under two seconds.',
      'When re-encoding is not strictly needed (e.g. cutting MP4 clips on keyframes), we pass streams through without recompression, yielding zero quality loss and immediate results.',
    ],
  },
  {
    id: 'ocr-document-extraction',
    title: 'Extracting High-Fidelity Text from Degraded Document Scans with AI OCR',
    category: 'Tutorial',
    readTime: '4 min read',
    date: 'Jun 2026',
    snippet: 'Enhancing skewed, low-contrast, and multi-lingual scans before running OCR to achieve 99%+ character accuracy across 8 Indian languages.',
    content: [
      'Standard OCR engines struggle with mobile camera photos of paper documents. We implement pre-processing filters including adaptive binarization, skew correction, and morphological noise removal.',
      'This pre-pass dramatically improves recognition rates for Indian scripts including Hindi, Tamil, Telugu, and Kannada before the text is parsed into structured formats.',
    ],
  },
];

export const BlogPage: React.FC = () => {
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 relative z-10">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-accent-300 bg-accent-500/10 border border-accent-500/20 mb-4 shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-accent-400" />
            <span>Engineering & Product Insights</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
            DocuFlow AI <span className="gradient-text">Blog</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Deep dives into AI document analysis, media processing, privacy architectures, and performance engineering.
          </p>
        </div>

        {/* Post Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {BLOG_POSTS.map((post) => (
            <div
              key={post.id}
              className="glass-card rounded-2xl p-6 border border-white/10 hover:border-brand-500/40 transition-all flex flex-col justify-between cursor-pointer group"
              onClick={() => setSelectedPost(post)}
            >
              <div>
                <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                  <span className="px-2.5 py-1 rounded-md bg-white/5 border border-white/10 font-semibold text-brand-300">
                    {post.category}
                  </span>
                  <div className="flex items-center gap-2 text-slate-500 font-mono">
                    <span>{post.date}</span>
                    <span>•</span>
                    <span>{post.readTime}</span>
                  </div>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white mb-3 group-hover:text-brand-300 transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  {post.snippet}
                </p>
              </div>

              <div className="flex items-center text-xs font-bold text-brand-400 group-hover:translate-x-1 transition-transform">
                Read Article <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </div>
            </div>
          ))}
        </div>

        {/* Reader Modal */}
        <AnimatePresence>
          {selectedPost && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
              onClick={() => setSelectedPost(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="bg-[#0b1329] border border-white/15 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4 pb-3 border-b border-white/10">
                  <span className="px-2.5 py-1 rounded-md bg-brand-500/10 text-brand-300 font-semibold border border-brand-500/20">
                    {selectedPost.category}
                  </span>
                  <div className="flex items-center gap-3">
                    <span>{selectedPost.readTime}</span>
                    <button
                      onClick={() => setSelectedPost(null)}
                      className="text-slate-400 hover:text-white text-lg font-bold"
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <h2 className="text-2xl sm:text-3xl font-black text-white mb-6 leading-tight">
                  {selectedPost.title}
                </h2>

                <div className="space-y-4 text-slate-300 text-sm sm:text-base leading-relaxed">
                  {selectedPost.content.map((p, idx) => (
                    <p key={idx}>{p}</p>
                  ))}
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
                  <button
                    onClick={() => setSelectedPost(null)}
                    className="btn-secondary text-sm py-2 px-4"
                  >
                    Close Article
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── PRICING PAGE ─────────────────────────────────────────────────────────────

export const PricingPage: React.FC = () => {
  const { user } = useAuthStore();
  const [selectedPlan, setSelectedPlan] = useState<PaymentPlan | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [welcomePromptData, setWelcomePromptData] = useState<any>(null);

  const activePlan = (user?.plan || localStorage.getItem('docuflow_active_plan') || 'free').toLowerCase();

  const handlePlanClick = (plan: any) => {
    if (plan.id === 'free') {
      toast.success('You already have access to the Free tier!');
      return;
    }
    setSelectedPlan(plan);
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSuccess = (transactionData: any) => {
    setWelcomePromptData(transactionData);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 relative z-10">
      <div className="max-w-6xl mx-auto space-y-16">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 mb-4 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Clear, Transparent Pricing</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
            Plans for Every <span className="gradient-text">Workflow</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Start completely free with zero credit card required. Upgrade as your file processing requirements scale.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SUBSCRIPTION_PLANS.map((plan) => {
            const isCurrent = plan.id === activePlan;
            return (
              <div
                key={plan.id}
                className={`relative glass-card rounded-2xl p-6 flex flex-col justify-between transition-all ${
                  isCurrent
                    ? 'border-brand-500 ring-2 ring-brand-500/30 bg-brand-500/5'
                    : plan.id === 'pro'
                    ? 'border-brand-500/40 ring-1 ring-brand-500/30'
                    : 'border-white/10'
                }`}
              >
                {plan.id === 'pro' && !isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-accent-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-glow">
                    Most Popular
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-slate-950 text-xs font-black px-3 py-1 rounded-full shadow-md">
                    Current Active Plan
                  </div>
                )}
                <div>
                  <h3 className="font-bold text-lg text-white mb-1">{plan.name}</h3>
                  <div className="mb-4">
                    <span className="text-3xl font-black text-white">
                      {plan.price === 0 ? 'Free' : `₹${plan.price}`}
                    </span>
                    {plan.price > 0 && <span className="text-slate-400 text-sm ml-1">/month</span>}
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {plan.features.map((f) => (
                      <li
                        key={f.label}
                        className={`flex items-start gap-2 text-xs sm:text-sm ${
                          f.included ? 'text-slate-300' : 'text-slate-600 line-through'
                        }`}
                      >
                        <Check
                          className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            f.included ? 'text-emerald-400' : 'text-slate-700'
                          }`}
                        />
                        <span>{f.label}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  {isCurrent ? (
                    <div className="text-center py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-sm">
                      Current Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePlanClick(plan)}
                      className={`w-full block text-center py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                        plan.id === 'pro'
                          ? 'bg-brand-500 hover:bg-brand-600 text-white shadow-glow'
                          : 'btn-secondary'
                      }`}
                    >
                      {plan.price === 0 ? 'Get Started Free' : `Choose ${plan.name}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Payment Gateway Modal */}
        {selectedPlan && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            plan={selectedPlan}
            onPaymentSuccess={handlePaymentSuccess}
          />
        )}

        {/* Welcome to DocuFlow AI Prompt */}
        {welcomePromptData && (
          <WelcomeProPrompt
            isOpen={!!welcomePromptData}
            onClose={() => setWelcomePromptData(null)}
            transactionData={welcomePromptData}
          />
        )}

        {/* Feature Matrix */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/10">
          <h2 className="text-xl sm:text-2xl font-black text-white mb-6 text-center">
            Detailed Plan Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-400">
                  <th className="pb-3 font-semibold">Feature</th>
                  <th className="pb-3 font-semibold text-center">Free</th>
                  <th className="pb-3 font-semibold text-center">Student</th>
                  <th className="pb-3 font-semibold text-center text-brand-300">Pro</th>
                  <th className="pb-3 font-semibold text-center">Business</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-300">
                <tr>
                  <td className="py-3 font-medium">Monthly Conversions</td>
                  <td className="py-3 text-center">10</td>
                  <td className="py-3 text-center">100</td>
                  <td className="py-3 text-center text-brand-300 font-semibold">1,000</td>
                  <td className="py-3 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Cloud Storage</td>
                  <td className="py-3 text-center">500 MB</td>
                  <td className="py-3 text-center">5 GB</td>
                  <td className="py-3 text-center text-brand-300 font-semibold">25 GB</td>
                  <td className="py-3 text-center">100 GB</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Max File Size</td>
                  <td className="py-3 text-center">10 MB</td>
                  <td className="py-3 text-center">50 MB</td>
                  <td className="py-3 text-center text-brand-300 font-semibold">200 MB</td>
                  <td className="py-3 text-center">500 MB</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">AI Requests / mo</td>
                  <td className="py-3 text-center text-slate-600">—</td>
                  <td className="py-3 text-center">50</td>
                  <td className="py-3 text-center text-brand-300 font-semibold">500</td>
                  <td className="py-3 text-center">Unlimited</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">Batch Zip Processing</td>
                  <td className="py-3 text-center text-slate-600">—</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="py-3 font-medium">REST API Access</td>
                  <td className="py-3 text-center text-slate-600">—</td>
                  <td className="py-3 text-center text-slate-600">—</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                  <td className="py-3 text-center text-emerald-400">✓</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── CONTACT PAGE ─────────────────────────────────────────────────────────────

export const ContactPage: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: 'support',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.message) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
      toast.success('Message sent! Our support team will get back to you within 2 hours.');
    }, 1000);
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 relative z-10">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-blue-300 bg-blue-500/10 border border-blue-500/20 mb-4 shadow-sm">
            <Mail className="w-3.5 h-3.5 text-blue-400" />
            <span>24/7 Global Support</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
            Get in <span className="gradient-text">Touch</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
            Have a question about DocuFlow AI, need high-volume enterprise billing, or want to report an issue? We're here to help.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Info Column */}
          <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6 border border-white/10 space-y-4">
              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Email Us</p>
                  <p className="text-sm font-bold text-white">support@docuflow.ai</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Response Time</p>
                  <p className="text-sm font-bold text-white">&lt; 2 Hours Average</p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-white">
                <div className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Service Status</p>
                  <p className="text-sm font-bold text-emerald-400">99.99% Operational</p>
                </div>
              </div>
            </div>

            <div className="glass-card rounded-2xl p-6 border border-white/10 text-xs text-slate-400 space-y-2">
              <p className="font-semibold text-white">Enterprise & Custom Workflows</p>
              <p>For custom volume deployments, dedicated VPC installations, or custom OCR model training, contact our sales engineering desk at enterprise@docuflow.ai.</p>
            </div>
          </div>

          {/* Form Column */}
          <div className="md:col-span-2">
            <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl">
              {submitted ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <Check className="w-8 h-8" />
                  </div>
                  <h3 className="text-2xl font-bold text-white">Thank you for reaching out!</h3>
                  <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Your message has been dispatched to our engineering team. We typically respond within two hours.
                  </p>
                  <button
                    onClick={() => {
                      setSubmitted(false);
                      setForm({ name: '', email: '', subject: 'support', message: '' });
                    }}
                    className="btn-secondary text-sm py-2 px-5 mt-4"
                  >
                    Send Another Message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                        Your Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="John Doe"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="john@company.com"
                        className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                      Inquiry Type
                    </label>
                    <select
                      value={form.subject}
                      onChange={(e) => setForm({ ...form, subject: e.target.value })}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-brand-500"
                    >
                      <option value="support">Technical Support & Troubleshooting</option>
                      <option value="enterprise">Enterprise Sales & Custom Quotas</option>
                      <option value="billing">Subscription & Billing Questions</option>
                      <option value="feedback">Product Feedback & Tool Requests</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1.5">
                      Message *
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Describe your question, request, or issue in detail..."
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-500 leading-relaxed resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold shadow-glow"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Sending message...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Submit Message</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── API DOCS & DEVELOPER HUB PAGE ──────────────────────────────────────────

interface ApiKeyItem {
  id: string;
  name: string;
  key_prefix: string;
  rate_limit_per_min: number;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export const ApiDocsPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'curl' | 'python' | 'javascript' | 'webhooks'>('curl');
  const [activeSnippetCategory, setActiveSnippetCategory] = useState<'v1_convert' | 'batch' | 'signature' | 'redact'>('v1_convert');

  // API Key Management State
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState<boolean>(false);
  const [newKeyName, setNewKeyName] = useState<string>('');
  const [isCreatingKey, setIsCreatingKey] = useState<boolean>(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ name: string; full_key: string } | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      loadApiKeys();
    }
  }, [isAuthenticated]);

  const loadApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await apiClient.get('/developer/api-keys');
      setApiKeys(res.data || []);
    } catch (err) {
      // User might be guest or offline
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      toast.error('Please enter a descriptive name for your API key.');
      return;
    }

    setIsCreatingKey(true);
    try {
      const res = await apiClient.post('/developer/api-keys', { name: newKeyName.trim() });
      setNewlyCreatedKey({
        name: res.data.name,
        full_key: res.data.full_key,
      });
      setNewKeyName('');
      toast.success('API key generated successfully!');
      loadApiKeys();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to generate API key.');
    } finally {
      setIsCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? Any applications using it will immediately lose access.')) {
      return;
    }
    try {
      await apiClient.delete(`/developer/api-keys/${keyId}`);
      toast.success('API key revoked.');
      setApiKeys((prev) => prev.filter((k) => k.id !== keyId));
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Failed to revoke API key.');
    }
  };

  const codeSnippets: Record<string, Record<string, string>> = {
    v1_convert: {
      curl: `# 🚀 Convert PDF to DOCX using DocuFlow Developer API
curl -X POST "http://localhost:8000/api/v1/convert" \\
  -H "X-API-Key: df_live_your_secret_key_here" \\
  -F "file=@financial_report.pdf" \\
  -F "operation=pdf_to_docx" \\
  -o "financial_report.docx"`,

      python: `import requests

# 🚀 Universal Convert via Python SDK
url = "http://localhost:8000/api/v1/convert"
headers = {"X-API-Key": "df_live_your_secret_key_here"}

with open("quarterly_report.pdf", "rb") as f:
    files = {"file": f}
    data = {"operation": "pdf_to_docx"}
    response = requests.post(url, headers=headers, files=files, data=data)

if response.status_code == 200:
    with open("converted.docx", "wb") as out:
        out.write(response.content)
    print("Document successfully converted and saved!")
else:
    print(f"Error {response.status_code}: {response.text}")`,

      javascript: `import axios from 'axios';
import fs from 'fs';
import FormData from 'form-data';

// 🚀 Universal Convert via Node.js
async function convertDocument() {
  const form = new FormData();
  form.append('file', fs.createReadStream('contract.pdf'));
  form.append('operation', 'pdf_to_docx');

  const response = await axios.post('http://localhost:8000/api/v1/convert', form, {
    headers: {
      ...form.getHeaders(),
      'X-API-Key': 'df_live_your_secret_key_here'
    },
    responseType: 'arraybuffer'
  });

  fs.writeFileSync('contract.docx', response.data);
  console.log('Conversion finished!');
}

convertDocument();`,

      webhooks: `# 🔒 Webhook Event Verification (HMAC-SHA256)
# Each incoming webhook from DocuFlow includes an 'X-Signature' header:
# X-Signature: sha256=<computed_hex_digest>

import hmac
import hashlib

def verify_webhook_signature(payload_bytes, signature_header, secret):
    expected = "sha256=" + hmac.new(secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)`
    },

    batch: {
      curl: `# 📦 Batch Processing Engine (ZIP Archive Export)
curl -X POST "http://localhost:8000/api/batch/convert" \\
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \\
  -F "files=@file1.pdf" \\
  -F "files=@file2.pdf" \\
  -F "operation=pdf_to_docx"`,

      python: `import requests

# 📦 Convert Multiple Files in Parallel
url = "http://localhost:8000/api/batch/convert"
headers = {"Authorization": "Bearer YOUR_AUTH_TOKEN"}

files = [
    ('files', ('doc1.pdf', open('doc1.pdf', 'rb'), 'application/pdf')),
    ('files', ('doc2.pdf', open('doc2.pdf', 'rb'), 'application/pdf'))
]
data = {'operation': 'pdf_to_docx'}

res = requests.post(url, headers=headers, files=files, data=data)
data = res.json()
print(f"Batch {data['batch_id']} completed: {data['successful_count']} files packaged.")
print(f"ZIP Download URL: {data['zip_download_url']}")`,

      javascript: `import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';

// 📦 Bulk Batch Conversion via Node.js
const form = new FormData();
form.append('files', fs.createReadStream('doc1.pdf'));
form.append('files', fs.createReadStream('doc2.pdf'));
form.append('operation', 'pdf_to_docx');

const res = await axios.post('http://localhost:8000/api/batch/convert', form, {
  headers: {
    ...form.getHeaders(),
    Authorization: 'Bearer YOUR_AUTH_TOKEN'
  }
});
console.log('ZIP URL:', res.data.zip_download_url);`,

      webhooks: `# Webhook payload sent on batch completion:
{
  "event": "batch.completed",
  "batch_id": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "successful_count": 15,
  "failed_count": 0,
  "zip_download_url": "/api/files/download/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "timestamp": "2026-09-11T14:30:00Z"
}`
    },

    signature: {
      curl: `# ✍️ Stamp Cryptographic Signature into PDF
curl -X POST "http://localhost:8000/api/pdf/sign-and-fill" \\
  -F "file=@agreement.pdf" \\
  -F 'elements_json=[{"type":"signature","page":1,"x":100,"y":700,"width":150,"height":50,"data":"data:image/png;base64,..."}]' \\
  -F "signer_name=Jane Doe" \\
  -o "signed_agreement.pdf"`,

      python: `import requests
import json

# ✍️ Sign & Fill Document Programmatically
url = "http://localhost:8000/api/pdf/sign-and-fill"
elements = [
    {
        "type": "signature",
        "page": 1,
        "x": 120,
        "y": 680,
        "width": 140,
        "height": 45,
        "data": "data:image/png;base64,iVBORw0KGgo..."
    },
    {
        "type": "date",
        "page": 1,
        "x": 350,
        "y": 695,
        "text": "2026-09-11",
        "font_size": 12
    }
]

files = {"file": open("nda_template.pdf", "rb")}
data = {"elements_json": json.dumps(elements), "signer_name": "Dr. Aris Thorne"}

res = requests.post(url, files=files, data=data)
with open("nda_certified_signed.pdf", "wb") as f:
    f.write(res.content)
print("Signed PDF written with cryptographic audit trail!")`,

      javascript: `// ✍️ Flatten Tamper-Evident Signatures in Browser or Node
const formData = new FormData();
formData.append('file', pdfBlob);
formData.append('elements_json', JSON.stringify([
  { type: 'signature', page: 1, x: 100, y: 700, width: 150, height: 50, data: sigBase64 }
]));
formData.append('signer_name', 'Alex Mercer');

const response = await fetch('/api/pdf/sign-and-fill', {
  method: 'POST',
  body: formData
});
const signedPdfBlob = await response.blob();`,

      webhooks: `# Audit trail embedded in PDF Producer metadata:
{
  "certified_by": "DocuFlow AI Cryptographic Signer",
  "document_sha256": "4b227777d4dd1fc61c6f884f48641d02b4d121d3fd328cb08b5531fcacdabf8a",
  "signer": "Alex Mercer",
  "timestamp": "2026-09-11T14:35:00Z"
}`
    },

    redact: {
      curl: `# 🛡️ 1. Scan PDF for PII Entities (Email, SSN, Credit Cards, Aadhaar)
curl -X POST "http://localhost:8000/api/pdf/scan-pii" \\
  -F "file=@confidential_statement.pdf"

# 🛡️ 2. Apply Permanent Pixel & Vector Redactions
curl -X POST "http://localhost:8000/api/pdf/apply-redactions" \\
  -F "file=@confidential_statement.pdf" \\
  -F 'redactions_json=[{"page":1,"bbox":[120,340,300,360],"category":"credit_card"}]' \\
  -o "sanitized_statement.pdf"`,

      python: `import requests
import json

# 🛡️ Automated PII Discovery & Deep Sanitization
scan_url = "http://localhost:8000/api/pdf/scan-pii"
files = {"file": open("customer_records.pdf", "rb")}
scan_res = requests.post(scan_url, files=files).json()

print(f"Found {scan_res['total_found']} sensitive PII instances:")
for pii in scan_res["redactions"]:
    print(f" - [{pii['category']}] {pii['text_preview']} on page {pii['page']}")

# Apply burn-in
apply_url = "http://localhost:8000/api/pdf/apply-redactions"
files = {"file": open("customer_records.pdf", "rb")}
data = {"redactions_json": json.dumps(scan_res["redactions"])}

clean_pdf = requests.post(apply_url, files=files, data=data).content
with open("customer_records_redacted.pdf", "wb") as f:
    f.write(clean_pdf)
print("Sanitized document saved. Glyph streams and pixels purged.")`,

      javascript: `// 🛡️ Client-side trigger for PII Redaction
const scanRes = await fetch('/api/pdf/scan-pii', { method: 'POST', body: formData });
const { redactions } = await scanRes.json();

// Confirm and burn out
const applyForm = new FormData();
applyForm.append('file', file);
applyForm.append('redactions_json', JSON.stringify(redactions));

const res = await fetch('/api/pdf/apply-redactions', { method: 'POST', body: applyForm });
const sanitizedBlob = await res.blob();`,

      webhooks: `# PII Scanner supports categories:
- email (RFC 5322 regex)
- phone (International & E.164)
- credit_card (Visa, MC, Amex, Discover with Luhn Check)
- ssn (US Social Security Numbers)
- aadhaar (Indian 12-digit UIDAI format)
- pan (Indian Income Tax Permanent Account Number)
- ip_address (IPv4 / IPv6 addresses)`
    }
  };

  const currentSnippet = codeSnippets[activeSnippetCategory]?.[activeTab] || '';

  const copyCode = () => {
    navigator.clipboard.writeText(currentSnippet);
    toast.success('Code snippet copied to clipboard!');
  };

  const copyApiKey = (keyText: string) => {
    navigator.clipboard.writeText(keyText);
    toast.success('API Key copied to clipboard!');
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 relative z-10">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 mb-4 shadow-sm">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Developer REST API & Webhooks</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
            DocuFlow AI <span className="gradient-text">Developer Platform</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Integrate enterprise-grade document conversion, digital signatures, AI extraction, and PII redaction directly into your applications with unified REST endpoints and webhooks.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-5 shadow-glow"
            >
              <span>Interactive Swagger UI</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            <a
              href="http://localhost:8000/redoc"
              target="_blank"
              rel="noreferrer"
              className="btn-secondary inline-flex items-center gap-2 text-sm py-2.5 px-5"
            >
              <span>ReDoc Specification</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* API Key Management Portal */}
        <div className="glass-card rounded-2xl p-6 sm:p-8 border border-white/10 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-brand-400" />
                <h2 className="text-xl font-bold text-white">Live API Keys</h2>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">
                Pass your API key in the <code className="text-brand-300 font-mono">X-API-Key</code> request header or as a Bearer token.
              </p>
            </div>

            {isAuthenticated && (
              <form onSubmit={handleCreateKey} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Key label (e.g. Production Web)"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  className="bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500 w-48 sm:w-56"
                />
                <button
                  type="submit"
                  disabled={isCreatingKey}
                  className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5 whitespace-nowrap shadow-glow"
                >
                  {isCreatingKey ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  <span>Generate Key</span>
                </button>
              </form>
            )}
          </div>

          {/* Newly Created Key Banner (Shown Only Once) */}
          <AnimatePresence>
            {newlyCreatedKey && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-4 text-emerald-300 space-y-2 shadow-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    New API Key Generated: {newlyCreatedKey.name}
                  </span>
                  <button
                    onClick={() => setNewlyCreatedKey(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
                <p className="text-xs text-emerald-200/80">
                  ⚠️ Make sure to copy this key now. For security purposes, it will never be displayed again.
                </p>
                <div className="flex items-center gap-2 bg-slate-950 p-2 rounded-lg border border-emerald-500/30">
                  <code className="font-mono text-xs text-emerald-400 flex-1 select-all break-all">
                    {newlyCreatedKey.full_key}
                  </code>
                  <button
                    onClick={() => copyApiKey(newlyCreatedKey.full_key)}
                    className="p-1.5 rounded-md bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 transition"
                    title="Copy Key"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Keys List */}
          {!isAuthenticated ? (
            <div className="text-center py-8 border border-dashed border-white/10 rounded-xl bg-slate-900/30">
              <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">Sign in to manage your developer credentials</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Generate production API keys with up to 1,000 requests/minute and configure HMAC webhooks.
              </p>
              <Link to="/login" className="btn-primary text-xs py-2 px-4 inline-flex items-center gap-1.5">
                <span>Sign In to DocuFlow</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : isLoadingKeys ? (
            <div className="py-6 flex justify-center text-slate-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No API keys created yet. Enter a label above and click "Generate Key" to get your first secret key.
            </div>
          ) : (
            <div className="space-y-2.5">
              {apiKeys.map((k) => (
                <div
                  key={k.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-white/5 gap-3"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-semibold text-white">{k.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-white/5">
                          {k.rate_limit_per_min} req/min
                        </span>
                      </div>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 mt-0.5 font-mono">
                        <span>Prefix: {k.key_prefix}</span>
                        {k.last_used_at && (
                          <span>• Last used: {new Date(k.last_used_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handleRevokeKey(k.id)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-red-300 bg-red-950/40 hover:bg-red-950/70 border border-red-900/50 flex items-center space-x-1.5 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Revoke</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Interactive Code Snippets */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            {/* Category Selector */}
            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: 'v1_convert', label: 'Universal /api/v1/convert' },
                { id: 'batch', label: 'Batch Converter' },
                { id: 'signature', label: 'Digital Signatures' },
                { id: 'redact', label: 'PII Redaction' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setActiveSnippetCategory(cat.id as any)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeSnippetCategory === cat.id
                      ? 'bg-white/15 text-white font-semibold'
                      : 'text-slate-400 hover:text-white bg-transparent'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Language Selector */}
            <div className="flex items-center gap-1.5">
              {(['curl', 'python', 'javascript', 'webhooks'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono uppercase font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-brand-500 text-white shadow-glow'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab === 'javascript' ? 'Node.js' : tab}
                </button>
              ))}
              <button
                onClick={copyCode}
                className="btn-secondary text-xs py-1 px-2.5 ml-2 flex items-center gap-1"
                title="Copy Snippet"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
          </div>

          <pre className="p-4 rounded-xl bg-slate-950 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto leading-relaxed border border-white/5">
            {currentSnippet}
          </pre>
        </div>

        {/* Flagship REST Endpoints List */}
        <div>
          <h2 className="text-2xl font-black text-white mb-6">Flagship Enterprise Endpoints</h2>
          <div className="space-y-3">
            {[
              { method: 'POST', path: '/api/v1/convert', desc: 'Universal public conversion endpoint authenticated via X-API-Key header' },
              { method: 'POST', path: '/api/batch/convert', desc: 'Convert up to 50 files in parallel and export as compressed .ZIP' },
              { method: 'POST', path: '/api/pdf/sign-and-fill', desc: 'Embed signatures, form fields, and cryptographic SHA-256 audit stamps' },
              { method: 'POST', path: '/api/pdf/scan-pii', desc: 'Detect credit cards, SSN, Aadhaar, PAN, emails, and phone numbers' },
              { method: 'POST', path: '/api/pdf/apply-redactions', desc: 'Burn out PII and physically purge glyph vectors & raster pixels' },
              { method: 'POST', path: '/api/ocr/extract', desc: 'High-accuracy OCR for scanned documents, images, and invoices' },
              { method: 'POST', path: '/api/ai/extract-invoice', desc: 'Extract structured vendor, line items, and financial metrics' },
              { method: 'POST', path: '/api/developer/webhooks', desc: 'Register HMAC-SHA256 signed webhooks for async completion events' },
            ].map((ep) => (
              <div
                key={ep.path}
                className="bg-slate-900/60 p-4 rounded-xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                    {ep.method}
                  </span>
                  <code className="text-sm text-white font-mono">{ep.path}</code>
                </div>
                <p className="text-xs text-slate-400">{ep.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

