import React, { useState, useEffect } from 'react';
import { BookOpen, ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';
import { ReadingSeries, Volume, NavigationDestination } from '../types/homepage';

interface FeaturedReadsSectionProps {
  seriesList: ReadingSeries[];
  latestVolumes: Volume[];
  onNavigate: (destination: NavigationDestination, payload?: any) => void;
}

export const FeaturedReadsSection: React.FC<FeaturedReadsSectionProps> = ({
  seriesList,
  latestVolumes,
  onNavigate,
}) => {
  const [carouselIndex, setCarouselIndex] = useState(0);

  const maxIndex = Math.max(0, seriesList.length - 3);
  const safeIndex = Math.min(carouselIndex, maxIndex);

  useEffect(() => {
    if (carouselIndex > maxIndex) {
      setCarouselIndex(maxIndex);
    }
  }, [carouselIndex, maxIndex]);

  const handlePrev = () => {
    setCarouselIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCarouselIndex((prev) => Math.min(maxIndex, prev + 1));
  };

  const visibleSeries = seriesList.slice(safeIndex, safeIndex + 3);

  return (
    <section 
      aria-label="Featured Reading Series and Latest Volumes"
      className="py-20 sm:py-28 landscape-mobile:py-10 bg-[var(--bg-surface)] px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] relative overflow-hidden transition-colors duration-200"
    >
      {/* Subtle obsidian cyan ambient wash */}
      <div className="absolute top-1/4 right-0 w-[480px] h-[480px] bg-[#7ADBF0]/[0.05] rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto space-y-24 landscape-mobile:space-y-12 relative z-10">
        
        {/* ======================================================== */}
        {/* SUBSECTION 1: FEATURED READING SERIES */}
        {/* ======================================================== */}
        <div>
          {/* Header with Title and Carousel Controls */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-6 border-b border-[var(--border-color)]">
            <div>
              <div className="eyebrow-mono text-[11px] text-[var(--accent-cyan)] uppercase mb-2.5">
                THE DODAEONA F.C. PUBLISHING COLLECTION
              </div>
              <h2 className="font-display text-4xl sm:text-5xl text-[var(--text-primary)] tracking-[0.015em] uppercase leading-none">
                FEATURED READING SERIES
              </h2>
              <div className="w-20 h-[2px] bg-gradient-to-r from-[#7ADBF0] light:from-cyan-600 to-transparent my-4" />
              <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed text-balance">
                Comprehensive football curricula, historical chronologies, and tactical handbooks crafted for dedicated readers.
              </p>
            </div>

            {/* Carousel Navigation Controls */}
            {seriesList.length > 0 && (
              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={handlePrev}
                  disabled={safeIndex === 0}
                  aria-label="Previous reading series"
                  className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#7ADBF0]/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                
                <div className="flex items-center gap-1.5 px-2">
                  {Array.from({ length: maxIndex + 1 }).map((_, i) => (
                    <span
                      key={i}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        i === safeIndex ? 'w-6 bg-[#7ADBF0] light:bg-cyan-600' : 'w-1.5 bg-[var(--border-color)]'
                      }`}
                    />
                  ))}
                </div>

                <button
                  onClick={handleNext}
                  disabled={safeIndex >= maxIndex}
                  aria-label="Next reading series"
                  className="p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[#7ADBF0]/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 focus:outline-none"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>

          {/* Series Cards (3 visible simultaneously on desktop) */}
          {visibleSeries.length === 0 ? (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] p-10 text-center text-sm text-[var(--text-muted)]">
              No featured reading series are currently published.
            </div>
          ) : (
            <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-8 landscape-mobile:gap-5">
              {visibleSeries.map((series) => (
                <div
                  key={series.id}
                  onClick={() => onNavigate('series-detail', series)}
                  className="group relative rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#7ADBF0]/60 flex flex-col justify-between overflow-hidden transition-all duration-200 cursor-pointer shadow-lg"
                >
                  {/* Official Cover Art Showcase */}
                  <div className="relative aspect-[3/4] w-full bg-[#03070E] light:bg-slate-100 overflow-hidden flex items-center justify-center p-6 border-b border-[var(--border-color)]">
                    <img
                      src={series.coverUrl}
                      alt={`Official cover for series: ${series.title}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-auto max-w-full object-contain rounded-lg shadow-xl transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  </div>

                  {/* Series Details */}
                  <div className="p-7 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 eyebrow-mono text-[10px] text-[var(--accent-cyan)] mb-2">
                        <span>Series #{String(series.seriesNumber).padStart(2, '0')}</span>
                        <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                        <span className="text-[var(--text-muted)]">{series.volumeCount} {series.volumeCount === 1 ? 'Volume' : 'Volumes'}</span>
                      </div>
                      <h3 className="font-display text-2xl text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors uppercase tracking-[0.015em] leading-none">
                        {series.title}
                      </h3>
                      <p className="mt-3 text-xs sm:text-sm text-[var(--text-secondary)] line-clamp-3 leading-relaxed">
                        {series.description}
                      </p>
                    </div>

                    <div className="mt-6 pt-5 border-t border-[var(--border-color)] flex items-center justify-between">
                      <span className="eyebrow-mono text-[10px] text-[var(--text-muted)]">
                        CURATED CURRICULUM
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('series-detail', series);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider btn-primary-theme rounded-xl transition-all"
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

        {/* ======================================================== */}
        {/* SUBSECTION 2: LATEST VOLUMES */}
        {/* ======================================================== */}
        <div>
          <div className="mb-10 pb-6 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <div className="eyebrow-mono text-[11px] text-[var(--accent-cyan)] uppercase mb-2.5">
                RECENT RELEASES
              </div>
              <h2 className="font-display text-4xl sm:text-5xl text-[var(--text-primary)] tracking-[0.015em] uppercase leading-none">
                LATEST VOLUMES
              </h2>
              <div className="w-20 h-[2px] bg-gradient-to-r from-[#7ADBF0] light:from-cyan-600 to-transparent my-4" />
              <p className="text-sm sm:text-base text-[var(--text-secondary)] max-w-2xl leading-relaxed text-balance">
                The most recently published volumes available for direct reading in the DodaEona in-app reader.
              </p>
            </div>

            <button
              onClick={() => onNavigate('reads')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-primary)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[#7ADBF0]/50 text-xs font-bold uppercase tracking-wider text-[var(--accent-cyan)] transition-all shrink-0"
            >
              <span>View Full Library</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Responsive Card Grid (up to 4 latest volumes) */}
          {latestVolumes.length === 0 ? (
            <div className="rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] p-10 text-center text-sm text-[var(--text-muted)]">
              No published volumes are currently available.
            </div>
          ) : (
            <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 landscape-mobile:gap-4">
              {latestVolumes.map((vol, idx) => (
                <div
                  key={vol.id}
                  onClick={() => onNavigate('volume-reader', vol)}
                  className="group relative rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[#7ADBF0]/60 flex flex-col justify-between overflow-hidden transition-all duration-200 cursor-pointer shadow-lg"
                >
                  {/* Official Volume Cover Art */}
                  <div className="relative aspect-[3/4] w-full bg-[#03070E] light:bg-slate-100 overflow-hidden flex items-center justify-center p-4 border-b border-[var(--border-color)]">
                    <img
                      src={vol.coverUrl}
                      alt={`Volume cover: ${vol.title}`}
                      referrerPolicy="no-referrer"
                      className="h-full w-auto max-w-full object-contain rounded-md shadow-lg transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>

                  {/* Volume Details */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 eyebrow-mono text-[10px] text-[var(--accent-cyan)] truncate">
                        <span>{vol.seriesTitle}</span>
                        {vol.volumeNumber && (
                          <>
                            <span aria-hidden="true" className="text-[var(--text-muted)]">·</span>
                            <span className="text-[var(--text-muted)]">Vol. {String(vol.volumeNumber).padStart(2, '0')}</span>
                          </>
                        )}
                      </div>
                      <h4 className="mt-1.5 font-semibold text-sm sm:text-base text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-2 leading-snug">
                        {vol.title}
                      </h4>
                      <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed font-normal">
                        {vol.description}
                      </p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                      <span className="font-mono text-[11px] text-[var(--text-muted)]">
                        {String(idx + 1).padStart(2, '0')} · {vol.publishedDate || 'New Release'}
                      </span>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate('volume-reader', vol);
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider btn-primary-theme rounded-lg transition-colors"
                      >
                        <span>READ</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
