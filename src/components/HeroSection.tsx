import React from 'react';
import { BookOpen, Trophy, ArrowRight } from 'lucide-react';
import { OFFICIAL_ASSETS } from '../data/mockData';
import { NavigationDestination, Volume } from '../types/homepage';
import { PWAInstallButton } from './common/PWAInstallButton';

interface HeroSectionProps {
  subtext: string;
  latestVolumes: Volume[];
  onNavigate: (destination: NavigationDestination, payload?: any) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ subtext, latestVolumes, onNavigate }) => {
  const displayedVolumes = latestVolumes.slice(0, 4);

  return (
    <section 
      aria-label="Cinematic Hero Split" 
      className="relative min-h-[600px] landscape-mobile:min-h-0 lg:min-h-[680px] flex items-center overflow-hidden border-b border-[var(--border-color)] bg-[var(--bg-primary)] transition-colors duration-200"
    >
      {/* Background Brand Banner Texture & Directional Floodlight Atmosphere */}
      <div className="absolute inset-0 z-0 select-none pointer-events-none">
        <img
          src={OFFICIAL_ASSETS.heroStadium}
          alt="DodaEona F.C. official Dare to Dream diagonal blue and gold background"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover object-center opacity-25 dark:opacity-50"
        />
        {/* Deep Obsidian Directional Scrims keeping foreground copy crisp */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)]/70 to-[var(--bg-primary)]/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/78 to-[var(--bg-primary)]/45" />

        {/* Refined Icy Cyan & Warm Amber Radial Accents */}
        <div className="absolute top-0 left-1/5 w-[560px] h-[360px] bg-[#7ADBF0]/10 rounded-full blur-[150px] pointer-events-none" />
        <div className="absolute bottom-0 right-1/5 w-[480px] h-[320px] bg-[#D6B56E]/6 rounded-full blur-[140px] pointer-events-none" />
      </div>

      {/* Main 7/5 Desktop & Mobile Landscape Grid Container */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 sm:py-20 landscape-mobile:py-6 w-full">
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-10 landscape-mobile:gap-6 lg:gap-12 items-center">
          
          {/* ======================================================== */}
          {/* 7-COLUMN LEFT: MAIN BRAND STATEMENT & CTAS */}
          {/* ======================================================== */}
          <div className="landscape-mobile:col-span-7 lg:col-span-7 flex flex-col items-start text-left">
            
            {/* Refined Outlined Eyebrow Capsule */}
            <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[var(--bg-surface)]/85 border border-[#7ADBF0]/30 light:border-cyan-600/30 text-[var(--accent-cyan)] eyebrow-mono mb-6 landscape-mobile:mb-3 backdrop-blur-md">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0] light:bg-cyan-600" />
              <span>THE DEFINITIVE FOOTBALL PLATFORM</span>
            </div>

            {/* Massive Tall Condensed Anton Display Headline */}
            <h1 className="font-display text-5xl sm:text-6xl landscape-mobile:text-3xl lg:text-[4.25rem] xl:text-[4.65rem] uppercase tracking-[0.015em] text-[var(--text-primary)] leading-[0.98] text-balance max-w-2xl">
              MORE THAN A GAME.{' '}
              <span className="text-[var(--text-primary)]">
                A WHOLE FOOTBALL WORLD.
              </span>
            </h1>

            {/* Glowing Cyan Horizontal Accent Bar */}
            <div className="w-24 h-[2px] bg-gradient-to-r from-[#7ADBF0] light:from-cyan-600 to-transparent shadow-[0_0_14px_rgba(122,219,240,0.65)] my-6 landscape-mobile:my-3" />

            {/* Clean Plus Jakarta Sans Subtext */}
            <p className="text-base sm:text-lg landscape-mobile:text-xs text-[var(--text-secondary)] leading-relaxed font-normal max-w-xl text-balance">
              {subtext}
            </p>

            {/* Primary Icy Cyan & Frosted Dark Secondary CTA Buttons */}
            <div className="mt-8 landscape-mobile:mt-4 flex flex-col sm:flex-row landscape-mobile:flex-row landscape-mobile:flex-wrap items-stretch sm:items-center gap-4 landscape-mobile:gap-2.5 w-full sm:w-auto">
              
              {/* Primary Icy Cyan CTA */}
              <button
                onClick={() => onNavigate('reads')}
                className="inline-flex items-center justify-center gap-3 px-7 py-3.5 landscape-mobile:px-4 landscape-mobile:py-2.5 text-xs sm:text-sm landscape-mobile:text-xs font-bold uppercase tracking-wider btn-primary-theme rounded-xl shadow-[0_0_28px_rgba(122,219,240,0.28)] transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ADBF0] group whitespace-nowrap shrink-0"
              >
                <BookOpen className="w-4 h-4" />
                <span>EXPLORE THE LIBRARY</span>
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              {/* Dark Frosted Glass Secondary CTA */}
              <button
                onClick={() => onNavigate('match-centre')}
                className="inline-flex items-center justify-center gap-3 px-7 py-3.5 landscape-mobile:px-4 landscape-mobile:py-2.5 text-xs sm:text-sm landscape-mobile:text-xs font-bold uppercase tracking-wider text-[var(--text-primary)] bg-[var(--bg-surface)]/90 hover:bg-[var(--bg-elevated)] light:bg-white light:hover:bg-slate-50 border border-white/[0.15] light:border-slate-300 hover:border-[#7ADBF0]/50 light:hover:border-cyan-600 rounded-xl backdrop-blur-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ADBF0] group whitespace-nowrap shrink-0"
              >
                <Trophy className="w-4 h-4 text-[var(--accent-cyan)] transition-transform duration-200 group-hover:scale-110" />
                <span>ENTER MATCH CENTRE</span>
                <ArrowRight className="w-4 h-4 text-[var(--accent-cyan)] transition-transform duration-200 group-hover:translate-x-1" />
              </button>

              {/* Progressive Web App Install CTA */}
              <PWAInstallButton variant="hero" />
            </div>

            {/* Clean Unboxed Typographic Metadata Strip */}
            <div className="mt-10 landscape-mobile:mt-4 pt-6 landscape-mobile:pt-3 border-t border-[var(--border-color)] flex flex-wrap items-center gap-y-2 gap-x-3 text-xs sm:text-sm landscape-mobile:text-[11px] font-medium text-[var(--text-muted)]">
              <span className="text-[var(--text-secondary)]">977 Verified Clubs &amp; Teams</span>
              <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
              <span className="text-[var(--text-secondary)]">Interactive Literature</span>
              <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
              <span className="text-[var(--text-secondary)]">Simulation Intelligence</span>
            </div>

          </div>

          {/* ======================================================== */}
          {/* 5-COLUMN RIGHT: ARCHITECTURAL "LATEST VOLUMES" LEDGER */}
          {/* ======================================================== */}
          <div className="landscape-mobile:col-span-5 lg:col-span-5">
            <div className="relative rounded-xl bg-[var(--bg-surface)]/90 backdrop-blur-xl border border-[var(--border-color)] overflow-hidden shadow-2xl">
              
              {/* Clean Ledger Header */}
              <div className="px-6 py-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="eyebrow-mono text-[11px] text-[var(--text-muted)] tracking-[0.22em]">
                    LATEST VOLUMES
                  </span>
                </div>
                <button
                  onClick={() => onNavigate('reads')}
                  aria-label="Browse all volumes in Library"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-cyan)] hover:underline whitespace-nowrap shrink-0"
                >
                  <BookOpen className="w-4 h-4" />
                </button>
              </div>

              {/* Clean Hairline-Separated Numbered Rows */}
              {displayedVolumes.length === 0 ? (
                <div className="px-6 py-10 text-center text-xs text-[var(--text-muted)]">
                  No published volumes are currently available.
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-color)]">
                  {displayedVolumes.map((vol, index) => {
                    const displayNum = String(index + 1).padStart(2, '0');
                    const volLabel = vol.volumeNumber ? `Volume ${String(vol.volumeNumber).padStart(2, '0')}` : 'New Release';
                    return (
                      <button
                        key={vol.id}
                        type="button"
                        onClick={() => onNavigate('volume-reader', vol)}
                        className="group w-full text-left flex items-center gap-4 px-6 py-4 landscape-mobile:px-4 landscape-mobile:py-2.5 hover:bg-white/[0.03] light:hover:bg-slate-50 transition-colors duration-150 cursor-pointer"
                      >
                        {/* Tall Anton Numeral in Muted Cyan */}
                        <div className="font-display text-3xl sm:text-[2.15rem] landscape-mobile:text-2xl text-[#7ADBF0]/55 light:text-cyan-700/60 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors w-10 landscape-mobile:w-8 shrink-0 leading-none">
                          {displayNum}
                        </div>

                        {/* Volume Title & Series Metadata */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors truncate">
                            {vol.title}
                          </h4>
                          <p className="text-xs text-[var(--text-muted)] truncate mt-0.5">
                            {vol.seriesTitle} · {volLabel}
                          </p>
                        </div>

                        {/* Subtle Arrow Reveal */}
                        <ArrowRight className="w-4 h-4 text-[var(--text-muted)] opacity-40 group-hover:opacity-100 group-hover:text-[var(--accent-cyan)] group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Subtle Architectural Ledger Footer */}
              <div className="px-6 py-3 bg-black/20 light:bg-slate-50 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                <span className="eyebrow-mono text-[9px]">
                  PDF &amp; IN-APP READER
                </span>
                <button
                  onClick={() => onNavigate('reads')}
                  className="font-semibold text-[var(--accent-cyan)] hover:underline inline-flex items-center gap-1"
                >
                  <span>View All ({latestVolumes.length})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
