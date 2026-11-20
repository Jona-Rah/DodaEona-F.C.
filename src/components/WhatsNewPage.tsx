import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  ExternalLink,
  Megaphone,
  Radio,
  Settings,
} from 'lucide-react';
import type { ManagedAnnouncement } from '../../server/types';
import { NavigationDestination } from '../types/homepage';
import { useAuth } from '../context/AuthContext';
import {
  formatAnnouncementDate,
  resolveInternalDestination,
} from './AnnouncementBanner';

interface WhatsNewPageProps {
  announcements: ManagedAnnouncement[];
  onNavigate: (destination: NavigationDestination) => void;
  onNavigateAdminAnnouncements: () => void;
}

export const WhatsNewPage: React.FC<WhatsNewPageProps> = ({
  announcements: initialAnnouncements,
  onNavigate,
  onNavigateAdminAnnouncements,
}) => {
  const { isAdmin } = useAuth();
  const [publishedList, setPublishedList] = useState<ManagedAnnouncement[]>(() =>
    initialAnnouncements.filter((a) => a.status === 'published')
  );
  const [loading, setLoading] = useState<boolean>(initialAnnouncements.length === 0);

  const refreshPublished = useCallback(async () => {
    try {
      const res = await fetch('/api/public/announcements');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data?.announcements)) {
        setPublishedList(
          data.announcements.filter((a: ManagedAnnouncement) => a.status === 'published')
        );
      }
    } catch {
      // keep existing state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPublishedList(initialAnnouncements.filter((a) => a.status === 'published'));
  }, [initialAnnouncements]);

  useEffect(() => {
    refreshPublished();
    const handleUpdate = () => {
      refreshPublished();
    };
    window.addEventListener('dodaeona:announcements-updated', handleUpdate);
    return () => {
      window.removeEventListener('dodaeona:announcements-updated', handleUpdate);
    };
  }, [refreshPublished]);

  const activeBannerId = publishedList.find((a) => Boolean(a.showBanner))?.id;

  const handleCardLinkClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    rawUrl?: string
  ) => {
    const trimmed = rawUrl?.trim();
    if (!trimmed) {
      e.preventDefault();
      return;
    }
    const internalDest = resolveInternalDestination(trimmed);
    if (internalDest) {
      e.preventDefault();
      onNavigate(internalDest);
      return;
    }
    if (trimmed.startsWith('/')) {
      e.preventDefault();
      window.history.pushState({}, '', trimmed);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };

  const resolveHref = (rawUrl?: string): string => {
    const trimmed = rawUrl?.trim() || '';
    const internal = resolveInternalDestination(trimmed);
    if (internal === 'announcements') return '/whats-new';
    if (internal === 'home') return '/';
    if (internal) return `/${internal}`;
    return trimmed;
  };

  return (
    <section
      aria-label="What's New and Official Announcements"
      className="min-h-[75vh] landscape-mobile:min-h-0 py-12 sm:py-16 landscape-mobile:py-6 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-5xl mx-auto space-y-10 landscape-mobile:space-y-5">
        {/* Top Breadcrumb & Admin Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--accent-cyan)] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </button>

          {isAdmin && (
            <a
              href="/admin/announcements"
              onClick={(e) => {
                e.preventDefault();
                onNavigateAdminAnnouncements();
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-surface)] border border-[#7ADBF0]/40 text-xs font-bold uppercase tracking-wider text-[var(--accent-cyan)] hover:bg-[#7ADBF0]/15 transition-all"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Manage Announcements</span>
            </a>
          )}
        </div>

        {/* Masthead Header */}
        <div className="rounded-2xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-7 sm:p-10 landscape-mobile:p-5 relative overflow-hidden">
          <div className="absolute -top-24 -right-24 w-72 h-72 bg-[#7ADBF0]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 space-y-3 landscape-mobile:space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 eyebrow-mono text-[var(--accent-cyan)]">
              <Megaphone className="w-3.5 h-3.5" />
              <span>OFFICIAL CLUB DISPATCHES</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl landscape-mobile:text-3xl text-[var(--text-primary)] uppercase tracking-wide leading-none">
              WHAT&apos;S NEW
            </h1>
            <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed">
              Official platform announcements, new reading series releases, and Match Centre simulation updates from DodaEona F.C.
            </p>
          </div>
        </div>

        {/* Announcements Cards Feed */}
        {loading && publishedList.length === 0 ? (
          <div className="rounded-2xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-12 text-center">
            <p className="eyebrow-mono text-[var(--text-muted)]">
              LOADING OFFICIAL ANNOUNCEMENTS...
            </p>
          </div>
        ) : publishedList.length === 0 ? (
          <div className="rounded-2xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-12 text-center space-y-3">
            <Megaphone className="w-8 h-8 text-[var(--accent-cyan)] mx-auto opacity-80" />
            <h2 className="font-display text-2xl text-[var(--text-primary)] uppercase tracking-wide">
              No Published Announcements Yet
            </h2>
            <p className="text-xs sm:text-sm text-[var(--text-secondary)] max-w-md mx-auto">
              Check back soon for new volume dispatches, club updates, and Match Centre releases.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 landscape-mobile:gap-3.5" data-testid="whats-new-cards">
            {publishedList.map((ann) => {
              const formattedDate = formatAnnouncementDate(ann.date);
              const linkUrl = ann.ctaUrl || ann.ctaDest;
              const hasLink = Boolean(ann.ctaLabel?.trim() && linkUrl?.trim());
              const href = resolveHref(linkUrl);
              const isExternal = /^https?:\/\//i.test(href);
              const isActiveBanner = ann.id === activeBannerId && Boolean(ann.showBanner);

              return (
                <article
                  key={ann.id}
                  data-announcement-card={ann.id}
                  className="rounded-2xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 hover:border-[#7ADBF0]/45 transition-all p-6 sm:p-8 landscape-mobile:p-5 flex flex-col justify-between gap-5 landscape-mobile:gap-3 shadow-[0_8px_30px_rgba(0,0,0,0.22)] light:shadow-sm"
                >
                  <div className="space-y-3">
                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[var(--bg-primary)] border border-white/[0.08] light:border-slate-200 font-mono text-[11px] text-[var(--text-secondary)]">
                        <Calendar className="w-3 h-3 text-[var(--accent-cyan)]" />
                        <time dateTime={ann.date}>{formattedDate || ann.date}</time>
                      </span>

                      {isActiveBanner && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#7ADBF0]/15 border border-[#7ADBF0]/40 eyebrow-mono text-[10px] text-[var(--accent-cyan)]">
                          <Radio className="w-3 h-3" />
                          <span>Featured Site Banner</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h2 className="font-display text-2xl sm:text-3xl text-[var(--text-primary)] tracking-wide leading-tight">
                      {ann.title}
                    </h2>

                    {/* Message */}
                    <p className="text-sm sm:text-base text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                      {ann.message}
                    </p>
                  </div>

                  {/* Optional Labelled Link */}
                  {hasLink && (
                    <div className="pt-2">
                      <a
                        href={href}
                        onClick={(e) => handleCardLinkClick(e, linkUrl)}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl btn-primary-theme text-xs font-bold uppercase tracking-wider transition-all group"
                      >
                        <span>{ann.ctaLabel}</span>
                        {isExternal ? (
                          <ExternalLink className="w-3.5 h-3.5" />
                        ) : (
                          <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                        )}
                      </a>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
