import React, { useMemo, useState } from 'react';
import {
  Check,
  Edit2,
  History,
  RefreshCw,
  RotateCcw,
  Shield,
  Users,
  X,
} from 'lucide-react';
import { getPlayerDisplayName, Player, Team } from '../../../types/matchCentre';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import {
  assignPlayersToFormation,
  getStartingXiPlayers,
  isLightHex,
  normalizeHex,
  normalizePositionDetail,
  validateStartingXi,
} from './dossierUtils';

interface DossierPreferredXiTabProps {
  team: Team;
}

const LINE_BADGE_MAP: Record<string, string> = {
  GK: 'bg-orange-500/20 text-orange-300 border-orange-500/40 light:bg-orange-50 light:text-orange-700 light:border-orange-300',
  DEF: 'bg-amber-500/20 text-amber-300 border-amber-500/40 light:bg-amber-50 light:text-amber-700 light:border-amber-300',
  MID: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-300',
  ATT: 'bg-sky-500/20 text-sky-300 border-sky-500/40 light:bg-sky-50 light:text-sky-700 light:border-sky-300',
};

const LINE_SHORT_LABEL: Record<string, string> = {
  GK: 'GK',
  DEF: 'DF',
  MID: 'MF',
  ATT: 'FW',
};

export const DossierPreferredXiTab: React.FC<DossierPreferredXiTabProps> = ({ team }) => {
  const { updatePreferredXi, resetPreferredXiToAuto, canManageTeam, openPlayerProfile } =
    useMatchCentre();
  const canManage = canManageTeam(team);
  const [isEditingXi, setIsEditingXi] = useState(false);

  const startingXi = useMemo(() => getStartingXiPlayers(team), [team]);
  const [draftIds, setDraftIds] = useState<string[]>(() => startingXi.map((p) => p.id));

  const activeXi = useMemo(() => {
    if (!isEditingXi) return startingXi;
    return draftIds
      .map((id) => team.squad.find((p) => p.id === id))
      .filter(Boolean) as Player[];
  }, [isEditingXi, draftIds, startingXi, team.squad]);

  const primaryHex = normalizeHex(team.primaryColor);
  const lightPrimary = isLightHex(primaryHex);

  // Assign players to formation pitch nodes with strict positional accuracy
  const pitchAssignedPlayers = useMemo(() => {
    return assignPlayersToFormation(activeXi, team.defaultFormation);
  }, [activeXi, team.defaultFormation]);

  // Positional accuracy validation check
  const validation = useMemo(() => {
    return validateStartingXi(pitchAssignedPlayers);
  }, [pitchAssignedPlayers]);

  const placedPlayers = useMemo(
    () => pitchAssignedPlayers.map((a) => a.player).filter((p): p is Player => Boolean(p)),
    [pitchAssignedPlayers]
  );

  const xiAvg = placedPlayers.length
    ? Math.round(placedPlayers.reduce((s, p) => s + p.overallRating, 0) / placedPlayers.length)
    : 0;
  const emptySlots = validation.vacantCount;
  const unplacedDraftPlayers = useMemo(() => {
    if (!isEditingXi) return [];
    const placedIds = new Set(placedPlayers.map((p) => p.id));
    return activeXi.filter((p) => !placedIds.has(p.id));
  }, [isEditingXi, placedPlayers, activeXi]);

  // Rotation XI: players outside the preferred XI
  const xiIdSet = new Set(activeXi.map((p) => p.id));
  const rotationPlayers = useMemo(() => {
    return team.squad
      .filter((p) => !xiIdSet.has(p.id))
      .sort((a, b) => b.overallRating - a.overallRating)
      .slice(0, 11);
  }, [team.squad, activeXi]);

  const toggleDraftPlayer = (playerId: string) => {
    setDraftIds((prev) => {
      if (prev.includes(playerId)) {
        return prev.filter((id) => id !== playerId);
      }
      if (prev.length >= 11) {
        return [...prev.slice(0, 10), playerId];
      }
      return [...prev, playerId];
    });
  };

  const handleOpenEdit = () => {
    setDraftIds(startingXi.map((p) => p.id));
    setIsEditingXi(true);
  };

  const handleSaveXi = () => {
    updatePreferredXi(team.id, draftIds, 'user-set');
    setIsEditingXi(false);
  };

  const sourceTag =
    team.preferredXiSource === 'verified'
      ? 'VERIFIED'
      : team.preferredXiSource === 'estimated'
      ? 'AUTO-PICKED'
      : 'USER-SET';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5">
          <span className="block font-mono text-[10px] tracking-[0.22em] text-slate-400 light:text-slate-500 uppercase">
            PREFERRED STARTING XI
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 tracking-wide leading-none">
              {team.defaultFormation}
            </h2>
            <span className="px-2.5 py-0.5 rounded-md bg-sky-500/12 border border-sky-400/40 text-sky-300 light:bg-sky-50 light:text-sky-700 font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1">
              <Edit2 className="w-2.5 h-2.5" />
              <span>{sourceTag}</span>
            </span>
            {validation.isValid ? (
              <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 light:bg-emerald-50 light:text-emerald-700 font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1">
                <Check className="w-2.5 h-2.5" />
                <span>
                  POSITIONAL ACCURACY ({validation.filledCount}/11
                  {validation.substituteCount > 0 ? ` · ${validation.substituteCount} COVER` : ''})
                </span>
              </span>
            ) : validation.isPositionalAccurate && validation.filledCount > 0 ? (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-300 light:bg-amber-50 light:text-amber-700 font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1">
                <span>
                  STRICT FIT ({validation.filledCount}/11 · {validation.vacantCount} VACANT)
                </span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 text-amber-300 light:bg-amber-50 light:text-amber-700 font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1">
                <span>{validation.errors[0]}</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 light:text-slate-600">
            Saved by an administrator. It is the XI a simulation loads first; injuries, suspensions and fatigue are handled by the engine.
          </p>
        </div>

        {/* Action Buttons: Edit XI + Reset to auto */}
        {canManage && (
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {isEditingXi ? (
              <>
                <button
                  type="button"
                  onClick={handleSaveXi}
                  className="px-3.5 py-2 rounded-xl bg-[#10B981] hover:bg-[#34D399] text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save XI ({draftIds.length}/11)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditingXi(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleOpenEdit}
                  className="px-3.5 py-2 rounded-xl bg-[#0C131F] light:bg-white hover:bg-[#131D2E] light:hover:bg-slate-50 border border-white/[0.12] light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <Edit2 className="w-3.5 h-3.5 text-[#34D399] light:text-emerald-600" />
                  <span>Edit XI</span>
                </button>
                <button
                  type="button"
                  onClick={() => resetPreferredXiToAuto(team.id)}
                  className="px-3.5 py-2 rounded-xl bg-[#0C131F] light:bg-white hover:bg-[#131D2E] light:hover:bg-slate-50 border border-white/[0.12] light:border-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800 inline-flex items-center gap-1.5 cursor-pointer transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset to auto</span>
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Interactive Squad Picker Drawer when Edit XI is active */}
      {canManage && isEditingXi && (
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-[#10B981]/50 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#34D399] light:text-emerald-700 uppercase font-bold">
              SELECT 11 STARTERS FROM SQUAD ({draftIds.length} / 11 SELECTED)
            </span>
            {unplacedDraftPlayers.length > 0 && (
              <span className="font-mono text-[10px] text-amber-400 uppercase font-bold">
                UNPLACED (INCOMPATIBLE FOR VACANT SLOTS): {unplacedDraftPlayers.map((p) => `${p.shortName} (${p.positionDetail})`).join(', ')}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
            {team.squad.map((p) => {
              const selected = draftIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleDraftPlayer(p.id)}
                  className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 text-xs transition-all cursor-pointer ${
                    selected
                      ? 'bg-[#10B981]/15 border-[#10B981] text-white light:bg-emerald-50 light:text-emerald-950'
                      : 'bg-[#080E18] light:bg-slate-50 border-white/[0.06] light:border-slate-200 text-slate-300 light:text-slate-700 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 w-5">
                      #{p.shirtNumber}
                    </span>
                    <span className="font-semibold truncate">{getPlayerDisplayName(p)}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] text-slate-400">{p.positionDetail}</span>
                    <span className="font-mono font-bold text-[#34D399] light:text-emerald-700">
                      {p.overallRating}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* PitchXI + XIList 2-Column Split */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-5 landscape-mobile:gap-4 items-start">
        {/* Left: PitchXI Visual */}
        <div className="landscape-mobile:col-span-5 lg:col-span-6">
          <div className="relative w-full landscape-mobile:max-w-[320px] landscape-mobile:mx-auto aspect-[4/4.7] rounded-2xl overflow-hidden border border-white/[0.08] shadow-inner select-none bg-[#0D2B1B]">
            <div
              className="absolute inset-0 pointer-events-none opacity-45"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 44px, transparent 44px, transparent 88px)',
              }}
            />
            <div className="absolute inset-4 border border-white/20 rounded pointer-events-none" />
            <div className="absolute top-1/2 inset-x-4 h-[1px] bg-white/20 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20 pointer-events-none" />
            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-40 h-16 border-b border-x border-white/20 pointer-events-none" />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-16 border-t border-x border-white/20 pointer-events-none" />

            {pitchAssignedPlayers.map(({ node, player }, idx) => {
              const normPos = player
                ? normalizePositionDetail(player.positionDetail, player.position)
                : '';
              const isCover = Boolean(player && normPos !== node.posReq);
              return (
                <div
                  key={idx}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                >
                  <div className="relative">
                    <div
                      className={`w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-mono text-xs font-black shadow-lg ${
                        player
                          ? 'border-2 border-white'
                          : 'border-2 border-dashed border-white/40 bg-black/45 text-white/60'
                      }`}
                      style={
                        player
                          ? {
                              backgroundColor: primaryHex,
                              color: lightPrimary ? '#050A12' : '#FFFFFF',
                            }
                          : undefined
                      }
                    >
                      {player ? player.shirtNumber : '—'}
                    </div>
                    {player?.isCaptain && (
                      <span className="absolute -top-1 -right-2 w-4 h-4 rounded bg-amber-400 text-slate-950 font-mono text-[8px] font-black flex items-center justify-center shadow">
                        C
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] mt-1 whitespace-nowrap max-w-[82px] truncate ${
                      player ? 'text-white' : 'text-white/55 italic'
                    }`}
                  >
                    {player ? player.shortName : 'Vacant'}
                  </span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="font-mono text-[8px] font-bold text-white/90 bg-black/60 px-1.5 py-0.2 rounded border border-white/20 uppercase leading-none">
                      {node.role}
                    </span>
                    {isCover && player?.positionDetail && (
                      <span className="font-mono text-[8px] text-[var(--accent-cyan)] font-semibold leading-none drop-shadow">
                        ({player.positionDetail})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Bottom-right team nameplate */}
            <div className="absolute bottom-2.5 right-3.5 px-2 py-0.5 rounded bg-black/50 border border-white/15 font-mono text-[9px] tracking-[0.18em] text-white/80 uppercase">
              {team.name}
            </div>
          </div>
        </div>

        {/* Right: XIList Roster (1-to-1 with pitch formation slots) */}
        <div className="landscape-mobile:col-span-7 lg:col-span-6 space-y-2.5">
          <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 divide-y divide-white/[0.05] light:divide-slate-200 overflow-hidden">
            {pitchAssignedPlayers.map(({ node, player }, idx) => {
              const normPos = player
                ? normalizePositionDetail(player.positionDetail, player.position)
                : '';
              const isCover = Boolean(player && normPos !== node.posReq);

              if (!player) {
                return (
                  <div
                    key={`vacant-${node.role}-${idx}`}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 bg-white/[0.01] light:bg-slate-50/70"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-6 font-mono text-xs text-slate-500 tabular-nums shrink-0">
                        —
                      </span>
                      <span className="min-w-10 px-1.5 py-0.5 rounded text-center font-mono text-[10px] font-bold border border-dashed border-white/20 light:border-slate-300 text-slate-400 light:text-slate-500 shrink-0">
                        {node.role}
                      </span>
                      <span className="text-xs text-slate-500 italic truncate">
                        Vacant — no suitable player in squad
                      </span>
                    </div>
                    <span className="font-mono text-xs text-slate-600 shrink-0">—</span>
                  </div>
                );
              }

              return (
                <div
                  key={`${player.id}-${idx}`}
                  className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] light:hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 font-mono text-xs text-slate-400 light:text-slate-500 tabular-nums shrink-0">
                      {player.shirtNumber}
                    </span>
                    <span
                      className={`min-w-10 px-1.5 py-0.5 rounded text-center font-mono text-[10px] font-bold border shrink-0 ${
                        LINE_BADGE_MAP[player.position] || LINE_BADGE_MAP.MID
                      }`}
                    >
                      {node.role}
                    </span>
                    <button
                      type="button"
                      onClick={() => openPlayerProfile(player.id)}
                      className="font-semibold text-xs sm:text-sm text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 truncate cursor-pointer text-left transition-colors"
                    >
                      {getPlayerDisplayName(player)}
                    </button>
                    {isCover && (
                      <span className="px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-400/30 text-sky-300 light:bg-sky-50 light:text-sky-700 font-mono text-[9px] font-bold shrink-0">
                        {player.positionDetail} COVER
                      </span>
                    )}
                    {player.isCaptain && (
                      <span className="w-4 h-4 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center shrink-0">
                        C
                      </span>
                    )}
                    {player.isViceCaptain && (
                      <span className="px-1 rounded bg-slate-700 text-slate-200 font-mono text-[9px] font-bold shrink-0">
                        VC
                      </span>
                    )}
                  </div>

                  <span className="font-mono font-bold text-sm text-slate-200 light:text-slate-800 tabular-nums shrink-0">
                    {player.overallRating}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="px-1 flex items-center justify-between font-mono text-[11px] tracking-[0.18em] text-slate-400 light:text-slate-600 uppercase">
            <span>
              XI RATING {xiAvg} ·{' '}
              {emptySlots === 0 ? (
                <span className="text-[#34D399] light:text-emerald-700 font-bold">COMPLETE</span>
              ) : (
                <span className="text-amber-400 font-bold">
                  {validation.filledCount}/11 FILLED · {emptySlots} VACANT
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Row: Latest Recorded Lineup + Rotation XI */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-5">
        {/* Latest Recorded Lineup */}
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#34D399] light:text-emerald-700" />
              <h3 className="font-bold text-sm text-white light:text-slate-900">
                Latest recorded lineup
              </h3>
            </div>
            {team.latestLineup && (
              <span className="font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
                {team.latestLineup.formation}
              </span>
            )}
          </div>

          {team.latestLineup ? (
            <div className="space-y-2.5">
              <div className="text-xs text-slate-400 light:text-slate-600 font-mono">
                vs {team.latestLineup.opponent} · {team.latestLineup.date}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {team.latestLineup.players.map((p, idx) => (
                  <div
                    key={p.id || idx}
                    className="px-2.5 py-1.5 rounded-lg bg-[#080E18] light:bg-slate-50 border border-white/[0.05] light:border-slate-200 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-[10px] text-slate-500 w-5">
                        #{p.shirtNumber}
                      </span>
                      {p.id ? (
                        <button
                          type="button"
                          onClick={() => openPlayerProfile(p.id)}
                          className="font-medium text-slate-200 light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 truncate cursor-pointer text-left transition-colors"
                        >
                          {p.name}
                        </button>
                      ) : (
                        <span className="font-medium text-slate-200 light:text-slate-900 truncate">
                          {p.name}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[9px] text-[#34D399] light:text-emerald-700 font-bold shrink-0">
                      {p.positionDetail}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-dashed border-white/[0.08] light:border-slate-200 p-5 text-center text-xs text-slate-400 light:text-slate-500">
              No simulated match lineup recorded yet. Run a match simulation to log the starting eleven here.
            </div>
          )}
        </div>

        {/* Rotation XI */}
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3.5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#34D399] light:text-emerald-700" />
              <h3 className="font-bold text-sm text-white light:text-slate-900">Rotation XI</h3>
            </div>
            <span className="font-mono text-[10px] tracking-[0.16em] text-slate-400 light:text-slate-500 uppercase">
              {rotationPlayers.length} BENCH / ROTATION
            </span>
          </div>

          {rotationPlayers.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {rotationPlayers.map((p) => (
                <div
                  key={p.id}
                  className="px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-[10px] text-slate-400 w-5 shrink-0">
                      {p.shirtNumber}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold border shrink-0 ${
                        LINE_BADGE_MAP[p.position] || LINE_BADGE_MAP.MID
                      }`}
                    >
                      {p.positionDetail}
                    </span>
                    <button
                      type="button"
                      onClick={() => openPlayerProfile(p.id)}
                      className="font-medium text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 truncate cursor-pointer text-left transition-colors"
                    >
                      {getPlayerDisplayName(p)}
                    </button>
                  </div>
                  <span className="font-mono font-bold text-slate-300 light:text-slate-700 tabular-nums shrink-0">
                    {p.overallRating}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-dashed border-white/[0.08] light:border-slate-200 p-5 text-center text-xs text-slate-400 light:text-slate-500">
              All registered players are currently in the Preferred XI. Register additional players in the Squad tab to build a rotation unit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
