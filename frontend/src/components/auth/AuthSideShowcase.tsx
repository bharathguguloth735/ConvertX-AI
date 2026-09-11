import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Zap, Sparkles, FileCheck, Star } from 'lucide-react';
import fileConverterImg from '@/assets/all_file_converter.png';

/**
 * Modern "All File Converter" Side Showcase for Login & Register Pages
 * Uses the user's authentic high-impact graphic with floating feature badges
 * and platform highlights for the best onboarding experience.
 */
export const AuthSideShowcase: React.FC = () => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center w-full max-w-lg text-center px-2 py-4">
      {/* 3D Glossy Hero Graphic Container with Ambient Glow */}
      <div className="relative mb-6 group">
        {/* Soft Radial Backlight */}
        <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 via-purple-500/30 to-pink-500/20 rounded-[32px] blur-2xl group-hover:blur-3xl transition-all opacity-80" />

        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
          className="relative"
        >
          <img
            src={fileConverterImg}
            alt="All File Converter — PDF, Word, Excel, Images, Media"
            className="w-48 sm:w-56 md:w-60 h-auto rounded-[32px] shadow-[0_15px_40px_-10px_rgba(79,70,229,0.22)] object-contain mx-auto"
            loading="eager"
          />
        </motion.div>
      </div>

      {/* Title & Tagline */}
      <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight mb-1">
        Next-Gen <span className="gradient-text">File Suite</span>
      </h2>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mb-5 leading-relaxed">
        Convert, compress, edit, and analyze PDF, Office documents, audio, videos, and images with advanced AI.
      </p>

      {/* Feature Highlights (2x2 Grid) */}
      <div className="grid grid-cols-2 gap-2.5 w-full max-w-md mb-4 text-left">
        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-purple-50/70 border border-purple-100/80 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-purple-600/10 text-purple-600 flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-tight">100+ Formats</p>
            <p className="text-[10px] text-slate-500">PDF, DOCX, MP4, MP3</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-blue-50/70 border border-blue-100/80 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-blue-600/10 text-blue-600 flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-tight">AI Neural Engine</p>
            <p className="text-[10px] text-slate-500">Summarize & OCR</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100/80 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-tight">100% Private</p>
            <p className="text-[10px] text-slate-500">Auto-delete after 1h</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-100/80 shadow-xs">
          <div className="w-7 h-7 rounded-lg bg-amber-600/10 text-amber-600 flex items-center justify-center flex-shrink-0">
            <FileCheck className="w-3.5 h-3.5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800 leading-tight">Zero Loss Quality</p>
            <p className="text-[10px] text-slate-500">Crystal-clear results</p>
          </div>
        </div>
      </div>

      {/* Social Proof Star Rating */}
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 bg-slate-100/80 px-3.5 py-1.5 rounded-full">
        <div className="flex text-amber-400">
          {[...Array(5)].map((_, i) => (
            <Star key={i} className="w-3 h-3 fill-current" />
          ))}
        </div>
        <span className="text-[11px]">4.9 / 5 • Loved by 200,000+ creators</span>
      </div>
    </div>
  );
};

export default AuthSideShowcase;
