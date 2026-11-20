import React from 'react';
import { BookOpen, Bookmark, Check, ArrowRight, Clock, FileText } from 'lucide-react';
import { BookVolume } from '../../types/reads';

interface LatestPublicationsSectionProps {
  books: BookVolume[];
  onOpenBook: (book: BookVolume) => void;
  onSaveBook: (bookId: string) => void;
  isBookSaved: (bookId: string) => boolean;
}

export const LatestPublicationsSection: React.FC<LatestPublicationsSectionProps> = ({
  books,
  onOpenBook,
  onSaveBook,
  isBookSaved,
}) => {
  if (books.length === 0) {
    return (
      <div className="py-16 text-center text-[var(--text-muted)] bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
        <p>No publications match your criteria.</p>
      </div>
    );
  }

  return (
    <section 
      aria-label="Latest Publications"
      className="py-16 sm:py-24 landscape-mobile:py-8 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] bg-[var(--bg-primary)] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Section Header */}
        <div className="mb-10 landscape-mobile:mb-5 pb-5 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 eyebrow-mono text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-[0.2em] mb-2">
              <FileText className="w-4 h-4 text-[var(--accent-cyan)]" />
              <span>Catalog Releases</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--text-primary)] tracking-tight uppercase">
              LATEST PUBLICATIONS
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md">
            Individual volumes and publications ready to open in the full-screen reader or download as PDF.
          </p>
        </div>

        {/* Responsive Grid */}
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 landscape-mobile:gap-4">
          {books.map((book) => {
            const saved = isBookSaved(book.id);
            return (
              <div
                key={book.id}
                onClick={() => onOpenBook(book)}
                className="group relative rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#7ADBF0]/60 light:hover:border-cyan-600/60 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl light:shadow-sm cursor-pointer"
              >
                {/* Book Cover Container */}
                <div className="relative aspect-[3/4] landscape-mobile:aspect-[4/3] w-full bg-[#020512] light:bg-slate-100 overflow-hidden flex items-center justify-center p-4 landscape-mobile:p-3 border-b border-[var(--border-color)]">
                  <img
                    src={book.coverUrl}
                    alt={`Cover for ${book.title}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-auto max-w-full object-contain rounded shadow-xl transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  
                  {/* Draft / Volume Badges */}
                  <div className="absolute top-3 left-3 flex flex-col items-start gap-1.5">
                    {!book.published && (
                      <div className="px-2 py-0.5 rounded bg-amber-500/95 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                        Draft · Owner only
                      </div>
                    )}
                    {book.volumeNumber && (
                      <div className="px-2 py-0.5 rounded bg-blue-950/90 light:bg-white/95 border border-blue-400/40 light:border-cyan-600/40 text-blue-300 light:text-cyan-800 text-[10px] font-bold uppercase tracking-wider shadow">
                        Vol. {book.volumeNumber}
                      </div>
                    )}
                  </div>

                  {/* Bookmark Save Action */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSaveBook(book.id);
                    }}
                    title={saved ? 'Saved in My Library' : 'Save to My Library'}
                    aria-label="Save book to personal library"
                    className={`absolute top-3 right-3 p-2 rounded-full border transition-all ${
                      saved
                        ? 'bg-amber-400 text-slate-950 border-amber-400 shadow-md'
                        : 'bg-slate-950/80 light:bg-white/90 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-cyan-700 border-white/[0.15] light:border-slate-300 hover:border-amber-400/60'
                    }`}
                  >
                    {saved ? <Check className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
                  </button>
                </div>

                {/* Details */}
                <div className="p-5 landscape-mobile:p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-amber-400 light:text-cyan-700 uppercase tracking-wider block truncate">
                      {book.seriesTitle}
                    </span>
                    <h3 className="mt-1 text-sm sm:text-base font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors line-clamp-2 leading-snug">
                      {book.title}
                    </h3>
                    <p className="mt-2 text-xs text-[var(--text-muted)] line-clamp-2 leading-relaxed">
                      {book.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <Clock className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                      <span>{book.readTimeMinutes} min read</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBook(book);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#050A12] bg-[#7ADBF0] hover:bg-[#99E6F7] light:bg-cyan-600 light:text-white light:hover:bg-cyan-700 rounded-md transition-colors shadow"
                    >
                      <span>READ NOW</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
