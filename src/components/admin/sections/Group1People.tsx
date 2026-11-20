import React, { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  FileText,
  Layers,
  CheckCircle2,
  Circle,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  Ban,
  Unlock,
  Monitor,
  Trash2,
  Users,
  Activity,
} from 'lucide-react';
import { useReads } from '../../../context/ReadsContext';
import { useAuth } from '../../../context/AuthContext';
import { AdminSectionId } from '../adminRoutes';
import {
  adminFetch,
  AdminPageHeader,
  AdminStatCard,
  AdminActivityList,
  AdminDataTable,
  AdminSearch,
  AdminFilter,
  AdminStatusBadge,
  AdminDialog,
  AdminConfirmDialog,
  PageLoader,
} from '../shared/AdminUI';
import type { ActivityEventRecord, AuditLogEntry, PublicAuthUser } from '../../../../server/types';

// ============================================================================
// SECTION 1: OVERVIEW (Matches Reference Control Room Screenshot)
// ============================================================================
export const OverviewSection: React.FC<{
  onNavigateSection: (sec: AdminSectionId) => void;
}> = ({ onNavigateSection }) => {
  const { books, series } = useReads();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<{
    usersCount: number;
    unreadMessagesCount: number;
    openQuizReportsCount: number;
    announcementsCount: number;
    pdfCount: number;
    leaguesPublishedCount: number;
    leaguesTotalCount: number;
    auditLogs: AuditLogEntry[];
    setupStatus: { hasBranding: boolean; hasMusic: boolean; hasContact: boolean };
  } | null>(null);

  useEffect(() => {
    adminFetch<typeof overview>('/api/admin/overview')
      .then((d) => setOverview(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const publishedCount = books.filter((b) => b.published).length;
  const draftCount = books.filter((b) => !b.published).length;
  const liveSeriesCount = series.filter((s) => s.published).length;
  const totalSeriesCount = series.length;

  const checklist = [
    {
      label: 'Add your logo and branding',
      done: overview?.setupStatus.hasBranding ?? true,
      target: 'website-branding' as AdminSectionId,
    },
    {
      label: 'Create your first book series',
      done: totalSeriesCount > 0,
      target: 'manage-book-series' as AdminSectionId,
    },
    {
      label: 'Upload a book with its PDF',
      done: publishedCount > 0,
      target: 'upload-manage-books' as AdminSectionId,
    },
    {
      label: 'Configure ambient site music',
      done: overview?.setupStatus.hasMusic ?? true,
      target: 'background-music' as AdminSectionId,
    },
    {
      label: 'Configure contact & YouTube link',
      done: overview?.setupStatus.hasContact ?? true,
      target: 'contact-info' as AdminSectionId,
    },
    {
      label: 'Audit PDF edition access rules',
      done: (overview?.pdfCount || 0) > 0,
      target: 'manage-pdf-files' as AdminSectionId,
    },
  ];

  const recentlyChangedBooks = books.slice(0, 4).map((b) => ({
    id: b.id,
    title: b.title,
    meta: `${b.seriesTitle} · ${b.publishedDate}`,
    badge: b.published ? 'LIVE' : 'DRAFT',
    badgeTone: (b.published ? 'emerald' : 'amber') as 'emerald' | 'amber',
  }));

  if (loading && !overview) return <PageLoader label="Loading Control Room overview..." />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="OVERVIEW"
        title="THE CONTROL ROOM"
        description="Everything the club publishes passes through here. Series, volumes, PDF editions and the wording of the public site all live in this dashboard."
      />

      {/* 4 Primary Stat Cards matching screenshot */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-4 landscape-mobile:gap-3">
        <AdminStatCard
          icon={BookOpen}
          value={publishedCount}
          label="PUBLISHED VOLUMES"
          onClick={() => onNavigateSection('upload-manage-books')}
        />
        <AdminStatCard
          icon={FileText}
          value={draftCount}
          label="DRAFT VOLUMES"
          onClick={() => onNavigateSection('upload-manage-books')}
        />
        <AdminStatCard
          icon={Layers}
          value={`${liveSeriesCount} LIVE · ${totalSeriesCount} TOTAL`}
          label="SERIES"
          onClick={() => onNavigateSection('manage-book-series')}
        />
        <AdminStatCard
          icon={FileText}
          value={overview?.pdfCount ?? 0}
          label="PDF EDITIONS"
          onClick={() => onNavigateSection('manage-pdf-files')}
        />
      </div>

      {/* Checklist + Recently Changed Split Grid */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-6 landscape-mobile:gap-4">
        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">
              Set-up checklist
            </h2>
            <span className="eyebrow-mono text-[var(--accent-cyan)]">
              {checklist.filter((c) => c.done).length} / {checklist.length} READY
            </span>
          </div>

          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            {checklist.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigateSection(item.target)}
                className="w-full py-3.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3 text-left group hover:bg-white/[0.02] light:hover:bg-slate-50 px-2 -mx-2 rounded-lg transition-colors"
              >
                <span className="flex items-center gap-3 min-w-0">
                  {item.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 light:text-emerald-600 shrink-0" />
                  ) : (
                    <Circle className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                  )}
                  <span
                    className={`text-xs sm:text-sm truncate ${
                      item.done
                        ? 'text-[var(--text-secondary)] line-through decoration-white/25'
                        : 'text-[var(--text-primary)] font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </span>
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--accent-cyan)] group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        </div>

        <AdminActivityList
          title="Recently changed"
          actionLabel="All books"
          onAction={() => onNavigateSection('upload-manage-books')}
          items={recentlyChangedBooks}
        />
      </div>

      {/* Live Governance Snapshot & Recent Admin Audit */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 lg:grid-cols-3 gap-4 landscape-mobile:gap-3">
        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-5 space-y-2">
          <span className="eyebrow-mono text-[var(--accent-cyan)]">PLATFORM ACCOUNTS</span>
          <div className="font-display text-2xl text-[var(--text-primary)] tabular-nums">
            {overview?.usersCount ?? 0} REGISTERED
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('signed-in-accounts')}
            className="text-xs font-semibold text-[var(--accent-cyan)] hover:underline inline-flex items-center gap-1"
          >
            <span>Inspect accounts</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-5 space-y-2">
          <span className="eyebrow-mono text-[var(--accent-cyan)]">PUBLIC BROADCASTS</span>
          <div className="font-display text-2xl text-[var(--text-primary)] tabular-nums">
            {overview?.announcementsCount ?? 0} LIVE UPDATES
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('whats-new-updates')}
            className="text-xs font-semibold text-[var(--accent-cyan)] hover:underline inline-flex items-center gap-1"
          >
            <span>Manage announcements</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-5 space-y-2">
          <span className="eyebrow-mono text-[var(--accent-cyan)]">MATCH CENTRE &amp; SQUADS</span>
          <div className="font-display text-2xl text-[var(--text-primary)] tabular-nums">
            TEAMS &amp; ROSTERS LIVE
          </div>
          <button
            type="button"
            onClick={() => onNavigateSection('simulation-database')}
            className="text-xs font-semibold text-[var(--accent-cyan)] hover:underline inline-flex items-center gap-1"
          >
            <span>Open Simulation Database</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {overview && overview.auditLogs.length > 0 && (
        <AdminActivityList
          title="Recent Control Room audit trail"
          actionLabel="Accounts & Activity"
          onAction={() => onNavigateSection('accounts-activity')}
          items={overview.auditLogs.slice(0, 6).map((a) => ({
            id: a.id,
            title: `${a.action} — ${a.target}`,
            meta: `${a.section} · ${a.actorEmail} · ${new Date(a.timestamp).toLocaleString()}`,
            badge: a.section,
            badgeTone: 'slate',
          }))}
        />
      )}
    </div>
  );
};

// ============================================================================
// SECTION 2: SIGNED-IN ACCOUNTS
// ============================================================================
interface AdminUserRow extends PublicAuthUser {
  activeSessions: number;
  warningsCount: number;
}

export const SignedInAccountsSection: React.FC = () => {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [confirmToggleUser, setConfirmToggleUser] = useState<AdminUserRow | null>(null);
  const [confirmSignOutUser, setConfirmSignOutUser] = useState<AdminUserRow | null>(null);
  const [confirmDeleteUser, setConfirmDeleteUser] = useState<AdminUserRow | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await adminFetch<{ users: AdminUserRow[] }>('/api/admin/users');
      setUsers(data.users);
    } catch {
      // handled by auth/error state
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === 'admin' && u.role !== 'admin') return false;
      if (filter === 'member' && u.role !== 'member') return false;
      if (filter === 'blocked' && !u.blocked) return false;
      if (q) {
        return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      }
      return true;
    });
  }, [users, search, filter]);

  const pageSize = 8;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pagedRows = filtered.slice((page - 1) * pageSize, page * pageSize);

  const handleConfirmBlockToggle = async () => {
    if (!confirmToggleUser) return;
    try {
      await adminFetch(`/api/admin/users/${confirmToggleUser.id}/block`, {
        method: 'PATCH',
        body: JSON.stringify({
          blocked: !confirmToggleUser.blocked,
          reason: blockReason || 'Access restricted by owner',
        }),
      });
      setStatusMessage(
        `${confirmToggleUser.email} ${confirmToggleUser.blocked ? 'unblocked' : 'blocked'}.`
      );
      setConfirmToggleUser(null);
      setSelectedUser(null);
      setBlockReason('');
      await loadUsers();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Action failed.');
      setConfirmToggleUser(null);
    }
  };

  const handleSignOutUser = async () => {
    if (!confirmSignOutUser) return;
    try {
      await adminFetch(`/api/admin/users/${confirmSignOutUser.id}/signout`, {
        method: 'POST',
      });
      setStatusMessage(`Signed out all active sessions for ${confirmSignOutUser.email}.`);
      setConfirmSignOutUser(null);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Action failed.');
      setConfirmSignOutUser(null);
    }
  };

  const handleDeleteUser = async () => {
    if (!confirmDeleteUser) return;
    try {
      await adminFetch(`/api/admin/users/${confirmDeleteUser.id}`, {
        method: 'DELETE',
      });
      setStatusMessage(`Permanently removed account ${confirmDeleteUser.email}.`);
      setConfirmDeleteUser(null);
      setSelectedUser(null);
      await loadUsers();
    } catch (err) {
      setStatusMessage(err instanceof Error ? err.message : 'Action failed.');
      setConfirmDeleteUser(null);
    }
  };

  if (loading) return <PageLoader label="Loading signed-in accounts..." />;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="ACCOUNTS"
        title="SIGNED-IN ACCOUNTS"
        description="Search registered reader and owner accounts, inspect session activity, and manage access suspensions."
      />

      {statusMessage && (
        <div className="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-xs text-[var(--accent-cyan)] flex items-center justify-between">
          <span>{statusMessage}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="underline">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-col landscape-mobile:flex-row landscape-mobile:items-center sm:flex-row sm:items-center justify-between gap-3">
        <AdminSearch
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search by name or email..."
          className="landscape-mobile:w-72 sm:w-80"
        />
        <AdminFilter
          label="FILTER"
          value={filter}
          onChange={(v) => {
            setFilter(v);
            setPage(1);
          }}
          options={[
            { value: 'all', label: `All accounts (${users.length})` },
            { value: 'admin', label: 'Admins' },
            { value: 'member', label: 'Members' },
            { value: 'blocked', label: 'Blocked' },
          ]}
        />
      </div>

      <AdminDataTable
        rows={pagedRows}
        rowKey={(u) => u.id}
        onRowClick={(u) => setSelectedUser(u)}
        columns={[
          {
            key: 'account',
            header: 'ACCOUNT',
            render: (u) => (
              <div>
                <div className="font-semibold text-[var(--text-primary)]">{u.name}</div>
                <div className="text-xs font-mono text-[var(--text-muted)]">{u.email}</div>
              </div>
            ),
          },
          {
            key: 'role',
            header: 'ROLE',
            render: (u) => (
              <AdminStatusBadge
                label={u.role === 'admin' ? 'Owner / Admin' : 'Member'}
                tone={u.role === 'admin' ? 'cyan' : 'slate'}
              />
            ),
          },
          {
            key: 'status',
            header: 'STATUS',
            render: (u) => (
              <AdminStatusBadge
                label={u.blocked ? 'Blocked' : 'Active'}
                tone={u.blocked ? 'rose' : 'emerald'}
              />
            ),
          },
          {
            key: 'sessions',
            header: 'SESSIONS',
            align: 'center',
            render: (u) => <span className="font-mono tabular-nums">{u.activeSessions}</span>,
          },
          {
            key: 'lastActive',
            header: 'LAST ACTIVE',
            render: (u) => (
              <span className="text-xs font-mono text-[var(--text-muted)]">
                {new Date(u.lastActiveAt).toLocaleDateString()}
              </span>
            ),
          },
          {
            key: 'action',
            header: 'ACTION',
            align: 'right',
            render: (u) => (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedUser(u);
                }}
                className="text-xs font-semibold text-[var(--accent-cyan)] hover:underline"
              >
                Inspect
              </button>
            ),
          },
        ]}
      />

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-white/[0.1] disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-white/[0.1] disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Detail Drawer/Dialog */}
      <AdminDialog
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUser(null)}
        title={selectedUser ? selectedUser.name : 'Account'}
        subtitle={selectedUser?.email}
      >
        {selectedUser && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-white/[0.08] light:border-slate-200">
                <span className="eyebrow-mono text-[var(--text-muted)] block">ROLE</span>
                <span className="font-bold text-[var(--text-primary)] mt-1 block uppercase">
                  {selectedUser.role}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-white/[0.08] light:border-slate-200">
                <span className="eyebrow-mono text-[var(--text-muted)] block">ACTIVE SESSIONS</span>
                <span className="font-bold font-mono text-[var(--text-primary)] mt-1 block">
                  {selectedUser.activeSessions}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-white/[0.08] light:border-slate-200">
                <span className="eyebrow-mono text-[var(--text-muted)] block">WARNINGS ISSUED</span>
                <span className="font-bold font-mono text-[var(--text-primary)] mt-1 block">
                  {selectedUser.warningsCount}
                </span>
              </div>
              <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-white/[0.08] light:border-slate-200">
                <span className="eyebrow-mono text-[var(--text-muted)] block">JOINED</span>
                <span className="font-mono text-[var(--text-primary)] mt-1 block">
                  {new Date(selectedUser.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/[0.08] light:border-slate-200 space-y-3">
              {!selectedUser.blocked && (
                <div>
                  <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                    Suspension reason (optional)
                  </label>
                  <input
                    type="text"
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    placeholder="Policy violation / spam"
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs text-[var(--text-primary)]"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setConfirmToggleUser(selectedUser)}
                className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${
                  selectedUser.blocked
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                    : 'bg-rose-600 hover:bg-rose-500 text-white'
                }`}
              >
                {selectedUser.blocked ? (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Restore account access</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Suspend account access</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setConfirmSignOutUser(selectedUser)}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <span>Sign out active sessions</span>
              </button>

              <button
                type="button"
                onClick={() => setConfirmDeleteUser(selectedUser)}
                className="w-full py-2.5 rounded-xl bg-red-700 hover:bg-red-600 text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Remove / delete account permanently</span>
              </button>
            </div>
          </div>
        )}
      </AdminDialog>

      <AdminConfirmDialog
        open={Boolean(confirmToggleUser)}
        onClose={() => setConfirmToggleUser(null)}
        onConfirm={handleConfirmBlockToggle}
        danger={!confirmToggleUser?.blocked}
        title={confirmToggleUser?.blocked ? 'Restore account access?' : 'Suspend account access?'}
        message={
          confirmToggleUser?.blocked
            ? `Allow ${confirmToggleUser.email} to sign back into DodaEona F.C.?`
            : `Revoke all active sessions and block ${confirmToggleUser?.email} from signing in?`
        }
        confirmLabel={confirmToggleUser?.blocked ? 'Unblock account' : 'Block account'}
      />

      <AdminConfirmDialog
        open={Boolean(confirmSignOutUser)}
        onClose={() => setConfirmSignOutUser(null)}
        onConfirm={handleSignOutUser}
        danger={true}
        title="Sign out active sessions?"
        message={`Terminate all active login sessions for ${confirmSignOutUser?.email}? They will need to sign in again.`}
        confirmLabel="Sign out user"
      />

      <AdminConfirmDialog
        open={Boolean(confirmDeleteUser)}
        onClose={() => setConfirmDeleteUser(null)}
        onConfirm={handleDeleteUser}
        danger={true}
        title="Permanently remove account?"
        message={`Delete ${confirmDeleteUser?.email} from the database permanently? This action cannot be undone.`}
        confirmLabel="Delete account"
      />
    </div>
  );
};

// ============================================================================
// SECTION 3: ACCOUNTS & ACTIVITY (adminUserActivity)
// ============================================================================
export const AccountsActivitySection: React.FC = () => {
  const [data, setData] = useState<{
    totalEvents: number;
    countsByCategory: Record<string, number>;
    events: ActivityEventRecord[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ category, search });
    adminFetch<typeof data>(`/api/admin/activity?${params.toString()}`)
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="TELEMETRY"
        title="ACCOUNTS & ACTIVITY"
        description="User activity stream across reading sessions, match simulations, and authentication events."
      />

      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <AdminStatCard icon={Activity} value={data.totalEvents} label="TOTAL RECORDED EVENTS" />
          <AdminStatCard
            icon={BookOpen}
            value={data.countsByCategory.reading || 0}
            label="READING SESSIONS"
          />
          <AdminStatCard
            icon={Users}
            value={data.countsByCategory.simulation || 0}
            label="SIMULATION EVENTS"
          />
          <AdminStatCard
            icon={ShieldCheck}
            value={data.countsByCategory.auth || 0}
            label="SIGN-IN EVENTS"
          />
        </div>
      )}

      <div className="flex flex-col landscape-mobile:flex-row landscape-mobile:items-center sm:flex-row sm:items-center justify-between gap-3">
        <AdminSearch
          value={search}
          onChange={setSearch}
          placeholder="Search user, action, or target..."
          className="landscape-mobile:w-72 sm:w-80"
        />
        <AdminFilter
          label="CATEGORY"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'all', label: 'All activity' },
            { value: 'reading', label: 'Reading' },
            { value: 'simulation', label: 'Simulation' },
            { value: 'auth', label: 'Authentication' },
            { value: 'admin', label: 'Admin changes' },
          ]}
        />
      </div>

      {loading && !data ? (
        <PageLoader label="Loading activity stream..." />
      ) : (
        <AdminDataTable
          rows={data?.events || []}
          rowKey={(e) => e.id}
          columns={[
            {
              key: 'user',
              header: 'ACCOUNT',
              render: (e) => (
                <div>
                  <div className="font-semibold text-[var(--text-primary)]">{e.userName}</div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)]">{e.userEmail}</div>
                </div>
              ),
            },
            {
              key: 'category',
              header: 'CATEGORY',
              render: (e) => (
                <AdminStatusBadge
                  label={e.category}
                  tone={
                    e.category === 'reading'
                      ? 'cyan'
                      : e.category === 'quiz'
                      ? 'indigo'
                      : e.category === 'simulation'
                      ? 'emerald'
                      : 'amber'
                  }
                />
              ),
            },
            {
              key: 'action',
              header: 'ACTION & TARGET',
              render: (e) => (
                <div>
                  <div className="font-medium text-[var(--text-primary)]">
                    {e.action}: <span className="text-[var(--accent-cyan)]">{e.target}</span>
                  </div>
                  {e.details && <div className="text-xs text-[var(--text-muted)]">{e.details}</div>}
                </div>
              ),
            },
            {
              key: 'time',
              header: 'TIMESTAMP',
              align: 'right',
              render: (e) => (
                <span className="text-xs font-mono text-[var(--text-muted)]">
                  {new Date(e.timestamp).toLocaleString()}
                </span>
              ),
            },
          ]}
        />
      )}
    </div>
  );
};

// ============================================================================
// SECTION 4: ACCOUNT & SECURITY
// ============================================================================
interface ActiveSessionRow {
  sid: string;
  userAgent: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export const AccountSecuritySection: React.FC = () => {
  const { user, changePassword } = useAuth();
  const [sessions, setSessions] = useState<ActiveSessionRow[]>([]);
  const [audits, setAudits] = useState<AuditLogEntry[]>([]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSecurity = async () => {
    try {
      const data = await adminFetch<{
        sessions: ActiveSessionRow[];
        securityAudits: AuditLogEntry[];
      }>('/api/admin/security');
      setSessions(data.sessions);
      setAudits(data.securityAudits);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSecurity();
  }, []);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (newPassword !== confirmPassword) {
      setFeedback({ ok: false, msg: 'New passwords do not match.' });
      return;
    }
    setSaving(true);
    const res = await changePassword(currentPassword, newPassword);
    setSaving(false);
    if (!res.ok) {
      setFeedback({ ok: false, msg: res.error || 'Unable to change password.' });
      return;
    }
    setFeedback({ ok: true, msg: res.message || 'Password updated cleanly.' });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    loadSecurity();
  };

  const handleRevokeSession = async (sid: string) => {
    try {
      await adminFetch(`/api/auth/sessions/${encodeURIComponent(sid)}`, {
        method: 'DELETE',
      });
      loadSecurity();
    } catch {
      // handled cleanly
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="SECURITY"
        title="ACCOUNT & SECURITY"
        description="Verify active HTTP-only signed sessions, rotate your owner password, and audit security changes."
      />

      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-6 landscape-mobile:gap-4">
        {/* Password Change Form */}
        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2.5">
            <KeyRound className="w-4 h-4 text-[var(--accent-cyan)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Update Owner Password</h2>
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Signed in as <span className="font-mono text-[var(--text-primary)]">{user?.email}</span>{' '}
            · Role verified by server session.
          </p>

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs border ${
                feedback.ok
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 light:text-emerald-700'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300 light:text-rose-700'
              }`}
            >
              {feedback.msg}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Current password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                New password (min 8 characters)
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-[var(--text-secondary)] block mb-1">
                Confirm new password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs text-[var(--text-primary)]"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider"
            >
              {saving ? 'Updating...' : 'Save new password'}
            </button>
          </form>
        </div>

        {/* Active Sessions */}
        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Monitor className="w-4 h-4 text-[var(--accent-cyan)]" />
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Active Owner Sessions ({sessions.length})
              </h2>
            </div>
            <AdminStatusBadge label="HMAC HTTP-Only" tone="emerald" />
          </div>

          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            {sessions.map((s) => (
              <div key={s.sid} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] truncate max-w-[260px]">
                      {s.userAgent}
                    </span>
                    {s.isCurrent && <AdminStatusBadge label="Current" tone="cyan" />}
                  </div>
                  <div className="text-[11px] font-mono text-[var(--text-muted)]">
                    IP {s.ip} · Expires {new Date(s.expiresAt).toLocaleDateString()}
                  </div>
                </div>
                {!s.isCurrent && (
                  <button
                    type="button"
                    onClick={() => handleRevokeSession(s.sid)}
                    className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400"
                    title="Revoke session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {audits.length > 0 && (
        <AdminActivityList
          title="Security change audit"
          items={audits.map((a) => ({
            id: a.id,
            title: a.action,
            meta: `${a.actorEmail} · ${new Date(a.timestamp).toLocaleString()}`,
            badge: 'VERIFIED',
            badgeTone: 'emerald',
          }))}
        />
      )}
    </div>
  );
};
