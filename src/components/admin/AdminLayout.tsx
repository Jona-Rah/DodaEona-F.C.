import React, { Suspense, useState } from 'react';
import {
  Shield,
  Menu,
  X,
  Volume2,
  VolumeX,
  LogIn,
  ArrowLeft,
  Loader2,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { AdminNav } from './AdminNav';
import { AdminSectionId } from './adminRoutes';
import { PageLoader } from './shared/AdminUI';

interface AdminLayoutProps {
  activeSection: AdminSectionId;
  onSelectSection: (section: AdminSectionId) => void;
  onNavigateLogin: () => void;
  onNavigateReads: () => void;
  onReturnToPublic: () => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({
  activeSection,
  onSelectSection,
  onNavigateLogin,
  onNavigateReads,
  onReturnToPublic,
  children,
}) => {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { theme, toggleTheme, isAudioPlaying, toggleAudio } = useTheme();
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);

  // =========================================================================
  // STATE 1 — Authentication is resolving (NO dashboard flash or admin data)
  // =========================================================================
  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] flex flex-col items-center justify-center p-6 landscape-mobile:p-4">
        <Loader2 className="w-9 h-9 animate-spin text-[var(--accent-cyan)]" />
        <p className="mt-4 eyebrow-mono text-[var(--text-muted)]">
          VERIFYING CONTROL ROOM CREDENTIALS...
        </p>
      </div>
    );
  }

  // =========================================================================
  // STATE 2 — No authenticated user (Sign-in prompt with clear route to /login)
  // =========================================================================
  if (!isAuthenticated || !user) {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] flex items-center justify-center p-6 landscape-mobile:p-4">
        <div className="max-w-md w-full rounded-2xl bg-[var(--bg-surface)] border border-white/[0.1] light:border-slate-200 p-8 landscape-mobile:p-5 text-center space-y-5 landscape-mobile:space-y-3.5 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/35 text-[var(--accent-cyan)] flex items-center justify-center mx-auto">
            <LogIn className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <span className="eyebrow-mono text-[var(--accent-cyan)] block">
              DODAEONA F.C. CONTROL ROOM
            </span>
            <h1 className="font-display text-3xl text-[var(--text-primary)] tracking-wide">
              SIGN IN REQUIRED
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Sign in with an authorised owner account to open the DodaEona F.C. Control Room.
            </p>
          </div>
          <div className="space-y-2.5 pt-2">
            <a
              href="/login"
              onClick={(e) => {
                e.preventDefault();
                onNavigateLogin();
              }}
              className="w-full py-3 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              <span>Go to Sign in</span>
            </a>
            <button
              type="button"
              onClick={onReturnToPublic}
              className="w-full py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.1] light:border-slate-200 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              Return to public site
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 3 — Authenticated user WITHOUT admin role ("Owners only" guard)
  // Renders ZERO sidebar, navigation, stats, admin content, or controls.
  // =========================================================================
  if (user.role !== 'admin') {
    return (
      <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] floodlit-canvas-atmosphere flex items-center justify-center p-6 landscape-mobile:p-4">
        <div className="max-w-md w-full rounded-2xl bg-[var(--bg-surface)] border border-white/[0.1] light:border-slate-200 p-8 sm:p-10 landscape-mobile:p-5 text-center space-y-6 landscape-mobile:space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-400/40 text-amber-400 light:text-amber-600 flex items-center justify-center mx-auto">
            <Shield className="w-8 h-8" />
          </div>

          <div className="space-y-2.5">
            <span className="eyebrow-mono text-[var(--accent-cyan)] block">
              DODAEONA F.C. ACCESS RULES
            </span>
            <h1 className="font-display text-3xl sm:text-4xl text-[var(--text-primary)] tracking-wide">
              Owners only
            </h1>
            <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
              Your account ({user.email}) does not have publishing permissions. Administrative
              changes are refused by the library&apos;s access rules.
            </p>
          </div>

          <div className="pt-2">
            <a
              href="/reads"
              onClick={(e) => {
                e.preventDefault();
                onNavigateReads();
              }}
              className="w-full py-3 px-5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-lg"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to the library</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STATE 4 — Authorised Admin (Complete Floodlit Archive Control Room Shell)
  // =========================================================================
  return (
    <div className="min-h-[100dvh] bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-200">
      {/* Mobile & Tablet (< lg) Sticky Header */}
      <div className="lg:hidden sticky landscape-mobile:static top-0 z-40 h-14 landscape-mobile:h-12 px-4 bg-[var(--bg-surface)]/95 backdrop-blur-lg border-b border-white/[0.08] light:border-slate-200 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setMobileSheetOpen(true)}
            aria-label="Open admin menu"
            className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-white/[0.1] light:border-slate-300 text-[var(--text-primary)]"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="font-display text-lg tracking-wide truncate">DodaEona F.C.</span>
          <span className="px-2 py-0.5 rounded bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/35 eyebrow-mono text-[var(--accent-cyan)]">
            Admin
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-white/[0.1] light:border-slate-300 text-[var(--text-secondary)]"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={toggleAudio}
            aria-label="Toggle site music"
            className="p-2 rounded-lg bg-[var(--bg-elevated)] border border-white/[0.1] light:border-slate-300 text-[var(--accent-cyan)]"
          >
            {isAudioPlaying ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Left-Side Sheet Drawer */}
      {mobileSheetOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setMobileSheetOpen(false)}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />
          <aside className="fixed inset-y-0 left-0 w-72 max-w-[85vw] max-h-[100dvh] overflow-y-auto bg-[var(--bg-surface)] border-r border-white/[0.1] light:border-slate-200 z-50 flex flex-col">
            <div className="flex items-center justify-end p-3 pb-0">
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                aria-label="Close admin menu"
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <AdminNav
                activeSection={activeSection}
                onSelectSection={(sec) => {
                  onSelectSection(sec);
                  setMobileSheetOpen(false);
                }}
                onReturnToPublic={() => {
                  setMobileSheetOpen(false);
                  onReturnToPublic();
                }}
              />
            </div>
          </aside>
        </div>
      )}

      {/* Centered Desktop Shell (max-w-[1600px]) */}
      <div className="max-w-[1600px] mx-auto flex min-h-[100dvh]">
        {/* Desktop Persistent Sticky Left Sidebar (w-72) */}
        <aside className="hidden lg:flex lg:flex-col w-72 shrink-0 sticky top-0 h-screen bg-[var(--bg-surface)] border-r border-white/[0.08] light:border-slate-200">
          <AdminNav
            activeSection={activeSection}
            onSelectSection={onSelectSection}
            onReturnToPublic={onReturnToPublic}
          />
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 px-4 sm:px-8 lg:px-10 py-6 landscape-mobile:py-4 sm:py-8">
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
};
