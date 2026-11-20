import React, { useEffect, useState } from 'react';
import {
  Check,
  Download,
  Edit2,
  Eye,
  EyeOff,
  FileText,
  Layers,
  Lock,
  Plus,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  Unlock,
  Upload,
} from 'lucide-react';
import { useReads } from '../../../context/ReadsContext';
import { useAdmin } from '../../../context/AdminContext';
import { useTheme } from '../../../context/ThemeContext';
import { OFFICIAL_ASSETS, resolveAccessCardImageUrl } from '../../../data/mockData';
import { optimizeImageFileToDataUrl } from '../../../utils/imageUpload';
import type { BookVolume, ReadingSeriesItem, ReadsCategory } from '../../../types/reads';
import {
  adminFetch,
  AdminPageHeader,
  AdminStatCard,
  AdminDataTable,
  AdminStatusBadge,
  AdminDialog,
  AdminConfirmDialog,
  PageLoader,
} from '../shared/AdminUI';
import type {
  AboutLegalConfig,
  ContactInfoConfig,
  PdfFileRecord,
  ThemePaletteValues,
  WebsiteBrandingConfig,
} from '../../../../server/types';

const READS_CATEGORIES: ReadsCategory[] = [
  'Football Tactics and Strategy',
  'Football History and Culture',
  'Youth Academy and Player Development',
  'Competitions and Tournaments',
  'Players and Legends',
  'Football Rules and Regulations',
  'Activities and Challenges',
];

// ============================================================================
// SECTION 16: MANAGE BOOK SERIES
// ============================================================================
export const ManageBookSeriesSection: React.FC = () => {
  const { series, createSeries, updateSeries, deleteSeries } = useReads();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ReadingSeriesItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReadingSeriesItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    seriesNumber: series.length + 1,
    title: '',
    description: '',
    category: 'Football Tactics and Strategy' as ReadsCategory,
    coverUrl: OFFICIAL_ASSETS.seriesTactics,
    published: true,
    featured: true,
  });

  const openNew = () => {
    setEditing(null);
    setSaveError(null);
    setForm({
      seriesNumber: series.length + 1,
      title: '',
      description: '',
      category: 'Football Tactics and Strategy',
      coverUrl: OFFICIAL_ASSETS.seriesTactics,
      published: true,
      featured: true,
    });
    setModalOpen(true);
  };

  const openEdit = (s: ReadingSeriesItem) => {
    setEditing(s);
    setSaveError(null);
    setForm({
      seriesNumber: s.seriesNumber,
      title: s.title,
      description: s.description,
      category: s.category,
      coverUrl: s.coverUrl,
      published: s.published,
      featured: s.featured,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      if (editing) {
        await updateSeries({
          ...editing,
          ...form,
          slug: form.title.toLowerCase().replace(/\s+/g, '-'),
        });
        setToastMessage(`Series "${form.title}" updated and permanently saved to database.`);
      } else {
        await createSeries({
          ...form,
          volumeCount: 0,
          slug: form.title.toLowerCase().replace(/\s+/g, '-'),
        });
        setToastMessage(`Series "${form.title}" created and permanently saved to database.`);
      }
      setModalOpen(false);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to permanently save series to database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="READS PRESS"
        title="MANAGE BOOK SERIES"
        description="Create and organize numbered reading series collections published across the DodaEona F.C. library."
        actions={
          <button
            type="button"
            onClick={openNew}
            className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>New book series</span>
          </button>
        }
      />

      <AdminDataTable
        rows={series}
        rowKey={(s) => s.id}
        columns={[
          { key: 'num', header: '#', render: (s) => <span className="font-mono">0{s.seriesNumber}</span> },
          {
            key: 'title',
            header: 'SERIES',
            render: (s) => (
              <div className="flex items-center gap-3">
                <img src={s.coverUrl} alt={s.title} className="w-9 h-12 rounded-md object-cover shrink-0" />
                <div>
                  <div className="font-bold">{s.title}</div>
                  <div className="text-xs text-[var(--text-muted)] line-clamp-1">{s.category}</div>
                </div>
              </div>
            ),
          },
          {
            key: 'vols',
            header: 'VOLUMES',
            align: 'center',
            render: (s) => <span className="font-mono font-bold">{s.volumeCount}</span>,
          },
          {
            key: 'status',
            header: 'STATUS',
            render: (s) => (
              <AdminStatusBadge label={s.published ? 'Live' : 'Draft'} tone={s.published ? 'emerald' : 'amber'} />
            ),
          },
          {
            key: 'actions',
            header: 'ACTIONS',
            align: 'right',
            render: (s) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => updateSeries({ ...s, published: !s.published })}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)]"
                  title={s.published ? 'Unpublish' : 'Publish'}
                >
                  {s.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(s)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)]"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(s)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <AdminDialog open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Series' : 'New Book Series'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="text-xs font-semibold block mb-1">Series title</label>
              <input
                type="text"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Series #</label>
              <input
                type="number"
                min={1}
                value={form.seriesNumber}
                onChange={(e) => setForm({ ...form, seriesNumber: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Category</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as ReadsCategory })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            >
              {READS_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Description</label>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold block">Series cover image (URL or Upload File)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="https://... or /assets/..."
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
              />
              <label className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.1] text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload cover image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setForm({ ...form, coverUrl: ev.target.result as string });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <span>Published</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm({ ...form, featured: e.target.checked })}
              />
              <span>Featured on Homepage</span>
            </label>
          </div>
          {saveError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {saving ? 'Saving to Database...' : 'Save series'}
            </button>
          </div>
        </form>
      </AdminDialog>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            try {
              await deleteSeries(deleteTarget.id);
              setToastMessage(`Series "${deleteTarget.title}" permanently deleted.`);
              setTimeout(() => setToastMessage(null), 3000);
            } catch (err: any) {
              setToastMessage(`Error deleting series: ${err?.message || 'Server error'}`);
            }
          }
          setDeleteTarget(null);
        }}
        title="Delete book series?"
        message={
          deleteTarget
            ? `Deleting "${deleteTarget.title}" permanently removes it and its attached volumes from the database.`
            : ''
        }
        confirmLabel="Delete series"
      />
    </div>
  );
};

// ============================================================================
// SECTION 17: UPLOAD & MANAGE BOOKS
// ============================================================================
export const UploadManageBooksSection: React.FC = () => {
  const { books, series, createBook, updateBook, deleteBook, toggleBookPublish, toggleBookDownload } =
    useReads();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<BookVolume | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BookVolume | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    seriesId: series[0]?.id || '',
    volumeNumber: 1,
    title: '',
    description: '',
    author: 'DodaEona Editorial Team',
    category: 'Football Tactics and Strategy' as ReadsCategory,
    pageCount: 140,
    readTimeMinutes: 35,
    coverUrl: OFFICIAL_ASSETS.seriesTactics,
    pdfUrl: '',
    published: true,
    downloadEnabled: true,
  });

  const openNew = () => {
    setEditing(null);
    setSaveError(null);
    setForm({
      seriesId: series[0]?.id || '',
      volumeNumber: books.length + 1,
      title: '',
      description: '',
      author: 'DodaEona Editorial Team',
      category: 'Football Tactics and Strategy',
      pageCount: 140,
      readTimeMinutes: 35,
      coverUrl: OFFICIAL_ASSETS.seriesTactics,
      pdfUrl: '',
      published: true,
      downloadEnabled: true,
    });
    setModalOpen(true);
  };

  const openEdit = (b: BookVolume) => {
    setEditing(b);
    setSaveError(null);
    setForm({
      seriesId: b.seriesId,
      volumeNumber: b.volumeNumber,
      title: b.title,
      description: b.description,
      author: b.author,
      category: b.category,
      pageCount: b.pageCount,
      readTimeMinutes: b.readTimeMinutes,
      coverUrl: b.coverUrl,
      pdfUrl: b.pdfUrl || '',
      published: b.published,
      downloadEnabled: b.downloadEnabled,
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);
    try {
      const parentSeries = series.find((s) => s.id === form.seriesId);
      if (editing) {
        await updateBook({
          ...editing,
          ...form,
          seriesTitle: parentSeries?.title || editing.seriesTitle,
        });
        setToastMessage(`Book "${form.title}" updated and permanently saved to database.`);
      } else {
        await createBook({
          ...form,
          seriesTitle: parentSeries?.title || 'DodaEona Series',
          publishedDate: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          featured: true,
          slug: form.title.toLowerCase().replace(/\s+/g, '-'),
          chapters: [],
        });
        setToastMessage(`Book "${form.title}" created and permanently saved to database.`);
      }
      setModalOpen(false);
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to permanently save book volume to database.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="CATALOGUE"
        title="UPLOAD & MANAGE BOOKS"
        description="Publish reading volumes, assign cover artwork, control live status, and configure PDF downloads."
        actions={
          <button
            type="button"
            onClick={openNew}
            className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Upload / Add book</span>
          </button>
        }
      />

      <AdminDataTable
        rows={books}
        rowKey={(b) => b.id}
        columns={[
          {
            key: 'book',
            header: 'BOOK VOLUME',
            render: (b) => (
              <div className="flex items-center gap-3">
                <img src={b.coverUrl} alt={b.title} className="w-9 h-12 rounded-md object-cover shrink-0" />
                <div>
                  <div className="font-bold">{b.title}</div>
                  <div className="text-xs text-[var(--text-muted)]">
                    {b.seriesTitle} · Vol. {b.volumeNumber}
                  </div>
                </div>
              </div>
            ),
          },
          { key: 'author', header: 'AUTHOR', render: (b) => <span className="text-xs">{b.author}</span> },
          {
            key: 'status',
            header: 'STATE',
            render: (b) => (
              <AdminStatusBadge label={b.published ? 'Published' : 'Draft'} tone={b.published ? 'emerald' : 'amber'} />
            ),
          },
          {
            key: 'dl',
            header: 'PDF',
            render: (b) => (
              <button
                type="button"
                onClick={() => toggleBookDownload(b.id)}
                className="text-xs font-mono underline text-[var(--accent-cyan)]"
              >
                {b.downloadEnabled ? 'Downloadable' : 'Read-only'}
              </button>
            ),
          },
          {
            key: 'actions',
            header: 'ACTIONS',
            align: 'right',
            render: (b) => (
              <div className="flex items-center justify-end gap-1">
                <button
                  type="button"
                  onClick={() => toggleBookPublish(b.id)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)]"
                  title={b.published ? 'Unpublish' : 'Publish'}
                >
                  {b.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => openEdit(b)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-cyan)]"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(b)}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <AdminDialog open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Book Volume' : 'Upload Book Volume'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1">Book title</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold block mb-1">Series</label>
              <select
                value={form.seriesId}
                onChange={(e) => setForm({ ...form, seriesId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
              >
                {series.length === 0 ? (
                  <option value="">No series created yet</option>
                ) : (
                  series.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold block mb-1">Volume #</label>
              <input
                type="number"
                min={1}
                value={form.volumeNumber}
                onChange={(e) => setForm({ ...form, volumeNumber: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Description</label>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-semibold block">Book cover image (URL or Upload Image File)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="https://... or /assets/..."
                value={form.coverUrl}
                onChange={(e) => setForm({ ...form, coverUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
              />
              <label className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.1] text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload cover image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setForm({ ...form, coverUrl: ev.target.result as string });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold block">PDF document (URL or Upload PDF File)</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="/uploads/file.pdf or URL"
                value={form.pdfUrl}
                onChange={(e) => setForm({ ...form, pdfUrl: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs font-mono"
              />
              <label className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.1] text-xs flex items-center justify-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>Upload PDF file</span>
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (ev) => {
                        if (ev.target?.result) {
                          setForm({ ...form, pdfUrl: ev.target.result as string });
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.published}
                onChange={(e) => setForm({ ...form, published: e.target.checked })}
              />
              <span>Publish live</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.downloadEnabled}
                onChange={(e) => setForm({ ...form, downloadEnabled: e.target.checked })}
              />
              <span>Enable PDF downloads</span>
            </label>
          </div>
          {saveError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {saveError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {saving ? 'Saving to Database...' : 'Save book'}
            </button>
          </div>
        </form>
      </AdminDialog>

      <AdminConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            try {
              await deleteBook(deleteTarget.id);
              setToastMessage(`Book "${deleteTarget.title}" permanently deleted.`);
              setTimeout(() => setToastMessage(null), 3000);
            } catch (err: any) {
              setToastMessage(`Error deleting book: ${err?.message || 'Server error'}`);
            }
          }
          setDeleteTarget(null);
        }}
        title="Delete book volume?"
        message={deleteTarget ? `Remove "${deleteTarget.title}" permanently from the database?` : ''}
        confirmLabel="Delete book"
      />
    </div>
  );
};

// ============================================================================
// SECTION 18: MANAGE PDF FILES (Enforces /api/pdfs/:id access protection)
// ============================================================================
export const ManagePdfFilesSection: React.FC = () => {
  const { books } = useReads();
  const [pdfs, setPdfs] = useState<PdfFileRecord[]>([]);
  const [totalBytes, setTotalBytes] = useState(0);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  const [form, setForm] = useState({
    bookId: books[0]?.id || '',
    filename: '',
    accessStatus: 'public' as 'public' | 'private',
    sizeBytes: 1_500_000,
    urlOrData: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminFetch<{ pdfFiles: PdfFileRecord[]; totalBytes: number }>('/api/admin/pdfs');
      setPdfs(res.pdfFiles);
      setTotalBytes(res.totalBytes);
    } catch {
      // handled cleanly
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setForm((prev) => ({
      ...prev,
      filename: file.name,
      sizeBytes: file.size || 1_200_000,
      urlOrData: `/uploads/pdfs/${file.name}`,
    }));
    const reader = new FileReader();
    reader.onload = () => {
      setFileBase64(String(reader.result || ''));
    };
    reader.onerror = () => {
      setUploadError('Failed to read selected PDF file.');
    };
    reader.readAsDataURL(file);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setUploadError(null);
    try {
      const book = books.find((b) => b.id === form.bookId);
      await adminFetch('/api/admin/pdfs/upload', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          bookTitle: book?.title || form.bookId,
          base64Data: fileBase64,
        }),
      });
      setUploadOpen(false);
      setFileBase64('');
      setToastMessage(`PDF "${form.filename}" permanently uploaded and linked to ${book?.title || 'book'}.`);
      setTimeout(() => setToastMessage(null), 3000);
      await load();
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to permanently store PDF file.');
    } finally {
      setUploading(false);
    }
  };

  const toggleAccess = async (pdf: PdfFileRecord) => {
    try {
      await adminFetch(`/api/admin/pdfs/${pdf.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ accessStatus: pdf.accessStatus === 'public' ? 'private' : 'public' }),
      });
      await load();
    } catch (err: any) {
      setToastMessage(`Error updating access: ${err?.message || 'Server error'}`);
    }
  };

  if (loading) return <PageLoader label="Loading PDF editions..." />;

  const totalMb = (totalBytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="EDITIONS & STORAGE"
        title="MANAGE PDF FILES"
        description="Control PDF file attachments and access gates. Private PDFs are blocked for non-admin requests at /api/pdfs/:id."
        actions={
          <button
            type="button"
            onClick={() => setUploadOpen(true)}
            className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Attach PDF edition</span>
          </button>
        }
      />

      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 sm:grid-cols-3 gap-4 landscape-mobile:gap-3">
        <AdminStatCard icon={FileText} value={pdfs.length} label="MANAGED PDF FILES" />
        <AdminStatCard icon={Layers} value={`${totalMb} MB`} label="TOTAL STORAGE" />
        <AdminStatCard
          icon={Lock}
          value={pdfs.filter((p) => p.accessStatus === 'private').length}
          label="PROTECTED / PRIVATE"
        />
      </div>

      <AdminDataTable
        rows={pdfs}
        rowKey={(p) => p.id}
        columns={[
          { key: 'file', header: 'FILENAME', render: (p) => <span className="font-mono text-xs font-bold">{p.filename}</span> },
          { key: 'book', header: 'LINKED BOOK', render: (p) => p.bookTitle },
          {
            key: 'size',
            header: 'SIZE',
            render: (p) => <span className="font-mono text-xs">{(p.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>,
          },
          {
            key: 'access',
            header: 'ACCESS GATE',
            render: (p) => (
              <AdminStatusBadge
                label={p.accessStatus === 'public' ? 'Public' : 'Admin Only'}
                tone={p.accessStatus === 'public' ? 'emerald' : 'rose'}
              />
            ),
          },
          {
            key: 'actions',
            header: 'ACTIONS',
            align: 'right',
            render: (p) => (
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => toggleAccess(p)}
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg-elevated)] border border-white/[0.08] text-xs font-semibold inline-flex items-center gap-1"
                >
                  {p.accessStatus === 'public' ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  <span>{p.accessStatus === 'public' ? 'Restrict' : 'Make Public'}</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await adminFetch(`/api/admin/pdfs/${p.id}`, { method: 'DELETE' });
                    load();
                  }}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-rose-400"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]}
      />

      <AdminDialog open={uploadOpen} onClose={() => setUploadOpen(false)} title="Attach PDF File">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="text-xs font-semibold block mb-1">Linked book</label>
            <select
              value={form.bookId}
              onChange={(e) => setForm({ ...form, bookId: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            >
              {books.length === 0 ? (
                <option value="">No book volumes created yet</option>
              ) : (
                books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Select PDF file or enter filename</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={form.filename}
                onChange={(e) => setForm({ ...form, filename: e.target.value })}
                placeholder="club-publication.pdf"
                className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs font-mono"
              />
              <label className="px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.1] text-xs cursor-pointer">
                Browse
                <input type="file" accept="application/pdf" onChange={handleFilePick} className="hidden" />
              </label>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Access policy</label>
            <select
              value={form.accessStatus}
              onChange={(e) => setForm({ ...form, accessStatus: e.target.value as 'public' | 'private' })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            >
              <option value="public">Public (readers when book is published)</option>
              <option value="private">Private (admin only)</option>
            </select>
          </div>
          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {uploadError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setUploadOpen(false)} className="px-4 py-2 rounded-xl bg-[var(--bg-elevated)] text-xs font-semibold">
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
            >
              {uploading ? 'Storing in Database...' : 'Upload PDF'}
            </button>
          </div>
        </form>
      </AdminDialog>
    </div>
  );
};

// ============================================================================
// SECTION 19: WEBSITE BRANDING (Faithful to Reference Branding Screenshot)
// ============================================================================
interface BrandingPreset {
  id: string;
  name: string;
  description: string;
  dark: ThemePaletteValues;
  light: ThemePaletteValues;
}

export const WebsiteBrandingSection: React.FC = () => {
  const { applyBranding } = useTheme();
  const [config, setConfig] = useState<WebsiteBrandingConfig | null>(null);
  const [presets, setPresets] = useState<BrandingPreset[]>([]);
  const [editMode, setEditMode] = useState<'dark' | 'light'>('dark');
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  useEffect(() => {
    adminFetch<{ branding: WebsiteBrandingConfig; presets: BrandingPreset[] }>('/api/admin/branding')
      .then((res) => {
        setConfig(res.branding);
        setPresets(res.presets);
      })
      .catch(() => {});
  }, []);

  if (!config) return <PageLoader label="Loading branding studio..." />;

  const selectPreset = (preset: BrandingPreset) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            activePresetId: preset.id,
            dark: { ...preset.dark },
            light: { ...preset.light },
          }
        : prev
    );
  };

  const updatePaletteField = (key: keyof ThemePaletteValues, hex: string) => {
    setConfig((prev) =>
      prev
        ? {
            ...prev,
            [editMode]: {
              ...prev[editMode],
              [key]: hex,
            },
          }
        : prev
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await adminFetch<{ branding: WebsiteBrandingConfig }>('/api/admin/branding', {
        method: 'PUT',
        body: JSON.stringify(config),
      });
      setConfig(res.branding);
      applyBranding(res.branding);
      window.dispatchEvent(new CustomEvent('dodaeona:branding-updated', { detail: { branding: res.branding } }));
      setSavedToast(true);
      setTimeout(() => setSavedToast(false), 2600);
    } finally {
      setSaving(false);
    }
  };

  const currentPalette = config[editMode];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="WEBSITE BRANDING"
        title="BRANDING"
        description="Configure your colour palette, accent highlights, and site crest across both Dark and Light experiences."
        actions={
          <div className="flex items-center gap-2.5">
            {savedToast && (
              <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400">
                <Check className="w-3.5 h-3.5" />
                Saved live
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl bg-[var(--accent-cyan)] hover:brightness-110 text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save branding'}</span>
            </button>
          </div>
        }
      />

      {/* Preset Grid matching Screenshot */}
      <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Theme presets</h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Select a curated Floodlit Archive palette or customize individual colour tokens below.
          </p>
        </div>

        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4 landscape-mobile:gap-3">
          {presets.map((p) => {
            const isSelected = config.activePresetId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => selectPreset(p)}
                className={`text-left rounded-xl p-4 border transition-all flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-[var(--bg-elevated)] border-[var(--accent-cyan)] ring-1 ring-[var(--accent-cyan)]/40'
                    : 'bg-[var(--bg-primary)] border-white/[0.08] light:border-slate-200 hover:border-white/25'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {[p.dark.bgPrimary, p.dark.accentCyan, p.dark.accentCrest, p.light.bgPrimary].map(
                      (swatch, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-white/20 light:border-slate-300"
                          style={{ backgroundColor: swatch }}
                        />
                      )
                    )}
                  </div>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[var(--accent-cyan)] text-[#050A12] flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-[var(--text-primary)]">{p.name}</div>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 leading-relaxed">{p.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fine-tune Dark | Light Palette Card matching Screenshot */}
      <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-5">
        <div className="flex flex-col landscape-mobile:flex-row landscape-mobile:items-center sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-[var(--text-primary)]">
              Fine-tune the {editMode} site
            </h2>
            <p className="text-xs text-[var(--text-muted)]">
              Inspect and override exact hex colour tokens for {editMode} mode.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs font-semibold">
            {(['dark', 'light'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setEditMode(m)}
                className={`px-3.5 py-1.5 rounded-lg capitalize transition-all ${
                  editMode === m
                    ? 'bg-[var(--accent-cyan)] text-[#050A12] light:text-white font-bold'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 landscape-mobile:gap-3">
          {(
            [
              { key: 'bgPrimary', label: 'Page Canvas' },
              { key: 'bgSurface', label: 'Panel Surface' },
              { key: 'bgElevated', label: 'Elevated Card' },
              { key: 'accentCyan', label: 'Primary Accent' },
              { key: 'accentCrest', label: 'Club Crest Gold' },
              { key: 'textPrimary', label: 'Primary Text' },
            ] as const
          ).map((field) => (
            <div
              key={field.key}
              className="rounded-xl bg-[var(--bg-primary)] border border-white/[0.08] light:border-slate-200 p-3.5 flex items-center justify-between gap-3"
            >
              <div>
                <div className="text-xs font-semibold text-[var(--text-primary)]">{field.label}</div>
                <div className="text-[11px] font-mono text-[var(--text-muted)] uppercase mt-0.5">
                  {currentPalette[field.key]}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={currentPalette[field.key]}
                  onChange={(e) => updatePaletteField(field.key, e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-0"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-white/[0.08] light:border-slate-200 grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-4 landscape-mobile:gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1">Control Room Title</label>
            <input
              type="text"
              value={config.siteName}
              onChange={(e) => setConfig({ ...config, siteName: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Sub-label</label>
            <input
              type="text"
              value={config.controlRoomLabel}
              onChange={(e) => setConfig({ ...config, controlRoomLabel: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SECTION 20: HOMEPAGE CONTENT
// ============================================================================
export const HomepageContentSection: React.FC = () => {
  const {
    draftHomepageConfig,
    isDraftDirty,
    updateDraftHomepageConfig,
    publishHomepageChanges,
    discardHomepageDraft,
    toggleSectionVisibility,
  } = useAdmin();
  const [publishing, setPublishing] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    setSaveError(null);
    try {
      await publishHomepageChanges();
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2400);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to permanently save homepage changes to database.');
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="PUBLIC FRONT DOOR"
        title="HOMEPAGE CONTENT"
        description="Edit public hero copy, welcome editorial, pillar gateway cards, newsletter text, and active homepage section visibility."
        actions={
          <div className="flex items-center gap-2">
            {isDraftDirty && (
              <button
                type="button"
                onClick={discardHomepageDraft}
                className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-white/[0.1] text-xs font-semibold"
              >
                Discard draft
              </button>
            )}
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing}
              className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{publishing ? 'Saving to Database...' : savedNotice ? 'Published live' : 'Publish homepage'}</span>
            </button>
          </div>
        }
      />

      {saveError && (
        <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-xs font-semibold text-rose-400">
          {saveError}
        </div>
      )}

      {savedNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs font-semibold text-emerald-400 flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Homepage configuration permanently saved to database and live for all visitors.</span>
        </div>
      )}

      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-6 landscape-mobile:gap-4">
        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-5">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Explore Reads & Match Centre Card Images</h2>

          {(['reads', 'match'] as const).map((cardKind) => {
            const fieldKey = cardKind === 'reads' ? 'readsImage' : 'matchImage';
            const defaultImg =
              cardKind === 'reads' ? OFFICIAL_ASSETS.readsCardCover : OFFICIAL_ASSETS.matchCentreCardVisual;
            const currentImg = resolveAccessCardImageUrl(
              draftHomepageConfig.accessCards?.[fieldKey],
              cardKind
            );
            const isCustom = currentImg !== defaultImg;
            const cardLabel =
              cardKind === 'reads'
                ? 'Explore Reads Card Image (URL or File Upload)'
                : 'Enter Match Centre Card Image (URL or File Upload)';

            return (
              <div
                key={cardKind}
                className="p-3.5 rounded-xl bg-[var(--bg-primary)]/60 border border-white/[0.06] light:border-slate-200 space-y-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold">{cardLabel}</label>
                  {isCustom && (
                    <button
                      type="button"
                      onClick={() =>
                        updateDraftHomepageConfig((prev) => ({
                          ...prev,
                          accessCards: { ...prev.accessCards, [fieldKey]: defaultImg },
                        }))
                      }
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--accent-cyan)] hover:underline"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset Default</span>
                    </button>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  <div className="w-32 aspect-[16/10] rounded-lg overflow-hidden bg-slate-950 border border-white/10 light:border-slate-300 shrink-0">
                    <img
                      src={currentImg}
                      alt={cardLabel}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                  <div className="flex-1 w-full space-y-2">
                    <input
                      type="text"
                      value={currentImg}
                      onChange={(e) =>
                        updateDraftHomepageConfig((prev) => ({
                          ...prev,
                          accessCards: { ...prev.accessCards, [fieldKey]: e.target.value },
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300 text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-white/[0.1] light:border-slate-300 text-xs font-semibold cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Image</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            e.target.value = '';
                            if (!file) return;
                            setSaveError(null);
                            try {
                              const optimizedUrl = await optimizeImageFileToDataUrl(file);
                              updateDraftHomepageConfig((prev) => ({
                                ...prev,
                                accessCards: { ...prev.accessCards, [fieldKey]: optimizedUrl },
                              }));
                            } catch (err: any) {
                              setSaveError(err?.message || 'Failed to process selected image file.');
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[11px] text-[var(--text-muted)]">
                        Auto-optimized for fast live sync
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Active Section Visibility</h2>
          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            {Object.entries(draftHomepageConfig.sections).map(([id, meta]) => (
              <div key={id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-mono uppercase text-[var(--text-secondary)]">Section {id}</span>
                <button
                  type="button"
                  onClick={() => toggleSectionVisibility(id)}
                  className={`px-3 py-1 rounded-lg font-bold ${
                    meta.visible
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-slate-500/15 text-[var(--text-muted)]'
                  }`}
                >
                  {meta.visible ? 'Visible' : 'Hidden'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SECTION 21: ABOUT & LEGAL
// ============================================================================
export const AboutLegalSection: React.FC = () => {
  const [data, setData] = useState<AboutLegalConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    adminFetch<{ aboutLegal: AboutLegalConfig }>('/api/admin/about-legal')
      .then((res) => setData(res.aboutLegal))
      .catch(() => {});
  }, []);

  if (!data) return <PageLoader label="Loading About & Legal editor..." />;

  const handleSave = async (nextStatus?: 'draft' | 'published') => {
    setSaving(true);
    try {
      const payload = nextStatus ? { ...data, status: nextStatus } : data;
      const res = await adminFetch<{ aboutLegal: AboutLegalConfig }>('/api/admin/about-legal', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      setData(res.aboutLegal);
      setSavedNotice(true);
      setTimeout(() => setSavedNotice(false), 2200);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="GOVERNANCE"
        title="ABOUT & LEGAL"
        description="Author and manage About DodaEona F.C., Privacy Policy, and Terms of Use pages."
        actions={
          <div className="flex items-center gap-2">
            <AdminStatusBadge label={data.status} tone={data.status === 'published' ? 'emerald' : 'amber'} />
            <button
              type="button"
              onClick={() => handleSave('draft')}
              className="px-3.5 py-2 rounded-xl bg-[var(--bg-surface)] border border-white/[0.1] text-xs font-semibold"
            >
              Save draft
            </button>
            <button
              type="button"
              onClick={() => handleSave('published')}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider"
            >
              {savedNotice ? 'Published' : 'Publish copy'}
            </button>
          </div>
        }
      />

      <div className="space-y-4">
        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-3">
          <h2 className="text-sm font-bold">About DodaEona F.C.</h2>
          <input
            type="text"
            value={data.aboutTitle}
            onChange={(e) => setData({ ...data, aboutTitle: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs font-semibold"
          />
          <textarea
            rows={3}
            value={data.aboutBody}
            onChange={(e) => setData({ ...data, aboutBody: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
          />
        </div>

        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-4 landscape-mobile:gap-3">
          <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-3">
            <h2 className="text-sm font-bold">Privacy Policy</h2>
            <textarea
              rows={5}
              value={data.privacyBody}
              onChange={(e) => setData({ ...data, privacyBody: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>
          <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-3">
            <h2 className="text-sm font-bold">Terms of Use</h2>
            <textarea
              rows={5}
              value={data.termsBody}
              onChange={(e) => setData({ ...data, termsBody: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SECTION 22: CONTACT INFORMATION (Includes Owner YouTube Footer Link)
// ============================================================================
export const ContactInfoSection: React.FC = () => {
  const { updateFooterYoutubeUrl } = useAdmin();
  const [data, setData] = useState<ContactInfoConfig | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    adminFetch<{ contactInfo: ContactInfoConfig }>('/api/admin/contact-info')
      .then((res) => setData(res.contactInfo))
      .catch(() => {});
  }, []);

  if (!data) return <PageLoader label="Loading contact details..." />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await adminFetch<{ contactInfo: ContactInfoConfig }>('/api/admin/contact-info', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    setData(res.contactInfo);
    updateFooterYoutubeUrl(res.contactInfo.socialYoutube);
    setSaved(true);
    setTimeout(() => setSaved(false), 2400);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="DIRECTORY"
        title="CONTACT INFORMATION"
        description="Update club contact channels, support addresses, and the public Footer YouTube link destination."
      />

      <form
        onSubmit={handleSave}
        className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-4 max-w-3xl"
      >
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 gap-4 landscape-mobile:gap-3">
          <div>
            <label className="text-xs font-semibold block mb-1">Official Owner Email</label>
            <input
              type="email"
              value={data.officialEmail}
              onChange={(e) => setData({ ...data, officialEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Library Support Email</label>
            <input
              type="email"
              value={data.supportEmail}
              onChange={(e) => setData({ ...data, supportEmail: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Footer YouTube Channel URL</label>
            <input
              type="url"
              value={data.socialYoutube}
              onChange={(e) => setData({ ...data, socialYoutube: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>
          <div>
            <label className="text-xs font-semibold block mb-1">Office Hours</label>
            <input
              type="text"
              value={data.officeHours}
              onChange={(e) => setData({ ...data, officeHours: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold block mb-1">Press Note</label>
          <textarea
            rows={2}
            value={data.pressNote}
            onChange={(e) => setData({ ...data, pressNote: e.target.value })}
            className="w-full px-3 py-2 rounded-xl bg-[var(--bg-primary)] border border-white/[0.1] text-xs"
          />
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider"
          >
            Save contact info
          </button>
          {saved && <span className="text-xs font-mono text-emerald-400">Saved & synced to footer</span>}
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// GOOGLE SEARCH CONSOLE OWNERSHIP VERIFICATION UPLOAD
// ============================================================================
const GoogleVerificationSection: React.FC = () => {
  const [fileName, setFileName] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [uploading, setUploading] = useState(false);
  const [successUrl, setSuccessUrl] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileContent(String(ev.target?.result || ''));
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName || !fileContent) {
      setErrorMsg('Please select a valid Google verification HTML file.');
      return;
    }
    setUploading(true);
    setErrorMsg(null);
    setSuccessUrl(null);
    try {
      const res = await adminFetch<{ ok: boolean; url: string }>('/api/admin/upload-verification', {
        method: 'POST',
        body: JSON.stringify({ filename: fileName, content: fileContent }),
      });
      const fullUrl = `${window.location.origin}${res.url}`;
      setSuccessUrl(fullUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to upload verification file.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Upload className="w-4 h-4 text-[var(--accent-cyan)]" />
        <h2 className="text-sm font-bold text-[var(--text-primary)]">Google Search Console Ownership Verification</h2>
      </div>
      <p className="text-xs text-[var(--text-muted)]">
        Upload your downloaded Google Search Console HTML verification file (e.g., <span className="font-mono text-[var(--text-primary)]">googlebbdb5656da73b3cc.html</span>). It will be placed automatically in the website root directory and made publicly accessible.
      </p>

      {successUrl && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 light:text-emerald-700 space-y-2">
          <div className="text-xs font-bold flex items-center gap-1.5">
            <Check className="w-4 h-4" />
            <span>Verification file successfully uploaded to website root!</span>
          </div>
          <div className="text-xs">
            Exact Public Verification URL:{' '}
            <a href={successUrl} target="_blank" rel="noreferrer" className="font-mono underline text-[var(--accent-cyan)] hover:opacity-80">
              {successUrl}
            </a>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 light:text-rose-700 text-xs">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className="text-xs font-semibold block mb-1">Select HTML Verification File</label>
          <input
            type="file"
            accept=".html"
            onChange={handleFileUpload}
            className="w-full text-xs text-[var(--text-muted)] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[var(--accent-cyan)] file:text-[#050A12] hover:file:opacity-90 cursor-pointer"
          />
        </div>
        {fileName && (
          <div className="text-xs font-mono text-[var(--text-muted)]">
            Selected: <span className="text-[var(--text-primary)]">{fileName}</span> ({fileContent.length} bytes)
          </div>
        )}
        <button
          type="submit"
          disabled={uploading || !fileContent}
          className="px-5 py-2.5 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {uploading ? 'Uploading to Root...' : 'Upload Verification File'}
        </button>
      </form>
    </div>
  );
};

// ============================================================================
// SECTION 23: DATA & RESET (Guarded Owner-only Export & Multi-Step Reset)
// ============================================================================
export const DataResetSection: React.FC = () => {
  const [confirmScope, setConfirmScope] = useState<'analytics' | 'simulation' | 'full' | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleReset = async () => {
    if (!confirmScope) return;
    setErrorMsg(null);
    setStatusMsg(null);
    try {
      const res = await adminFetch<{ ok: boolean; message: string }>('/api/admin/reset', {
        method: 'POST',
        body: JSON.stringify({ scope: confirmScope, confirmationPhrase: 'RESET DODAEONA' }),
      });
      setStatusMsg(res.message);
      setConfirmScope(null);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Reset failed.');
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="OWNER SAFEGUARDS"
        title="DATA & RESET"
        description="Download full JSON or CSV archives of the DodaEona F.C. platform or execute verified resets with mandatory audit logging."
      />

      {statusMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 light:text-emerald-700 text-xs">
          {statusMsg}
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 light:text-rose-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Google Search Console Verification */}
      <GoogleVerificationSection />

      {/* Export Cards */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-4 landscape-mobile:gap-3">
        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Export Full Database Snapshot (JSON)</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Downloads sanitized accounts, simulation fixtures, PDF editions, announcements, and branding config.
          </p>
          <a
            href="/api/admin/export?format=json"
            download="dodaeona-backup.json"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--accent-cyan)] text-[#050A12] light:text-white text-xs font-bold uppercase tracking-wider"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON archive</span>
          </a>
        </div>

        <div className="rounded-xl bg-[var(--bg-surface)] border border-white/[0.08] light:border-slate-200 p-6 space-y-3">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Export Directory Summary (CSV)</h2>
          <p className="text-xs text-[var(--text-muted)]">
            Downloads registered accounts and PDF permission index in spreadsheet CSV format.
          </p>
          <a
            href="/api/admin/export?format=csv"
            download="dodaeona-export.csv"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-elevated)] border border-white/[0.12] light:border-slate-300 text-xs font-bold uppercase tracking-wider"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download CSV report</span>
          </a>
        </div>
      </div>

      {/* Guarded Reset Scopes */}
      <div className="rounded-xl bg-[var(--bg-surface)] border border-rose-500/25 p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-400">
          <ShieldAlert className="w-4 h-4" />
          <h2 className="text-sm font-bold">Protected Reset Scopes</h2>
        </div>
        <p className="text-xs text-[var(--text-muted)]">
          Resets never execute automatically. Each scope requires explicit confirmation by typing{' '}
          <span className="font-mono text-[var(--text-primary)]">RESET DODAEONA</span>.
        </p>

        <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 sm:grid-cols-3 gap-3">
          {(
            [
              { scope: 'analytics', label: 'Clear Analytics Events', desc: 'Resets view/read/download logs.' },
              { scope: 'simulation', label: 'Reset Simulation Overrides', desc: 'Restores seed fixtures & squad overrides.' },
              { scope: 'full', label: 'Full Control Room Reset', desc: 'Restores seed data (keeps your session).' },
            ] as const
          ).map((item) => (
            <button
              key={item.scope}
              type="button"
              onClick={() => setConfirmScope(item.scope)}
              className="text-left rounded-xl p-4 bg-[var(--bg-primary)] border border-rose-500/25 hover:border-rose-500/60 transition-all space-y-1.5"
            >
              <div className="flex items-center gap-1.5 text-xs font-bold text-rose-400">
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)]">{item.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <AdminConfirmDialog
        open={Boolean(confirmScope)}
        onClose={() => setConfirmScope(null)}
        onConfirm={handleReset}
        requirePhrase="RESET DODAEONA"
        title={`Authorize "${confirmScope}" reset?`}
        message={`This irreversible owner action will reset the "${confirmScope}" dataset and record an audit entry.`}
        confirmLabel="Execute verified reset"
      />
    </div>
  );
};
