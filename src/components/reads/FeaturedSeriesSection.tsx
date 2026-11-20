import React from 'react';
import { Layers, ArrowRight, Sparkles, BookOpen } from 'lucide-react';
import { ReadingSeriesItem } from '../../types/reads';

interface FeaturedSeriesSectionProps {
  seriesList: ReadingSeriesItem[];
  onSelectSeries: (series: ReadingSeriesItem) => void;
}

export const FeaturedSeriesSection: React.FC<FeaturedSeriesSectionProps> = ({
  seriesList,
  onSelectSeries,
}) => {
  const featured = seriesList.filter((s) => s.featured && s.volumeCount > 0);

  if (featured.length === 0) return null;

  return (
    <section 
      aria-label="Featured Reading Series"
      className="py-16 sm:py-20 landscape-mobile:py-8 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] bg-[var(--bg-primary)] relative transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="mb-10 landscape-mobile:mb-5 pb-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 eyebrow-mono text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-[0.2em] mb-2">
              <Sparkles className="w-4 h-4 text-[var(--accent-cyan)]" />
              <span>Curated Collections</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--text-primary)] tracking-tight uppercase">
              FEATURED READING SERIES
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md">
            Flagship thematic series recommended by the DodaEona editorial team for comprehensive study.
          </p>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8 landscape-mobile:gap-5">
          {featured.map((series) => (
            <div
              key={series.id}
              onClick={() => onSelectSeries(series)}
              className="group relative rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#7ADBF0]/60 light:hover:border-cyan-600/60 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl light:shadow-sm cursor-pointer"
            >
              {/* Cover Artwork Container */}
              <div className="relative aspect-[3/4] landscape-mobile:aspect-[4/3] w-full bg-[#020512] light:bg-slate-100 overflow-hidden flex items-center justify-center p-6 landscape-mobile:p-3 border-b border-[var(--border-color)]">
                <img
                  src={series.coverUrl}
                  alt={`Official cover for ${series.title}`}
                  referrerPolicy="no-referrer"
                  className="h-full w-auto max-w-full object-contain rounded-md shadow-2xl transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
                
                {/* Series Number Badge */}
                <div className="absolute top-4 left-4 px-2.5 py-1 rounded bg-[#020617]/90 light:bg-white/95 backdrop-blur-md border border-amber-400/30 light:border-amber-500/40 text-amber-300 light:text-amber-700 text-[11px] font-bold uppercase tracking-wider shadow">
                  Series #{series.seriesNumber}
                </div>

                {series.category && (
                  <div className="absolute top-4 right-4 px-2 py-0.5 rounded bg-blue-950/80 light:bg-blue-50/95 backdrop-blur-md border border-blue-400/30 light:border-blue-300 text-blue-300 light:text-blue-700 text-[10px] font-semibold uppercase tracking-wider">
                    {series.category}
                  </div>
                )}
              </div>

              {/* Series Content */}
              <div className="p-7 landscape-mobile:p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors uppercase tracking-tight">
                    {series.title}
                  </h3>
                  {series.subtitle && (
                    <p className="mt-1 text-xs font-semibold text-amber-400 light:text-amber-700 tracking-wide">
                      {series.subtitle}
                    </p>
                  )}
                  <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                    {series.description}
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-muted)]">
                    <Layers className="w-4 h-4 text-[var(--accent-cyan)]" />
                    <span>{series.volumeCount} Volumes</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectSeries(series);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#050A12] bg-[#7ADBF0] hover:bg-[#99E6F7] light:bg-cyan-600 light:text-white light:hover:bg-cyan-700 rounded-lg transition-colors shadow"
                  >
                    <span>EXPLORE SERIES</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
