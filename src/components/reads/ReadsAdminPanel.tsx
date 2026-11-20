import React, { useState } from 'react';
import { X, Plus, Edit, Trash2, Eye, EyeOff, Download, Upload, ShieldCheck, Check, Sparkles, BookOpen, Layers } from 'lucide-react';
import { useReads } from '../../context/ReadsContext';
import { ReadingSeriesItem, BookVolume, ReadsCategory } from '../../types/reads';
import { OFFICIAL_ASSETS } from '../../data/mockData';

interface ReadsAdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const CATEGORIES: ReadsCategory[] = [
  'Football Tactics and Strategy',
  'Football History and Culture',
  'Youth Academy and Player Development',
  'Competitions and Tournaments',
  'Players and Legends',
  'Football Rules and Regulations',
  'Activities and Challenges',
];

export const ReadsAdminPanel: React.FC<ReadsAdminPanelProps> = ({ isOpen, onClose }) => {
  const {
    series,
    books,
    createSeries,
    updateSeries,
    deleteSeries,
    createBook,
    updateBook,
    deleteBook,
    toggleBookPublish,
    toggleBookDownload,
    userSession,
  } = useReads();

  const [activeTab, setActiveTab] = useState<'books' | 'series' | 'new-book' | 'new-series'>('books');
  const [successMsg, setSuccessMsg] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form states for New / Edit Series
  const [seriesForm, setSeriesForm] = useState<Partial<ReadingSeriesItem>>({
    seriesNumber: (series.length || 0) + 1,
    title: '',
    subtitle: '',
    description: '',
    category: 'Football Tactics and Strategy',
    coverUrl: OFFICIAL_ASSETS.seriesTactics,
    published: true,
    featured: false,
    volumeCount: 0,
    slug: '',
  });

  // Form states for New / Edit Book
  const [bookForm, setBookForm] = useState<Partial<BookVolume>>({
    seriesId: series[0]?.id || '',
    volumeNumber: 1,
    title: '',
    subtitle: '',
    description: '',
    category: 'Football Tactics and Strategy',
    author: 'DodaEona Editorial Team',
    pageCount: 150,
    readTimeMinutes: 40,
    coverUrl: OFFICIAL_ASSETS.seriesTactics,
    publishedDate: 'November 2026',
    published: true,
    downloadEnabled: true,
    pdfUrl: '',
    chapters: [],
  });

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleCreateSeriesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!seriesForm.title) return;

    createSeries({
      seriesNumber: Number(seriesForm.seriesNumber) || series.length + 1,
      title: seriesForm.title,
      subtitle: seriesForm.subtitle || '',
      description: seriesForm.description || '',
      category: seriesForm.category as ReadsCategory,
      coverUrl: seriesForm.coverUrl || OFFICIAL_ASSETS.seriesTactics,
      published: seriesForm.published ?? true,
      featured: seriesForm.featured ?? false,
      volumeCount: 0,
      slug: seriesForm.title.toLowerCase().replace(/\s+/g, '-'),
    });

    showNotification('New reading series successfully published to Reads database!');
    setActiveTab('series');
  };

  const handleCreateBookSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookForm.title || !bookForm.seriesId) return;

    const parentSeries = series.find((s) => s.id === bookForm.seriesId);

    createBook({
      seriesId: bookForm.seriesId,
      seriesTitle: parentSeries?.title || 'DodaEona Series',
      volumeNumber: Number(bookForm.volumeNumber) || 1,
      title: bookForm.title,
      subtitle: bookForm.subtitle || '',
      description: bookForm.description || '',
      category: (bookForm.category as ReadsCategory) || parentSeries?.category || 'Football Tactics and Strategy',
      author: bookForm.author || 'DodaEona Technical Board',
      pageCount: Number(bookForm.pageCount) || 120,
      readTimeMinutes: Number(bookForm.readTimeMinutes) || 30,
      coverUrl: bookForm.coverUrl || OFFICIAL_ASSETS.seriesTactics,
      publishedDate: bookForm.publishedDate || 'November 2026',
      published: bookForm.published ?? true,
      featured: bookForm.featured ?? false,
      downloadEnabled: bookForm.downloadEnabled ?? true,
      pdfUrl: bookForm.pdfUrl || '',
      chapters: bookForm.chapters || [],
      slug: bookForm.title.toLowerCase().replace(/\s+/g, '-'),
    });

    showNotification('New volume published and synchronized with Reads catalog!');
    setActiveTab('books');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 landscape-mobile:p-3 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[#030a1c] light:bg-white border border-amber-400/30 light:border-slate-300 rounded-2xl w-full max-w-4xl max-h-[calc(100dvh-1.5rem)] overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.85)] flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 landscape-mobile:p-3.5 border-b border-white/[0.08] light:border-slate-200 bg-[#020512] light:bg-slate-50 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 landscape-mobile:p-2 rounded-xl bg-amber-400 text-slate-950 font-black shadow-md">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg landscape-mobile:text-base font-black text-white light:text-slate-900 uppercase tracking-tight">
                  Reads Content Management Hub
                </h2>
                <span className="px-2 py-0.5 rounded bg-blue-950 light:bg-blue-100 border border-blue-400/40 light:border-blue-300 text-[10px] font-bold text-blue-300 light:text-blue-900 uppercase">
                  {userSession.role === 'admin' ? 'Owner / Admin' : 'Reader'}
                </span>
              </div>
              <p className="text-xs text-slate-400 light:text-slate-600">
                Exclusive publisher portal for series, volumes, covers, and PDF permissions.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 hover:bg-white/[0.06] light:hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 landscape-mobile:px-4 pt-3 pb-2 border-b border-white/[0.08] light:border-slate-200 bg-[#020617] light:bg-slate-100 overflow-x-auto text-xs font-bold uppercase tracking-wider shrink-0">
          <button
            onClick={() => setActiveTab('books')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'books' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Manage Volumes ({books.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('series')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'series' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Manage Series ({series.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('new-book')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'new-book' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add New Book / Volume</span>
          </button>

          <button
            onClick={() => setActiveTab('new-series')}
            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'new-series' ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create New Series</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-emerald-950/80 light:bg-emerald-50 border border-emerald-700 light:border-emerald-300 text-emerald-300 light:text-emerald-800 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 light:text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tab Contents */}
        <div className="p-6 landscape-mobile:p-4 flex-1 overflow-y-auto">
          
          {/* TAB 1: MANAGE VOLUMES */}
          {activeTab === 'books' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] light:border-slate-200">
                <span className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider">
                  All Published & Draft Volumes
                </span>
                <button
                  onClick={() => setActiveTab('new-book')}
                  className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Upload Publication</span>
                </button>
              </div>

              <div className="space-y-3">
                {books.length === 0 && (
                  <div className="p-6 rounded-xl bg-[#040e24] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 text-center text-xs text-slate-400 light:text-slate-600">
                    No book volumes have been created yet. Use &quot;Upload Publication&quot; to add your first volume.
                  </div>
                )}
                {books.map((b) => (
                  <div
                    key={b.id}
                    className="p-4 rounded-xl bg-[#040e24] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={b.coverUrl}
                        alt={b.title}
                        className="w-12 h-16 object-contain rounded bg-slate-950 light:bg-slate-200 shrink-0 shadow"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-amber-400 light:text-amber-700 uppercase tracking-wider">
                            {b.seriesTitle} · Vol. {b.volumeNumber}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            b.published ? 'bg-emerald-950 light:bg-emerald-100 text-emerald-400 light:text-emerald-800 border border-emerald-800 light:border-emerald-300' : 'bg-rose-950 light:bg-rose-100 text-rose-400 light:text-rose-800 border border-rose-800 light:border-rose-300'
                          }`}>
                            {b.published ? 'Published' : 'Draft / Hidden'}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white light:text-slate-900 truncate max-w-md">{b.title}</h4>
                        <span className="text-xs text-slate-400 light:text-slate-600">
                          {b.pageCount} pages · PDF: {b.downloadEnabled ? 'Enabled' : 'Restricted'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      {/* Toggle Publish */}
                      <button
                        onClick={() => {
                          toggleBookPublish(b.id);
                          showNotification(`Toggled publication status for "${b.title}"`);
                        }}
                        title={b.published ? 'Unpublish (hide from visitors)' : 'Publish (make visible to visitors)'}
                        className={`p-2 rounded-lg border text-xs font-bold transition-colors ${
                          b.published
                            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400 hover:bg-emerald-900/60'
                            : 'bg-slate-900 border-white/[0.1] text-slate-400 hover:text-white'
                        }`}
                      >
                        {b.published ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>

                      {/* Toggle Download */}
                      <button
                        onClick={() => {
                          toggleBookDownload(b.id);
                          showNotification(`Toggled download permission for "${b.title}"`);
                        }}
                        title={b.downloadEnabled ? 'Disable PDF Downloads' : 'Enable PDF Downloads'}
                        className={`p-2 rounded-lg border text-xs font-bold transition-colors ${
                          b.downloadEnabled
                            ? 'bg-blue-950/60 border-blue-800 text-blue-400 hover:bg-blue-900/60'
                            : 'bg-slate-900 border-white/[0.1] text-slate-500 hover:text-slate-300'
                        }`}
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      {confirmDeleteId === b.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              deleteBook(b.id);
                              setConfirmDeleteId(null);
                              showNotification('Publication removed from database.');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 text-[10px] font-bold uppercase tracking-wider hover:bg-white/[0.1]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(b.id)}
                          title="Delete Book"
                          className="p-2 rounded-lg border border-rose-900/40 bg-rose-950/40 text-rose-400 hover:bg-rose-900/60 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: MANAGE SERIES */}
          {activeTab === 'series' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] light:border-slate-200">
                <span className="text-xs font-bold text-slate-400 light:text-slate-600 uppercase tracking-wider">
                  All Educational Series
                </span>
                <button
                  onClick={() => setActiveTab('new-series')}
                  className="px-3 py-1.5 rounded bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Series</span>
                </button>
              </div>

              <div className="space-y-3">
                {series.length === 0 && (
                  <div className="p-6 rounded-xl bg-[#040e24] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 text-center text-xs text-slate-400 light:text-slate-600">
                    No reading series have been created yet. Use &quot;Create Series&quot; to start a series.
                  </div>
                )}
                {series.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-[#040e24] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <img
                        src={s.coverUrl}
                        alt={s.title}
                        className="w-12 h-16 object-contain rounded bg-slate-950 light:bg-slate-200 shrink-0 shadow"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-amber-400 light:text-amber-700 uppercase tracking-wider">
                          Series #{s.seriesNumber} · {s.category}
                        </span>
                        <h4 className="text-sm font-bold text-white light:text-slate-900 truncate">{s.title}</h4>
                        <span className="text-xs text-slate-400 light:text-slate-600 block truncate">
                          {s.volumeCount} volumes linked
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {confirmDeleteId === s.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              deleteSeries(s.id);
                              setConfirmDeleteId(null);
                              showNotification('Series and linked volumes removed.');
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 rounded-lg bg-white/[0.06] light:bg-slate-200 text-slate-300 light:text-slate-700 text-[10px] font-bold uppercase tracking-wider hover:bg-white/[0.1] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(s.id)}
                          title="Delete Series & Linked Volumes"
                          className="p-2 rounded-lg border border-rose-900/40 light:border-rose-300 bg-rose-950/40 light:bg-rose-50 text-rose-400 light:text-rose-700 hover:bg-rose-900/60 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ADD NEW BOOK / VOLUME */}
          {activeTab === 'new-book' && (
            <form onSubmit={handleCreateBookSubmit} className="space-y-4">
              <div className="p-3 bg-blue-950/40 light:bg-blue-50 border border-blue-800/40 light:border-blue-200 rounded-xl text-xs text-blue-200 light:text-blue-900">
                Add an official book or volume to any existing series. Upon publishing, it will immediately appear on the Reads main page.
              </div>

              <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 gap-4 landscape-mobile:gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Select Parent Series *
                  </label>
                  <select
                    value={bookForm.seriesId}
                    onChange={(e) => setBookForm({ ...bookForm, seriesId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                    required
                  >
                    {series.length === 0 ? (
                      <option value="">No series available — create a series first</option>
                    ) : (
                      series.map((s) => (
                        <option key={s.id} value={s.id}>
                          Series #{s.seriesNumber}: {s.title}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Volume Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={bookForm.volumeNumber}
                    onChange={(e) => setBookForm({ ...bookForm, volumeNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Book Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Masterclass in High-Press Transitions"
                  value={bookForm.title}
                  onChange={(e) => setBookForm({ ...bookForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Structural Blueprint for Counter-Attacking Speed"
                  value={bookForm.subtitle}
                  onChange={(e) => setBookForm({ ...bookForm, subtitle: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Comprehensive description of the tactical themes covered in this volume..."
                  value={bookForm.description}
                  onChange={(e) => setBookForm({ ...bookForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 sm:grid-cols-3 gap-4 landscape-mobile:gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Category
                  </label>
                  <select
                    value={bookForm.category}
                    onChange={(e) => setBookForm({ ...bookForm, category: e.target.value as ReadsCategory })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Page Count
                  </label>
                  <input
                    type="number"
                    value={bookForm.pageCount}
                    onChange={(e) => setBookForm({ ...bookForm, pageCount: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Reading Time (Minutes)
                  </label>
                  <input
                    type="number"
                    value={bookForm.readTimeMinutes}
                    onChange={(e) => setBookForm({ ...bookForm, readTimeMinutes: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Cover selection & Custom Image Page / Upload */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Cover Artwork Template, Custom URL, or Upload Image Page
                </label>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setBookForm({ ...bookForm, coverUrl: OFFICIAL_ASSETS.seriesTactics })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer ${
                      bookForm.coverUrl === OFFICIAL_ASSETS.seriesTactics ? 'border-amber-400 bg-amber-400/10' : 'border-white/[0.1] light:border-slate-300 bg-transparent'
                    }`}
                  >
                    <img src={OFFICIAL_ASSETS.seriesTactics} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = OFFICIAL_ASSETS.seriesTactics; }} className="w-8 h-10 object-contain rounded" />
                    <span className="text-[10px] text-white light:text-slate-900">Tactics Navy Cover</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookForm({ ...bookForm, coverUrl: OFFICIAL_ASSETS.seriesLegends })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer ${
                      bookForm.coverUrl === OFFICIAL_ASSETS.seriesLegends ? 'border-amber-400 bg-amber-400/10' : 'border-white/[0.1] light:border-slate-300 bg-transparent'
                    }`}
                  >
                    <img src={OFFICIAL_ASSETS.seriesLegends} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = OFFICIAL_ASSETS.seriesTactics; }} className="w-8 h-10 object-contain rounded" />
                    <span className="text-[10px] text-white light:text-slate-900">Champions Gold Cover</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBookForm({ ...bookForm, coverUrl: OFFICIAL_ASSETS.seriesAcademy })}
                    className={`p-2 rounded-lg border text-left flex items-center gap-2 cursor-pointer ${
                      bookForm.coverUrl === OFFICIAL_ASSETS.seriesAcademy ? 'border-amber-400 bg-amber-400/10' : 'border-white/[0.1] light:border-slate-300 bg-transparent'
                    }`}
                  >
                    <img src={OFFICIAL_ASSETS.seriesAcademy} onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = OFFICIAL_ASSETS.seriesTactics; }} className="w-8 h-10 object-contain rounded" />
                    <span className="text-[10px] text-white light:text-slate-900">Academy Royal Cover</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Custom Image URL / Path</label>
                    <input
                      type="text"
                      placeholder="https://... or /assets/..."
                      value={bookForm.coverUrl || ''}
                      onChange={(e) => setBookForm({ ...bookForm, coverUrl: e.target.value })}
                      className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Upload Custom Cover Image File</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (uploadEvt) => {
                            if (uploadEvt.target?.result) {
                              setBookForm({ ...bookForm, coverUrl: uploadEvt.target.result as string });
                              showNotification('Custom cover image loaded successfully!');
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-400 file:text-slate-950 hover:file:bg-amber-300 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* PDF Settings */}
              <div className="p-4 rounded-xl bg-slate-950 light:bg-slate-50 border border-white/[0.08] light:border-slate-200 space-y-3">
                <span className="text-xs font-bold text-amber-400 light:text-amber-700 uppercase tracking-widest block">
                  PDF & Download Security Controls
                </span>

                <div>
                  <label className="block text-[11px] text-slate-300 light:text-slate-700 mb-1">
                    PDF Document File URL / Path
                  </label>
                  <input
                    type="text"
                    value={bookForm.pdfUrl}
                    onChange={(e) => setBookForm({ ...bookForm, pdfUrl: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 light:bg-white border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900"
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable-download-chk"
                      checked={bookForm.downloadEnabled}
                      onChange={(e) => setBookForm({ ...bookForm, downloadEnabled: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-400"
                    />
                    <label htmlFor="enable-download-chk" className="text-xs text-slate-200 light:text-slate-700">
                      Enable visitor PDF downloads for this title
                    </label>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="publish-now-chk"
                      checked={bookForm.published}
                      onChange={(e) => setBookForm({ ...bookForm, published: e.target.checked })}
                      className="w-4 h-4 rounded text-amber-400"
                    />
                    <label htmlFor="publish-now-chk" className="text-xs font-bold text-emerald-400 light:text-emerald-700">
                      Publish immediately
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('books')}
                  className="px-4 py-2 rounded-lg bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-900 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold uppercase tracking-wider shadow cursor-pointer"
                >
                  Publish Volume
                </button>
              </div>
            </form>
          )}

          {/* TAB 4: CREATE NEW SERIES */}
          {activeTab === 'new-series' && (
            <form onSubmit={handleCreateSeriesSubmit} className="space-y-4">
              <div className="p-3 bg-blue-950/40 light:bg-blue-50 border border-blue-800/40 light:border-blue-200 rounded-xl text-xs text-blue-200 light:text-blue-900">
                Define a new thematic series to house upcoming book volumes.
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Series Number *
                  </label>
                  <input
                    type="number"
                    value={seriesForm.seriesNumber}
                    onChange={(e) => setSeriesForm({ ...seriesForm, seriesNumber: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                    Category *
                  </label>
                  <select
                    value={seriesForm.category}
                    onChange={(e) => setSeriesForm({ ...seriesForm, category: e.target.value as ReadsCategory })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Series Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Total Football: The Tactical Masterminds"
                  value={seriesForm.title}
                  onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900"
                  required
                />
              </div>

              {/* Series Cover Image URL & File Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Series Cover Image URL / Path</label>
                  <input
                    type="text"
                    placeholder="https://... or /assets/..."
                    value={seriesForm.coverUrl || ''}
                    onChange={(e) => setSeriesForm({ ...seriesForm, coverUrl: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Upload Series Cover Image File</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (uploadEvt) => {
                          if (uploadEvt.target?.result) {
                            setSeriesForm({ ...seriesForm, coverUrl: uploadEvt.target.result as string });
                            showNotification('Series cover image uploaded successfully!');
                          }
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="w-full text-xs text-slate-300 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-amber-400 file:text-slate-950 hover:file:bg-amber-300 cursor-pointer"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 light:text-slate-700 mb-1">
                  Series Description *
                </label>
                <textarea
                  rows={3}
                  value={seriesForm.description}
                  onChange={(e) => setSeriesForm({ ...seriesForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-950 light:bg-slate-50 border border-slate-700 light:border-slate-300 rounded-lg text-xs text-white light:text-slate-900"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('series')}
                  className="px-4 py-2 rounded-lg bg-slate-800 light:bg-slate-200 text-slate-300 light:text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-extrabold uppercase tracking-wider shadow cursor-pointer"
                >
                  Create Series
                </button>
              </div>
            </form>
          )}

        </div>

      </div>
    </div>
  );
};
