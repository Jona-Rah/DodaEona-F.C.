import React, { useEffect, useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { Announcement, NavigationDestination } from '../types/homepage';

export const DISMISSED_ANNOUNCEMENTS_STORAGE_KEY = 'dodaeona_dismissed_announcements_v1';

export function getDismissedAnnouncementIds(): string[] {
  try {
    const raw = localStorage.getItem(DISMISSED_ANNOUNCEMENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function saveDismissedAnnouncementId(id: string): string[] {
  try {
    const current = getDismissedAnnouncementIds();
    const next = current.includes(id) ? current : [...current, id];
    localStorage.setItem(DISMISSED_ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [id];
  }
}

export function formatAnnouncementDate(rawDate?: string): string {
  if (!rawDate) return '';
  const trimmed = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [y, m, d] = trimmed.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    if (!Number.isNaN(dt.getTime())) {
      return dt.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
      });
    }
  }
  return trimmed;
}

export function resolveInternalDestination(rawUrl?: string): NavigationDestination | null {
  if (!rawUrl) return null;
  const clean = rawUrl.trim().toLowerCase().replace(/^\/+|\/+$/g, '');
  if (clean === '' || clean === 'home') return 'home';
  if (clean === 'reads' || clean === 'books' || clean === 'library') return 'reads';
  if (clean === 'match-centre' || clean === 'match_centre' || clean === 'matches') return 'match-centre';
  if (clean === 'whats-new' || clean === 'announcements' || clean === 'updates') return 'announcements';
  if (clean === 'my-library') return 'my-library';
  if (clean === 'login' || clean === 'signin') return 'login';
  if (clean === 'admin') return 'admin';
  if (clean === 'about') return 'about';
  if (clean === 'contact') return 'contact';
  if (clean === 'privacy') return 'privacy';
  if (clean === 'terms') return 'terms';
  return null;
}

interface AnnouncementBannerProps {
  announcement: Announcement | null;
  onNavigate: (destination: NavigationDestination) => void;
  onDismiss?: (id: string) => void;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({
  announcement,
  onNavigate,
  onDismiss,
}) => {
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => getDismissedAnnouncementIds());

  useEffect(() => {
    const syncDismissed = () => {
      setDismissedIds(getDismissedAnnouncementIds());
    };
    window.addEventListener('storage', syncDismissed);
    window.addEventListener('dodaeona:announcements-updated', syncDismissed);
    return () => {
      window.removeEventListener('storage', syncDismissed);
      window.removeEventListener('dodaeona:announcements-updated', syncDismissed);
    };
  }, []);

  if (!announcement || !announcement.active || !announcement.id) {
    return null;
  }

  if (dismissedIds.includes(announcement.id)) {
    return null;
  }

  const handleDismiss = () => {
    const next = saveDismissedAnnouncementId(announcement.id);
    setDismissedIds(next);
    if (onDismiss) {
      onDismiss(announcement.id);
    }
  };

  const handleActionClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rawUrl = announcement.actionUrl?.trim();
    if (!rawUrl) {
      e.preventDefault();
      return;
    }
    const internalDest = resolveInternalDestination(rawUrl);
    if (internalDest) {
      e.preventDefault();
      onNavigate(internalDest);
      return;
    }
    if (rawUrl.startsWith('/')) {
      e.preventDefault();
      window.history.pushState({}, '', rawUrl);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const formattedDate = formatAnnouncementDate(announcement.date);
  const hasAction = Boolean(announcement.actionText?.trim() && announcement.actionUrl?.trim());
  const actionHref = (() => {
    const raw = announcement.actionUrl?.trim() || '';
    const internal = resolveInternalDestination(raw);
    if (internal === 'announcements') return '/whats-new';
    if (internal === 'home') return '/';
    if (internal) return `/${internal}`;
    return raw || '/whats-new';
  })();

  return (
    <div
      role="region"
      aria-label="Site Announcement Banner"
      data-announcement-id={announcement.id}
      className="relative z-40 bg-[var(--bg-surface)] border-b border-[var(--border-color)] text-[var(--text-primary)] transition-colors duration-200"
    >
      {/* Subtle 2px Cyan Hairline Accent */}
      <div className="h-[2px] w-full bg-gradient-to-r from-[#7ADBF0] via-sky-400 to-transparent" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 landscape-mobile:py-1.5 relative z-10">
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          {/* Announcement content */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-1 min-w-0 flex-wrap sm:flex-nowrap">
            <span className="eyebrow-mono text-[10px] text-[#7ADBF0] light:text-cyan-700 font-bold tracking-[0.2em] shrink-0">
              {announcement.badge || 'OFFICIAL BROADCAST'}
            </span>

            {formattedDate && (
              <>
                <span aria-hidden="true" className="text-[var(--text-muted)] hidden sm:inline">
                  ·
                </span>
                <span className="font-mono text-[11px] text-[var(--text-muted)] shrink-0">
                  {formattedDate}
                </span>
              </>
            )}

            <span aria-hidden="true" className="text-[var(--text-muted)] hidden sm:inline">
              ·
            </span>

            <div className="text-xs sm:text-sm text-[var(--text-secondary)] leading-normal min-w-0">
              <span className="font-semibold text-[var(--text-primary)] mr-2 tracking-tight">
                {announcement.title}
              </span>
              <span className="text-[var(--text-secondary)] font-normal">
                {announcement.message}
              </span>
            </div>
          </div>

          {/* Right controls: Optional labelled link + Dismiss button */}
          <div className="flex items-center gap-2 shrink-0">
            {hasAction && (
              <a
                href={actionHref}
                onClick={handleActionClick}
                target={/^https?:\/\//i.test(actionHref) ? '_blank' : undefined}
                rel={/^https?:\/\//i.test(actionHref) ? 'noopener noreferrer' : undefined}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider text-[#050A12] bg-[#7ADBF0] hover:bg-[#99E4F5] light:bg-cyan-600 light:hover:bg-cyan-700 light:text-white rounded-lg transition-all duration-200 whitespace-nowrap shrink-0 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#7ADBF0]"
              >
                <span>{announcement.actionText}</span>
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-1 text-[#050A12] light:text-white" />
              </a>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss announcement"
              title="Dismiss announcement"
              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] light:hover:bg-slate-200/70 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
