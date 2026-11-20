import React from 'react';
import { ArrowLeft, BookOpen, Layers, Clock, ArrowRight, Bookmark } from 'lucide-react';
import { ReadingSeriesItem, BookVolume } from '../../types/reads';

interface SeriesDetailPageProps {
  series: ReadingSeriesItem;
  volumes: BookVolume[];
  onBack: () => void;
  onOpenBook: (book: BookVolume) => void;
}

export const SeriesDetailPage: React.FC<SeriesDetailPageProps> = ({
  series,
  volumes,
  onBack,
  onOpenBook,
}) => {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-12 landscape-mobile:py-5 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        
        {/* Back Link */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mb-8 landscape-mobile:mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Series</span>
        </button>

        {/* Series Header Card */}
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 sm:p-10 lg:p-12 landscape-mobile:p-5 shadow-2xl light:shadow-md mb-12 landscape-mobile:mb-6">
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-8 landscape-mobile:gap-5 items-center">
            
            {/* Series Cover */}
            <div className="landscape-mobile:col-span-4 lg:col-span-4 flex justify-center">
              <div className="relative aspect-[3/4] w-64 landscape-mobile:w-44 bg-[#020512] light:bg-slate-100 rounded-xl p-5 landscape-mobile:p-3 border border-[var(--border-color)] shadow-xl flex items-center justify-center">
                <img
                  src={series.coverUrl}
                  alt={series.title}
                  className="h-full w-auto max-w-full object-contain rounded-md shadow-2xl"
                />
                <div className="absolute top-3 left-3 px-2.5 py-1 rounded bg-[#020617]/90 light:bg-white/95 border border-amber-400/30 light:border-amber-500/40 text-amber-300 light:text-amber-700 text-xs font-bold uppercase tracking-wider">
                  Series #{series.seriesNumber}
                </div>
              </div>
            </div>

            {/* Series Description */}
            <div className="landscape-mobile:col-span-8 lg:col-span-8 space-y-4 landscape-mobile:space-y-2.5">
              <span className="text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-widest">
                Official DodaEona F.C. Curriculum
              </span>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl landscape-mobile:text-2xl text-[var(--text-primary)] tracking-tight uppercase">
                {series.title}
              </h1>
              {series.subtitle && (
                <p className="text-base text-amber-400 light:text-cyan-700 font-semibold tracking-wide">
                  {series.subtitle}
                </p>
              )}
              <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-normal">
                {series.description}
              </p>

              <div className="pt-4 flex items-center gap-4 text-xs text-[var(--text-muted)]">
                <div className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                  <Layers className="w-4 h-4 text-[var(--accent-cyan)]" />
                  <span>{volumes.length} Available Volumes</span>
                </div>
                <span>·</span>
                <span className="px-2.5 py-0.5 rounded bg-blue-950/80 light:bg-cyan-50 border border-blue-400/30 light:border-cyan-300 text-blue-300 light:text-cyan-800 font-semibold">
                  {series.category}
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Series Volumes List */}
        <div className="space-y-6">
          <div className="pb-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <h2 className="text-xl font-black text-[var(--text-primary)] uppercase tracking-tight">
              Volumes in this Series ({volumes.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-6 landscape-mobile:gap-4">
            {volumes.map((vol) => (
              <div
                key={vol.id}
                onClick={() => onOpenBook(vol)}
                className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#7ADBF0]/50 light:hover:border-cyan-600/50 transition-all flex flex-col justify-between group cursor-pointer hover:shadow-xl light:shadow-sm"
              >
                <div className="flex gap-5">
                  <img
                    src={vol.coverUrl}
                    alt={vol.title}
                    className="w-24 h-32 object-contain rounded-lg bg-slate-950 light:bg-slate-100 shrink-0 shadow-lg group-hover:scale-105 transition-transform"
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-amber-400 light:text-cyan-700 uppercase tracking-widest block mb-1">
                      Volume {vol.volumeNumber}
                    </span>
                    <h3 className="text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-2 leading-snug">
                      {vol.title}
                    </h3>
                    <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-3 leading-relaxed">
                      {vol.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                  <span className="text-xs text-[var(--text-muted)]">
                    {vol.pageCount} pages · {vol.readTimeMinutes} min
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenBook(vol);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#050A12] bg-[#7ADBF0] hover:bg-[#99E6F7] light:bg-cyan-600 light:text-white light:hover:bg-cyan-700 rounded-lg transition-colors shadow"
                  >
                    <span>EXPLORE VOLUME</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
