import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText, Brain,
  ArrowRight, Sparkles, Cpu, Search
} from 'lucide-react';
import { ALL_TOOLS, TOOL_CATEGORIES, searchTools } from '@/utils/tools';
import { LandingUploader } from '@/components/LandingUploader';

// ─── Simplified Hero Section ──────────────────────────────────────────────────

const HeroSection: React.FC = () => {
  return (
    <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden hero-pattern pt-24 pb-8">
      <div className="hero-glow w-96 h-96 bg-brand-500/15 top-16 left-1/4 -translate-x-1/2" />
      <div className="hero-glow w-80 h-80 bg-accent-500/10 top-32 right-1/4 translate-x-1/2" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
        {/* Brand Tagline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider text-brand-400 bg-brand-500/10 border border-brand-500/20 mb-3"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>DocuFlow AI</span>
        </motion.div>

        {/* Primary Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight leading-tight text-white mb-3"
        >
          Convert, edit and manage your files <span className="gradient-text">in one place.</span>
        </motion.h1>

        {/* Short Supporting Text */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-sm sm:text-base text-slate-300 max-w-lg mx-auto mb-8 font-medium leading-relaxed"
        >
          Fast and simple tools for PDF, image, audio and file conversion.
        </motion.p>

        {/* Real In-Place Interactive Uploader */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <LandingUploader />
        </motion.div>
      </div>
    </section>
  );
};

// ─── Tools Section ────────────────────────────────────────────────────────────

const ToolsSection: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const filteredTools = searchQuery
    ? searchTools(searchQuery)
    : activeCategory === 'all'
    ? ALL_TOOLS.slice(0, 16)
    : ALL_TOOLS.filter((t) => t.category === activeCategory);

  return (
    <section id="tools" className="py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-2">
            Available <span className="gradient-text">Tools</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
            Select a tool directly or filter by category.
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md mx-auto mb-6 flex items-center">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            id="tool-search"
            type="text"
            placeholder="Search tools (e.g. JPG, PDF, Compress, Cut)..."
            className="input !pl-11 pr-4 py-2 text-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        {!searchQuery && (
          <div className="flex flex-wrap gap-2 justify-center mb-8">
            {TOOL_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                id={`category-${cat.id}`}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCategory === cat.id
                    ? 'bg-brand-500 text-white shadow-glow'
                    : 'bg-surface-800 text-slate-400 hover:text-white border border-white/5'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Tool Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
          {filteredTools.map((tool, i) => (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className="tool-card group cursor-pointer p-4 rounded-xl bg-surface-900/90 border border-white/10 hover:border-brand-500/50 hover:bg-surface-800/90 transition-all"
              onClick={() => navigate(tool.route)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-surface-800 flex items-center justify-center text-xl flex-shrink-0 border border-white/5">
                  {tool.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-white text-sm truncate group-hover:text-brand-300 transition-colors">
                      {tool.title}
                    </h3>
                    {tool.isNew && (
                      <span className="badge badge-info text-[10px] px-1.5 py-0.2">New</span>
                    )}
                  </div>
                  <p className="text-slate-500 text-xs truncate mt-0.5">{tool.description}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/5">
                <span className="font-mono uppercase text-[11px] text-slate-400">
                  {tool.acceptedFormats[0] || 'any'}
                </span>
                <span className="text-brand-400 font-semibold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-xs">
                  Open <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>

        {!searchQuery && (
          <div className="text-center mt-8">
            <Link to="/tools" className="btn-secondary text-xs px-5 py-2 inline-flex items-center gap-1.5">
              View All 35+ Tools <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

// ─── AI Highlights ────────────────────────────────────────────────────────────

const AISection: React.FC = () => {
  const navigate = useNavigate();

  const aiTools = [
    {
      title: 'Ask Your Document',
      desc: 'Chat with any document using AI and page citations.',
      icon: <Brain className="w-5 h-5 text-brand-400" />,
      route: '/tools/ai/ask-document',
    },
    {
      title: 'Invoice AI Extractor',
      desc: 'Extract structured vendor, line items, and totals automatically.',
      icon: <FileText className="w-5 h-5 text-emerald-400" />,
      route: '/tools/ai/invoice',
    },
    {
      title: 'Document Summarizer',
      desc: 'Get quick key points and summaries from long documents.',
      icon: <Sparkles className="w-5 h-5 text-amber-400" />,
      route: '/tools/ai/summarize',
    },
    {
      title: 'OCR Text Extractor',
      desc: 'Accurately extract text from scanned images and PDFs.',
      icon: <Cpu className="w-5 h-5 text-violet-400" />,
      route: '/tools/ocr',
    },
  ];

  return (
    <section id="ai-features" className="py-12 px-4 bg-surface-950/40 border-y border-white/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-black text-white mb-1.5">
            AI <span className="gradient-text">Intelligence</span>
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm max-w-md mx-auto">
            Extract insights and answers directly from your files.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3.5">
          {aiTools.map((t) => (
            <div
              key={t.title}
              onClick={() => navigate(t.route)}
              className="glass-card cursor-pointer p-4 rounded-xl hover:border-brand-500/40 transition-all flex items-start gap-3.5"
            >
              <div className="p-2.5 rounded-lg bg-surface-800 border border-white/5 flex-shrink-0">
                {t.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm mb-1">{t.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed mb-2">{t.desc}</p>
                <span className="text-brand-400 text-xs font-semibold inline-flex items-center gap-1">
                  Try Tool <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

// ─── Landing Page ─────────────────────────────────────────────────────────────

const LandingPage: React.FC = () => (
  <div className="min-h-screen">
    <HeroSection />
    <ToolsSection />
    <AISection />
  </div>
);

export default LandingPage;
