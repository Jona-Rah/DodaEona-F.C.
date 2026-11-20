import React, { useState, useEffect, useMemo, useDeferredValue } from 'react';
import {
  BookOpen,
  Search,
  ArrowRight,
  ShieldCheck,
  Plus,
  Download,
  Bookmark as BookmarkIcon,
  CheckCircle2,
  X,
  ChevronDown,
  ArrowLeft,
  FileText,
  Settings,
  FolderOpen,
  RotateCcw,
  AlertTriangle
} from 'lucide-react';
import { useReads } from '../../context/ReadsContext';
import { BookVolume, ReadingSeriesItem, ReadsCategory } from '../../types/reads';
import { normalizeDatabaseSearchText } from '../../utils/globalDatabaseSearch';

interface LibraryHubPageProps {
  onNavigateHome: () => void;
  initialBookId?: string | null;
  initialSeriesId?: string | null;
}

export const LibraryHubPage: React.FC<LibraryHubPageProps> = ({
  onNavigateHome,
  initialBookId,
  initialSeriesId,
}) => {
  const {
    series,
    publishedSeries,
    books,
    publishedBooks,
    userLibrary,
    userSession,
    saveBook,
    unsaveBook,
    isBookSaved,
    addBookmark,
    updateReadingProgress,
    recordBookOpened,
    createSeries,
    updateSeries,
    deleteSeries,
    createBook,
    updateBook,
    deleteBook,
    toggleBookPublish,
    toggleBookDownload,
  } = useReads();

  const isAdmin = userSession.role === 'admin';
  const catalogBooks = publishedBooks;
  const catalogSeries = publishedSeries;

  // Router / Path / Query parsing
  const [pathname, setPathname] = useState<string>(() => (typeof window !== 'undefined' ? window.location.pathname : '/library'));
  const [searchParams, setSearchParams] = useState<URLSearchParams>(() => {
    if (typeof window !== 'undefined') return new URLSearchParams(window.location.search);
    return new URLSearchParams();
  });

  useEffect(() => {
    const handlePopState = () => {
      setPathname(window.location.pathname);
      setSearchParams(new URLSearchParams(window.location.search));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (url: string) => {
    window.history.pushState({}, '', url);
    setPathname(window.location.pathname);
    setSearchParams(new URLSearchParams(window.location.search));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const initialTab = searchParams.get('tab') || 'series';
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [searchQuery, setSearchQuery] = useState<string>(searchParams.get('q') || '');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedSeriesId, setSelectedSeriesId] = useState<string>(searchParams.get('series') || 'all');
  const [selectedCategory, setSelectedCategory] = useState<string>(searchParams.get('category') || 'all');
  const [selectedSort, setSelectedSort] = useState<string>(searchParams.get('sort') || 'newest');
  const [visibleVolumesCount, setVisibleVolumesCount] = useState<number>(12);

  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    if (searchQuery.trim()) {
      params.set('q', searchQuery.trim());
    } else {
      params.delete('q');
    }
    if (selectedSeriesId !== 'all') {
      params.set('series', selectedSeriesId);
    } else {
      params.delete('series');
    }
    if (selectedCategory !== 'all') {
      params.set('category', selectedCategory);
    } else {
      params.delete('category');
    }
    if (activeTab && activeTab !== 'series') {
      params.set('tab', activeTab);
    } else {
      params.delete('tab');
    }
    const newSearch = params.toString();
    const newUrl = `${window.location.pathname}${newSearch ? `?${newSearch}` : ''}`;
    window.history.replaceState({}, '', newUrl);
  }, [searchQuery, selectedSeriesId, selectedCategory, activeTab, searchParams]);

  const seriesDetailMatch = pathname.match(/^\/(?:library\/)?series\/([^/]+)$/);
  const bookReadMatch = pathname.match(/^\/(?:library\/)?books\/([^/]+)\/read$/);
  const bookDetailMatch = pathname.match(/^\/(?:library\/)?books\/([^/]+)$/);

  const matchedSeriesId = seriesDetailMatch ? decodeURIComponent(seriesDetailMatch[1]) : initialSeriesId;
  const matchedBookId = bookReadMatch ? decodeURIComponent(bookReadMatch[1]) : bookDetailMatch ? decodeURIComponent(bookDetailMatch[1]) : initialBookId;
  const isReaderMode = Boolean(bookReadMatch);

  const activeSeriesItem = matchedSeriesId ? catalogSeries.find((s) => s.id === matchedSeriesId) : null;
  const activeBookItem = matchedBookId ? catalogBooks.find((b) => b.id === matchedBookId) : null;

  useEffect(() => {
    if (activeBookItem) {
      recordBookOpened(activeBookItem.id);
    }
  }, [activeBookItem, recordBookOpened]);

  const [adminModalMode, setAdminModalMode] = useState<'create-series' | 'edit-series' | 'create-book' | 'edit-book' | null>(null);
  const [editingSeries, setEditingSeries] = useState<ReadingSeriesItem | null>(null);
  const [editingBook, setEditingBook] = useState<BookVolume | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'series' | 'book' | null>(null);

  const filteredVolumes = useMemo(() => {
    let list = catalogBooks;

    if (selectedSeriesId !== 'all') {
      list = list.filter((b) => b.seriesId === selectedSeriesId);
    }

    if (selectedCategory !== 'all') {
      list = list.filter((b) => b.category === selectedCategory);
    }

    const q = normalizeDatabaseSearchText(deferredSearchQuery);
    if (q) {
      list = list.filter(
        (b) =>
          normalizeDatabaseSearchText(b.title).includes(q) ||
          normalizeDatabaseSearchText(b.subtitle || '').includes(q) ||
          normalizeDatabaseSearchText(b.author).includes(q) ||
          normalizeDatabaseSearchText(b.description).includes(q) ||
          normalizeDatabaseSearchText(b.seriesTitle).includes(q) ||
          normalizeDatabaseSearchText(b.category).includes(q)
      );
    }

    return [...list].sort((a, b) => {
      if (selectedSort === 'newest') {
        return new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime();
      }
      if (selectedSort === 'oldest') {
        return new Date(a.publishedDate).getTime() - new Date(b.publishedDate).getTime();
      }
      if (selectedSort === 'title') {
        return a.title.localeCompare(b.title);
      }
      if (selectedSort === 'volume') {
        return (a.sortOrder || a.volumeNumber) - (b.sortOrder || b.volumeNumber);
      }
      return 0;
    });
  }, [catalogBooks, selectedSeriesId, selectedCategory, deferredSearchQuery, selectedSort]);

  const filteredSeries = useMemo(() => {
    let list = catalogSeries;
    const q = normalizeDatabaseSearchText(deferredSearchQuery);
    if (q) {
      list = list.filter(
        (s) =>
          normalizeDatabaseSearchText(s.title).includes(q) ||
          normalizeDatabaseSearchText(s.subtitle || '').includes(q) ||
          normalizeDatabaseSearchText(s.description).includes(q)
      );
    }
    return [...list].sort((a, b) => (a.sortOrder || a.seriesNumber) - (b.sortOrder || b.seriesNumber));
  }, [catalogSeries, deferredSearchQuery]);

  // Reader Mode
  if (isReaderMode && activeBookItem) {
    return (
      <FullSizePdfReaderView
        book={activeBookItem}
        onBack={() => navigateTo(`/books/${activeBookItem.id}`)}
        userLibrary={userLibrary}
        onSaveProgress={updateReadingProgress}
        onAddBookmark={addBookmark}
      />
    );
  }

  // Book Detail View
  if (activeBookItem) {
    const isSaved = isBookSaved(activeBookItem.id);
    const progress = userLibrary.progress[activeBookItem.id];
    const relatedBooks = catalogBooks
      .filter((b) => b.seriesId === activeBookItem.seriesId && b.id !== activeBookItem.id && b.published)
      .slice(0, 4);

    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
        <div className="bg-[#070F1B] light:bg-white border-b border-white/10 light:border-slate-200 sticky top-0 z-40 backdrop-blur-md px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigateTo('/library')}
              className="inline-flex items-center gap-2 text-xs font-mono text-[#7ADBF0] light:text-cyan-700 hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library Hub</span>
            </button>
            <div className="flex items-center gap-3">
              {isAdmin && (
                <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono uppercase">
                  {activeBookItem.published ? 'Published Draft' : 'Unpublished Draft'}
                </span>
              )}
              <button
                onClick={() => (isSaved ? unsaveBook(activeBookItem.id) : saveBook(activeBookItem.id))}
                className={`p-2 rounded-xl border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors ${
                  isSaved
                    ? 'bg-[#7ADBF0] text-slate-950 border-[#7ADBF0]'
                    : 'bg-white/5 light:bg-slate-100 border-white/10 light:border-slate-200 text-slate-200 light:text-slate-700 hover:bg-white/10'
                }`}
              >
                <BookmarkIcon className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
                <span>{isSaved ? 'Saved in Library' : 'Save to Library'}</span>
              </button>
            </div>
          </div>
        </div>

        {isAdmin && !activeBookItem.published && (
          <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-xs font-mono text-center flex items-center justify-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Unpublished Draft Warning: This volume is currently hidden from ordinary visitors. Only administrators can view this page.</span>
            <button
              onClick={() => toggleBookPublish(activeBookItem.id)}
              className="px-2 py-0.5 rounded bg-amber-950 text-amber-200 font-bold ml-2 cursor-pointer hover:bg-amber-900"
            >
              Publish Now
            </button>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl bg-gradient-to-r from-[#0C1527] via-[#09101E] to-[#060B14] light:from-slate-100 light:to-white border border-white/10 light:border-slate-300 p-6 sm:p-10 shadow-2xl">
            <div className="lg:col-span-4 flex justify-center">
              <div className="relative group w-64 sm:w-72 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 light:border-slate-300">
                <img src={activeBookItem.coverUrl} alt={activeBookItem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-full bg-[#0891B2] text-white text-xs font-mono tracking-wider shadow">
                  Vol. {activeBookItem.volumeNumber}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="space-y-2">
                <div className="font-mono text-xs uppercase tracking-widest text-[#7ADBF0] light:text-cyan-700 flex items-center gap-2">
                  <span>{activeBookItem.seriesTitle}</span>
                  <span>·</span>
                  <span>{activeBookItem.category}</span>
                </div>
                <h1 className="font-display text-3xl sm:text-5xl text-white light:text-slate-900 uppercase tracking-wide">
                  {activeBookItem.title}
                </h1>
                {activeBookItem.subtitle && (
                  <p className="text-sm sm:text-base text-slate-300 light:text-slate-600 font-medium">
                    {activeBookItem.subtitle}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-6 text-xs font-mono text-slate-400 light:text-slate-600 pt-2 border-t border-white/10 light:border-slate-200">
                <div>Author: <span className="text-white light:text-slate-900 font-bold">{activeBookItem.author}</span></div>
                <div>Published: <span className="text-white light:text-slate-900 font-bold">{activeBookItem.publishedDate}</span></div>
                <div>Length: <span className="text-white light:text-slate-900 font-bold">{activeBookItem.pageCount} Pages ({activeBookItem.readTimeMinutes} min)</span></div>
              </div>

              {progress && (
                <div className="p-4 rounded-2xl bg-white/[0.04] light:bg-slate-200/60 border border-white/10 light:border-slate-300 space-y-2">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#7ADBF0] light:text-cyan-700">Reading Progress: Page {progress.currentPage} of {progress.totalPages}</span>
                    <span className="text-white light:text-slate-900 font-bold">{progress.percent}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 light:bg-slate-300 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0891B2] to-[#7ADBF0]" style={{ width: `${progress.percent}%` }} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-4 pt-4">
                {activeBookItem.pdfUrl && (activeBookItem.readOnline !== false) ? (
                  <button
                    onClick={() => navigateTo(`/books/${activeBookItem.id}/read`)}
                    className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#06B6D4] hover:brightness-110 text-white font-mono text-xs uppercase tracking-wider shadow-lg shadow-cyan-900/40 flex items-center gap-2.5 cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4 text-amber-300" />
                    <span>Read Online (PDF Viewer)</span>
                  </button>
                ) : (
                  <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 light:bg-slate-200 text-slate-400 light:text-slate-600 text-xs font-mono">
                    Online reading currently restricted by publisher.
                  </div>
                )}

                {activeBookItem.pdfUrl && activeBookItem.downloadEnabled ? (
                  <a
                    href={activeBookItem.pdfUrl}
                    download
                    className="px-6 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 light:bg-slate-200 text-white light:text-slate-900 font-mono text-xs uppercase tracking-wider border border-white/20 flex items-center gap-2.5 cursor-pointer transition-colors"
                  >
                    <Download className="w-4 h-4 text-[#7ADBF0]" />
                    <span>Download PDF</span>
                  </a>
                ) : (
                  <div className="px-4 py-2.5 rounded-xl bg-slate-800/80 light:bg-slate-200 text-slate-400 light:text-slate-600 text-xs font-mono">
                    PDF downloads disabled.
                  </div>
                )}
              </div>

              {!activeBookItem.pdfUrl && (
                <p className="text-xs font-mono text-amber-400/90">
                  Notice: The digital PDF edition for this volume is currently being prepared by DodaEona F.C. editorial staff.
                </p>
              )}

              <p className="text-[11px] text-slate-500 italic">
                Publication Disclaimer: Officially licensed by DodaEona F.C. Publishing Wing. All tactical analyses and historical records verified against official competition archives.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-4 space-y-6">
              <div className="rounded-2xl bg-[#070F1B]/95 light:bg-white border border-white/10 light:border-slate-300 p-6 shadow-xl space-y-4">
                <h3 className="font-mono text-xs uppercase tracking-widest text-[#7ADBF0] pb-3 border-b border-white/10 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>The Dossier</span>
                </h3>
                <div className="space-y-3 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Author:</span>
                    <span className="text-white light:text-slate-900 font-bold">{activeBookItem.author}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Series:</span>
                    <span className="text-white light:text-slate-900 font-bold">{activeBookItem.seriesTitle}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Volume:</span>
                    <span className="text-white light:text-slate-900 font-bold">Vol. {activeBookItem.volumeNumber}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-white/5">
                    <span className="text-slate-400">Category:</span>
                    <span className="text-white light:text-slate-900 font-bold text-right max-w-[160px] truncate">{activeBookItem.category}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">Release Date:</span>
                    <span className="text-white light:text-slate-900 font-bold">{activeBookItem.publishedDate}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 space-y-6">
              <div className="rounded-2xl bg-[#070F1B]/95 light:bg-white border border-white/10 p-6 sm:p-8 shadow-xl space-y-6">
                <h3 className="font-mono text-xs uppercase tracking-widest text-[#7ADBF0] pb-3 border-b border-white/10 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  <span>The Brief — Volume Description</span>
                </h3>
                <div className="text-sm sm:text-base text-slate-300 light:text-slate-700 leading-relaxed space-y-4 whitespace-pre-line">
                  {activeBookItem.description}
                </div>

                {activeBookItem.chapters && activeBookItem.chapters.length > 0 && (
                  <div className="pt-6 border-t border-white/10 space-y-4">
                    <h4 className="font-mono text-xs uppercase tracking-widest text-white light:text-slate-900">
                      Table of Contents ({activeBookItem.chapters.length} Chapters)
                    </h4>
                    <div className="space-y-2">
                      {activeBookItem.chapters.map((ch) => (
                        <div key={ch.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-200">Ch. {ch.chapterNumber}: {ch.title}</span>
                          <span className="text-[#7ADBF0]">Page {ch.pageNumber}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {relatedBooks.length > 0 && (
            <div className="space-y-6 pt-6">
              <h3 className="font-display text-2xl text-white light:text-slate-900 uppercase tracking-wide">
                More from {activeBookItem.seriesTitle}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {relatedBooks.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => navigateTo(`/books/${book.id}`)}
                    className="group rounded-2xl bg-[#070F1B] border border-white/10 overflow-hidden shadow-xl hover:border-[#7ADBF0] cursor-pointer transition-all hover:-translate-y-1 flex flex-col"
                  >
                    <div className="aspect-[3/4] relative overflow-hidden bg-slate-900">
                      <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#0891B2] text-white text-[10px] font-mono">
                        Vol. {book.volumeNumber}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-white line-clamp-1 group-hover:text-[#7ADBF0]">{book.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{book.author}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono text-slate-500">
                        <span>{book.publishedDate}</span>
                        <span className="text-[#7ADBF0] flex items-center gap-1">Read <ArrowRight className="w-3 h-3" /></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Series Detail View
  if (activeSeriesItem) {
    const seriesVolumes = catalogBooks.filter((b) => b.seriesId === activeSeriesItem.id);

    return (
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
        <div className="bg-[#070F1B] light:bg-white border-b border-white/10 sticky top-0 z-40 backdrop-blur-md px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <button
              onClick={() => navigateTo('/library')}
              className="inline-flex items-center gap-2 text-xs font-mono text-[#7ADBF0] hover:underline cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Library Hub</span>
            </button>
            <span className="text-xs font-mono text-slate-400">Series #{activeSeriesItem.seriesNumber}</span>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
          <div className="rounded-3xl bg-gradient-to-r from-[#0C1527] via-[#09101E] to-[#060B14] border border-white/10 p-8 sm:p-12 shadow-2xl flex flex-col md:flex-row gap-8 items-center">
            <div className="w-48 sm:w-60 aspect-[3/4] rounded-2xl overflow-hidden shadow-2xl border-2 border-white/20 shrink-0">
              <img src={activeSeriesItem.coverUrl} alt={activeSeriesItem.title} className="w-full h-full object-cover" />
            </div>
            <div className="space-y-4 flex-1 text-center md:text-left">
              <div className="font-mono text-xs uppercase tracking-widest text-[#7ADBF0]">
                {activeSeriesItem.category} · {seriesVolumes.length} Volumes Published
              </div>
              <h1 className="font-display text-3xl sm:text-5xl text-white uppercase tracking-wide">
                {activeSeriesItem.title}
              </h1>
              {activeSeriesItem.subtitle && (
                <p className="text-sm sm:text-base text-slate-300">{activeSeriesItem.subtitle}</p>
              )}
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
                {activeSeriesItem.description}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-display text-2xl text-white uppercase tracking-wide">
              Volumes in this Series ({seriesVolumes.length})
            </h3>

            {seriesVolumes.length === 0 ? (
              <div className="text-center py-16 rounded-2xl bg-[#070F1B] border border-white/10 p-8 text-slate-400 font-mono text-xs">
                No volumes currently published in this series.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {seriesVolumes.map((book) => (
                  <div
                    key={book.id}
                    onClick={() => navigateTo(`/books/${book.id}`)}
                    className="group rounded-2xl bg-[#070F1B] border border-white/10 overflow-hidden shadow-xl hover:border-[#7ADBF0] cursor-pointer transition-all hover:-translate-y-1 flex flex-col"
                  >
                    <div className="aspect-[3/4] relative overflow-hidden bg-slate-900">
                      <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#0891B2] text-white text-[10px] font-mono">
                        Vol. {book.volumeNumber}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-white group-hover:text-[#7ADBF0]">{book.title}</h4>
                        <p className="text-xs text-slate-400">{book.author}</p>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-[10px] font-mono text-slate-500">
                        <span>{book.publishedDate}</span>
                        <span className="text-[#7ADBF0] flex items-center gap-1">Read Book <ArrowRight className="w-3 h-3" /></span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Library Hub
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col transition-colors duration-200">

      <div className="relative overflow-hidden bg-gradient-to-r from-[#0C1527] via-[#09101E] to-[#060B14] border-b border-white/10 py-12 px-4 sm:px-6 lg:px-8 shadow-2xl">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="space-y-2 max-w-3xl">
            <div className="font-mono text-xs uppercase tracking-widest text-[#7ADBF0] flex items-center gap-2 flex-wrap">
              <span>DODAEONA F.C. PUBLISHING WING</span>
              <span className="text-slate-500">·</span>
              <span className="text-slate-300 tabular-nums">{publishedSeries.length} Published Series</span>
              <span className="text-slate-500">·</span>
              <span className="text-emerald-300 tabular-nums">{publishedBooks.length} Total Volumes</span>
            </div>
            <h1 className="font-display text-4xl sm:text-6xl text-white uppercase tracking-wide">
              Official Book Library
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Explore exhaustive football literature, tactical masterclasses, historical chronicles, and academy guides. Read online in the full-screen PDF viewer, download editions, and track reading progress.
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-3 items-center pt-2">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search across title, subtitle, author, description, category, or series..."
                className="w-full pl-11 pr-10 py-3 rounded-2xl bg-white/[0.06] border border-white/15 text-xs sm:text-sm text-white placeholder-slate-400 focus:outline-none focus:border-[#7ADBF0] shadow-lg"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <select
                value={selectedSeriesId}
                onChange={(e) => setSelectedSeriesId(e.target.value)}
                aria-label="Filter library by series"
                className="py-3 px-4 rounded-2xl bg-white/[0.06] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#7ADBF0] cursor-pointer"
              >
                <option value="all" className="bg-[#0B1525]">All Series ({catalogSeries.length})</option>
                {catalogSeries.map((s) => (
                  <option key={s.id} value={s.id} className="bg-[#0B1525]">{s.title}</option>
                ))}
              </select>

              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value)}
                aria-label="Sort library volumes"
                className="py-3 px-4 rounded-2xl bg-white/[0.06] border border-white/15 text-xs font-mono text-white focus:outline-none focus:border-[#7ADBF0] cursor-pointer"
              >
                <option value="newest" className="bg-[#0B1525]">Sort: Newest First</option>
                <option value="oldest" className="bg-[#0B1525]">Sort: Oldest First</option>
                <option value="title" className="bg-[#0B1525]">Sort: Title A–Z</option>
                <option value="volume" className="bg-[#0B1525]">Sort: Series Order</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 border-b border-white/10 pt-4">
            <button
              onClick={() => setActiveTab('series')}
              className={`px-5 py-3 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'series' ? 'bg-[#0891B2] text-white shadow-lg' : 'text-slate-400 hover:text-white bg-white/[0.03]'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span>Series Shelf ({filteredSeries.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('volumes')}
              className={`px-5 py-3 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === 'volumes' ? 'bg-[#0891B2] text-white shadow-lg' : 'text-slate-400 hover:text-white bg-white/[0.03]'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Volumes Shelf ({filteredVolumes.length})</span>
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('admin-books')}
                  className={`px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'admin-books' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-white/[0.03]'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>Admin Books</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin-files')}
                  className={`px-4 py-3 rounded-xl text-xs font-mono uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeTab === 'admin-files' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white bg-white/[0.03]'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Storage & PDFs</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full space-y-8">
        {(searchQuery || selectedSeriesId !== 'all' || selectedCategory !== 'all') && (
          <div className="flex items-center justify-between p-4 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono">
            <span className="text-cyan-200">Active filters applied. Showing results for search &ldquo;{searchQuery || 'all'}&rdquo;.</span>
            <button
              onClick={() => { setSearchQuery(''); setSelectedSeriesId('all'); setSelectedCategory('all'); }}
              className="text-[#7ADBF0] hover:underline flex items-center gap-1 cursor-pointer font-bold"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear All Filters</span>
            </button>
          </div>
        )}

        {activeTab === 'series' && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl text-white uppercase tracking-wide">
              Published Book Series ({filteredSeries.length})
            </h2>

            {filteredSeries.length === 0 ? (
              <div className="text-center py-20 rounded-3xl bg-[#070F1B] border border-white/10 space-y-4">
                <FolderOpen className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-sm font-mono text-slate-400">No book series match your search criteria.</p>
                <button onClick={() => { setSearchQuery(''); setSelectedSeriesId('all'); }} className="px-4 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-mono uppercase">
                  Reset Search
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredSeries.map((seriesItem) => {
                  const sVolumes = catalogBooks.filter((b) => b.seriesId === seriesItem.id);
                  return (
                    <div
                      key={seriesItem.id}
                      onClick={() => navigateTo(`/series/${seriesItem.id}`)}
                      className="group rounded-3xl bg-[#070F1B] border border-white/10 overflow-hidden shadow-2xl hover:border-[#7ADBF0] cursor-pointer transition-all hover:-translate-y-1.5 flex flex-col"
                    >
                      <div className="aspect-[16/9] relative overflow-hidden bg-slate-900">
                        <img src={seriesItem.coverUrl} alt={seriesItem.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#070F1B] via-transparent to-transparent opacity-80" />
                        <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between">
                          <span className="px-3 py-1 rounded-full bg-[#0891B2] text-white text-[11px] font-mono shadow">
                            Series #{seriesItem.seriesNumber}
                          </span>
                          <span className="text-xs font-mono text-cyan-200">{sVolumes.length} Volumes</span>
                        </div>
                      </div>

                      <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                        <div className="space-y-2">
                          <div className="font-mono text-[10px] uppercase tracking-wider text-[#7ADBF0]">{seriesItem.category}</div>
                          <h3 className="font-display text-xl text-white group-hover:text-[#7ADBF0] transition-colors">{seriesItem.title}</h3>
                          {seriesItem.subtitle && <p className="text-xs text-slate-400 line-clamp-1">{seriesItem.subtitle}</p>}
                          <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">{seriesItem.description}</p>
                        </div>

                        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400">Explore Volumes</span>
                          <span className="text-[#7ADBF0] flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            View Series <ArrowRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>

                      {isAdmin && (
                        <div className="px-6 py-3 bg-black/40 border-t border-white/10 flex items-center justify-between text-xs font-mono">
                          <span className={seriesItem.published ? 'text-emerald-400' : 'text-amber-400'}>{seriesItem.published ? 'Published' : 'Draft'}</span>
                          <div className="flex items-center gap-2">
                            <button onClick={(e) => { e.stopPropagation(); setEditingSeries(seriesItem); setAdminModalMode('edit-series'); }} className="px-2.5 py-1 rounded bg-white/10 text-white">Edit</button>
                            <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(seriesItem.id); setDeleteType('series'); }} className="px-2.5 py-1 rounded bg-rose-500/20 text-rose-300">Delete</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'volumes' && (
          <div className="space-y-6">
            <h2 className="font-display text-2xl text-white uppercase tracking-wide">
              Library Volumes ({filteredVolumes.length})
            </h2>

            {filteredVolumes.length === 0 ? (
              <div className="text-center py-20 rounded-3xl bg-[#070F1B] border border-white/10 space-y-4">
                <BookOpen className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-sm font-mono text-slate-400">No volumes match your search and filter criteria.</p>
                <button onClick={() => { setSearchQuery(''); setSelectedSeriesId('all'); setSelectedCategory('all'); }} className="px-4 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-mono uppercase">
                  Reset Filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {filteredVolumes.slice(0, visibleVolumesCount).map((book) => {
                    const isSaved = isBookSaved(book.id);
                    return (
                      <div
                        key={book.id}
                        onClick={() => navigateTo(`/books/${book.id}`)}
                        className="group rounded-2xl bg-[#070F1B] border border-white/10 overflow-hidden shadow-xl hover:border-[#7ADBF0] cursor-pointer transition-all hover:-translate-y-1 flex flex-col justify-between"
                      >
                        <div className="aspect-[3/4] relative overflow-hidden bg-slate-900">
                          <img src={book.coverUrl} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <div className="absolute top-2 left-2 px-2.5 py-0.5 rounded-full bg-[#0891B2] text-white text-[10px] font-mono shadow">
                            Vol. {book.volumeNumber}
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); isSaved ? unsaveBook(book.id) : saveBook(book.id); }}
                            className={`absolute top-2 right-2 p-2 rounded-full backdrop-blur-md shadow cursor-pointer transition-colors ${
                              isSaved ? 'bg-[#7ADBF0] text-slate-950' : 'bg-black/60 text-white hover:bg-black/80'
                            }`}
                          >
                            <BookmarkIcon className={`w-3.5 h-3.5 ${isSaved ? 'fill-current' : ''}`} />
                          </button>
                        </div>

                        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                          <div className="space-y-1">
                            <div className="font-mono text-[9px] text-[#7ADBF0] uppercase tracking-wider line-clamp-1">{book.seriesTitle}</div>
                            <h3 className="text-xs font-bold text-white line-clamp-2 group-hover:text-[#7ADBF0]">{book.title}</h3>
                            <p className="text-[11px] text-slate-400 line-clamp-1">{book.author}</p>
                          </div>
                          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                            <span>{book.publishedDate}</span>
                            <span className="text-[#7ADBF0] flex items-center gap-1 font-bold">Read <ArrowRight className="w-3 h-3" /></span>
                          </div>
                        </div>

                        {isAdmin && (
                          <div className="px-4 py-2 bg-black/40 border-t border-white/10 flex items-center justify-between text-[10px] font-mono">
                            <span className={book.published ? 'text-emerald-400' : 'text-amber-400'}>{book.published ? 'Published' : 'Draft'}</span>
                            <div className="flex items-center gap-1.5">
                              <button onClick={(e) => { e.stopPropagation(); setEditingBook(book); setAdminModalMode('edit-book'); }} className="px-2 py-0.5 rounded bg-white/10 text-white">Edit</button>
                              <button onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(book.id); setDeleteType('book'); }} className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300">Delete</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {visibleVolumesCount < filteredVolumes.length && (
                  <div className="text-center pt-6">
                    <button
                      onClick={() => setVisibleVolumesCount((prev) => prev + 12)}
                      className="px-8 py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider border border-white/20 shadow-lg cursor-pointer inline-flex items-center gap-2"
                    >
                      <ChevronDown className="w-4 h-4 text-[#7ADBF0]" />
                      <span>Load More Volumes ({filteredVolumes.length - visibleVolumesCount} remaining)</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'admin-books' && isAdmin && (
          <AdminBooksView
            books={books}
            seriesList={series}
            onCreateBook={() => { setEditingBook(null); setAdminModalMode('create-book'); }}
            onEditBook={(book) => { setEditingBook(book); setAdminModalMode('edit-book'); }}
            onDeleteBook={(id) => { setDeleteConfirmId(id); setDeleteType('book'); }}
            onTogglePublish={toggleBookPublish}
            onToggleDownload={toggleBookDownload}
          />
        )}

        {activeTab === 'admin-files' && isAdmin && (
          <AdminFilesView books={books} />
        )}
      </div>

      {adminModalMode === 'create-series' && (
        <SeriesFormModal onClose={() => setAdminModalMode(null)} onSave={async (data) => { await createSeries(data); setAdminModalMode(null); }} />
      )}
      {adminModalMode === 'edit-series' && editingSeries && (
        <SeriesFormModal initialData={editingSeries} onClose={() => setAdminModalMode(null)} onSave={async (data) => { await updateSeries({ ...editingSeries, ...data }); setAdminModalMode(null); }} />
      )}
      {adminModalMode === 'create-book' && (
        <BookFormModal seriesList={series} onClose={() => setAdminModalMode(null)} onSave={async (data) => { await createBook(data); setAdminModalMode(null); }} />
      )}
      {adminModalMode === 'edit-book' && editingBook && (
        <BookFormModal seriesList={series} initialData={editingBook} onClose={() => setAdminModalMode(null)} onSave={async (data) => { await updateBook({ ...editingBook, ...data }); setAdminModalMode(null); }} />
      )}

      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1525] border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-display text-xl text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span>Confirm Deletion</span>
            </h3>
            <p className="text-xs font-mono text-slate-300 leading-relaxed">
              {deleteType === 'series'
                ? 'Deleting this series will permanently remove all associated book volumes, PDF references, and bookmarks. This action cannot be undone.'
                : 'Deleting this book volume will remove its PDF reference and reading progress records.'}
            </p>
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 rounded-xl bg-white/10 text-white text-xs font-mono">Cancel</button>
              <button
                onClick={async () => {
                  if (deleteType === 'series' && deleteConfirmId) {
                    await deleteSeries(deleteConfirmId);
                  } else if (deleteType === 'book' && deleteConfirmId) {
                    await deleteBook(deleteConfirmId);
                  }
                  setDeleteConfirmId(null);
                  setDeleteType(null);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-mono font-bold hover:bg-red-500"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface FullSizePdfReaderViewProps {
  book: BookVolume;
  onBack: () => void;
  userLibrary: any;
  onSaveProgress: (bookId: string, curr: number, total: number) => void;
  onAddBookmark: (bookmark: any) => void;
}

const FullSizePdfReaderView: React.FC<FullSizePdfReaderViewProps> = ({
  book,
  onBack,
  userLibrary,
  onSaveProgress,
  onAddBookmark,
}) => {
  const savedProgress = userLibrary.progress[book.id];
  const initialPage = savedProgress?.currentPage || 1;
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const totalPages = book.pageCount || 120;
  const [isFinished, setIsFinished] = useState<boolean>(savedProgress?.completed || false);

  useEffect(() => {
    onSaveProgress(book.id, currentPage, totalPages);
  }, [currentPage, totalPages, book.id, onSaveProgress]);

  const handleNextPage = () => { if (currentPage < totalPages) setCurrentPage((p) => p + 1); };
  const handlePrevPage = () => { if (currentPage > 1) setCurrentPage((p) => p - 1); };
  const markAsFinished = () => { setIsFinished(true); onSaveProgress(book.id, totalPages, totalPages); };

  return (
    <div className="fixed inset-0 z-50 bg-[#03070D] text-white flex flex-col overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-[#070F1B] border-b border-white/10 px-4 py-3 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono flex items-center gap-1.5 cursor-pointer transition-colors">
            <ArrowLeft className="w-4 h-4 text-[#7ADBF0]" />
            <span>Exit Reader</span>
          </button>
          <div className="hidden sm:block">
            <h2 className="text-xs font-bold text-white truncate max-w-sm">{book.title}</h2>
            <p className="text-[10px] font-mono text-[#7ADBF0]">{book.seriesTitle} · Vol. {book.volumeNumber} · By {book.author}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
            <button onClick={handlePrevPage} disabled={currentPage <= 1} className="hover:text-[#7ADBF0] disabled:opacity-35 cursor-pointer p-1">◀</button>
            <span className="tabular-nums font-bold">Page {currentPage} of {totalPages}</span>
            <button onClick={handleNextPage} disabled={currentPage >= totalPages} className="hover:text-[#7ADBF0] disabled:opacity-35 cursor-pointer p-1">▶</button>
          </div>

          <button
            onClick={() => {
              onAddBookmark({ bookId: book.id, bookTitle: book.title, seriesTitle: book.seriesTitle, pageNumber: currentPage, chapterTitle: `Page ${currentPage}` });
              alert(`Bookmark successfully saved for Page ${currentPage}!`);
            }}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-mono flex items-center gap-1 cursor-pointer"
            title="Bookmark Current Page"
          >
            <BookmarkIcon className="w-4 h-4 text-amber-300" />
            <span className="hidden md:inline">Bookmark</span>
          </button>

          {!isFinished ? (
            <button onClick={markAsFinished} className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-mono font-bold cursor-pointer transition-colors">
              Mark Finished
            </button>
          ) : (
            <span className="px-3.5 py-2 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 text-xs font-mono flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Finished
            </span>
          )}

          {book.pdfUrl && book.downloadEnabled && (
            <a href={book.pdfUrl} download className="p-2.5 rounded-xl bg-[#0891B2] hover:bg-[#06B6D4] text-white text-xs font-mono flex items-center gap-1 cursor-pointer" title="Download PDF">
              <Download className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Main Content Viewer Area */}
      <div className="flex-1 relative flex items-center justify-center p-6 bg-[#03070D] overflow-y-auto">
        <div className="max-w-3xl w-full bg-[#070F1B] border border-white/15 rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[580px]">
          {/* Top publication header banner inside page */}
          <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-6 text-xs font-mono text-slate-400">
            <span>{book.seriesTitle} — Volume {book.volumeNumber}</span>
            <span className="text-[#7ADBF0]">{book.category}</span>
          </div>

          {/* Page Content */}
          <div className="space-y-6 my-auto py-6">
            <div className="space-y-2">
              <div className="eyebrow-mono text-amber-400">CHAPTER SECTION · PAGE {currentPage} OF {totalPages}</div>
              <h1 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-wide">
                {currentPage === 1 ? book.title : `Section ${currentPage}: Strategic Analysis & Breakdown`}
              </h1>
              {currentPage === 1 && book.subtitle && (
                <p className="text-sm text-slate-300 font-mono">{book.subtitle}</p>
              )}
            </div>

            <div className="p-6 rounded-2xl bg-white/[0.04] border border-white/10 text-sm text-slate-200 leading-relaxed font-sans space-y-4">
              <p>
                {currentPage === 1
                  ? book.description
                  : `Detailed tactical exploration and match analysis for page ${currentPage} of ${book.title}. Covering high-intensity transitional mechanics, spatial occupation, positional structures, and statistical modeling developed by the DodaEona F.C. Technical Board.`}
              </p>
              <p className="text-xs text-slate-400 font-mono">
                &ldquo;Mastery of football principles requires rigorous repetition, tactical discipline, and relentless ambition.&rdquo; — {book.author}
              </p>
            </div>
          </div>

          {/* Page Footer Navigation */}
          <div className="border-t border-white/10 pt-6 mt-6 flex items-center justify-between text-xs font-mono text-slate-400">
            <span>DodaEona F.C. Official Publication</span>
            <div className="flex items-center gap-3">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white disabled:opacity-30 cursor-pointer"
              >
                Previous
              </button>
              <span className="text-white font-bold">{currentPage} / {totalPages}</span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#06B6D4] text-white font-bold disabled:opacity-30 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AdminBooksView: React.FC<{
  books: BookVolume[];
  seriesList: ReadingSeriesItem[];
  onCreateBook: () => void;
  onEditBook: (book: BookVolume) => void;
  onDeleteBook: (id: string) => void;
  onTogglePublish: (id: string) => void;
  onToggleDownload: (id: string) => void;
}> = ({ books, seriesList, onCreateBook, onEditBook, onDeleteBook, onTogglePublish, onToggleDownload }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-white uppercase tracking-wide">Manage Book Volumes</h2>
          <p className="text-xs font-mono text-slate-400">Control publications, independent reading/download permissions, and PDF assets.</p>
        </div>
        <button onClick={onCreateBook} className="px-4 py-2.5 rounded-xl bg-amber-400 text-slate-950 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-amber-300 cursor-pointer shadow">
          <Plus className="w-4 h-4" />
          <span>Upload New Book</span>
        </button>
      </div>

      <div className="rounded-3xl bg-[#070F1B] border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/10 text-slate-400 uppercase text-[10px]">
                <th className="p-4">Volume</th>
                <th className="p-4">Book Title & Author</th>
                <th className="p-4">Series</th>
                <th className="p-4">PDF Attached</th>
                <th className="p-4">Status</th>
                <th className="p-4">Permissions</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {books.map((book) => (
                <tr key={book.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-[#7ADBF0]">Vol. {book.volumeNumber}</td>
                  <td className="p-4 space-y-0.5">
                    <div className="font-bold text-white">{book.title}</div>
                    <div className="text-[11px] text-slate-400">{book.author}</div>
                  </td>
                  <td className="p-4 text-slate-300">{book.seriesTitle}</td>
                  <td className="p-4">
                    {book.pdfUrl ? (
                      <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">Attached</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-[10px]">Preparing PDF</span>
                    )}
                  </td>
                  <td className="p-4">
                    <button onClick={() => onTogglePublish(book.id)} className={`px-3 py-1 rounded-full text-[10px] font-bold cursor-pointer ${book.published ? 'bg-emerald-600 text-white' : 'bg-amber-600/60 text-amber-200'}`}>
                      {book.published ? 'Published' : 'Draft'}
                    </button>
                  </td>
                  <td className="p-4 space-y-1">
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400">Read Online:</span>
                      <span className={book.readOnline !== false ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>{book.readOnline !== false ? 'Enabled' : 'Disabled'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      <span className="text-slate-400">Download:</span>
                      <button onClick={() => onToggleDownload(book.id)} className={`px-2 py-0.5 rounded cursor-pointer ${book.downloadEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        {book.downloadEnabled ? 'Allowed' : 'Blocked'}
                      </button>
                    </div>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => onEditBook(book)} className="px-3 py-1.5 rounded-lg bg-white/10 text-white">Edit</button>
                    <button onClick={() => onDeleteBook(book.id)} className="px-3 py-1.5 rounded-lg bg-rose-500/20 text-rose-300">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const AdminFilesView: React.FC<{ books: BookVolume[] }> = ({ books }) => {
  const booksWithPdf = books.filter((b) => b.pdfUrl);
  const totalSizeBytes = booksWithPdf.length * 4.8 * 1024 * 1024;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl text-white uppercase tracking-wide">Storage Management & PDF Files</h2>
          <p className="text-xs font-mono text-slate-400">Monitor cloud file storage, file sizes, and replace or detach PDF assets.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-3xl bg-[#070F1B] border border-white/10 space-y-2">
          <div className="text-xs font-mono text-slate-400 uppercase">Total Attached PDFs</div>
          <div className="text-3xl font-display text-[#7ADBF0]">{booksWithPdf.length} Files</div>
        </div>
        <div className="p-6 rounded-3xl bg-[#070F1B] border border-white/10 space-y-2">
          <div className="text-xs font-mono text-slate-400 uppercase">Estimated Storage Used</div>
          <div className="text-3xl font-display text-emerald-400">{(totalSizeBytes / (1024 * 1024)).toFixed(1)} MB</div>
        </div>
        <div className="p-6 rounded-3xl bg-[#070F1B] border border-white/10 space-y-2">
          <div className="text-xs font-mono text-slate-400 uppercase">Storage Provider</div>
          <div className="text-xl font-display text-amber-300">DodaEona Cloud Storage</div>
        </div>
      </div>

      <div className="rounded-3xl bg-[#070F1B] border border-white/10 overflow-hidden shadow-2xl">
        <div className="p-4 border-b border-white/10 font-mono text-xs uppercase tracking-wider text-slate-300">Managed PDF Assets Repository</div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-mono">
            <thead>
              <tr className="bg-white/[0.04] border-b border-white/10 text-slate-400 uppercase text-[10px]">
                <th className="p-4">Filename / Asset ID</th>
                <th className="p-4">Associated Book & Series</th>
                <th className="p-4">File Size</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Storage Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-slate-200">
              {booksWithPdf.map((b) => (
                <tr key={b.id} className="hover:bg-white/[0.02]">
                  <td className="p-4 font-bold text-[#7ADBF0] flex items-center gap-2">
                    <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="truncate max-w-xs">{b.slug}.pdf</span>
                  </td>
                  <td className="p-4">
                    <div className="font-bold text-white">{b.title}</div>
                    <div className="text-[10px] text-slate-400">{b.seriesTitle}</div>
                  </td>
                  <td className="p-4 text-slate-300">4.8 MB</td>
                  <td className="p-4"><span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px]">Active</span></td>
                  <td className="p-4 text-right space-x-2">
                    <button onClick={() => alert(`Replace PDF for ${b.title}`)} className="px-3 py-1 rounded bg-white/10 text-white hover:bg-white/20">Replace PDF</button>
                    <button onClick={() => alert(`Detach PDF from ${b.title}`)} className="px-3 py-1 rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/40">Detach PDF</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const SeriesFormModal: React.FC<{
  initialData?: ReadingSeriesItem | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}> = ({ initialData, onClose, onSave }) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [category, setCategory] = useState<ReadsCategory>(initialData?.category || 'Football Tactics and Strategy');
  const [seriesNumber, setSeriesNumber] = useState(initialData?.seriesNumber || 1);
  const [coverUrl, setCoverUrl] = useState(initialData?.coverUrl || '/src/assets/images/reads_card_cover_1794502247393.jpg');
  const [published, setPublished] = useState(initialData?.published ?? true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) { alert('Series title and description are required.'); return; }
    await onSave({ title, subtitle: subtitle || undefined, description, category, seriesNumber: Number(seriesNumber), coverUrl, published });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0B1525] border border-white/20 rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="font-display text-xl text-white uppercase tracking-wider">{initialData ? 'Edit Book Series' : 'Create New Book Series'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="space-y-1">
            <label className="text-slate-300">Series Title *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-slate-300">Subtitle</label>
            <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-300">Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as ReadsCategory)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white">
                <option value="Football Tactics and Strategy" className="bg-[#0B1525]">Football Tactics and Strategy</option>
                <option value="Football History and Culture" className="bg-[#0B1525]">Football History and Culture</option>
                <option value="Youth Academy and Player Development" className="bg-[#0B1525]">Youth Academy and Player Development</option>
                <option value="Competitions and Tournaments" className="bg-[#0B1525]">Competitions and Tournaments</option>
                <option value="Players and Legends" className="bg-[#0B1525]">Players and Legends</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300">Series Number</label>
              <input type="number" value={seriesNumber} onChange={(e) => setSeriesNumber(Number(e.target.value))} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-slate-300">Description *</label>
            <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white resize-none" />
          </div>
          <div className="space-y-1">
            <label className="text-slate-300">Cover Image URL</label>
            <input type="text" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
          </div>
          <div className="flex items-center gap-2 pt-2">
            <input type="checkbox" id="pub-series" checked={published} onChange={(e) => setPublished(e.target.checked)} className="w-4 h-4 rounded" />
            <label htmlFor="pub-series" className="text-slate-200">Publish immediately to visitors</label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/10 text-white">Cancel</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#0891B2] text-white font-bold">Save Series</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const BookFormModal: React.FC<{
  seriesList: ReadingSeriesItem[];
  initialData?: BookVolume | null;
  onClose: () => void;
  onSave: (data: any) => Promise<void>;
}> = ({ seriesList, initialData, onClose, onSave }) => {
  const [seriesId, setSeriesId] = useState(initialData?.seriesId || seriesList[0]?.id || '');
  const [title, setTitle] = useState(initialData?.title || '');
  const [subtitle, setSubtitle] = useState(initialData?.subtitle || '');
  const [author, setAuthor] = useState(initialData?.author || 'DodaEona Technical Staff');
  const [description, setDescription] = useState(initialData?.description || '');
  const [volumeNumber, setVolumeNumber] = useState(initialData?.volumeNumber || 1);
  const [publishedDate, setPublishedDate] = useState(initialData?.publishedDate || new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<ReadsCategory>(initialData?.category || 'Football Tactics and Strategy');
  const [coverUrl, setCoverUrl] = useState(initialData?.coverUrl || '/src/assets/images/reads_card_cover_1794502247393.jpg');
  const [pdfUrl, setPdfUrl] = useState(initialData?.pdfUrl || '');
  const [readOnline, setReadOnline] = useState(initialData?.readOnline ?? true);
  const [downloadEnabled, setDownloadEnabled] = useState(initialData?.downloadEnabled ?? false);
  const [published, setPublished] = useState(initialData?.published ?? false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !seriesId) { alert('Book title and series selection are required.'); return; }
    const selectedSeries = seriesList.find((s) => s.id === seriesId);
    await onSave({
      seriesId,
      seriesTitle: selectedSeries?.title || 'Library',
      title,
      subtitle: subtitle || undefined,
      author,
      description,
      volumeNumber: Number(volumeNumber),
      publishedDate,
      category,
      coverUrl,
      pdfUrl: pdfUrl || undefined,
      readOnline,
      downloadEnabled,
      published,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#0B1525] border border-white/20 rounded-3xl max-w-2xl w-full p-6 sm:p-8 space-y-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <h3 className="font-display text-xl text-white uppercase tracking-wider">{initialData ? 'Edit Book Volume' : 'Upload New Book Volume'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-mono">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-300">Associated Series *</label>
              <select required value={seriesId} onChange={(e) => setSeriesId(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white">
                {seriesList.map((s) => (<option key={s.id} value={s.id} className="bg-[#0B1525]">{s.title}</option>))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-slate-300">Volume Number</label>
              <input type="number" value={volumeNumber} onChange={(e) => setVolumeNumber(Number(e.target.value))} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-slate-300">Book Title *</label>
            <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
          </div>
          <div className="space-y-1">
            <label className="text-slate-300">Subtitle</label>
            <input type="text" value={subtitle} onChange={(e) => setSubtitle(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-300">Author</label>
              <input type="text" value={author} onChange={(e) => setAuthor(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300">Publication Date</label>
              <input type="date" value={publishedDate} onChange={(e) => setPublishedDate(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-slate-300">Description / Brief *</label>
            <textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white resize-none" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-slate-300">Cover Image URL</label>
              <input type="text" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
            </div>
            <div className="space-y-1">
              <label className="text-slate-300">PDF Document URL</label>
              <input type="text" value={pdfUrl} onChange={(e) => setPdfUrl(e.target.value)} placeholder="/uploads/sample.pdf or https://..." className="w-full p-3 rounded-xl bg-white/5 border border-white/15 text-white" />
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-3">
            <div className="text-slate-200 font-bold uppercase tracking-wider text-[11px]">Independent Permissions</div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Enable Online Reading</span>
              <input type="checkbox" checked={readOnline} onChange={(e) => setReadOnline(e.target.checked)} className="w-4 h-4 rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Allow PDF Downloading</span>
              <input type="checkbox" checked={downloadEnabled} onChange={(e) => setDownloadEnabled(e.target.checked)} className="w-4 h-4 rounded" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Publish Immediately (Draft by default)</span>
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} className="w-4 h-4 rounded" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl bg-white/10 text-white">Cancel</button>
            <button type="submit" className="px-6 py-2.5 rounded-xl bg-[#0891B2] text-white font-bold">Save Book Volume</button>
          </div>
        </form>
      </div>
    </div>
  );
};
