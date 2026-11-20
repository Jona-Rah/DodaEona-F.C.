import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Bookmark,
  Calendar,
  CheckCircle2,
  Download,
  Edit3,
  Eye,
  EyeOff,
  Link2,
  Mail,
  Megaphone,
  Play,
  Plus,
  Radio,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useAdmin } from '../../../context/AdminContext';
import { useTheme } from '../../../context/ThemeContext';
import { formatAnnouncementDate } from '../../AnnouncementBanner';
import {
  adminFetch,
  AdminPageHeader,
  AdminStatCard,
  AdminDataTable,
  AdminStatusBadge,
  AdminDialog,
  PageLoader,
} from '../shared/AdminUI';
import type {
  ManagedAnnouncement,
  MusicTrackRecord,
  NewsletterSubscriberRecord,
  PublicationAnalyticsEvent,
} from '../../../../server/types';

// ============================================================================
// SECTION 10: PUBLICATION ANALYTICS (Real events only — zero fabricated revenue)
// ============================================================================
export const PublicationAnalyticsSection: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<{
    totals: { views: number; reads: number; downloads: number; bookmarks: number };
    perBook: Array<{
      bookId: string;
      bookTitle: string;
      seriesTitle: string;
      views: number;
      reads: number;
      downloads: number;
      bookmarks: number;
    }>;
    recentEvents: PublicationAnalyticsEvent[];
  } | null>(null);

  useEffect(() => {
    adminFetch<typeof analytics>('/api/admin/analytics')
      .then((res) => setAnalytics(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || !analytics) return <PageLoader label="Aggregating publication analytics..." />;

  const maxTotal = Math.max(
    1,
    ...analytics.perBook.map((b) => b.views + b.reads + b.downloads + b.bookmarks)
  );

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="ENGAGEMENT"
        title="PUBLICATION ANALYTICS"
        description="Authentic volume views, active reading sessions, bookmarks, and PDF downloads across the public Reads press."
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <AdminStatCard icon={Eye} value={analytics.totals.views} label="VOLUME VIEWS" />
        <AdminStatCard icon={BookOpen} value={analytics.totals.reads} label="READ SESSIONS" />
        <AdminStatCard icon={Download} value={analytics.totals.downloads} label="PDF DOWNLOADS" />
        <AdminStatCard icon={Bookmark} value={analytics.totals.bookmarks} label="BOOKMARKS" />
      </div>

      {/* Horizontal Engagement Chart per Book */}
      <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[var(--accent-cyan)]" />
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Engagement by Publication</h2>
        </div>
        {analytics.perBook.length === 0 ? (
          <p className="text-xs text-[var(--text-muted)]">No publication events recorded yet.</p>
        ) : (
          <div className="space-y-3">
            {analytics.perBook.map((row) => {
              const total = row.views + row.reads + row.downloads + row.bookmarks;
              const pct = Math.round((total / maxTotal) * 100);
              return (
                <div key={row.bookId} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[var(--text-primary)] truncate">
                      {row.bookTitle}{' '}
                      <span className="text-[var(--text-muted)] font-normal">· {row.seriesTitle}</span>
                    </span>
                    <span className="font-mono text-[var(--accent-cyan)] tabular-nums shrink-0">
                      {total} total ({row.reads} reads · {row.downloads} PDFs)
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--bg-primary)] overflow-hidden border border-white/[0.06] light:border-slate-200">
                    <div
                      className="h-full rounded-full bg-[var(--accent-cyan)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AdminDataTable
        rows={analytics.perBook}
        rowKey={(r) => r.bookId}
        columns={[
          { key: 'title', header: 'VOLUME', render: (r) => <span className="font-semibold">{r.bookTitle}</span> },
          { key: 'series', header: 'SERIES', render: (r) => r.seriesTitle },
          { key: 'views', header: 'VIEWS', align: 'center', render: (r) => <span className="font-mono">{r.views}</span> },
          { key: 'reads', header: 'READS', align: 'center', render: (r) => <span className="font-mono">{r.reads}</span> },
          {
            key: 'downloads',
            header: 'DOWNLOADS',
            align: 'center',
            render: (r) => <span className="font-mono">{r.downloads}</span>,
          },
          {
            key: 'bookmarks',
            header: 'BOOKMARKS',
            align: 'right',
            render: (r) => <span className="font-mono font-bold text-[var(--accent-cyan)]">{r.bookmarks}</span>,
          },
        ]}
      />
    </div>
  );
};

// ============================================================================
// SECTION 13: ANNOUNCEMENTS & EMAIL UPDATES (/admin/announcements)
// ============================================================================
const DEFAULT_TODAY_ISO = () => new Date().toISOString().slice(0, 10);

interface AnnouncementFormState {
  title: string;
  message: string;
  date: string;
  ctaLabel: string;
  ctaUrl: string;
  showBanner: boolean;
  status: 'published' | 'hidden';
}

const INITIAL_ANNOUNCEMENT_FORM = (): AnnouncementFormState => ({
  title: '',
  message: '',
  date: DEFAULT_TODAY_ISO(),
  ctaLabel: '',
  ctaUrl: '',
  showBanner: false,
  status: 'published',
});

export const WhatsNewUpdatesSection: React.FC = () => {
  const { updateDraftHomepageConfig, publishHomepageChanges } = useAdmin();
  const [announcements, setAnnouncements] = useState<ManagedAnnouncement[]>([]);
  const [subscribers, setSubscribers] = useState<NewsletterSubscriberRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AnnouncementFormState>(INITIAL_ANNOUNCEMENT_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const notifyLiveSync = (list: ManagedAnnouncement[]) => {
    const published = list.filter((a) => a.status === 'published');
    updateDraftHomepageConfig((prev) => ({
      ...prev,
      announcements: published.map((a) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        active: Boolean(a.showBanner),
        actionText: a.ctaLabel,
        actionUrl: a.ctaUrl || a.ctaDest,
        date: a.date,
      })),
    }));
    publishHomepageChanges();
    window.dispatchEvent(new CustomEvent('dodaeona:announcements-updated'));
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{
        announcements: ManagedAnnouncement[];
        subscribers?: NewsletterSubscriberRecord[];
      }>('/api/admin/announcements');
      setAnnouncements(res.announcements || []);
      if (Array.isArray(res.subscribers)) {
        setSubscribers(res.subscribers);
      } else {
        const subRes = await adminFetch<{ subscribers: NewsletterSubscriberRecord[] }>(
          '/api/admin/newsletter-subscribers'
        );
        setSubscribers(subRes.subscribers || []);
      }
    } catch {
      // handled cleanly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const handleSubUpdate = () => {
      adminFetch<{ subscribers: NewsletterSubscriberRecord[] }>('/api/admin/newsletter-subscribers')
        .then((r) => setSubscribers(r.subscribers || []))
        .catch(() => {});
    };
    window.addEventListener('dodaeona:subscribers-updated', handleSubUpdate);
    return () => {
      window.removeEventListener('dodaeona:subscribers-updated', handleSubUpdate);
    };
  }, []);

  const showToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => {
      setFeedback((curr) => (curr === msg ? null : curr));
    }, 3200);
  };

  const resetForm = () => {
    setEditingId(null);
    setForm(INITIAL_ANNOUNCEMENT_FORM());
  };

  const handleStartEdit = (ann: ManagedAnnouncement) => {
    setEditingId(ann.id);
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(ann.date)
      ? ann.date
      : (() => {
          const parsed = Date.parse(ann.date);
          return !Number.isNaN(parsed)
            ? new Date(parsed).toISOString().slice(0, 10)
            : DEFAULT_TODAY_ISO();
        })();
    setForm({
      title: ann.title,
      message: ann.message,
      date: normalizedDate,
      ctaLabel: ann.ctaLabel || '',
      ctaUrl: ann.ctaUrl || ann.ctaDest || '',
      showBanner: Boolean(ann.showBanner),
      status: ann.status === 'published' ? 'published' : 'hidden',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        date: form.date.trim() || DEFAULT_TODAY_ISO(),
        ctaLabel: form.ctaLabel.trim(),
        ctaUrl: form.ctaUrl.trim(),
        ctaDest: form.ctaUrl.trim(),
        showBanner: Boolean(form.showBanner),
        status: form.status,
      };

      if (editingId) {
        const res = await adminFetch<{
          announcement: ManagedAnnouncement;
          announcements: ManagedAnnouncement[];
        }>(`/api/admin/announcements/${editingId}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        const nextList = res.announcements || announcements;
        setAnnouncements(nextList);
        notifyLiveSync(nextList);
        showToast('Announcement updated.');
      } else {
        const res = await adminFetch<{
          announcement: ManagedAnnouncement;
          announcements: ManagedAnnouncement[];
        }>('/api/admin/announcements', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const nextList = res.announcements || [res.announcement, ...announcements];
        setAnnouncements(nextList);
        notifyLiveSync(nextList);
        showToast(
          form.status === 'published'
            ? 'Announcement published and live.'
            : 'Announcement saved as hidden (admin-only).'
        );
      }
      resetForm();
    } catch {
      // handled cleanly
    } finally {
      setSaving(false);
    }
  };

  const handleSetStatus = async (
    ann: ManagedAnnouncement,
    nextStatus: 'published' | 'hidden'
  ) => {
    const res = await adminFetch<{
      announcement: ManagedAnnouncement;
      announcements: ManagedAnnouncement[];
    }>(`/api/admin/announcements/${ann.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: nextStatus }),
    });
    const nextList =
      res.announcements ||
      announcements.map((item) => (item.id === ann.id ? res.announcement : item));
    setAnnouncements(nextList);
    notifyLiveSync(nextList);
    showToast(
      nextStatus === 'published'
        ? `"${ann.title}" is now published on What's New.`
        : `"${ann.title}" is now hidden from public pages.`
    );
  };

  const handleToggleBanner = async (ann: ManagedAnnouncement) => {
    const nextBanner = !ann.showBanner;
    const res = await adminFetch<{
      announcement: ManagedAnnouncement;
      announcements: ManagedAnnouncement[];
    }>(`/api/admin/announcements/${ann.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ showBanner: nextBanner }),
    });
    const nextList =
      res.announcements ||
      announcements.map((item) => (item.id === ann.id ? res.announcement : item));
    setAnnouncements(nextList);
    notifyLiveSync(nextList);
    showToast(
      nextBanner
        ? `Site banner enabled for "${ann.title}".`
        : `Site banner disabled for "${ann.title}".`
    );
  };

  const handleDeleteAnnouncement = async (ann: ManagedAnnouncement) => {
    const res = await adminFetch<{ ok: boolean; announcements?: ManagedAnnouncement[] }>(
      `/api/admin/announcements/${ann.id}`,
      { method: 'DELETE' }
    );
    const nextList =
      res.announcements || announcements.filter((item) => item.id !== ann.id);
    setAnnouncements(nextList);
    if (editingId === ann.id) {
      resetForm();
    }
    notifyLiveSync(nextList);
    showToast(`Deleted "${ann.title}".`);
  };

  const handleRemoveSubscriber = async (sub: NewsletterSubscriberRecord) => {
    const res = await adminFetch<{
      ok: boolean;
      subscribers: NewsletterSubscriberRecord[];
    }>(`/api/admin/newsletter-subscribers/${encodeURIComponent(sub.email)}`, {
      method: 'DELETE',
    });
    setSubscribers(
      res.subscribers || subscribers.filter((item) => item.email !== sub.email)
    );
    showToast(`Removed ${sub.email} from Email Updates.`);
  };

  if (loading) return <PageLoader label="Loading Announcements & Email Updates..." />;

  const activeBannerAnnouncementId = announcements.find(
    (a) => a.status === 'published' && Boolean(a.showBanner)
  )?.id;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="BROADCASTS & SUBSCRIBERS"
        title="ANNOUNCEMENTS"
        description="Create, edit, publish, hide, and delete announcements for What's New (/whats-new) and the site-wide top banner, and manage deduplicated Email Updates subscribers."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="/whats-new"
              onClick={(e) => {
                e.preventDefault();
                window.history.pushState({}, '', '/whats-new');
                window.dispatchEvent(new PopStateEvent('popstate'));
              }}
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.1] light:border-slate-300 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-cyan)]/50 transition-all"
            >
              View /whats-new
            </a>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-3.5 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New announcement</span>
              </button>
            )}
          </div>
        }
      />

      {feedback && (
        <div
          role="status"
          className="px-4 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 light:text-emerald-800 text-xs font-semibold flex items-center justify-between gap-3"
        >
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-300 light:text-emerald-800 hover:opacity-80"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. CREATE / EDIT ANNOUNCEMENT FORM */}
      <div className="rounded-2xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] light:border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <Megaphone className="w-4 h-4 text-[var(--accent-cyan)]" />
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              {editingId ? 'Edit Announcement' : 'Create Announcement'}
            </h2>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            >
              <X className="w-3.5 h-3.5" />
              <span>Cancel edit</span>
            </button>
          )}
        </div>

        <form onSubmit={handleSubmitForm} className="space-y-4" data-testid="announcement-form">
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 md:grid-cols-3 gap-4 landscape-mobile:gap-3">
            <div className="landscape-mobile:col-span-2 md:col-span-2">
              <label htmlFor="ann-title" className="text-xs font-semibold block mb-1.5 text-[var(--text-secondary)]">
                Title *
              </label>
              <input
                id="ann-title"
                name="title"
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="e.g., Spring Tactical Series Volume 4 Released"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>

            <div>
              <label htmlFor="ann-date" className="text-xs font-semibold block mb-1.5 text-[var(--text-secondary)]">
                Date *
              </label>
              <input
                id="ann-date"
                name="date"
                type="date"
                required
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs sm:text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>
          </div>

          <div>
            <label htmlFor="ann-message" className="text-xs font-semibold block mb-1.5 text-[var(--text-secondary)]">
              Message *
            </label>
            <textarea
              id="ann-message"
              name="message"
              rows={3}
              required
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Write the announcement details that will appear on /whats-new and optionally in the top site banner..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
            />
          </div>

          {/* Optional Labelled Link + Status */}
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 md:grid-cols-3 gap-4 landscape-mobile:gap-3">
            <div>
              <label htmlFor="ann-cta-label" className="text-xs font-semibold block mb-1.5 text-[var(--text-secondary)]">
                Link Label (Optional)
              </label>
              <input
                id="ann-cta-label"
                name="ctaLabel"
                type="text"
                value={form.ctaLabel}
                onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })}
                placeholder="e.g., Explore Reads"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>

            <div>
              <label htmlFor="ann-cta-url" className="text-xs font-semibold block mb-1.5 text-[var(--text-secondary)]">
                Link URL / Destination (Optional)
              </label>
              <input
                id="ann-cta-url"
                name="ctaUrl"
                type="text"
                value={form.ctaUrl}
                onChange={(e) => setForm({ ...form, ctaUrl: e.target.value })}
                placeholder="e.g., /reads or /match-centre"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs sm:text-sm font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
              />
            </div>

            <div>
              <label htmlFor="ann-status" className="text-xs font-semibold block mb-1.5 text-[var(--text-secondary)]">
                Visibility Status
              </label>
              <select
                id="ann-status"
                name="status"
                value={form.status}
                onChange={(e) =>
                  setForm({
                    ...form,
                    status: e.target.value === 'published' ? 'published' : 'hidden',
                  })
                }
                className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs sm:text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
              >
                <option value="published">Published (Visible on /whats-new)</option>
                <option value="hidden">Hidden / Unpublished (Admin-only)</option>
              </select>
            </div>
          </div>

          {/* Site-Banner Setting + Submit */}
          <div className="flex flex-col landscape-mobile:flex-row landscape-mobile:items-center sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-white/[0.06] light:border-slate-200">
            <label
              htmlFor="ann-show-banner"
              className="inline-flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[var(--text-primary)] cursor-pointer select-none"
            >
              <input
                id="ann-show-banner"
                name="showBanner"
                type="checkbox"
                checked={form.showBanner}
                onChange={(e) => setForm({ ...form, showBanner: e.target.checked })}
                className="w-4 h-4 rounded accent-[var(--accent-cyan)] cursor-pointer"
              />
              <span>Enable site-wide top banner (most recent published banner announcement appears at top of every page)</span>
            </label>

            <div className="flex items-center gap-2 shrink-0">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.08] light:border-slate-300 text-xs font-semibold text-[var(--text-secondary)]"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                <span>{editingId ? 'Save Changes' : 'Create Announcement'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* 2. ANNOUNCEMENTS LIST */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <span>All Announcements</span>
            <span className="px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] font-mono text-xs text-[var(--accent-cyan)]">
              {announcements.length}
            </span>
          </h2>
          <span className="text-xs text-[var(--text-muted)]">
            {announcements.filter((a) => a.status === 'published').length} published ·{' '}
            {announcements.filter((a) => a.status !== 'published').length} unpublished (admin-only)
          </span>
        </div>

        {announcements.length === 0 ? (
          <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-8 text-center text-xs text-[var(--text-muted)]">
            No announcements created yet. Use the form above to create your first announcement.
          </div>
        ) : (
          <div className="space-y-3" data-testid="admin-announcements-list">
            {announcements.map((ann) => {
              const isPublished = ann.status === 'published';
              const isCurrentTopBanner = ann.id === activeBannerAnnouncementId;
              const linkUrl = ann.ctaUrl || ann.ctaDest;

              return (
                <div
                  key={ann.id}
                  data-admin-announcement-id={ann.id}
                  className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-5 landscape-mobile:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-2 max-w-3xl min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <Megaphone className="w-4 h-4 text-[var(--accent-cyan)] shrink-0" />
                      <h3 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                        {ann.title}
                      </h3>
                      <AdminStatusBadge
                        label={isPublished ? 'Published' : 'Hidden'}
                        tone={isPublished ? 'emerald' : 'amber'}
                      />
                      {ann.showBanner && (
                        <AdminStatusBadge
                          label={isCurrentTopBanner ? 'Active Site Banner' : 'Banner Enabled'}
                          tone="cyan"
                        />
                      )}
                      <span className="inline-flex items-center gap-1 text-[11px] font-mono text-[var(--text-muted)]">
                        <Calendar className="w-3 h-3" />
                        <span>{formatAnnouncementDate(ann.date) || ann.date}</span>
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-line">
                      {ann.message}
                    </p>

                    {(ann.ctaLabel || linkUrl) && (
                      <div className="inline-flex items-center gap-1.5 text-xs font-mono text-[var(--accent-cyan)]">
                        <Link2 className="w-3.5 h-3.5" />
                        <span>
                          {ann.ctaLabel || 'Link'}: {linkUrl || '—'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status Controls & Edit/Delete Actions */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {isPublished ? (
                      <button
                        type="button"
                        onClick={() => handleSetStatus(ann, 'hidden')}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 light:text-amber-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <EyeOff className="w-3.5 h-3.5" />
                        <span>Hide</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetStatus(ann, 'published')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Publish</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleBanner(ann)}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer ${
                        ann.showBanner
                          ? 'bg-[var(--accent-cyan)]/15 border-[var(--accent-cyan)]/40 text-[var(--accent-cyan)]'
                          : 'bg-[var(--bg-elevated)] border-white/[0.08] light:border-slate-300 text-[var(--text-secondary)]'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5" />
                      <span>{ann.showBanner ? 'Disable Banner' : 'Enable Banner'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEdit(ann)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-white/[0.08] light:border-slate-300 text-xs font-semibold text-[var(--text-primary)] hover:border-[var(--accent-cyan)]/50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteAnnouncement(ann)}
                      aria-label={`Delete ${ann.title}`}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-400 light:text-rose-700 hover:bg-rose-500/25 text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. EMAIL UPDATES SECTION (Deduplicated Newsletter Subscribers) */}
      <div
        className="rounded-2xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-4"
        data-testid="email-updates-section"
      >
        <div className="flex flex-col landscape-mobile:flex-row landscape-mobile:items-center sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] light:border-slate-200 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-[var(--accent-cyan)]" />
              <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
                Email Updates
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-[var(--bg-elevated)] font-mono text-xs text-[var(--accent-cyan)]">
                {subscribers.length} {subscribers.length === 1 ? 'subscriber' : 'subscribers'}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              Deduplicated newsletter subscribers receiving official DodaEona F.C. announcements and reading dispatches.
            </p>
          </div>
        </div>

        {subscribers.length === 0 ? (
          <div className="py-8 text-center text-xs text-[var(--text-muted)]">
            No newsletter subscribers are currently on the Email Updates list.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            {subscribers.map((sub) => (
              <div
                key={sub.email}
                data-subscriber-email={sub.email}
                className="py-3.5 flex items-center justify-between gap-4"
              >
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-mono font-semibold text-[var(--text-primary)] truncate">
                    {sub.email}
                  </div>
                  <div className="text-[11px] text-[var(--text-muted)] font-mono">
                    Subscribed {formatAnnouncementDate(sub.subscribedAt.slice(0, 10)) || sub.subscribedAt.slice(0, 10)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveSubscriber(sub)}
                  aria-label={`Remove ${sub.email}`}
                  className="px-3 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/35 text-rose-400 light:text-rose-700 hover:bg-rose-500/25 text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SECTION 15: BACKGROUND MUSIC
// ============================================================================
export const BackgroundMusicSection: React.FC = () => {
  const {
    isAudioPlaying,
    toggleAudio,
    activeTrack,
    selectTrack,
    refreshBootstrapTheme,
  } = useTheme();
  const [tracks, setTracks] = useState<MusicTrackRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({
    title: '',
    artist: 'DodaEona Club Audio',
    audioUrl: '',
    category: 'Club Anthem',
    sourceType: 'audio-url' as MusicTrackRecord['sourceType'],
    featured: true,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTracks = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ tracks: MusicTrackRecord[] }>('/api/admin/music');
      setTracks(res.tracks);
    } catch {
      // handled cleanly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTracks();
  }, []);

  const handleUploadAudioFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('audio/')) {
      setErrorMsg('Please select a valid audio file (.mp3, .wav, .ogg).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setErrorMsg(null);
      setForm((prev) => ({
        ...prev,
        title: prev.title || file.name.replace(/\.[^.]+$/, ''),
        sourceType: 'uploaded',
        audioUrl: String(reader.result || ''),
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!form.audioUrl.trim()) {
      setErrorMsg('Please enter an audio URL or upload an audio file.');
      return;
    }
    await adminFetch('/api/admin/music', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setAddOpen(false);
    setForm({
      title: '',
      artist: 'DodaEona Club Audio',
      audioUrl: '',
      category: 'Club Anthem',
      sourceType: 'audio-url',
      featured: true,
    });
    await loadTracks();
    await refreshBootstrapTheme();
  };

  const toggleEnabled = async (track: MusicTrackRecord) => {
    await adminFetch(`/api/admin/music/${track.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: !track.enabled }),
    });
    await loadTracks();
    await refreshBootstrapTheme();
  };

  const toggleFeatured = async (track: MusicTrackRecord) => {
    await adminFetch(`/api/admin/music/${track.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ featured: !(track.featured !== false) }),
    });
    await loadTracks();
    await refreshBootstrapTheme();
  };

  const makeDefault = async (track: MusicTrackRecord) => {
    await adminFetch(`/api/admin/music/${track.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isDefault: true, enabled: true }),
    });
    await loadTracks();
    await refreshBootstrapTheme();
    selectTrack(track.id);
  };

  if (loading) return <PageLoader label="Loading ambient music library..." />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="ATMOSPHERE & AUDIO"
        title="BACKGROUND MUSIC & SOUNDSCAPES"
        description="Upload and manage custom audio tracks playable from the global site header and the floating player dock."
        actions={
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add audio track</span>
          </button>
        }
      />

      <div className="space-y-3">
        {tracks.length === 0 && (
          <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-8 text-center text-xs text-[var(--text-muted)]">
            No background audio tracks have been uploaded yet. Use &quot;Add audio track&quot; to upload an audio file or link an audio URL.
          </div>
        )}
        {tracks.map((tr) => {
          const isCurrent = activeTrack?.id === tr.id && isAudioPlaying;
          return (
            <div
              key={tr.id}
              className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-5 landscape-mobile:p-4 flex flex-col landscape-mobile:flex-row landscape-mobile:items-center sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    selectTrack(tr.id);
                    if (!isAudioPlaying || activeTrack?.id === tr.id) {
                      toggleAudio();
                    }
                  }}
                  className="w-10 h-10 rounded-xl bg-[var(--accent-cyan)]/15 border border-[var(--accent-cyan)]/35 text-[var(--accent-cyan)] flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
                  title={isCurrent ? 'Stop preview' : 'Preview track'}
                >
                  {isCurrent ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate">{tr.title}</span>
                    {tr.featured !== false && <AdminStatusBadge label="Featured" tone="amber" />}
                    {tr.isDefault && <AdminStatusBadge label="Default" tone="cyan" />}
                    <AdminStatusBadge
                      label={tr.enabled ? 'Enabled' : 'Disabled'}
                      tone={tr.enabled ? 'emerald' : 'slate'}
                    />
                    {tr.category && (
                      <span className="text-[10px] font-mono text-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-2 py-0.5 rounded">
                        {tr.category}
                      </span>
                    )}
                  </div>
                  <div className="text-xs font-mono text-[var(--text-muted)]">
                    {tr.artist} · {tr.soundscapePreset ? `Preset: ${tr.soundscapePreset}` : tr.sourceType} · {tr.durationLabel}
                  </div>
                  {tr.description && (
                    <div className="text-[11px] text-[var(--text-muted)]/80 italic mt-0.5">
                      {tr.description}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                {!tr.isDefault && (
                  <button
                    type="button"
                    onClick={() => makeDefault(tr)}
                    className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-white/[0.08] text-xs font-semibold cursor-pointer hover:border-white/20"
                  >
                    Set default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => toggleFeatured(tr)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-white/[0.08] text-xs font-semibold cursor-pointer hover:border-white/20"
                >
                  {tr.featured !== false ? 'Unfeature' : 'Feature'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleEnabled(tr)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-white/[0.08] text-xs font-semibold cursor-pointer hover:border-white/20"
                >
                  {tr.enabled ? 'Disable' : 'Enable'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await adminFetch(`/api/admin/music/${tr.id}`, { method: 'DELETE' });
                    await loadTracks();
                    await refreshBootstrapTheme();
                  }}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400 cursor-pointer"
                  title="Delete track"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <AdminDialog open={addOpen} onClose={() => setAddOpen(false)} title="Add Background Audio Track">
        <form onSubmit={handleCreate} className="space-y-4">
          {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
          <div>
            <label className="text-xs font-semibold block mb-1">Track title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Stadium Entry Theme"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Artist / Source Label</label>
            <input
              type="text"
              value={form.artist}
              onChange={(e) => setForm({ ...form, artist: e.target.value })}
              placeholder="DodaEona Club Audio"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Category</label>
            <input
              type="text"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="Matchday Stadium"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Audio URL</label>
            <input
              type="text"
              value={form.audioUrl}
              onChange={(e) => setForm({ ...form, audioUrl: e.target.value, sourceType: 'audio-url' })}
              placeholder="https://example.com/track.mp3"
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-semibold block mb-1">Or upload local audio (.mp3 / .wav / .ogg)</label>
            <label className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.1] text-xs cursor-pointer hover:border-white/20">
              <Upload className="w-3.5 h-3.5 text-[var(--accent-cyan)]" />
              <span>Choose audio file</span>
              <input type="file" accept="audio/*" onChange={handleUploadAudioFile} className="hidden" />
            </label>
          </div>

          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              className="accent-[var(--accent-cyan)]"
            />
            <span>Mark as Featured Song</span>
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider cursor-pointer"
            >
              Save track
            </button>
          </div>
        </form>
      </AdminDialog>
    </div>
  );
};
