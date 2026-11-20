import React, { useState } from 'react';
import { ArrowLeft, BookOpen, Download, Bookmark, Sparkles, Check, EyeOff, Globe } from 'lucide-react';
import { BookVolume, ReadingProgressRecord } from '../../types/reads';

interface BookDetailPageProps {
  book: BookVolume;
  onBack: () => void;
  onStartReading: (startChapterId?: string) => void;
  isSaved: boolean;
  onToggleSave: () => void;
  progress?: ReadingProgressRecord;
  isAdmin?: boolean;
  onTogglePublish?: () => void;
}

export const BookDetailPage: React.FC<BookDetailPageProps> = ({
  book,
  onBack,
  onStartReading,
  isSaved,
  onToggleSave,
  progress,
  isAdmin = false,
  onTogglePublish,
}) => {
  const [pdfNotice, setPdfNotice] = useState<{ type: 'info' | 'error'; text: string } | null>(null);

  if (!book.published && !isAdmin) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-16 px-4 flex items-center justify-center">
        <div className="max-w-md w-full rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 text-center space-y-4">
          <EyeOff className="w-8 h-8 text-amber-400 mx-auto" />
          <h2 className="font-display text-2xl uppercase">Volume Unavailable</h2>
          <p className="text-xs text-[var(--text-secondary)]">
            This volume is currently unpublished and cannot be accessed.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="px-4 py-2 rounded-xl bg-[#7ADBF0] light:bg-cyan-600 text-[#050A12] light:text-white text-xs font-bold cursor-pointer"
          >
            Back to Reads Library
          </button>
        </div>
      </div>
    );
  }

  const handleDownloadPdf = () => {
    if (!book.downloadEnabled) {
      setPdfNotice({
        type: 'error',
        text: 'PDF downloading for this publication is currently restricted by the administrator.',
      });
      return;
    }
    const link = document.createElement('a');
    link.href = book.pdfUrl || '#';
    link.download = `${book.title.replace(/\s+/g, '_')}.pdf`;
    setPdfNotice({
      type: 'info',
      text: `Preparing PDF edition for "${book.title}".`,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] py-12 landscape-mobile:py-5 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-6xl mx-auto">
        
        {/* Back Link */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--accent-cyan)] mb-6 landscape-mobile:mb-3 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Reads Library</span>
        </button>

        {/* Owner-Only Draft Banner */}
        {isAdmin && !book.published && (
          <div className="mb-6 rounded-2xl bg-amber-500/12 border border-amber-400/50 px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-3">
              <EyeOff className="w-5 h-5 text-amber-400 light:text-amber-700 shrink-0 mt-0.5 sm:mt-0" />
              <div className="space-y-0.5">
                <span className="font-mono text-[10px] tracking-[0.2em] text-amber-300 light:text-amber-800 font-bold uppercase block">
                  UNPUBLISHED DRAFT · OWNER VIEW ONLY
                </span>
                <p className="text-xs sm:text-sm text-amber-100 light:text-amber-950 font-medium">
                  This volume is unpublished. Only you can see it — visitors cannot open this page or find the PDF.
                </p>
              </div>
            </div>
            {onTogglePublish && (
              <button
                type="button"
                onClick={onTogglePublish}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shrink-0 cursor-pointer shadow"
              >
                <Globe className="w-3.5 h-3.5" />
                <span>Publish volume</span>
              </button>
            )}
          </div>
        )}

        {/* Inline PDF Status Feedback */}
        {pdfNotice && (
          <div
            className={`mb-6 rounded-xl px-4 py-3 border text-xs font-medium flex items-center justify-between gap-3 ${
              pdfNotice.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300 light:text-rose-800'
                : 'bg-[#7ADBF0]/10 border-[#7ADBF0]/40 text-[#7ADBF0] light:bg-cyan-50 light:text-cyan-800 light:border-cyan-300'
            }`}
          >
            <span>{pdfNotice.text}</span>
            <button
              type="button"
              onClick={() => setPdfNotice(null)}
              className="text-[11px] font-bold underline cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Card Showcase */}
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 sm:p-10 lg:p-12 landscape-mobile:p-5 shadow-2xl light:shadow-md">
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-8 landscape-mobile:gap-5 lg:gap-12 items-start">
            
            {/* Left: Book Cover Artwork */}
            <div className="landscape-mobile:col-span-4 lg:col-span-5 flex flex-col items-center">
              <div className="relative w-full max-w-sm landscape-mobile:max-w-[210px] aspect-[3/4] bg-[#020512] light:bg-slate-100 rounded-xl p-6 landscape-mobile:p-3 border border-[var(--border-color)] shadow-xl flex items-center justify-center">
                <img
                  src={book.coverUrl}
                  alt={book.title}
                  className="h-full w-auto max-w-full object-contain rounded-md shadow-2xl"
                />
                <div className="absolute top-4 left-4 px-3 py-1 rounded bg-blue-950/90 light:bg-white/95 border border-blue-400/40 light:border-cyan-600/40 text-blue-300 light:text-cyan-800 text-xs font-bold uppercase tracking-wider">
                  Vol. {book.volumeNumber}
                </div>
              </div>

              {/* Progress Summary if available */}
              {progress && (
                <div className="w-full max-w-sm mt-5 p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-semibold mb-2">
                    <span>Reading Progress</span>
                    <span className="text-[var(--accent-cyan)] font-mono">{progress.percent}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 light:bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-amber-400 light:from-cyan-600 light:to-amber-500 rounded-full"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <span className="text-[11px] text-[var(--text-muted)] mt-2 block">
                    Last read on {progress.lastReadAt} · Page {progress.currentPage} of {progress.totalPages}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Book Details & Actions */}
            <div className="landscape-mobile:col-span-8 lg:col-span-7 flex flex-col justify-between h-full space-y-6 landscape-mobile:space-y-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent-cyan)] text-xs font-bold tracking-[0.2em] uppercase mb-3">
                  <Sparkles className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                  <span>{book.seriesTitle} · Volume {book.volumeNumber}</span>
                </div>

                <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl landscape-mobile:text-2xl text-[var(--text-primary)] tracking-tight uppercase leading-[1.05]">
                  {book.title}
                </h1>

                {book.subtitle && (
                  <p className="mt-2 text-base sm:text-lg text-amber-400 light:text-cyan-700 font-medium tracking-wide">
                    {book.subtitle}
                  </p>
                )}

                {/* Metadata Pills */}
                <div className="mt-5 flex flex-wrap items-center gap-3 text-xs text-[var(--text-secondary)]">
                  <span className="px-2.5 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)] font-semibold">
                    Author: {book.author}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                    {book.pageCount} Pages
                  </span>
                  <span className="px-2.5 py-1 rounded bg-[var(--bg-elevated)] border border-[var(--border-color)]">
                    ~{book.readTimeMinutes} mins reading time
                  </span>
                  <span className="px-2.5 py-1 rounded bg-blue-950/80 light:bg-cyan-50 border border-blue-400/30 light:border-cyan-300 text-blue-300 light:text-cyan-800">
                    {book.category}
                  </span>
                </div>

                <div className="mt-6 pt-6 border-t border-[var(--border-color)]">
                  <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">
                    About this Publication
                  </h3>
                  <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed font-normal">
                    {book.description}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-6 landscape-mobile:pt-4 border-t border-[var(--border-color)] flex flex-col landscape-mobile:flex-row sm:flex-row items-stretch landscape-mobile:items-center sm:items-center gap-4 landscape-mobile:gap-2.5">
                
                {/* Primary: In-App Reader */}
                <button
                  onClick={() => onStartReading()}
                  className="flex-1 inline-flex items-center justify-center gap-3 px-8 py-4 text-xs sm:text-sm font-extrabold uppercase tracking-widest text-[#050A12] bg-[#7ADBF0] hover:bg-[#99E6F7] light:bg-cyan-600 light:hover:bg-cyan-700 light:text-white rounded-xl shadow-[0_0_25px_rgba(122,219,240,0.3)] transition-all transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <BookOpen className="w-5 h-5" />
                  <span>{progress && progress.percent > 0 ? 'RESUME READING' : 'START READING IN-APP'}</span>
                </button>

                {/* PDF Download (Admin controlled) */}
                <button
                  onClick={handleDownloadPdf}
                  title={book.downloadEnabled ? 'Download official PDF publication' : 'PDF download disabled by administrator'}
                  className={`inline-flex items-center justify-center gap-2 px-6 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl border transition-all ${
                    book.downloadEnabled
                      ? 'bg-blue-600 hover:bg-blue-500 text-white border-blue-400/40 shadow'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border-[var(--border-color)] cursor-not-allowed opacity-60'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>{book.downloadEnabled ? 'PDF DOWNLOAD' : 'PDF LOCKED'}</span>
                </button>

                {/* Save to Library */}
                <button
                  onClick={onToggleSave}
                  title={isSaved ? 'Remove from My Library' : 'Save to My Library'}
                  className={`p-4 rounded-xl border transition-all ${
                    isSaved
                      ? 'bg-amber-400 text-slate-950 border-amber-400 shadow'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-color)] hover:border-[#7ADBF0]/60'
                  }`}
                >
                  {isSaved ? <Check className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                </button>

              </div>
            </div>

          </div>
        </div>

        {/* Chapters & Contents Section */}
        <div className="mt-12 landscape-mobile:mt-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 sm:p-10 landscape-mobile:p-5 light:shadow-sm">
          <div className="mb-6 pb-4 border-b border-[var(--border-color)] flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-[var(--text-primary)] uppercase tracking-tight">
                Table of Contents & Chapters
              </h3>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                Select any chapter to start reading directly from that section.
              </p>
            </div>
            <span className="text-xs font-mono font-bold text-[var(--accent-cyan)]">
              {book.chapters.length} Chapters Included
            </span>
          </div>

          <div className="space-y-3">
            {book.chapters.map((chapter) => (
              <div
                key={chapter.id}
                onClick={() => onStartReading(chapter.id)}
                className="p-4 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] hover:border-[#7ADBF0]/50 light:hover:border-cyan-600/50 transition-all flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-blue-950 light:bg-cyan-50 border border-blue-400/30 light:border-cyan-300 flex items-center justify-center font-mono font-bold text-blue-300 light:text-cyan-800 text-xs shrink-0 group-hover:bg-[#7ADBF0] light:group-hover:bg-cyan-600 group-hover:text-slate-950 light:group-hover:text-white transition-colors">
                    {chapter.chapterNumber}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[var(--text-primary)] group-hover:text-[var(--accent-cyan)] transition-colors">
                      {chapter.title}
                    </h4>
                    <span className="text-[11px] text-[var(--text-muted)]">
                      Starts on page {chapter.pageNumber}
                    </span>
                  </div>
                </div>

                <div className="text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                  Read Chapter →
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};
