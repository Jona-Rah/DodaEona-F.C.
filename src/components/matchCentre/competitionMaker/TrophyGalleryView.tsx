import React, { useDeferredValue, useMemo, useState } from 'react';
import {
  Award,
  Crown,
  ExternalLink,
  ImagePlus,
  Lock,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  X,
} from 'lucide-react';
import type {
  TrophyCategory,
  TrophyDesignConfig,
  TrophyDisplayStyle,
  TrophyMaterial,
  TrophyPrestigeTier,
  TrophySilhouette,
} from '../../../types/competitionMaker';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { useAuth } from '../../../context/AuthContext';
import { TROPHY_CATEGORIES } from '../../../utils/competitionEngine';
import { AI_TROPHY_PORTRAIT_OPTIONS, TrophyArtwork } from './TrophyArtwork';
import { normalizeDatabaseSearchText } from '../../../utils/globalDatabaseSearch';

interface TrophyGalleryViewProps {
  initialSubTab?: 'trophies' | 'hall-of-fame';
  onSelectTrophyForNewCompetition?: (trophy: TrophyDesignConfig) => void;
  compactHeader?: boolean;
}

const SILHOUETTES: Array<{ id: TrophySilhouette; label: string }> = [
  { id: 'amphora', label: 'Amphora' },
  { id: 'globe', label: 'World Globe' },
  { id: 'crown', label: 'Crown Cup' },
  { id: 'shield', label: 'Shield Plate' },
  { id: 'chalice', label: 'Chalice' },
  { id: 'obelisk', label: 'Obelisk' },
  { id: 'plate', label: 'Championship Plate' },
  { id: 'medal', label: 'Medal' },
];

const MATERIALS: Array<{ id: TrophyMaterial; label: string }> = [
  { id: 'gold', label: '24k Gold' },
  { id: 'silver', label: 'Sterling Silver' },
  { id: 'platinum', label: 'Platinum' },
  { id: 'rose-gold', label: 'Rose Gold' },
  { id: 'obsidian-gold', label: 'Obsidian Gold' },
  { id: 'crystal', label: 'Crystal' },
  { id: 'metal', label: 'Brushed Metal' },
];

const PRESTIGE_TIERS: TrophyPrestigeTier[] = ['Legendary', 'Major', 'Domestic', 'Invitational'];

export const TrophyGalleryView: React.FC<TrophyGalleryViewProps> = ({
  initialSubTab = 'trophies',
  onSelectTrophyForNewCompetition,
  compactHeader = false,
}) => {
  const {
    competitionTrophies,
    competitionMakers,
    hallOfFame,
    openTeamById,
    saveCustomTrophyDesign,
    deleteTrophyDesign,
  } = useMatchCentre();
  const { isAdmin } = useAuth();

  const [subTab, setSubTab] = useState<'trophies' | 'hall-of-fame'>(initialSubTab);
  const [categoryFilter, setCategoryFilter] = useState<'all' | TrophyCategory>('all');
  const [styleFilter, setStyleFilter] = useState<'all' | TrophyDisplayStyle>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Admin Add / Edit Trophy Modal State
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingTrophyId, setEditingTrophyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [draftTrophy, setDraftTrophy] = useState<TrophyDesignConfig>(() => ({
    id: `trophy-custom-${Date.now()}`,
    name: 'Imperial Champions Cup',
    category: 'Continental',
    displayStyle: 'silver',
    engraving: 'CHAMPIONS OF EUROPE',
    silhouette: 'amphora',
    material: 'silver',
    primaryColor: '#E2E8F0',
    accentColor: '#38BDF8',
    prestigeTier: 'Legendary',
    imageUrl: AI_TROPHY_PORTRAIT_OPTIONS[0].url,
    isCustom: true,
  }));

  const openAddTrophyModal = () => {
    setEditingTrophyId(null);
    setDraftTrophy({
      id: `trophy-custom-${Date.now()}`,
      name: 'New Championship Trophy',
      category: 'Other',
      displayStyle: 'gold',
      engraving: 'OFFICIAL CHAMPIONS',
      silhouette: 'chalice',
      material: 'gold',
      primaryColor: '#F59E0B',
      accentColor: '#7ADBF0',
      prestigeTier: 'Major',
      imageUrl: AI_TROPHY_PORTRAIT_OPTIONS[0].url,
      isCustom: true,
    });
    setEditorOpen(true);
  };

  const openEditTrophyModal = (target: TrophyDesignConfig) => {
    setEditingTrophyId(target.id);
    setDraftTrophy({
      ...target,
      category: target.category || 'Other',
      displayStyle:
        target.displayStyle ||
        (target.material === 'silver' || target.material === 'platinum'
          ? 'silver'
          : target.material === 'crystal'
          ? 'crystal'
          : target.material === 'metal'
          ? 'metal'
          : 'gold'),
    });
    setEditorOpen(true);
  };

  const handleSaveTrophy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftTrophy.name.trim()) return;
    setSaving(true);
    await saveCustomTrophyDesign(draftTrophy);
    setSaving(false);
    setEditorOpen(false);
  };

  const handleUploadCustomTrophyImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraftTrophy((prev) => ({ ...prev, imageUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const filteredTrophies = useMemo(() => {
    const q = normalizeDatabaseSearchText(deferredSearchQuery);
    return competitionTrophies.filter((tr) => {
      if (categoryFilter !== 'all' && (tr.category || 'Other') !== categoryFilter) {
        return false;
      }
      if (styleFilter !== 'all') {
        const resolvedStyle: TrophyDisplayStyle =
          tr.displayStyle ||
          (tr.material === 'crystal'
            ? 'crystal'
            : tr.material === 'metal'
            ? 'metal'
            : tr.silhouette === 'medal'
            ? 'medal'
            : tr.material === 'silver' || tr.material === 'platinum'
            ? 'silver'
            : 'gold');
        if (resolvedStyle !== styleFilter) return false;
      }
      if (!q) return true;
      return (
        normalizeDatabaseSearchText(tr.name).includes(q) ||
        normalizeDatabaseSearchText(tr.engraving).includes(q) ||
        normalizeDatabaseSearchText(tr.category).includes(q) ||
        normalizeDatabaseSearchText(tr.prestigeTier).includes(q)
      );
    });
  }, [competitionTrophies, categoryFilter, styleFilter, deferredSearchQuery]);

  // Map trophy ID -> list of winning clubs across user tournaments & Hall of Fame
  const winnersByTrophyId = useMemo(() => {
    const map = new Map<
      string,
      Array<{ teamId: string; teamName: string; season: string; competitionName: string }>
    >();

    for (const comp of competitionMakers) {
      if (comp.status === 'completed' && comp.champion && comp.trophy?.id) {
        const list = map.get(comp.trophy.id) || [];
        if (
          !list.some(
            (w) => w.teamId === comp.champion!.teamId && w.competitionName === comp.name && w.season === comp.season
          )
        ) {
          list.push({
            teamId: comp.champion.teamId,
            teamName: comp.champion.teamName,
            season: comp.season,
            competitionName: comp.name,
          });
        }
        map.set(comp.trophy.id, list);
      }
    }

    for (const entry of hallOfFame) {
      const tid = entry.trophy?.id;
      if (!tid) continue;
      const list = map.get(tid) || [];
      if (
        !list.some(
          (w) =>
            w.teamId === entry.championTeamId &&
            w.competitionName === entry.competitionName &&
            w.season === entry.season
        )
      ) {
        list.push({
          teamId: entry.championTeamId,
          teamName: entry.championName,
          season: entry.season,
          competitionName: entry.competitionName,
        });
      }
      map.set(tid, list);
    }

    return map;
  }, [competitionMakers, hallOfFame]);

  return (
    <div className="space-y-5">
      {/* Top Control & Sub-View Bar */}
      <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {!compactHeader ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/35 flex items-center justify-center text-amber-400">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-display text-xl sm:text-2xl tracking-wide uppercase text-white light:text-slate-950">
                  Trophy Gallery &amp; Silverware Vault
                </h2>
                <p className="text-xs text-slate-400 light:text-slate-600">
                  All official and custom trophies available when building tournaments. Trophies won by any team are automatically added to that club&apos;s Trophy Cabinet.
                </p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 light:text-slate-600">
              Select any trophy below to launch a tournament, or manage gallery designs as an admin.
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSubTab('trophies')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
                subTab === 'trophies'
                  ? 'bg-amber-400 text-slate-950'
                  : 'border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-100 text-slate-300 light:text-slate-700'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Trophy Showcase ({competitionTrophies.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setSubTab('hall-of-fame')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 transition-colors ${
                subTab === 'hall-of-fame'
                  ? 'bg-amber-400 text-slate-950'
                  : 'border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-100 text-slate-300 light:text-slate-700'
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Champions Hall of Fame ({hallOfFame.length})</span>
            </button>

            {isAdmin ? (
              <button
                type="button"
                onClick={openAddTrophyModal}
                className="px-4 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#9BE6F6] text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Trophy</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-white/10 bg-[#050A12] text-[11px] text-slate-400">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>Admin required to add/edit/remove</span>
              </span>
            )}
          </div>
        </div>

        {subTab === 'trophies' && (
          <div className="pt-3 border-t border-white/[0.07] light:border-slate-200 flex flex-wrap items-center justify-between gap-3">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCategoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider cursor-pointer ${
                  categoryFilter === 'all'
                    ? 'bg-amber-400/20 border border-amber-400/60 text-amber-300 light:bg-amber-100 light:text-amber-900 font-bold'
                    : 'border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-400 light:text-slate-600'
                }`}
              >
                All Categories
              </button>
              {TROPHY_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[10px] uppercase tracking-wider cursor-pointer ${
                    categoryFilter === cat
                      ? 'bg-amber-400/20 border border-amber-400/60 text-amber-300 light:bg-amber-100 light:text-amber-900 font-bold'
                      : 'border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-400 light:text-slate-600'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Style Filter & Search */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={styleFilter}
                onChange={(e) => setStyleFilter(e.target.value as 'all' | TrophyDisplayStyle)}
                className="rounded-xl border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-2.5 py-1.5 text-xs text-white light:text-slate-900"
              >
                <option value="all">All Finishes</option>
                <option value="gold">24k Gold</option>
                <option value="silver">Sterling Silver</option>
                <option value="crystal">Crystal</option>
                <option value="metal">Brushed Metal</option>
                <option value="medal">Commemorative Medal</option>
              </select>

              <div className="relative min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search trophies..."
                  className="w-full rounded-xl border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 pl-8 pr-7 py-1.5 text-xs text-white light:text-slate-900 focus:outline-none focus:border-amber-400"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="p-0.5 text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                    aria-label="Clear trophy search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content: Trophy Cards Grid OR Hall of Fame */}
      {subTab === 'trophies' ? (
        filteredTrophies.length === 0 ? (
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-12 text-center space-y-3">
            <Trophy className="w-8 h-8 text-amber-400/60 mx-auto" />
            <div className="text-sm font-bold text-white light:text-slate-950">
              No trophies match the current filter
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={openAddTrophyModal}
                className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add New Trophy</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTrophies.map((tr) => {
              const winners = winnersByTrophyId.get(tr.id) || [];
              const usedInCount = competitionMakers.filter((c) => c.trophy?.id === tr.id).length;

              return (
                <div
                  key={tr.id}
                  className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 flex flex-col justify-between gap-4 hover:border-amber-400/40 transition-all shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex items-start gap-4">
                      <div className="rounded-2xl bg-[#040912] light:bg-slate-100 border border-amber-400/25 p-2 shrink-0">
                        <TrophyArtwork trophy={tr} size="lg" />
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center justify-between gap-1.5">
                          <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 light:text-amber-700 font-semibold truncate">
                            {tr.category || 'Other'} · {tr.prestigeTier}
                          </span>
                          <span
                            className={`font-mono text-[9px] uppercase px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              tr.isCustom
                                ? 'bg-[#7ADBF0]/15 text-[#7ADBF0] border border-[#7ADBF0]/30'
                                : 'bg-amber-500/15 text-amber-300 border border-amber-400/30'
                            }`}
                          >
                            {tr.isCustom ? 'Custom' : 'Official'}
                          </span>
                        </div>

                        <h4 className="font-bold text-base text-white light:text-slate-950 truncate">
                          {tr.name}
                        </h4>
                        <p className="font-mono text-[10px] text-slate-400 light:text-slate-600 truncate">
                          &ldquo;{tr.engraving}&rdquo;
                        </p>

                        <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400 light:text-slate-600">
                          <span>
                            {usedInCount > 0
                              ? `Used in ${usedInCount} tournament${usedInCount > 1 ? 's' : ''}`
                              : 'Available for tournaments'}
                          </span>
                          {winners.length > 0 && (
                            <span className="text-emerald-400 light:text-emerald-700 font-semibold">
                              · Won {winners.length}x
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Recent Club Winners Strip (links directly to Club Trophy Cabinet) */}
                    {winners.length > 0 && (
                      <div className="rounded-xl bg-[#050A12] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-2.5 space-y-1.5">
                        <div className="font-mono text-[9px] uppercase tracking-wider text-amber-300 light:text-amber-800 flex items-center justify-between">
                          <span>In Club Trophy Cabinets ({winners.length})</span>
                          <span>Click club to view cabinet</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {winners.slice(0, 4).map((w, idx) => (
                            <button
                              key={`${w.teamId}-${w.season}-${idx}`}
                              type="button"
                              onClick={() => openTeamById(w.teamId, 5)}
                              className="px-2 py-0.5 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-[10px] font-semibold text-emerald-200 light:text-emerald-900 cursor-pointer inline-flex items-center gap-1"
                              title={`Open ${w.teamName} Trophy Cabinet (${w.competitionName} · ${w.season})`}
                            >
                              <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              <span className="truncate max-w-[120px]">{w.teamName}</span>
                              <span className="font-mono text-[9px] opacity-75">({w.season})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Use in Tournament + Admin Edit / Delete */}
                  <div className="pt-2 border-t border-white/[0.07] light:border-slate-200 space-y-2">
                    {onSelectTrophyForNewCompetition && (
                      <button
                        type="button"
                        onClick={() => onSelectTrophyForNewCompetition(tr)}
                        className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer inline-flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Use Trophy in Tournament Structure</span>
                      </button>
                    )}

                    {isAdmin && (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => openEditTrophyModal(tr)}
                          className="flex-1 py-1.5 px-2.5 rounded-lg border border-white/15 light:border-slate-300 bg-white/[0.04] hover:bg-white/[0.08] light:bg-slate-100 text-xs font-semibold text-slate-200 light:text-slate-800 cursor-pointer inline-flex items-center justify-center gap-1.5"
                        >
                          <Pencil className="w-3 h-3 text-[#7ADBF0]" />
                          <span>Edit Trophy</span>
                        </button>

                        {confirmDeleteId === tr.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteTrophyDesign(tr.id);
                                setConfirmDeleteId(null);
                              }}
                              className="py-1.5 px-2.5 rounded-lg bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="py-1.5 px-2 rounded-lg border border-white/15 text-[11px] text-slate-400 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(tr.id)}
                            className="py-1.5 px-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold text-rose-300 light:text-rose-700 cursor-pointer inline-flex items-center justify-center gap-1"
                            title="Remove trophy from gallery"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : hallOfFame.length === 0 ? (
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-10 text-center space-y-2">
          <Crown className="w-8 h-8 text-amber-400/60 mx-auto" />
          <div className="text-sm font-semibold">Hall of Fame is awaiting its first champion</div>
          <p className="text-xs text-slate-400 light:text-slate-600 max-w-md mx-auto">
            Complete any competition in Tournament Maker to crown a winner, automatically add the trophy to that club&apos;s Trophy Cabinet, and etch the edition into the Hall of Fame.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {hallOfFame.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="flex items-center gap-4 min-w-0">
                <TrophyArtwork trophy={entry.trophy} size="sm" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-amber-400 light:text-amber-700">
                    <span>{entry.competitionName}</span>
                    <span>·</span>
                    <span>{entry.season}</span>
                  </div>
                  <div className="text-base font-bold truncate mt-0.5 text-white light:text-slate-950">
                    {entry.championName}
                    {entry.runnerUpName && (
                      <span className="text-xs font-normal text-slate-400 light:text-slate-600 ml-2">
                        def. {entry.runnerUpName} ({entry.finalScore})
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 light:text-slate-600 mt-1">
                    <span>{entry.trophy.name}</span>
                    {entry.topScorerName && (
                      <span className="inline-flex items-center gap-1">
                        <Award className="w-3 h-3 text-emerald-400 light:text-emerald-600" />
                        Golden Boot: {entry.topScorerName} ({entry.topScorerGoals})
                      </span>
                    )}
                    <span className="tabular-nums">
                      {entry.totalMatches} matches · {entry.totalGoals} goals
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => openTeamById(entry.championTeamId, 5)}
                className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-xs font-bold text-amber-300 light:text-amber-800 cursor-pointer inline-flex items-center gap-1.5 shrink-0"
              >
                <span>Open Club Trophy Cabinet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Admin Add / Edit Trophy Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setEditorOpen(false)}
        >
          <form
            onSubmit={handleSaveTrophy}
            className="w-full max-w-2xl rounded-2xl border border-amber-400/40 bg-[#070F1B] light:bg-white text-white light:text-slate-900 p-6 space-y-5 shadow-2xl max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-white/10 light:border-slate-200 pb-3">
              <div>
                <h3 className="font-display text-xl uppercase tracking-wide">
                  {editingTrophyId ? 'Edit Trophy in Gallery' : 'Add New Trophy to Gallery'}
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-600">
                  Configure trophy portrait, category, engraving, and finish for Tournament Maker
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 items-start">
              <div className="rounded-2xl border border-amber-400/35 bg-[#040912] p-4 flex flex-col items-center justify-center gap-2.5">
                <TrophyArtwork trophy={draftTrophy} size="xl" />
                <div className="text-xs font-bold text-amber-100 text-center">
                  {draftTrophy.name || 'Untitled Trophy'}
                </div>
                <div className="font-mono text-[9px] uppercase text-amber-300/80 text-center">
                  {draftTrophy.engraving || 'CHAMPIONS'}
                </div>
                <label className="mt-1 w-full py-1.5 px-2.5 rounded-lg border border-white/15 bg-white/[0.05] hover:bg-white/10 text-[10px] font-semibold text-center text-[#7ADBF0] cursor-pointer inline-flex items-center justify-center gap-1">
                  <ImagePlus className="w-3 h-3" />
                  <span>Upload Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadCustomTrophyImage}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-400">
                      Trophy Name
                    </label>
                    <input
                      type="text"
                      required
                      value={draftTrophy.name}
                      onChange={(e) => setDraftTrophy((p) => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3 py-1.5 text-xs text-white light:text-slate-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-400">
                      Engraving Text
                    </label>
                    <input
                      type="text"
                      value={draftTrophy.engraving}
                      onChange={(e) => setDraftTrophy((p) => ({ ...p, engraving: e.target.value }))}
                      className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3 py-1.5 text-xs text-white light:text-slate-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-400">
                      Category
                    </label>
                    <select
                      value={draftTrophy.category || 'Other'}
                      onChange={(e) =>
                        setDraftTrophy((p) => ({
                          ...p,
                          category: e.target.value as TrophyCategory,
                        }))
                      }
                      className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3 py-1.5 text-xs text-white light:text-slate-900"
                    >
                      {TROPHY_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-400">
                      Prestige Tier
                    </label>
                    <select
                      value={draftTrophy.prestigeTier}
                      onChange={(e) =>
                        setDraftTrophy((p) => ({
                          ...p,
                          prestigeTier: e.target.value as TrophyPrestigeTier,
                        }))
                      }
                      className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3 py-1.5 text-xs text-white light:text-slate-900"
                    >
                      {PRESTIGE_TIERS.map((tier) => (
                        <option key={tier} value={tier}>
                          {tier}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* AI Trophy Portrait Selector */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-[10px] uppercase text-amber-300 font-bold">
                      AI Trophy Portrait Studio
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setDraftTrophy((p) => ({
                          ...p,
                          imageUrl:
                            p.imageUrl === 'svg' ? AI_TROPHY_PORTRAIT_OPTIONS[0].url : 'svg',
                        }))
                      }
                      className="font-mono text-[9px] uppercase text-[#7ADBF0] hover:underline cursor-pointer"
                    >
                      {draftTrophy.imageUrl === 'svg'
                        ? 'Use AI Photorealistic Render'
                        : 'Switch to Vector SVG'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {AI_TROPHY_PORTRAIT_OPTIONS.map((opt) => {
                      const active =
                        draftTrophy.imageUrl === opt.url || draftTrophy.imageUrl === opt.rawPath;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setDraftTrophy((p) => ({ ...p, imageUrl: opt.url }))}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            active
                              ? 'border-amber-400 bg-amber-500/15 text-amber-200'
                              : 'border-white/10 bg-[#050A12] text-slate-300 hover:border-white/25'
                          }`}
                        >
                          <img
                            src={opt.url}
                            alt={opt.label}
                            className="w-7 h-7 rounded object-cover shrink-0 border border-white/15"
                          />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold truncate">{opt.label}</div>
                            <div className="font-mono text-[8px] text-slate-400 truncate">
                              {opt.subtitle}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase text-slate-400">
                    Silhouette
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SILHOUETTES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setDraftTrophy((p) => ({ ...p, silhouette: s.id }))}
                        className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          draftTrophy.silhouette === s.id
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase text-slate-400">
                    Material Finish
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MATERIALS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setDraftTrophy((p) => ({
                            ...p,
                            material: m.id,
                            displayStyle:
                              m.id === 'crystal'
                                ? 'crystal'
                                : m.id === 'metal'
                                ? 'metal'
                                : m.id === 'silver' || m.id === 'platinum'
                                ? 'silver'
                                : 'gold',
                          }))
                        }
                        className={`px-2 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          draftTrophy.material === m.id
                            ? 'bg-[#7ADBF0] text-slate-950'
                            : 'bg-white/5 text-slate-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>Accent Color</span>
                    <input
                      type="color"
                      value={draftTrophy.accentColor}
                      onChange={(e) =>
                        setDraftTrophy((p) => ({ ...p, accentColor: e.target.value }))
                      }
                      className="w-8 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-300">
                    <span>Trim Color</span>
                    <input
                      type="color"
                      value={draftTrophy.primaryColor}
                      onChange={(e) =>
                        setDraftTrophy((p) => ({ ...p, primaryColor: e.target.value }))
                      }
                      className="w-8 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/15 text-xs font-semibold text-slate-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingTrophyId
                  ? 'Save Changes to Trophy'
                  : 'Add Trophy to Gallery'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
