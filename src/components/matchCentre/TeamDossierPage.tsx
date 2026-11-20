import React, { useState } from 'react';
import {
  Compass,
  Edit2,
  Gauge,
  Image as ImageIcon,
  LayoutGrid,
  Scale,
  Swords,
  Trash2,
  Trophy,
  User,
  Users,
  X,
  MapPin,
} from 'lucide-react';
import { Team, getTeamType } from '../../types/matchCentre';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { useAuth } from '../../context/AuthContext';
import { TeamEmblem } from './TeamEmblem';
import { DossierTabBar } from './dossier/DossierTabBar';
import { DossierOverviewTab } from './dossier/DossierOverviewTab';
import { DossierTacticsTab } from './dossier/DossierTacticsTab';
import { DossierPreferredXiTab } from './dossier/DossierPreferredXiTab';
import { DossierSquadTab } from './dossier/DossierSquadTab';
import { DossierManagerTab } from './dossier/DossierManagerTab';
import { DossierTrophiesTab } from './dossier/DossierTrophiesTab';
import {
  getOverallScheme,
  hexToRgba,
  isLightHex,
  normalizeHex,
} from './dossier/dossierUtils';

interface TeamDossierPageProps {
  team: Team;
  onBack: () => void;
  onOpenMatchCreator: () => void;
}

export const TeamDossierPage: React.FC<TeamDossierPageProps> = ({
  team,
  onBack,
  onOpenMatchCreator,
}) => {
  const {
    activeDossierTab,
    setActiveDossierTab,
    selectTeam,
    openCreateModal,
    deleteTeam,
    updateTeamCrest,
    canManageTeam,
    openPlayerProfile,
    openManagerProfile,
    closeDossier,
    openTeamStadium,
    openCompareTeams,
  } = useMatchCentre();
  const { isAdmin } = useAuth();
  const canManage = canManageTeam(team);
  const canonicalType = getTeamType(team);

  const [isCrestModalOpen, setIsCrestModalOpen] = useState(false);
  const [crestUrlInput, setCrestUrlInput] = useState(team.crestUrl);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const primaryHex = normalizeHex(team.primaryColor);
  const secondaryHex = normalizeHex(team.secondaryColor || primaryHex);
  const lightPrimary = isLightHex(primaryHex);
  const lightSecondary = isLightHex(secondaryHex);
  const lightDual = lightPrimary && lightSecondary;
  const overallScheme = getOverallScheme(team.overallRating);

  const handleCrestSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (crestUrlInput.trim()) {
      updateTeamCrest(team.id, crestUrlInput.trim());
    }
    setIsCrestModalOpen(false);
  };

  return (
    <div className="relative rounded-3xl p-3 sm:p-5 space-y-6 landscape-mobile:space-y-4 animate-in fade-in duration-300 pb-24 landscape-mobile:pb-10 overflow-hidden">
      {/* Dual-Color Club Crest Ambient Backdrop (Dark Mode) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl light:hidden"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(
            primaryHex,
            lightPrimary ? 0.16 : 0.28
          )} 0%, rgba(10, 16, 27, 0.45) 50%, ${hexToRgba(
            secondaryHex,
            lightSecondary ? 0.16 : 0.28
          )} 100%)`,
        }}
      />

      {/* Dual-Color Club Crest Ambient Backdrop (Light Mode) */}
      <div
        className="pointer-events-none absolute inset-0 rounded-3xl hidden light:block"
        style={{
          background: `linear-gradient(135deg, ${hexToRgba(
            primaryHex,
            lightPrimary ? 0.12 : 0.16
          )} 0%, rgba(248, 250, 252, 0.72) 50%, ${hexToRgba(
            secondaryHex,
            lightSecondary ? 0.12 : 0.16
          )} 100%)`,
        }}
      />

      {/* 1. Breadcrumb Navigation */}
      <div className="relative z-10 flex items-center gap-2 text-xs font-mono">
        <button
          type="button"
          onClick={onBack}
          className="text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer"
        >
          MATCH CENTRE
        </button>
        <span className="text-slate-500">/</span>
        <button
          type="button"
          onClick={onBack}
          className="text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 transition-colors cursor-pointer"
        >
          TEAMS
        </button>
        <span className="text-slate-500">/</span>
        <span className="text-[#7ADBF0] light:text-cyan-700 font-bold uppercase truncate max-w-xs">
          {team.name}
        </span>
      </div>

      {/* 2. Team Dossier Hero Card (Two Crest Colors Background) */}
      <div
        className="relative z-10 rounded-3xl overflow-hidden border border-white/[0.12] light:border-slate-300 shadow-2xl p-6 sm:p-8 landscape-mobile:p-4"
        style={{
          backgroundColor: '#0A101B',
          backgroundImage: `linear-gradient(180deg, rgba(6,10,18,0.16) 0%, rgba(6,10,18,0.52) 100%), repeating-linear-gradient(120deg, rgba(255,255,255,0.04) 0px, rgba(255,255,255,0.04) 1px, transparent 1px, transparent 16px), linear-gradient(116deg, ${hexToRgba(
            primaryHex,
            lightPrimary ? 0.72 : 0.92
          )} 0%, ${hexToRgba(primaryHex, lightPrimary ? 0.48 : 0.68)} 38%, ${hexToRgba(
            secondaryHex,
            lightSecondary ? 0.48 : 0.72
          )} 68%, ${hexToRgba(secondaryHex, lightSecondary ? 0.68 : 0.92)} 100%)`,
        }}
      >
        <div className="relative z-10 space-y-6 landscape-mobile:space-y-4">
          {/* Top Split: Identity Left + Overall & Actions Right */}
          <div className="flex flex-col landscape-mobile:flex-row lg:flex-row landscape-mobile:items-center lg:items-center justify-between gap-6 landscape-mobile:gap-4">
            {/* Identity Block */}
            <div className="flex flex-col landscape-mobile:flex-row sm:flex-row items-start landscape-mobile:items-center sm:items-center gap-5 landscape-mobile:gap-3.5 min-w-0">
              <div
                className={`${
                  canonicalType === 'country'
                    ? 'w-32 h-22 sm:w-36 sm:h-24 p-2.5'
                    : 'w-24 h-24 sm:w-28 sm:h-28 p-3'
                } rounded-2xl bg-white/10 backdrop-blur-md border-2 shrink-0 flex items-center justify-center shadow-2xl`}
                style={{
                  borderColor: hexToRgba(secondaryHex, 0.55),
                  boxShadow: `0 12px 30px -6px ${hexToRgba(primaryHex, 0.55)}`,
                }}
              >
                <TeamEmblem team={team} />
              </div>

              <div className="min-w-0 space-y-1.5">
                <span className="block font-mono text-[10px] tracking-[0.22em] text-white/85 uppercase drop-shadow-sm">
                  {team.flag ? `${team.flag} ` : ''}
                  {team.country} · {canonicalType === 'country' ? team.confederation : team.league || team.confederation}
                </span>

                <h1 className="font-display text-3xl sm:text-5xl landscape-mobile:text-2xl text-white uppercase tracking-wide leading-none drop-shadow-sm">
                  {team.name}
                </h1>

                <p className="text-xs sm:text-sm text-white/85 drop-shadow-sm">
                  {canonicalType === 'country'
                    ? `${team.confederation || 'International'}`
                    : team.league || 'Independent Club'}{' '}
                  · {team.squad.length} players
                  {team.worldRanking
                    ? ` · ${canonicalType === 'country' ? 'FIFA Rank' : 'World Rank'} #${team.worldRanking}`
                    : ''}{' '}
                  · {team.overallRating} OVR
                </p>

                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full bg-black/25 border border-white/25 font-mono text-[10px] font-bold tracking-widest text-white uppercase">
                    {canonicalType === 'club' ? 'CLUB' : 'NATIONAL'}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-black/25 border border-white/25 font-mono text-[10px] font-bold tracking-widest text-white uppercase">
                    {team.gender === 'men' ? 'MEN' : 'WOMEN'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Overall Glass Card + 4 Hero Actions */}
            <div className="flex flex-col items-start landscape-mobile:items-end lg:items-end gap-3 shrink-0">
              {/* OVERALL Card */}
              <div className="rounded-2xl bg-black/45 backdrop-blur-md border border-white/20 px-4 py-3 min-w-[205px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[9px] tracking-[0.2em] text-white/65 uppercase">
                    {team.worldRanking
                      ? `${canonicalType === 'country' ? 'FIFA RANK' : 'WORLD RANK'} #${team.worldRanking}`
                      : 'WORLD OVERALL'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span
                    className="font-display text-4xl tabular-nums leading-none"
                    style={{ color: overallScheme.barColor }}
                  >
                    {team.overallRating}
                  </span>
                  <div className="flex-1 space-y-1.5">
                    <span className="inline-block px-2 py-0.5 rounded border border-amber-400/40 bg-amber-400/10 font-mono text-[9px] tracking-[0.16em] text-amber-300 uppercase">
                      {overallScheme.tierLabel}
                    </span>
                    <div className="h-1.5 w-full rounded-full bg-white/15 overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(100, team.overallRating)}%`,
                          backgroundColor: overallScheme.barColor,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Action Buttons: Play a match, Crest, Edit, Delete */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    selectTeam(team, 'home');
                    onOpenMatchCreator();
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all hover:brightness-110 shadow-lg border border-white/20"
                  style={{
                    backgroundImage: `linear-gradient(135deg, ${primaryHex} 0%, ${secondaryHex} 100%)`,
                    color: lightDual ? '#050A12' : '#FFFFFF',
                  }}
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>Play a match</span>
                </button>

                <button
                  type="button"
                  onClick={() => openCompareTeams(team.id)}
                  className="px-3.5 py-2 rounded-xl bg-black/30 hover:bg-black/45 border border-white/20 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  title={`Compare ${team.name} on Radar Chart`}
                >
                  <Scale className="w-3.5 h-3.5 text-[#7ADBF0]" />
                  <span>Compare</span>
                </button>

                {canonicalType === 'club' && (
                  <button
                    type="button"
                    onClick={() => {
                      closeDossier();
                      openTeamStadium(team.id);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-black/30 hover:bg-black/45 border border-white/20 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-all"
                    title="View club stadium on Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Stadium Map</span>
                  </button>
                )}

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setCrestUrlInput(team.crestUrl);
                      setIsCrestModalOpen(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-black/30 hover:bg-black/45 border border-white/20 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-all"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>{canonicalType === 'country' ? 'Flag' : 'Crest'}</span>
                  </button>
                )}

                {canManage && (
                  <>
                    <button
                      type="button"
                      onClick={() => openCreateModal(team)}
                      className="px-3.5 py-2 rounded-xl bg-black/30 hover:bg-black/45 border border-white/20 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="p-2 rounded-xl bg-black/30 hover:bg-rose-500/30 border border-white/20 hover:border-rose-400/60 text-white/80 hover:text-rose-200 cursor-pointer transition-all"
                      title="Delete team"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Bottom 6-Tile Glass Stats Strip */}
          <div className="grid grid-cols-2 landscape-mobile:grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {[
              {
                icon: User,
                label: 'MANAGER',
                value: team.manager_name || team.manager || 'Vacant',
                onClick: () => {
                  if (team.manager_id) {
                    openManagerProfile(team.manager_id);
                  } else {
                    setActiveDossierTab(5);
                  }
                },
              },
              { icon: LayoutGrid, label: 'FORMATION', value: team.defaultFormation },
              { icon: Compass, label: 'STYLE', value: team.tacticalProfile?.playingStyle || team.playingStyle },
              { icon: Users, label: 'SQUAD', value: String(team.squad.length) },
              { icon: Gauge, label: team.worldRanking ? (canonicalType === 'country' ? 'FIFA RANK' : 'WORLD RANK') : 'OVERALL', value: team.worldRanking ? `#${team.worldRanking}` : String(team.overallRating) },
              { icon: Trophy, label: 'CATEGORY', value: canonicalType === 'club' ? 'Club' : 'National' },
            ].map((tile) => {
              const Icon = tile.icon;
              if (tile.onClick) {
                return (
                  <button
                    key={tile.label}
                    type="button"
                    onClick={tile.onClick}
                    className="text-left rounded-xl bg-black/25 hover:bg-black/40 backdrop-blur-md border border-white/15 hover:border-[#7ADBF0]/50 px-3.5 py-2.5 min-w-0 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-1.5 text-white/60 mb-1">
                      <Icon className="w-3 h-3 shrink-0" />
                      <span className="font-mono text-[9px] tracking-[0.18em] uppercase truncate">
                        {tile.label}
                      </span>
                    </div>
                    <span className="font-bold text-xs sm:text-sm text-white block truncate">
                      {tile.value}
                    </span>
                  </button>
                );
              }
              return (
                <div
                  key={tile.label}
                  className="rounded-xl bg-black/25 backdrop-blur-md border border-white/15 px-3.5 py-2.5 min-w-0"
                >
                  <div className="flex items-center gap-1.5 text-white/60 mb-1">
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="font-mono text-[9px] tracking-[0.18em] uppercase truncate">
                      {tile.label}
                    </span>
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-white block truncate">
                    {tile.value}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3 & 4. Dossier Navigation + Active Tab Viewport */}
      <div className="relative z-10 space-y-6">
        <DossierTabBar activeTab={activeDossierTab} onSelectTab={setActiveDossierTab} />

        {activeDossierTab === 1 && (
          <DossierOverviewTab
            team={team}
            onSelectTab={setActiveDossierTab}
            onOpenPlayerProfile={(playerId) => openPlayerProfile(playerId)}
            onOpenManagerProfile={(managerId) => openManagerProfile(managerId)}
          />
        )}
        {activeDossierTab === 2 && <DossierTacticsTab team={team} />}
        {activeDossierTab === 3 && <DossierPreferredXiTab team={team} />}
        {activeDossierTab === 4 && <DossierSquadTab team={team} />}
        {activeDossierTab === 5 && <DossierManagerTab team={team} />}
        {activeDossierTab === 6 && <DossierTrophiesTab team={team} />}
      </div>

      {/* Crest Editor Modal (Owner-only) */}
      {isAdmin && isCrestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <form
            onSubmit={handleCrestSave}
            className="w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white light:text-slate-900">
                Update {team.shortName} crest
              </h3>
              <button
                type="button"
                onClick={() => setIsCrestModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-white/5 light:bg-slate-100 border border-white/10 light:border-slate-200 p-2 flex items-center justify-center shrink-0">
                  <img
                    src={crestUrlInput}
                    alt="Preview"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-contain"
                  />
                </div>
                <input
                  type="url"
                  required
                  value={crestUrlInput}
                  onChange={(e) => setCrestUrlInput(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 light:text-slate-600 mb-1">
                  Or upload image file from device:
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const result = event.target?.result as string;
                      if (result) setCrestUrlInput(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#7ADBF0]/20 file:text-[#7ADBF0] hover:file:bg-[#7ADBF0]/30 cursor-pointer"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold text-xs cursor-pointer"
              >
                Save crest
              </button>
            </div>
          </form>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {canManage && confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C131F] light:bg-white border border-rose-500/40 p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-base text-white light:text-slate-900">
              Delete {team.name}?
            </h3>
            <p className="text-xs text-slate-400 light:text-slate-600">
              This will remove the team and its registered roster from the Match Centre database.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteOpen(false);
                  deleteTeam(team.id);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold cursor-pointer"
              >
                Confirm delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
