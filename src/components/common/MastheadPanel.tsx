import React from 'react';
import { Sparkles } from 'lucide-react';

export interface MastheadFactTile {
  label: string;
  value: string | number;
  sublabel?: string;
  accentColor?: 'gold' | 'sky' | 'emerald' | 'purple';
}

export interface MastheadPanelProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  topEdgeColor?: 'gold' | 'sky' | 'emerald' | 'purple';
  primaryCta?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryCta?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  factTiles?: MastheadFactTile[];
  children?: React.ReactNode;
}

export const MastheadPanel: React.FC<MastheadPanelProps> = ({
  eyebrow,
  title,
  subtitle,
  topEdgeColor = 'gold',
  primaryCta,
  secondaryCta,
  factTiles = [],
  children,
}) => {
  const edgeGradientClass = {
    gold: 'bg-gradient-to-r from-[#C5A059] via-[#E6C687] to-[#9A7836]',
    sky: 'bg-gradient-to-r from-[#38BDF8] via-[#60A5FA] to-[#0284C7]',
    emerald: 'bg-gradient-to-r from-[#10B981] via-[#34D399] to-[#059669]',
    purple: 'bg-gradient-to-r from-[#A855F7] via-[#C084FC] to-[#7E22CE]',
  }[topEdgeColor];

  const getTileBorder = (color?: string) => {
    switch (color) {
      case 'sky':
        return 'border-t-[#38BDF8]';
      case 'emerald':
        return 'border-t-[#10B981]';
      case 'purple':
        return 'border-t-[#A855F7]';
      case 'gold':
      default:
        return 'border-t-[#C5A059]';
    }
  };

  return (
    <div className="relative rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] overflow-hidden shadow-2xl transition-colors duration-200">
      {/* 3px Coloured Top Edge */}
      <div className={`h-[3px] w-full ${edgeGradientClass}`} />

      {/* Atmospheric Floodlight Beams & Pitch Markings Background */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {/* 3 Radial Lights */}
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-blue-600/15 dark:bg-blue-600/20 rounded-full blur-[100px]" />
        <div className="absolute -top-24 right-1/4 w-96 h-96 bg-amber-400/10 dark:bg-[#C5A059]/15 rounded-full blur-[100px]" />
        <div className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[500px] h-64 bg-cyan-500/10 rounded-full blur-[120px]" />

        {/* Faint Pitch Markings (Center circle + penalty arc SVG) */}
        <svg
          className="absolute right-0 top-0 h-full w-2/3 opacity-[0.04] dark:opacity-[0.06] text-white"
          viewBox="0 0 400 300"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          {/* Halfway line */}
          <line x1="200" y1="0" x2="200" y2="300" />
          {/* Center Circle */}
          <circle cx="200" cy="150" r="70" />
          <circle cx="200" cy="150" r="3" fill="currentColor" />
          {/* Penalty Box */}
          <rect x="290" y="50" width="110" height="200" />
          <rect x="350" y="95" width="50" height="110" />
          <path d="M 290 120 A 40 40 0 0 0 290 180" />
        </svg>
      </div>

      {/* Interior Layout */}
      <div className="relative z-10 p-6 sm:p-10 lg:p-12 landscape-mobile:p-5">
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-8 landscape-mobile:gap-5 lg:gap-10 items-center">
          
          {/* Left Column (Content & Action) */}
          <div className={factTiles.length > 0 ? 'landscape-mobile:col-span-7 lg:col-span-7 space-y-5 landscape-mobile:space-y-3' : 'landscape-mobile:col-span-12 lg:col-span-12 space-y-5 landscape-mobile:space-y-3'}>
            
            {/* Eyebrow Pill */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent-gold)] eyebrow-mono">
              <Sparkles className="w-3.5 h-3.5 text-[var(--accent-gold)]" />
              <span>{eyebrow}</span>
            </div>

            {/* Anton Display Headline */}
            <h1 className="font-display font-black text-3xl sm:text-4xl lg:text-5xl landscape-mobile:text-2xl text-[var(--text-primary)] uppercase tracking-tight leading-[1.05]">
              {title}
            </h1>

            {/* Description Subtitle */}
            {subtitle && (
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed max-w-2xl text-balance font-normal">
                {subtitle}
              </p>
            )}

            {/* Dual CTAs */}
            {(primaryCta || secondaryCta) && (
              <div className="pt-2 flex flex-wrap items-center gap-3.5">
                {primaryCta && (
                  <button
                    onClick={primaryCta.onClick}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-black text-xs uppercase tracking-widest text-slate-950 bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#C5A059] hover:from-[#D4B26F] hover:to-[#B69147] shadow-[0_0_25px_rgba(197,160,89,0.35)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#C5A059]"
                  >
                    {primaryCta.icon}
                    <span>{primaryCta.label}</span>
                  </button>
                )}

                {secondaryCta && (
                  <button
                    onClick={secondaryCta.onClick}
                    className="inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[var(--accent-gold)] transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none"
                  >
                    {secondaryCta.icon}
                    <span>{secondaryCta.label}</span>
                  </button>
                )}
              </div>
            )}

            {children}
          </div>

          {/* Right Column (Fact Tiles with 3px Coloured Top Edges) */}
          {factTiles.length > 0 && (
            <div className="landscape-mobile:col-span-5 lg:col-span-5 grid grid-cols-2 gap-3.5 sm:gap-4 landscape-mobile:gap-2.5">
              {factTiles.map((tile, idx) => (
                <div
                  key={idx}
                  className={`p-4 sm:p-5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] border-t-[3px] ${getTileBorder(tile.accentColor)} shadow-lg transition-transform hover:-translate-y-1`}
                >
                  <div className="eyebrow-mono text-[var(--text-muted)] text-[10px] uppercase truncate">
                    {tile.label}
                  </div>
                  <div className="font-display text-2xl sm:text-3xl text-[var(--text-primary)] font-black tracking-tight mt-1 tabular-nums">
                    {tile.value}
                  </div>
                  {tile.sublabel && (
                    <div className="text-[11px] text-[var(--text-secondary)] mt-0.5 truncate">
                      {tile.sublabel}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
