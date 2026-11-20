import React from 'react';
import { BookOpen, Bookmark as BookmarkIcon, ArrowRight, LogOut, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useReads } from '../context/ReadsContext';
import { NavigationDestination } from '../types/homepage';

interface MyLibraryPageProps {
  onNavigate: (dest: NavigationDestination) => void;
}

export const MyLibraryPage: React.FC<MyLibraryPageProps> = ({ onNavigate }) => {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { publishedBooks, userLibrary, removeBookmark, unsaveBook } = useReads();

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-3">
        <div className="w-10 h-10 rounded-full border-2 border-[var(--accent-cyan)]/30 border-t-[var(--accent-cyan)] animate-spin mx-auto" />
        <p className="text-xs font-mono uppercase tracking-[0.2em] text-[var(--text-muted)]">
          Loading your library...
        </p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-3xl text-[var(--text-primary)]">MY LIBRARY</h1>
        <p className="text-sm text-[var(--text-muted)]">
          Sign in to access your saved volumes, bookmarks, and reading progress across sessions.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('login')}
          className="px-6 py-3 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white font-bold text-xs uppercase tracking-wider"
        >
          Sign in
        </button>
      </div>
    );
  }

  const savedBooks = publishedBooks.filter((b) => userLibrary.savedBookIds.includes(b.id));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 landscape-mobile:py-5 space-y-8 landscape-mobile:space-y-5">
      {/* Header */}
      <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 sm:p-8 landscape-mobile:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="eyebrow-mono text-[var(--accent-cyan)]">PERSONAL READING ARCHIVE</span>
          <h1 className="font-display text-3xl sm:text-4xl text-[var(--text-primary)] mt-1">
            {user.name.toUpperCase()}&apos;S LIBRARY
          </h1>
          <p className="text-xs font-mono text-[var(--text-muted)] mt-1">{user.email}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('reads')}
            className="px-4 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Browse Library</span>
          </button>
          <button
            type="button"
            onClick={() => {
              logout();
              onNavigate('home');
            }}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>

      {/* Saved Volumes */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[var(--text-primary)]">
            Saved Volumes ({savedBooks.length})
          </h2>
        </div>

        {savedBooks.length === 0 ? (
          <div className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 text-center space-y-3">
            <p className="text-sm text-[var(--text-muted)]">No saved volumes yet.</p>
            <button
              type="button"
              onClick={() => onNavigate('reads')}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent-cyan)]"
            >
              <span>Explore Book Library</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedBooks.map((book) => {
              const prog = userLibrary.progress[book.id];
              return (
                <div
                  key={book.id}
                  className="rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 flex gap-4"
                >
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-20 h-28 object-cover rounded-xl shrink-0 border border-[var(--border-color)]"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <span className="eyebrow-mono text-[var(--accent-cyan)] block truncate">
                        {book.seriesTitle}
                      </span>
                      <h3 className="text-sm font-bold text-[var(--text-primary)] line-clamp-2 mt-0.5">
                        {book.title}
                      </h3>
                    </div>

                    <div className="space-y-2">
                      {prog ? (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)]">
                            <span className="inline-flex items-center gap-1">
                              {prog.completed ? (
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {prog.percent}% read
                            </span>
                            <span>
                              p.{prog.currentPage}/{prog.totalPages}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
                            <div
                              className="h-full bg-[var(--accent-cyan)] rounded-full"
                              style={{ width: `${prog.percent}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[var(--text-muted)] block">Not started yet</span>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => onNavigate('reads')}
                          className="text-xs font-bold text-[var(--accent-cyan)] hover:underline"
                        >
                          Open in Reads
                        </button>
                        <button
                          type="button"
                          onClick={() => unsaveBook(book.id)}
                          className="text-[11px] text-[var(--text-muted)] hover:text-rose-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Bookmarks */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-[var(--text-primary)]">
          Bookmarks ({userLibrary.bookmarks.length})
        </h2>
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-3">
          {userLibrary.bookmarks.map((bm) => (
            <div
              key={bm.id}
              className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] p-4 flex items-start justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--text-primary)]">
                  <BookmarkIcon className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
                  <span>{bm.bookTitle}</span>
                  <span className="font-mono text-[10px] text-[var(--text-muted)]">p.{bm.pageNumber}</span>
                </div>
                <p className="text-xs text-[var(--text-secondary)]">{bm.chapterTitle}</p>
                {bm.note && <p className="text-xs text-[var(--text-muted)] italic">{bm.note}</p>}
              </div>
              <button
                type="button"
                onClick={() => removeBookmark(bm.id)}
                className="text-xs text-[var(--text-muted)] hover:text-rose-400"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
