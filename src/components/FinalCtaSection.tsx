import React from 'react';
import { BookOpen, Trophy, ArrowRight } from 'lucide-react';
import { NavigationDestination } from '../types/homepage';

interface FinalCtaSectionProps {
  onNavigate: (destination: NavigationDestination) => void;
}

export const FinalCtaSection: React.FC<FinalCtaSectionProps> = ({ onNavigate }) => {
  return (
    <section 
      aria-label="Final Platform Call to Action"
      className="relative py-20 sm:py-28 landscape-mobile:py-8 bg-[var(--bg-primary)] px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] overflow-hidden transition-colors duration-200"
    >
      {/* Subtle obsidian cyan ambient wash */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-5xl h-96 bg-[#7ADBF0]/[0.06] rounded-full blur-[150px] pointer-events-none" />

      {/* Centered Content Container */}
      <div className="relative z-10 max-w-3xl mx-auto text-center flex flex-col items-center">
        
        {/* Clean Brand Motif Tag */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-surface)] border border-[#7ADBF0]/30 text-[var(--accent-cyan)] eyebrow-mono mb-5 backdrop-blur-md">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0] light:bg-cyan-600" />
          <span>DARE TO DREAM</span>
        </div>

        {/* Confirmed Anton Display Headline */}
        <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl landscape-mobile:text-3xl text-[var(--text-primary)] tracking-tight uppercase leading-[0.98]">
          YOUR FOOTBALL WORLD STARTS HERE.
        </h2>

        {/* Restrained cyan hairline glow bar */}
        <div className="w-24 h-[2px] bg-gradient-to-r from-[#7ADBF0] via-[#7ADBF0]/50 to-transparent rounded-full mt-5 shadow-[0_0_12px_rgba(122,219,240,0.45)] light:from-cyan-600 light:via-cyan-500/40" />

        {/* Confirmed Supporting Message */}
        <p className="mt-5 text-sm sm:text-base lg:text-lg text-[var(--text-secondary)] leading-relaxed font-normal max-w-2xl text-balance">
          Explore the game beyond the pitch. Discover new knowledge, experience football simulations, challenge yourself, and become part of the DodaEona F.C. community.
        </p>

        {/* Confirmed Two Prominent Buttons in Left-to-Right Order */}
        <div className="mt-9 landscape-mobile:mt-5 flex flex-col landscape-mobile:flex-row sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          
          {/* Button 1: "EXPLORE READS" */}
          <button
            onClick={() => onNavigate('reads')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider btn-primary-theme rounded-xl shadow-[0_0_24px_rgba(122,219,240,0.28)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ADBF0] group cursor-pointer"
          >
            <BookOpen className="w-4 h-4" />
            <span>EXPLORE READS</span>
            <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          {/* Button 2: "ENTER MATCH CENTRE" */}
          <button
            onClick={() => onNavigate('match-centre')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-7 py-3.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] bg-white/[0.03] light:bg-white hover:bg-white/[0.07] light:hover:bg-slate-50 border border-white/15 light:border-slate-300 hover:border-[#7ADBF0]/50 light:hover:border-cyan-600 rounded-xl transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ADBF0] group cursor-pointer"
          >
            <Trophy className="w-4 h-4 text-[var(--accent-cyan)] transition-transform group-hover:scale-110" />
            <span>ENTER MATCH CENTRE</span>
            <ArrowRight className="w-4 h-4 text-[var(--accent-cyan)] transition-transform group-hover:translate-x-1" />
          </button>

        </div>

      </div>
    </section>
  );
};
