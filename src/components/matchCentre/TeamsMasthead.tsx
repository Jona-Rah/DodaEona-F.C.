import React from 'react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { Sparkles, Shield, Globe, Users } from 'lucide-react';

export const TeamsMasthead: React.FC = () => {
  const { counts } = useMatchCentre();

  return (
    <div className="relative rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl mb-8 landscape-mobile:mb-4">
      {/* Moody Teal-Navy to Deep Plum Gradient Background matching reference */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(125deg, #061523 0%, #0B2534 45%, #231936 100%)',
        }}
      />

      {/* Warm Soft Bronze/Gold Glow (Top Right) */}
      <div
        className="absolute -top-16 right-8 w-80 h-80 rounded-full blur-[95px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(214, 181, 110, 0.24) 0%, transparent 70%)' }}
      />

      {/* Subtle Teal Glow (Bottom Center-Left) */}
      <div
        className="absolute -bottom-24 left-1/4 w-96 h-72 rounded-full blur-[95px] pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(20, 184, 166, 0.16) 0%, transparent 70%)' }}
      />

      {/* Main Content */}
      <div className="relative z-10 p-6 sm:p-9 lg:p-10 landscape-mobile:p-4">
        
        {/* Eyebrow */}
        <span className="text-[11px] font-normal tracking-[0.26em] text-[#D6B56E] uppercase block mb-2.5 landscape-mobile:mb-1.5">
          MATCH CENTRE
        </span>

        {/* Heading */}
        <h1 className="font-display font-normal text-3xl sm:text-5xl landscape-mobile:text-2xl text-white uppercase tracking-tight leading-none mb-3 landscape-mobile:mb-1.5">
          TEAMS DATABASE
        </h1>

        {/* Description Copy */}
        <p className="text-sm landscape-mobile:text-xs text-slate-300/90 max-w-2xl leading-relaxed font-normal">
          Men&apos;s and women&apos;s football clubs and international national teams across all six confederations — calibrated to world rankings and connected through one permanent player registry.
        </p>

        {/* Four Compact Translucent Statistical Tiles */}
        <div className="grid grid-cols-2 landscape-mobile:grid-cols-4 lg:grid-cols-4 gap-3.5 sm:gap-4 landscape-mobile:gap-2.5 mt-7 landscape-mobile:mt-4">
          
          {/* Tile 1: TEAMS ON FILE */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.1] hover:border-[#D6B56E]/50 hover:bg-white/[0.07] px-4 py-3.5 transition-all group">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D6B56E] shrink-0" />
              <span className="text-[10px] font-normal tracking-[0.16em] text-slate-300 uppercase truncate">
                TEAMS ON FILE
              </span>
            </div>
            <div className="font-display font-normal text-2xl sm:text-3xl text-white tabular-nums mt-2 leading-none group-hover:text-[#D6B56E] transition-colors">
              {counts.total}
            </div>
          </div>

          {/* Tile 2: CLUBS */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.1] hover:border-[#38BDF8]/50 hover:bg-white/[0.07] px-4 py-3.5 transition-all group">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
              <span className="text-[10px] font-normal tracking-[0.16em] text-slate-300 uppercase truncate">
                CLUBS
              </span>
            </div>
            <div className="font-display font-normal text-2xl sm:text-3xl text-white tabular-nums mt-2 leading-none group-hover:text-[#38BDF8] transition-colors">
              {counts.clubs}
            </div>
          </div>

          {/* Tile 3: NATIONAL TEAMS */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.1] hover:border-[#10B981]/50 hover:bg-white/[0.07] px-4 py-3.5 transition-all group">
            <div className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
              <span className="text-[10px] font-normal tracking-[0.16em] text-slate-300 uppercase truncate">
                NATIONAL TEAMS
              </span>
            </div>
            <div className="font-display font-normal text-2xl sm:text-3xl text-white tabular-nums mt-2 leading-none group-hover:text-[#10B981] transition-colors">
              {counts.national}
            </div>
          </div>

          {/* Tile 4: WOMEN'S SIDES */}
          <div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.1] hover:border-[#A855F7]/50 hover:bg-white/[0.07] px-4 py-3.5 transition-all group">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#A855F7] shrink-0" />
              <span className="text-[10px] font-normal tracking-[0.16em] text-slate-300 uppercase truncate">
                WOMEN&apos;S SIDES
              </span>
            </div>
            <div className="font-display font-normal text-2xl sm:text-3xl text-white tabular-nums mt-2 leading-none group-hover:text-[#A855F7] transition-colors">
              {counts.womens}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
