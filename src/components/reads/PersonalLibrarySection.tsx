import React, { useState } from 'react';
import { Bookmark, BookOpen, Clock, Trash2, ArrowRight, CheckCircle2, User, Lock } from 'lucide-react';
import { BookVolume, UserPersonalLibrary, UserSession } from '../../types/reads';

interface PersonalLibrarySectionProps {
  userLibrary: UserPersonalLibrary;
  allBooks: BookVolume[];
  userSession: UserSession;
  onOpenBook: (book: BookVolume) => void;
  onUnsaveBook: (bookId: string) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
  onSignInPrompt: () => void;
}

export const PersonalLibrarySection: React.FC<PersonalLibrarySectionProps> = ({
  userLibrary,
  allBooks,
  userSession,
  onOpenBook,
  onUnsaveBook,
  onRemoveBookmark,
  onSignInPrompt,
}) => {
  const [activeTab, setActiveTab] = useState<'saved' | 'progress' | 'bookmarks' | 'recent'>('saved');

  // If user is not authenticated or a guest
  if (!userSession.isAuthenticated) {
    return (
      <section 
        aria-label="Personal Reading Library"
        className="py-16 sm:py-24 landscape-mobile:py-8 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] bg-[var(--bg-primary)] transition-colors duration-200"
      >
        <div className="max-w-4xl mx-auto rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 sm:p-12 text-center flex flex-col items-center shadow-sm">
          <div className="w-14 h-14 rounded-full bg-amber-400/10 border border-amber-400/30 flex items-center justify-center text-amber-400 light:text-amber-600 mb-4 shadow">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="font-display text-2xl sm:text-3xl text-[var(--text-primary)] uppercase tracking-tight">
            MY PERSONAL READING LIBRARY
          </h2>
          <p className="mt-3 text-sm text-[var(--text-secondary)] max-w-lg leading-relaxed">
            Sign in to track your reading progress across publications, save books to your personal collection, and keep your bookmarks synchronized.
          </p>
          <button
            onClick={onSignInPrompt}
            className="mt-6 px-8 py-3.5 rounded-xl font-extrabold uppercase tracking-widest text-xs sm:text-sm text-[#050A12] bg-[#7ADBF0] hover:bg-[#99E6F7] light:bg-cyan-600 light:text-white light:hover:bg-cyan-700 transition-all shadow"
          >
            Sign In to Access Library
          </button>
        </div>
      </section>
    );
  }

  // Find actual active/published book objects so deleted or unpublished items are excluded everywhere
  const savedBooks = allBooks.filter((b) => userLibrary.savedBookIds.includes(b.id));
  const recentBooks = allBooks.filter((b) => userLibrary.recentBookIds.includes(b.id));
  const inProgressBooks = allBooks.filter((b) => userLibrary.progress[b.id] && !userLibrary.progress[b.id].completed);
  const activeBookmarks = userLibrary.bookmarks.filter((bm) => allBooks.some((b) => b.id === bm.bookId));
  const activeProgressEntries = Object.entries(userLibrary.progress).filter(([bookId]) =>
    allBooks.some((b) => b.id === bookId)
  );

  return (
    <section 
      aria-label="Personal Reading Library"
      className="py-16 sm:py-24 landscape-mobile:py-8 px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] bg-[var(--bg-primary)] transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto">
        
        {/* Header with User Info */}
        <div className="mb-10 landscape-mobile:mb-5 pb-6 landscape-mobile:pb-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 eyebrow-mono text-xs font-bold text-[var(--accent-cyan)] uppercase tracking-[0.2em] mb-2">
              <User className="w-4 h-4 text-[var(--accent-cyan)]" />
              <span>Personal Football Library · {userSession.name}</span>
            </div>
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl text-[var(--text-primary)] tracking-tight uppercase">
              MY READING REPOSITORY
            </h2>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center gap-1 p-1 bg-[var(--bg-surface)] rounded-lg border border-[var(--border-color)] overflow-x-auto">
            <button
              onClick={() => setActiveTab('saved')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === 'saved'
                  ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Saved ({savedBooks.length})
            </button>
            <button
              onClick={() => setActiveTab('progress')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === 'progress'
                  ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              In Progress ({inProgressBooks.length})
            </button>
            <button
              onClick={() => setActiveTab('bookmarks')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === 'bookmarks'
                  ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Bookmarks ({activeBookmarks.length})
            </button>
            <button
              onClick={() => setActiveTab('recent')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap ${
                activeTab === 'recent'
                  ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white shadow'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              Recent ({recentBooks.length})
            </button>
          </div>
        </div>

        {/* Tab 1: Saved Books */}
        {activeTab === 'saved' && (
          <div>
            {savedBooks.length === 0 ? (
              <div className="p-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center text-[var(--text-muted)]">
                <BookOpen className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                <p className="font-semibold text-[var(--text-primary)]">No saved books yet</p>
                <p className="text-xs mt-1">Browse the catalog above and click the bookmark icon to save volumes.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 landscape-mobile:gap-4">
                {savedBooks.map((book) => (
                  <div
                    key={book.id}
                    className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#7ADBF0]/50 light:hover:border-cyan-600/50 transition-all flex flex-col justify-between light:shadow-sm"
                  >
                    <div className="flex gap-4">
                      <img
                        src={book.coverUrl}
                        alt={book.title}
                        className="w-16 h-22 object-contain rounded bg-slate-950 light:bg-slate-100 shrink-0 shadow"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-amber-400 light:text-cyan-700 uppercase tracking-wider block truncate">
                          {book.seriesTitle}
                        </span>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">
                          {book.title}
                        </h4>
                        <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                          Vol. {book.volumeNumber} · {book.pageCount} pages
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                      <button
                        onClick={() => onUnsaveBook(book.id)}
                        className="text-xs text-rose-400 light:text-rose-600 hover:text-rose-300 light:hover:text-rose-700 flex items-center gap-1"
                        title="Remove from saved books"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>

                      <button
                        onClick={() => onOpenBook(book)}
                        className="px-3 py-1 rounded bg-[#7ADBF0] hover:bg-[#99E6F7] text-[#050A12] light:bg-cyan-600 light:hover:bg-cyan-700 light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1 shadow"
                      >
                        <span>Read</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Reading Progress */}
        {activeTab === 'progress' && (
          <div className="space-y-4">
            {activeProgressEntries.length === 0 ? (
              <div className="p-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center text-[var(--text-muted)]">
                <Clock className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                <p className="font-semibold text-[var(--text-primary)]">No active reading progress</p>
                <p className="text-xs mt-1">Start reading any book to track your page completion progress.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-4">
                {activeProgressEntries.map(([bookId, prog]) => {
                  const book = allBooks.find((b) => b.id === bookId);
                  if (!book) return null;
                  return (
                    <div
                      key={bookId}
                      className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-between gap-4 light:shadow-sm"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <img
                          src={book.coverUrl}
                          alt={book.title}
                          className="w-12 h-16 object-contain rounded bg-slate-950 light:bg-slate-100 shrink-0 shadow"
                        />
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{book.title}</h4>
                          <span className="text-xs text-[var(--text-muted)] block">
                            Page {prog.currentPage} of {prog.totalPages} ({prog.percent}%)
                          </span>
                          
                          {/* Progress bar */}
                          <div className="w-40 sm:w-56 h-1.5 bg-slate-800 light:bg-slate-200 rounded-full mt-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-blue-500 to-amber-400 light:from-cyan-600 light:to-amber-500 rounded-full transition-all"
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => onOpenBook(book)}
                        className="px-3.5 py-2 rounded-lg bg-[#7ADBF0] hover:bg-[#99E6F7] text-[#050A12] light:bg-cyan-600 light:hover:bg-cyan-700 light:text-white text-xs font-bold uppercase tracking-wider shrink-0 shadow"
                      >
                        Resume
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Bookmarks */}
        {activeTab === 'bookmarks' && (
          <div>
            {activeBookmarks.length === 0 ? (
              <div className="p-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center text-[var(--text-muted)]">
                <Bookmark className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
                <p className="font-semibold text-[var(--text-primary)]">No bookmarks saved</p>
                <p className="text-xs mt-1">Use the bookmark button inside the in-app reader to mark important pages.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeBookmarks.map((bm) => {
                  const book = allBooks.find((b) => b.id === bm.bookId);
                  return (
                    <div
                      key={bm.id}
                      className="p-5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex flex-col justify-between light:shadow-sm"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-amber-400 light:text-amber-700 font-bold mb-1">
                          <span>Page {bm.pageNumber}</span>
                          <span className="text-[var(--text-muted)] font-mono font-normal">{bm.createdAt}</span>
                        </div>
                        <h4 className="text-sm font-bold text-[var(--text-primary)] truncate">{bm.bookTitle}</h4>
                        <span className="text-xs text-[var(--accent-cyan)] block mb-2">{bm.chapterTitle}</span>
                        {bm.note && (
                          <p className="text-xs text-[var(--text-secondary)] italic bg-[var(--bg-elevated)] p-2.5 rounded border border-[var(--border-color)]">
                            &ldquo;{bm.note}&rdquo;
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                        <button
                          onClick={() => onRemoveBookmark(bm.id)}
                          className="text-xs text-rose-400 light:text-rose-600 hover:text-rose-300 light:hover:text-rose-700 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        {book && (
                          <button
                            onClick={() => onOpenBook(book)}
                            className="px-3 py-1 rounded bg-[#7ADBF0] hover:bg-[#99E6F7] text-[#050A12] light:bg-cyan-600 light:hover:bg-cyan-700 light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                          >
                            <span>Jump to Page</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Recently Opened */}
        {activeTab === 'recent' && (
          recentBooks.length === 0 ? (
            <div className="p-10 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] text-center text-[var(--text-muted)]">
              <Clock className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-2" />
              <p className="font-semibold text-[var(--text-primary)]">No recently opened volumes</p>
              <p className="text-xs mt-1">Open any book from the catalog to build your reading history.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 landscape-mobile:gap-4">
              {recentBooks.map((book) => (
                <div
                  key={book.id}
                  onClick={() => onOpenBook(book)}
                  className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#7ADBF0]/50 light:hover:border-cyan-600/50 transition-all flex flex-col justify-between cursor-pointer light:shadow-sm"
                >
                  <div className="flex gap-4">
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-16 h-22 object-contain rounded bg-slate-950 light:bg-slate-100 shrink-0 shadow"
                    />
                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-amber-400 light:text-cyan-700 uppercase tracking-wider block truncate">
                        {book.seriesTitle}
                      </span>
                      <h4 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 leading-snug">
                        {book.title}
                      </h4>
                      <span className="text-[11px] text-[var(--text-muted)] mt-1 block">
                        Vol. {book.volumeNumber} · {book.readTimeMinutes} min
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex justify-end">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenBook(book);
                      }}
                      className="px-3 py-1 rounded bg-[#7ADBF0] hover:bg-[#99E6F7] text-[#050A12] light:bg-cyan-600 light:hover:bg-cyan-700 light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

      </div>
    </section>
  );
};
