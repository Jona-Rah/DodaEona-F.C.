import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Bookmark, BookmarkCheck, Type, Sun, Moon, BookOpen, Share2, ArrowLeft } from 'lucide-react';
import { BookVolume, Chapter } from '../../types/reads';

interface InAppReaderModalProps {
  book: BookVolume;
  initialChapterId?: string;
  onClose: () => void;
  onSaveProgress: (currentPage: number, totalPages: number) => void;
  onAddBookmark: (page: number, chapterTitle: string, note?: string) => void;
  initialPage?: number;
}

export const InAppReaderModal: React.FC<InAppReaderModalProps> = ({
  book,
  initialChapterId,
  onClose,
  onSaveProgress,
  onAddBookmark,
  initialPage = 1,
}) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [fontSize, setFontSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base');
  const [theme, setTheme] = useState<'dark' | 'sepia' | 'light'>(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('light')
      ? 'light'
      : 'dark'
  );
  const [bookmarkSuccess, setBookmarkSuccess] = useState(false);
  const [bookmarkNote, setBookmarkNote] = useState('');
  const [showNoteInput, setShowNoteInput] = useState(false);

  const totalPages = book.pageCount || 100;

  // Find active chapter based on current page
  const activeChapter = [...book.chapters]
    .reverse()
    .find((chap) => currentPage >= chap.pageNumber) || book.chapters[0];

  // Auto-save progress whenever page changes
  useEffect(() => {
    onSaveProgress(currentPage, totalPages);
  }, [currentPage, totalPages]);

  // Jump to specific chapter if provided initially
  useEffect(() => {
    if (initialChapterId) {
      const target = book.chapters.find((c) => c.id === initialChapterId);
      if (target) {
        setCurrentPage(target.pageNumber);
      }
    }
  }, [initialChapterId]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage((p) => p + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((p) => p - 1);
    }
  };

  const handleCreateBookmark = () => {
    onAddBookmark(currentPage, activeChapter?.title || 'General Notes', bookmarkNote || undefined);
    setBookmarkSuccess(true);
    setShowNoteInput(false);
    setBookmarkNote('');
    setTimeout(() => setBookmarkSuccess(false), 2500);
  };

  // Reading theme classes
  const themeStyles = {
    dark: 'bg-[#030712] text-slate-100 border-white/[0.08]',
    sepia: 'bg-[#fbf0d9] text-[#2c2211] border-[#e2d0b0]',
    light: 'bg-white text-slate-900 border-slate-200',
  };

  const textStyles = {
    sm: 'text-sm sm:text-base leading-relaxed',
    base: 'text-base sm:text-lg leading-relaxed',
    lg: 'text-lg sm:text-xl leading-loose',
    xl: 'text-xl sm:text-2xl leading-loose',
  };

  return (
    <div className={`fixed inset-0 h-[100dvh] z-50 flex flex-col ${themeStyles[theme]} overflow-hidden animate-in fade-in duration-200`}>
      
      {/* Top Header Bar */}
      <header className="px-4 sm:px-8 py-3.5 landscape-mobile:py-1.5 border-b flex items-center justify-between shrink-0 bg-opacity-95 backdrop-blur-md">
        
        {/* Left: Back & Title */}
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-black/10 transition-colors flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Reader</span>
          </button>

          <div className="min-w-0">
            <span className="eyebrow-mono text-[9px] font-bold text-[#C5A059] uppercase tracking-widest block truncate">
              {book.seriesTitle} · Vol. {book.volumeNumber}
            </span>
            <h2 className="font-display font-black text-sm sm:text-base uppercase tracking-tight truncate max-w-sm sm:max-w-md">
              {book.title}
            </h2>
          </div>
        </div>

        {/* Right: Controls (Font size, Theme, Bookmark, Close) */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Font Size Toggle */}
          <div className="flex items-center rounded-lg border border-current/20 p-0.5 text-xs font-bold">
            <button
              onClick={() => setFontSize('sm')}
              className={`px-2 py-1 rounded ${fontSize === 'sm' ? 'bg-amber-400 text-slate-950' : 'opacity-70 hover:opacity-100'}`}
            >
              A-
            </button>
            <button
              onClick={() => setFontSize('base')}
              className={`px-2 py-1 rounded ${fontSize === 'base' ? 'bg-amber-400 text-slate-950' : 'opacity-70 hover:opacity-100'}`}
            >
              A
            </button>
            <button
              onClick={() => setFontSize('lg')}
              className={`px-2 py-1 rounded ${fontSize === 'lg' ? 'bg-amber-400 text-slate-950' : 'opacity-70 hover:opacity-100'}`}
            >
              A+
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center rounded-lg border border-current/20 p-0.5 text-xs">
            <button
              onClick={() => setTheme('dark')}
              title="Dark Theme"
              className={`p-1.5 rounded ${theme === 'dark' ? 'bg-slate-800 text-amber-300' : 'opacity-70'}`}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('sepia')}
              title="Sepia Theme"
              className={`p-1.5 rounded ${theme === 'sepia' ? 'bg-[#e2d0b0] text-[#2c2211]' : 'opacity-70'}`}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setTheme('light')}
              title="Light Theme"
              className={`p-1.5 rounded ${theme === 'light' ? 'bg-slate-200 text-slate-900' : 'opacity-70'}`}
            >
              <Type className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={() => setShowNoteInput(!showNoteInput)}
            title="Bookmark this page"
            className={`p-2 rounded-lg border transition-colors flex items-center gap-1.5 text-xs font-bold ${
              bookmarkSuccess
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'border-current/20 hover:border-amber-400'
            }`}
          >
            {bookmarkSuccess ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
            <span className="hidden md:inline">Bookmark</span>
          </button>

          {/* Exit */}
          <button
            onClick={onClose}
            aria-label="Close reader"
            className="p-2 rounded-lg hover:bg-black/10 transition-colors ml-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

      </header>

      {/* Bookmark Note Popup */}
      {showNoteInput && (
        <div className="absolute top-16 landscape-mobile:top-12 right-6 landscape-mobile:right-4 z-50 p-4 landscape-mobile:p-3 rounded-xl bg-slate-900 light:bg-white text-white light:text-slate-900 border border-amber-400/50 light:border-amber-400 shadow-2xl w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-4rem)] overflow-y-auto">
          <span className="text-xs font-bold text-amber-400 light:text-amber-800 uppercase tracking-wider block mb-1">
            Bookmark Page {currentPage}
          </span>
          <input
            type="text"
            value={bookmarkNote}
            onChange={(e) => setBookmarkNote(e.target.value)}
            placeholder="Add an optional tactical note..."
            className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 mb-3 focus:outline-none focus:border-amber-400"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowNoteInput(false)}
              className="px-3 py-1 text-xs text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateBookmark}
              className="px-4 py-1 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase cursor-pointer"
            >
              Save Bookmark
            </button>
          </div>
        </div>
      )}

      {/* Reader Main Content Viewport */}
      <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-10 landscape-mobile:py-4 flex justify-center">
        <article className="max-w-3xl w-full space-y-8 landscape-mobile:space-y-4">
          
          {/* Chapter Header */}
          <div className="text-center pb-8 landscape-mobile:pb-4 border-b border-current/10">
            {activeChapter ? (
              <>
                <span className="eyebrow-mono text-xs font-bold tracking-widest uppercase opacity-60 block mb-2">
                  Chapter {activeChapter.chapterNumber}
                </span>
                <h1 className="font-display font-black text-3xl sm:text-4xl landscape-mobile:text-2xl uppercase tracking-tight">
                  {activeChapter.title}
                </h1>
              </>
            ) : (
              <h1 className="font-display font-black text-3xl sm:text-4xl landscape-mobile:text-2xl uppercase tracking-tight">
                {book.title}
              </h1>
            )}
          </div>

          {/* Dynamic Chapter Paragraphs */}
          <div className={`space-y-6 ${textStyles[fontSize]}`}>
            {activeChapter && activeChapter.content.length > 0 ? (
              activeChapter.content.map((paragraph, idx) => (
                <p key={idx}>
                  {paragraph}
                </p>
              ))
            ) : (
              <p className="opacity-70 italic text-center py-8">
                {book.description || 'No digital text chapters have been added to this volume yet.'}
              </p>
            )}

            {/* Tactical Notes Card if available */}
            {activeChapter?.tacticalNotes && (
              <div className="mt-8 p-5 rounded-xl border border-current/20 bg-current/5">
                <span className="text-xs font-mono font-black uppercase tracking-wider block mb-1.5 text-amber-500">
                  Tactical Board Note:
                </span>
                <p className="text-xs sm:text-sm font-medium italic opacity-90">
                  {activeChapter.tacticalNotes}
                </p>
              </div>
            )}
          </div>

        </article>
      </main>

      {/* Bottom Navigation & Progress Bar */}
      <footer className="px-4 sm:px-8 py-3.5 landscape-mobile:py-1.5 border-t flex items-center justify-between shrink-0 bg-opacity-95 backdrop-blur-md">
        
        {/* Previous Page Button */}
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-current/20 hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous Page</span>
        </button>

        {/* Center Progress Slider / Page Status */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-xs sm:max-w-md px-4">
          <div className="flex items-center justify-between w-full text-[11px] font-mono opacity-70">
            <span>Page {currentPage} of {totalPages}</span>
            <span>{Math.round((currentPage / totalPages) * 100)}%</span>
          </div>
          
          <input
            type="range"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => setCurrentPage(Number(e.target.value))}
            className="w-full h-1 bg-current/20 rounded-full appearance-none cursor-pointer accent-amber-400"
          />
        </div>

        {/* Next Page Button */}
        <button
          onClick={handleNextPage}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-current/20 hover:bg-black/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-bold uppercase tracking-wider transition-colors"
        >
          <span className="hidden sm:inline">Next Page</span>
          <ChevronRight className="w-4 h-4" />
        </button>

      </footer>

    </div>
  );
};
