import React, { useState, useEffect } from 'react';
import { Search, X, AlertTriangle, Loader2, Inbox } from 'lucide-react';
import { getStoredSessionToken } from '../../../context/AuthContext';
import { buildAuthorizedHeaders } from '../../../services/firestorePersistence';

export async function adminFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...((init?.headers as Record<string, string>) || {}),
  });
  const res = await fetch(url, {
    credentials: 'include',
    ...init,
    headers,
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!res.ok) {
    if (res.status === 401 && typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('dodaeona:unauthorized'));
    }
    const errMsg =
      typeof data === 'object' && data !== null && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${res.status})`;
    throw new Error(errMsg);
  }
  return data as T;
}

export const PageLoader: React.FC<{ label?: string }> = ({ label = 'Loading Control Room module...' }) => (
  <div className="min-h-[320px] flex flex-col items-center justify-center gap-3 text-[var(--text-muted)]">
    <Loader2 className="w-7 h-7 animate-spin text-[var(--accent-cyan)]" />
    <span className="eyebrow-mono">{label}</span>
  </div>
);

interface AdminPageHeaderProps {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}

export const AdminPageHeader: React.FC<AdminPageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
}) => (
  <header className="pb-6 mb-6 landscape-mobile:pb-4 landscape-mobile:mb-4 border-b border-white/[0.08] light:border-slate-200 flex flex-col landscape-mobile:flex-row landscape-mobile:items-end md:flex-row md:items-end justify-between gap-4 landscape-mobile:gap-3">
    <div className="space-y-2 landscape-mobile:space-y-1 max-w-2xl">
      <span className="eyebrow-mono text-[var(--accent-cyan)] block">{eyebrow}</span>
      <h1 className="font-display text-3xl landscape-mobile:text-2xl sm:text-4xl lg:text-[42px] text-[var(--text-primary)] tracking-wide leading-none">
        {title}
      </h1>
      <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">{description}</p>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{actions}</div>}
  </header>
);

interface AdminStatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  value: string | number;
  label: string;
  sublabel?: string;
  onClick?: () => void;
}

export const AdminStatCard: React.FC<AdminStatCardProps> = ({
  icon: Icon,
  value,
  label,
  sublabel,
  onClick,
}) => {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`text-left w-full rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-5 landscape-mobile:p-3.5 flex flex-col justify-between gap-4 landscape-mobile:gap-2 transition-all ${
        onClick
          ? 'hover:border-[var(--accent-cyan)]/50 hover:bg-[var(--bg-elevated)] cursor-pointer'
          : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 text-[var(--accent-cyan)]" />
        {sublabel && <span className="eyebrow-mono text-[var(--text-muted)]">{sublabel}</span>}
      </div>
      <div className="space-y-1.5">
        <div className="font-display text-2xl sm:text-3xl text-[var(--text-primary)] tabular-nums leading-none">
          {value}
        </div>
        <div className="eyebrow-mono text-[var(--text-muted)]">{label}</div>
      </div>
    </Tag>
  );
};

interface AdminSearchProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const AdminSearch: React.FC<AdminSearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-10 pr-8 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs sm:text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-cyan)]"
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label="Clear search"
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    )}
  </div>
);

interface AdminFilterOption {
  value: string;
  label: string;
}

interface AdminFilterProps {
  value: string;
  onChange: (value: string) => void;
  options: AdminFilterOption[];
  label?: string;
}

export const AdminFilter: React.FC<AdminFilterProps> = ({ value, onChange, options, label }) => (
  <div className="flex items-center gap-2">
    {label && <span className="eyebrow-mono text-[var(--text-muted)]">{label}</span>}
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export type BadgeTone = 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate' | 'indigo';

export const AdminStatusBadge: React.FC<{ label: string; tone?: BadgeTone }> = ({
  label,
  tone = 'slate',
}) => {
  const tones: Record<BadgeTone, string> = {
    cyan: 'bg-cyan-500/15 text-cyan-300 light:text-cyan-700 border-cyan-500/30',
    emerald: 'bg-emerald-500/15 text-emerald-300 light:text-emerald-700 border-emerald-500/30',
    amber: 'bg-amber-500/15 text-amber-300 light:text-amber-700 border-amber-500/30',
    rose: 'bg-rose-500/15 text-rose-300 light:text-rose-700 border-rose-500/30',
    indigo: 'bg-indigo-500/15 text-indigo-300 light:text-indigo-700 border-indigo-500/30',
    slate: 'bg-slate-500/15 text-slate-300 light:text-slate-700 border-slate-500/30',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-mono uppercase tracking-wider font-semibold ${tones[tone]}`}
    >
      {label}
    </span>
  );
};

interface AdminDataTableColumn<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  render: (row: T) => React.ReactNode;
}

interface AdminDataTableProps<T> {
  columns: AdminDataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}

export function AdminDataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  emptyTitle = 'No matching records',
  emptyDescription = 'Try adjusting your filters or create a new record.',
}: AdminDataTableProps<T>) {
  if (rows.length === 0) {
    return <AdminEmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-white/[0.08] light:border-slate-200 bg-white/[0.02] light:bg-slate-50">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 eyebrow-mono text-[var(--text-muted)] font-semibold whitespace-nowrap ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  }`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06] light:divide-slate-200">
            {rows.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={`transition-colors ${
                  onRowClick
                    ? 'hover:bg-white/[0.03] light:hover:bg-slate-50 cursor-pointer'
                    : 'hover:bg-white/[0.015] light:hover:bg-slate-50/70'
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-xs sm:text-sm text-[var(--text-primary)] ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    }`}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export const AdminEmptyState: React.FC<{
  title: string;
  description: string;
  action?: React.ReactNode;
}> = ({ title, description, action }) => (
  <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-10 text-center space-y-3">
    <div className="w-11 h-11 rounded-xl bg-white/[0.04] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 flex items-center justify-center mx-auto text-[var(--text-muted)]">
      <Inbox className="w-5 h-5" />
    </div>
    <div className="space-y-1">
      <h3 className="text-sm font-bold text-[var(--text-primary)]">{title}</h3>
      <p className="text-xs text-[var(--text-muted)] max-w-md mx-auto">{description}</p>
    </div>
    {action && <div className="pt-2">{action}</div>}
  </div>
);

interface AdminDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidthClass?: string;
}

export const AdminDialog: React.FC<AdminDialogProps> = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  maxWidthClass = 'max-w-xl',
}) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 landscape-mobile:p-3 bg-black/75 backdrop-blur-sm">
      <div
        className={`w-full ${maxWidthClass} max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden rounded-2xl bg-[var(--bg-surface)] border border-white/[0.12] light:border-slate-200 shadow-2xl`}
      >
        <div className="shrink-0 px-6 py-4 landscape-mobile:px-4 landscape-mobile:py-3 bg-[var(--bg-surface)] border-b border-white/[0.08] light:border-slate-200 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-[var(--text-primary)]">{title}</h2>
            {subtitle && <p className="text-xs text-[var(--text-muted)] mt-0.5">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/[0.06] light:hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 landscape-mobile:p-4">{children}</div>
      </div>
    </div>
  );
};

interface AdminConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  requirePhrase?: string;
  loading?: boolean;
}

export const AdminConfirmDialog: React.FC<AdminConfirmDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm action',
  danger = true,
  requirePhrase,
  loading = false,
}) => {
  const [typed, setTyped] = useState('');

  useEffect(() => {
    if (!open) setTyped('');
  }, [open]);

  if (!open) return null;
  const blockedByPhrase = Boolean(requirePhrase && typed.trim() !== requirePhrase);

  return (
    <AdminDialog open={open} onClose={onClose} title={title} maxWidthClass="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 border ${
              danger
                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
            }`}
          >
            <AlertTriangle className="w-5 h-5" />
          </div>
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed">{message}</p>
        </div>

        {requirePhrase && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[var(--text-muted)] block">
              Type <span className="font-mono text-[var(--text-primary)]">{requirePhrase}</span> to authorize:
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={requirePhrase}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.12] light:border-slate-300 text-xs font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-cyan)]"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.1] light:border-slate-200 text-xs font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={blockedByPhrase || loading}
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider disabled:opacity-50 ${
              danger
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-[var(--accent-cyan)] text-[#050A12] light:text-white'
            }`}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </AdminDialog>
  );
};

export interface ActivityFeedEntry {
  id: string;
  title: string;
  meta: string;
  badge?: string;
  badgeTone?: BadgeTone;
}

export const AdminActivityList: React.FC<{
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  items: ActivityFeedEntry[];
}> = ({ title, actionLabel, onAction, items }) => (
  <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 space-y-4">
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-sm sm:text-base font-bold text-[var(--text-primary)]">{title}</h2>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-xs font-semibold text-[var(--accent-cyan)] hover:underline"
        >
          {actionLabel}
        </button>
      )}
    </div>
    {items.length === 0 ? (
      <p className="text-xs text-[var(--text-muted)] py-4">No recent changes recorded.</p>
    ) : (
      <div className="divide-y divide-white/[0.06] light:divide-slate-200">
        {items.map((item) => (
          <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-semibold text-[var(--text-primary)] truncate">
                {item.title}
              </div>
              <div className="eyebrow-mono text-[var(--text-muted)] truncate mt-1">{item.meta}</div>
            </div>
            {item.badge && <AdminStatusBadge label={item.badge} tone={item.badgeTone || 'cyan'} />}
          </div>
        ))}
      </div>
    )}
  </div>
);
