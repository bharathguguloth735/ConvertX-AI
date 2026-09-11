import React from 'react';

/**
 * DocuFlow AI — Ultra-Refined Cinematic Dotted Grid Background
 * Inspired by modern Linear, Vercel, and Stripe dark design systems.
 *
 * Characteristics:
 * - Deep obsidian canvas (#030712)
 * - Whisper-quiet, ultra-subtle 1px neutral dots (rgba(255, 255, 255, 0.07)) spaced at 28px
 * - Smooth radial vignette mask that gently fades dots out towards edges and bottom
 * - Soft, diffused cinematic ambient spotlight centered at the top
 * - Zero movement, zero jitter, zero distractions.
 */
export const FileFlowBackground: React.FC = () => {
  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden -z-10 select-none bg-[#030712]"
      aria-hidden="true"
    >
      {/* Soft Ambient Cinematic Spotlight (Electric Blue & Indigo Glow) */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(59,91,252,0.14),rgba(99,102,241,0.05)_45%,transparent_70%)] blur-2xl pointer-events-none" />

      {/* Subtle Aurora Corner Reflections */}
      <div className="absolute top-20 left-10 w-96 h-96 bg-blue-500/[0.04] rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-32 right-10 w-96 h-96 bg-purple-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Subtle, High-Precision Dotted Grid with Smooth Vignette Mask */}
      <div
        className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.07)_1px,transparent_1px)] [background-size:28px_28px]"
        style={{
          maskImage: 'radial-gradient(ellipse 75% 65% at 50% 20%, black 20%, transparent 85%)',
          WebkitMaskImage: 'radial-gradient(ellipse 75% 65% at 50% 20%, black 20%, transparent 85%)',
        }}
      />
    </div>
  );
};

export default FileFlowBackground;
