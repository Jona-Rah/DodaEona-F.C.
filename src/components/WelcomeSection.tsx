import React from 'react';
import { OFFICIAL_ASSETS } from '../data/mockData';
import { BookOpen, Trophy, Compass, Heart } from 'lucide-react';

export interface WelcomeCopyData {
  heading: string;
  subheading: string;
  paragraphs: string[];
  tagline: string;
  signoff: string;
}

interface WelcomeSectionProps {
  copy: WelcomeCopyData;
  onEditTrigger?: () => void;
}

export const WelcomeSection: React.FC<WelcomeSectionProps> = ({ copy }) => {
  const pillars = [
    { index: '01', label: 'Tactical Depth', icon: Compass },
    { index: '02', label: 'Historical Lore', icon: BookOpen },
    { index: '03', label: 'Simulation Intelligence', icon: Trophy },
    { index: '04', label: 'Passionate Community', icon: Heart },
  ];

  return (
    <section 
      aria-label="Welcome to DodaEona F.C."
      className="relative bg-[var(--bg-surface)] text-[var(--text-primary)] py-20 sm:py-28 landscape-mobile:py-8 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] overflow-hidden transition-colors duration-200"
    >
      {/* Subtle atmospheric cyan/slate glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-full max-w-4xl h-80 bg-[#7ADBF0]/[0.06] rounded-full blur-[140px] pointer-events-none" />

      {/* Main Centered Vertical Content Container */}
      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
        
        {/* 1. Official Emblem centered at top */}
        <div className="relative mb-6 group">
          <div className="absolute -inset-3 bg-[#7ADBF0]/15 rounded-full blur-xl opacity-50 group-hover:opacity-90 transition-opacity duration-500" />
          <div className="relative p-3 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] shadow-lg">
            <img
              src={OFFICIAL_ASSETS.emblem}
              alt="Official DodaEona F.C. Emblem"
              className="w-16 h-16 sm:w-20 sm:h-20 object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </div>
        </div>

        {/* 2. Welcome Heading in Anton Display */}
        <h2 className="font-display text-3xl sm:text-5xl lg:text-5xl tracking-[0.015em] text-[var(--text-primary)] uppercase leading-none text-balance">
          {copy.heading}
        </h2>

        {/* 3. Sub-Heading */}
        <p className="eyebrow-mono mt-3 text-[11px] sm:text-xs font-semibold text-[var(--accent-cyan)] uppercase tracking-[0.25em]">
          {copy.subheading}
        </p>

        {/* Glowing Cyan Horizontal Rule */}
        <div className="w-24 h-[2px] bg-gradient-to-r from-transparent via-[#7ADBF0] to-transparent shadow-[0_0_12px_rgba(122,219,240,0.6)] my-7" />

        {/* 4. Supporting Welcome Paragraphs */}
        <div className="space-y-4 text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-normal text-balance max-w-2xl">
          {copy.paragraphs.map((p, idx) => (
            <p key={idx}>
              {p}
            </p>
          ))}
        </div>

        {/* 5. 4 Architectural Pillar Cells (Hairline Grid) */}
        <div className="mt-10 landscape-mobile:mt-5 grid grid-cols-2 landscape-mobile:grid-cols-4 sm:grid-cols-4 border border-[var(--border-color)] rounded-xl overflow-hidden bg-[var(--bg-primary)]/70 w-full max-w-2xl divide-y landscape-mobile:divide-y-0 sm:divide-y-0 landscape-mobile:divide-x sm:divide-x divide-[var(--border-color)]">
          {pillars.map((pil) => {
            const Icon = pil.icon;
            return (
              <div
                key={pil.index}
                className="p-4 flex flex-col items-center justify-center gap-1.5 hover:bg-white/[0.03] light:hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-1.5 text-[var(--accent-cyan)]">
                  <span className="font-display text-lg leading-none opacity-75">{pil.index}</span>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-semibold text-[var(--text-primary)]">{pil.label}</span>
              </div>
            );
          })}
        </div>

        {/* 6. Closing Statement & Sign-off */}
        <div className="mt-10 pt-6 border-t border-[var(--border-color)] w-full max-w-xl">
          <p className="font-display text-lg sm:text-xl text-[var(--accent-cyan)] uppercase tracking-wide">
            {copy.tagline}
          </p>

          <p className="mt-1.5 text-xs text-[var(--text-muted)] tracking-wider">
            {copy.signoff}
          </p>
        </div>

      </div>
    </section>
  );
};
