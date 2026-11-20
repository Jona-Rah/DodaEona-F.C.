import React, { useState } from 'react';
import { Layers, ArrowRight, ArrowUpDown, BookOpen } from 'lucide-react';
import { ReadingSeriesItem } from '../../types/reads';

interface AllSeriesSectionProps {
  seriesList: ReadingSeriesItem[];
  onSelectSeries: (series: ReadingSeriesItem) => void;
}

export const AllSeriesSection: React.FC<AllSeriesSectionProps> = ({
  seriesList,
  onSelectSeries,
}) => {
  const [sortBy, setSortBy] = useState<'number' | 'title' | 'volumes'>('number');

  const sorted = [...seriesList].sort((a, b) => {
    if (sortBy === 'number') return a.seriesNumber - b.seriesNumber;
    if (sortBy === 'title') return a.title.localeCompare(b.title);
    if (sortBy === 'volumes') return b.volumeCount - a.volumeCount;
    return 0;
  });

  return (
    <section 
      aria-label="All Reading Series"
      className="py-16 sm:py-24 landscape-mobile:py-8 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] bg-[var(--bg-surface)] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header with Sort Controls */}
        <div className="mb-10 landscape-mobile:mb-5 pb-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 eyebrow-mono text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-[0.2em] mb-2">
              <BookOpen className="w-4 h-4 text-[var(--accent-cyan)]" />
              <span>Complete Catalog</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--text-primary)] tracking-tight uppercase">
              ALL READING SERIES
            </h2>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[var(--text-muted)] flex items-center gap-1 font-medium">
              <ArrowUpDown className="w-3.5 h-3.5" />
              Sort by:
            </span>
            <div className="flex p-1 bg-[var(--bg-elevated)] rounded-lg border border-[var(--border-color)]">
              <button
                onClick={() => setSortBy('number')}
                className={`px-3 py-1 rounded font-bold uppercase tracking-wider transition-colors ${
                  sortBy === 'number'
                    ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Series #
              </button>
              <button
                onClick={() => setSortBy('title')}
                className={`px-3 py-1 rounded font-bold uppercase tracking-wider transition-colors ${
                  sortBy === 'title'
                    ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Title
              </button>
              <button
                onClick={() => setSortBy('volumes')}
                className={`px-3 py-1 rounded font-bold uppercase tracking-wider transition-colors ${
                  sortBy === 'volumes'
                    ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Volumes
              </button>
            </div>
          </div>
        </div>

        {/* Series List Grid */}
        {sorted.length === 0 ? (
          <div className="rounded-2xl bg-[var(--bg-primary)] light:bg-white border border-[var(--border-color)] p-10 text-center">
            <p className="text-sm font-semibold text-[var(--text-primary)]">
              No reading series have been published yet.
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              New series and volumes published from the Control Room will appear here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8 landscape-mobile:gap-5">
            {sorted.map((series) => (
              <div
                key={series.id}
                onClick={() => onSelectSeries(series)}
                className="group relative rounded-2xl bg-[var(--bg-primary)] light:bg-white border border-[var(--border-color)] hover:border-[#7ADBF0]/50 light:hover:border-cyan-600/50 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl light:shadow-sm cursor-pointer"
              >
                {/* Cover Artwork */}
                <div className="relative aspect-[3/4] landscape-mobile:aspect-[4/3] w-full bg-[#020512] light:bg-slate-100 overflow-hidden flex items-center justify-center p-6 landscape-mobile:p-3 border-b border-[var(--border-color)]">
                  <img
                    src={series.coverUrl}
                    alt={`Cover for series: ${series.title}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-auto max-w-full object-contain rounded shadow-xl transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  
                  <div className="absolute top-4 left-4 px-2.5 py-1 rounded bg-[#020617]/90 light:bg-white/95 backdrop-blur-md border border-amber-400/30 light:border-amber-500/40 text-amber-300 light:text-amber-700 text-[11px] font-bold uppercase tracking-wider shadow">
                    Series #{series.seriesNumber}
                  </div>

                  <div className="absolute top-4 right-4 px-2.5 py-0.5 rounded bg-blue-950/80 light:bg-blue-50/95 backdrop-blur-md border border-blue-400/30 light:border-blue-300 text-blue-300 light:text-blue-700 text-[10px] font-bold uppercase tracking-wider">
                    {series.category}
                  </div>
                </div>

                {/* Series Details */}
                <div className="p-6 landscape-mobile:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors uppercase tracking-tight">
                      {series.title}
                    </h3>
                    <p className="mt-2.5 text-xs text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                      {series.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
                      <Layers className="w-4 h-4 text-[var(--accent-cyan)]" />
                      <span>{series.volumeCount} Published Volumes</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectSeries(series);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#050A12] bg-[#7ADBF0] hover:bg-[#99E6F7] light:bg-cyan-600 light:text-white light:hover:bg-cyan-700 rounded-md transition-colors"
                    >
                      <span>EXPLORE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
};
