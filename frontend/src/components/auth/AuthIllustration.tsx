import React from 'react';

/**
 * Modern Workspace Vector Illustration
 * Matches the reference image with woman working at desk, computer,
 * floating security/notification badges, desk accessories, and houseplant.
 */
export const AuthIllustration: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <svg
      viewBox="0 0 540 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`w-full max-w-[480px] h-auto select-none ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* Soft Drop Shadows */}
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="4" floodOpacity="0.15" />
        </filter>
        <filter id="deskShadow" x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="6" stdDeviation="6" floodOpacity="0.08" />
        </filter>
        {/* Monitor Screen Gradient */}
        <linearGradient id="monitorBezel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d8b4fe" />
          <stop offset="100%" stopColor="#c084fc" />
        </linearGradient>
      </defs>

      {/* ─── Desk & Furniture ────────────────────────────────────────── */}
      {/* Desk Surface Shadow & Top */}
      <rect x="250" y="215" width="225" height="8" rx="4" fill="#a5b4fc" />
      {/* Desk Legs */}
      <line x1="270" y1="223" x2="250" y2="335" stroke="#818cf8" strokeWidth="5" strokeLinecap="round" />
      <line x1="455" y1="223" x2="475" y2="335" stroke="#818cf8" strokeWidth="5" strokeLinecap="round" />
      {/* Horizontal Desk Stretcher */}
      <line x1="256" y1="300" x2="469" y2="300" stroke="#c7d2fe" strokeWidth="3" />

      {/* ─── Office Chair ────────────────────────────────────────────── */}
      {/* Chair Backrest */}
      <rect x="230" y="205" width="42" height="60" rx="8" fill="#d8b4fe" />
      {/* Chair Seat */}
      <rect x="260" y="235" width="55" height="12" rx="6" fill="#c084fc" />
      {/* Chair Legs */}
      <line x1="242" y1="265" x2="230" y2="340" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
      <line x1="275" y1="247" x2="295" y2="340" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />

      {/* ─── Woman Working at Computer ───────────────────────────────── */}
      {/* Legs */}
      <path
        d="M295 240 L330 270 L320 325"
        stroke="#6b21a8"
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Left Shoe & Ankle */}
      <circle cx="320" cy="332" r="6" fill="#fde047" />
      <path d="M312 332 Q325 332 338 332 Q344 336 338 340 L310 340 Z" fill="#0f172a" />
      {/* Right Shoe behind */}
      <path d="M330 330 Q343 330 354 330 Q360 334 354 338 L328 338 Z" fill="#1e293b" opacity="0.8" />

      {/* Torso & Purple Sweater */}
      <path
        d="M272 205 Q285 175 305 175 Q325 175 320 235 L285 245 Z"
        fill="#9333ea"
      />

      {/* Arms reaching to keyboard */}
      <path
        d="M295 190 Q330 200 350 215"
        stroke="#9333ea"
        strokeWidth="11"
        strokeLinecap="round"
      />
      {/* Hands */}
      <circle cx="352" cy="217" r="5" fill="#fed7aa" />

      {/* Neck & Face */}
      <rect x="303" y="165" width="8" height="12" fill="#fed7aa" rx="2" />
      <ellipse cx="310" cy="155" rx="10" ry="12" fill="#fed7aa" />
      {/* Ear */}
      <circle cx="304" cy="156" r="2.5" fill="#fbcfe8" />

      {/* Long Dark Wavy Hair */}
      <path
        d="M305 142 Q322 142 322 158 Q322 170 308 178 Q285 190 270 215 Q262 230 270 248 Q258 245 250 230 Q240 210 252 190 Q265 170 272 155 Q278 142 305 142 Z"
        fill="#1e1b4b"
      />

      {/* ─── Desktop Computer Monitor ────────────────────────────────── */}
      {/* Stand Base */}
      <path d="M345 215 Q365 210 385 215 Z" fill="#94a3b8" />
      <path d="M360 202 L368 215 L362 215 L357 202 Z" fill="#cbd5e1" />
      {/* Monitor Outer Frame */}
      <rect x="330" y="130" width="105" height="74" rx="8" fill="url(#monitorBezel)" stroke="#a855f7" strokeWidth="2" filter="url(#badgeShadow)" />
      {/* Monitor Screen (White) */}
      <rect x="336" y="135" width="93" height="64" rx="5" fill="#ffffff" />
      {/* Screen Interface: Profile Card UI */}
      <circle cx="382" cy="153" r="10" fill="#f472b6" opacity="0.25" />
      <circle cx="382" cy="150" r="4" fill="#ec4899" />
      <path d="M375 160 Q382 155 389 160 Z" fill="#ec4899" />
      {/* Screen Content lines */}
      <rect x="366" y="166" width="32" height="3" rx="1.5" fill="#cbd5e1" />
      <rect x="372" y="172" width="20" height="2.5" rx="1" fill="#e2e8f0" />
      <rect x="368" y="177" width="28" height="2" rx="1" fill="#e2e8f0" />

      {/* ─── Floating Notification / Security Badges ─────────────────── */}
      {/* 1. Amber Lock Badge */}
      <g filter="url(#badgeShadow)">
        <circle cx="355" cy="115" r="11" fill="#f97316" />
        {/* Lock icon */}
        <rect x="350" y="113" width="10" height="7" rx="1.5" fill="#ffffff" />
        <path d="M352 113 V110 A3 3 0 0 1 358 110 V113" stroke="#ffffff" strokeWidth="1.5" fill="none" />
      </g>

      {/* 2. Coral Mail Badge */}
      <g filter="url(#badgeShadow)">
        <circle cx="378" cy="98" r="11" fill="#f43f5e" />
        {/* Mail icon */}
        <rect x="373" y="94" width="10" height="8" rx="1" fill="#ffffff" />
        <path d="M373 94 L378 98 L383 94" stroke="#f43f5e" strokeWidth="1.2" fill="none" />
      </g>

      {/* 3. Emerald Green Checkmark Badge */}
      <g filter="url(#badgeShadow)">
        <circle cx="403" cy="92" r="10" fill="#22c55e" />
        {/* Checkmark */}
        <path d="M399 92 L402 95 L407 89" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </g>

      {/* 4. Cyan User Badge */}
      <g filter="url(#badgeShadow)">
        <circle cx="418" cy="112" r="10" fill="#0ea5e9" />
        {/* User icon */}
        <circle cx="418" cy="110" r="3" fill="#ffffff" />
        <path d="M413 117 Q418 114 423 117" stroke="#ffffff" strokeWidth="1.5" fill="none" />
      </g>

      {/* Connecting particles */}
      <circle cx="368" cy="106" r="2" fill="#e2e8f0" />
      <circle cx="392" cy="93" r="2" fill="#e2e8f0" />
      <circle cx="400" cy="105" r="1.5" fill="#a855f7" />
      <circle cx="410" cy="102" r="2" fill="#e2e8f0" />
      <circle cx="388" cy="114" r="1.5" fill="#06b6d4" />

      {/* ─── Desk Accessories ────────────────────────────────────────── */}
      {/* Red Coffee Mug */}
      <rect x="418" y="202" width="10" height="13" rx="2" fill="#ef4444" />
      <path d="M428 204 Q432 208 428 212" stroke="#ef4444" strokeWidth="2.5" fill="none" />

      {/* Document File Binders (Yellow, Lime, Cyan) */}
      {/* Yellow Binder */}
      <rect x="442" y="180" width="8" height="35" rx="1.5" fill="#facc15" />
      <circle cx="446" cy="192" r="1.5" fill="#ffffff" />
      {/* Lime Green Binder */}
      <rect x="451" y="177" width="8" height="38" rx="1.5" fill="#22c55e" />
      <circle cx="455" cy="192" r="1.5" fill="#ffffff" />
      {/* Cyan Binder */}
      <rect x="460" y="177" width="8" height="38" rx="1.5" fill="#06b6d4" />
      <circle cx="464" cy="192" r="1.5" fill="#ffffff" />

      {/* ─── Briefcase on Floor ──────────────────────────────────────── */}
      <g filter="url(#badgeShadow)">
        {/* Bag Body */}
        <rect x="382" y="300" width="46" height="34" rx="4" fill="#3b82f6" />
        {/* Handle */}
        <path d="M399 300 V293 Q405 291 411 293 V300" stroke="#1d4ed8" strokeWidth="3" fill="none" />
        {/* Clasp & Accent Line */}
        <line x1="382" y1="312" x2="428" y2="312" stroke="#1d4ed8" strokeWidth="2" />
        <rect x="402" y="309" width="6" height="6" rx="1" fill="#e2e8f0" />
      </g>

      {/* ─── Potted Houseplant ───────────────────────────────────────── */}
      {/* Leaves */}
      {/* Pink Large Leaf */}
      <path
        d="M472 290 Q445 270 440 240 Q465 242 476 270 Z"
        fill="#f43f5e"
      />
      <path d="M472 290 Q460 265 448 246" stroke="#fb7185" strokeWidth="1.5" fill="none" />
      {/* Lilac / Violet Leaf */}
      <path
        d="M485 285 Q515 250 495 210 Q478 238 480 270 Z"
        fill="#a855f7"
      />
      <path d="M485 285 Q492 250 490 220" stroke="#c084fc" strokeWidth="1.5" fill="none" />
      {/* Smaller Purple Leaf */}
      <path
        d="M478 285 Q495 270 505 278 Q495 295 480 290 Z"
        fill="#7c3aed"
      />
      {/* Ceramic Pot */}
      <path d="M467 285 L490 285 L484 322 L473 322 Z" fill="#581c87" />
      <ellipse cx="478.5" cy="285" rx="11.5" ry="3.5" fill="#4a044e" />
    </svg>
  );
};

export default AuthIllustration;
