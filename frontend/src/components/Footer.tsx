import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Zap, Lock, Shield, Users } from 'lucide-react';
import { useLiveViewers } from '@/hooks/useLiveViewers';

interface FooterItem {
  label: string;
  to: string;
}

interface FooterColumn {
  title: string;
  links: FooterItem[];
}

const FOOTER_SECTIONS: FooterColumn[] = [
  {
    title: 'Tools',
    links: [
      { label: 'PDF Tools', to: '/tools?category=pdf' },
      { label: 'Image Tools', to: '/tools?category=image' },
      { label: 'Audio Tools', to: '/tools?category=audio' },
      { label: 'Video Tools', to: '/tools?category=video' },
      { label: 'OCR', to: '/tools/ocr' },
    ],
  },
  {
    title: 'AI Features',
    links: [
      { label: 'Ask Document', to: '/tools/ai/ask-document' },
      { label: 'Invoice AI', to: '/tools/ai/invoice' },
      { label: 'Resume AI', to: '/tools/ai/resume' },
      { label: 'Summarizer', to: '/tools/ai/summarize' },
      { label: 'Translator', to: '/tools/ai/translate' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Blog', to: '/blog' },
      { label: 'Pricing', to: '/pricing' },
      { label: 'Contact', to: '/contact' },
      { label: 'API Docs', to: '/docs' },
    ],
  },
];

export const Footer: React.FC = () => {
  const location = useLocation();
  const { liveViewers, totalViews } = useLiveViewers();

  // Do not render footer on dashboard or standalone auth pages
  if (
    location.pathname.startsWith('/dashboard') ||
    location.pathname === '/login' ||
    location.pathname === '/register'
  ) {
    return null;
  }

  return (
    <footer className="border-t border-surface-800/50 py-12 px-4 bg-[#030712]/60 backdrop-blur-sm relative z-20">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
          {/* Brand Info */}
          <div className="col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4 group inline-flex">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-glow group-hover:scale-105 transition-transform">
                <Zap className="w-4 h-4 text-white" fill="white" />
              </div>
              <span className="font-black text-lg text-white">
                DocuFlow <span className="gradient-text">AI</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
              Convert • Edit • Cut • Compress • Understand. The all-in-one AI document platform.
            </p>

            {/* Live Activity Badge */}
            <div className="mt-4 inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-surface-900/80 border border-surface-700/50 text-xs text-slate-300 shadow-sm backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400 font-medium">Live Viewers:</span>
              <span className="font-bold text-emerald-400 font-mono tabular-nums">{liveViewers.toLocaleString()}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">Total Visits:</span>
              <span className="font-semibold text-slate-300 font-mono tabular-nums">{totalViews.toLocaleString()}</span>
            </div>
          </div>

          {/* Navigation Columns */}
          {FOOTER_SECTIONS.map((col) => (
            <div key={col.title}>
              <h4 className="font-semibold text-white mb-3 text-sm tracking-wide">{col.title}</h4>
              <ul className="space-y-2">
                {col.links.map((item) => (
                  <li key={item.label}>
                    <Link
                      to={item.to}
                      className="text-slate-400 text-sm hover:text-white transition-colors duration-150 inline-block py-0.5 hover:translate-x-0.5 transform"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-surface-800/50 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500 text-sm">
          <p>© {new Date().getFullYear()} DocuFlow AI. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-4 sm:gap-5 text-xs text-slate-400">
            {/* Live Viewers Indicator */}
            <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <Users className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-slate-300">
                <span className="text-emerald-400 font-semibold tabular-nums">{liveViewers.toLocaleString()}</span> Live Viewers
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-brand-400" />
              <span>Enterprise-grade security</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-accent-400" />
              <span>SOC2 ready architecture</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
