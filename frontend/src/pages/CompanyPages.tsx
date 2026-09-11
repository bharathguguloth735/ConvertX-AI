import React, { useState } from 'react';
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
} from 'lucide-react';
import toast from 'react-hot-toast';
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

// ─── API DOCS PAGE ────────────────────────────────────────────────────────────

export const ApiDocsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'curl' | 'python' | 'javascript'>('curl');

  const codeSnippets = {
    curl: `# 1. Extract Invoice Data
curl -X POST "http://localhost:8000/api/ai/extract-invoice" \\
  -H "Authorization: Bearer <YOUR_API_TOKEN>" \\
  -F "file=@sample_invoice.pdf"

# 2. Compress PDF
curl -X POST "http://localhost:8000/api/pdf/compress" \\
  -F "file=@document.pdf" \\
  -F "level=recommended" \\
  -o "compressed.pdf"`,

    python: `import requests

# 1. Summarize Document
url = "http://localhost:8000/api/ai/summarize-file"
headers = {"Authorization": "Bearer YOUR_API_TOKEN"}
files = {"file": open("quarterly_report.pdf", "rb")}
data = {"style": "detailed"}

response = requests.post(url, headers=headers, files=files, data=data)
print(response.json()["summary"])`,

    javascript: `// 1. Ask Document Question
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('question', 'What is the net revenue for Q3?');

const res = await fetch('http://localhost:8000/api/ai/ask-document', {
  method: 'POST',
  headers: { 'Authorization': 'Bearer YOUR_API_TOKEN' },
  body: formData
});
const result = await res.json();
console.log(result.answer);`,
  };

  const copyCode = () => {
    navigator.clipboard.writeText(codeSnippets[activeTab]);
    toast.success('Code snippet copied to clipboard!');
  };

  return (
    <div className="min-h-screen pt-28 pb-20 px-4 sm:px-6 relative z-10">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 mb-4 shadow-sm">
            <Terminal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Developer REST API</span>
          </div>
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight mb-4">
            DocuFlow AI <span className="gradient-text">API Reference</span>
          </h1>
          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Programmatically convert, OCR, extract, and understand documents through our high-performance REST API.
          </p>
          <div className="mt-6 flex justify-center gap-4">
            <a
              href="http://localhost:8000/docs"
              target="_blank"
              rel="noreferrer"
              className="btn-primary inline-flex items-center gap-2 text-sm py-2.5 px-5 shadow-glow"
            >
              <span>Interactive Swagger UI</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Code Snippets Card */}
        <div className="glass-card rounded-2xl p-6 border border-white/10 shadow-2xl">
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2">
              {(['curl', 'python', 'javascript'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-semibold transition-all ${
                    activeTab === tab
                      ? 'bg-brand-500 text-white shadow-glow'
                      : 'bg-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={copyCode}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>

          <pre className="mt-4 p-4 rounded-xl bg-slate-950 font-mono text-xs sm:text-sm text-slate-200 overflow-x-auto leading-relaxed border border-white/5">
            {codeSnippets[activeTab]}
          </pre>
        </div>

        {/* Core Endpoints List */}
        <div>
          <h2 className="text-2xl font-black text-white mb-6">Core API Endpoints</h2>
          <div className="space-y-3">
            {[
              { method: 'POST', path: '/api/pdf/convert', desc: 'Convert between PDF, DOCX, JPG, TXT, and Markdown' },
              { method: 'POST', path: '/api/pdf/merge', desc: 'Combine multiple PDF documents into a single file' },
              { method: 'POST', path: '/api/pdf/compress', desc: 'Compress PDF size with customizable optimization levels' },
              { method: 'POST', path: '/api/ocr/extract', desc: 'High-accuracy OCR for scanned documents, images, and invoices' },
              { method: 'POST', path: '/api/ai/ask-document', desc: 'RAG-powered conversational QA grounded in uploaded documents' },
              { method: 'POST', path: '/api/ai/extract-invoice', desc: 'Extract structured vendor, line items, and financial metrics' },
              { method: 'POST', path: '/api/ai/analyze-resume', desc: 'Parse resume skills, candidate experience, and education' },
              { method: 'POST', path: '/api/ai/translate', desc: 'Multilingual neural translation across 15+ languages' },
              { method: 'POST', path: '/api/media/audio/convert', desc: 'Convert and trim audio tracks with FFmpeg' },
              { method: 'POST', path: '/api/social/instagram/analyze', desc: 'Analyze permitted public social media links for download' },
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
