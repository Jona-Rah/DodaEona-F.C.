import React, { useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeftRight,
  Check,
  Edit2,
  Plus,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react';
import {
  calculateAgeFromDob,
  getPlayerDisplayName,
  Player,
  PlayerPosition,
  resolvePlayerAge,
  Team,
  getTeamType,
} from '../../../types/matchCentre';
import { makePitchShortName } from '../../../data/playerNicknames';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { useAuth } from '../../../context/AuthContext';
import { getGkDerivedStats, resolveLeadership } from './dossierUtils';

interface DossierSquadTabProps {
  team: Team;
}

const POS_DETAIL_BADGE: Record<string, string> = {
  GK: 'bg-orange-500/15 text-orange-300 border-orange-500/40 light:bg-orange-50 light:text-orange-700 light:border-orange-300',
  CB: 'bg-amber-500/15 text-amber-300 border-amber-500/40 light:bg-amber-50 light:text-amber-700 light:border-amber-300',
  LB: 'bg-amber-500/15 text-amber-300 border-amber-500/40 light:bg-amber-50 light:text-amber-700 light:border-amber-300',
  RB: 'bg-amber-500/15 text-amber-300 border-amber-500/40 light:bg-amber-50 light:text-amber-700 light:border-amber-300',
  CDM: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-300',
  CM: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-300',
  CAM: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40 light:bg-emerald-50 light:text-emerald-700 light:border-emerald-300',
  LW: 'bg-sky-500/15 text-sky-300 border-sky-500/40 light:bg-sky-50 light:text-sky-700 light:border-sky-300',
  RW: 'bg-sky-500/15 text-sky-300 border-sky-500/40 light:bg-sky-50 light:text-sky-700 light:border-sky-300',
  ST: 'bg-sky-500/15 text-sky-300 border-sky-500/40 light:bg-sky-50 light:text-sky-700 light:border-sky-300',
};

const AVATAR_RING: Record<PlayerPosition, string> = {
  GK: 'border-orange-400/70 text-orange-300 light:text-orange-700',
  DEF: 'border-amber-400/70 text-amber-300 light:text-amber-700',
  MID: 'border-emerald-400/70 text-emerald-300 light:text-emerald-700',
  ATT: 'border-sky-400/70 text-sky-300 light:text-sky-700',
};

export const DossierSquadTab: React.FC<DossierSquadTabProps> = ({ team }) => {
  const {
    teams,
    registry,
    freeAgents,
    signFreeAgent,
    callUpPlayerToNation,
    addPlayerToSquad,
    updatePlayerInSquad,
    deletePlayerFromSquad,
    transferPlayer,
    togglePlayerInjury,
    updateCaptaincy,
    updateLeadershipPair,
    canManageTeam,
    openPlayerProfile,
  } = useMatchCentre();
  const { isAdmin } = useAuth();
  const canManage = canManageTeam(team);
  const showActionsColumn = canManage || isAdmin;

  const isNationalTeam = getTeamType(team) === 'country';
  const { captain, viceCaptain } = resolveLeadership(team);

  // Leadership UI states
  const [selectingRole, setSelectingRole] = useState<'captain' | 'viceCaptain' | 'pair' | null>(null);
  const [pairCapId, setPairCapId] = useState(captain?.player?.id || '');
  const [pairVcId, setPairVcId] = useState(viceCaptain?.player?.id || '');

  // Squad Sort / Filter / Compare state
  const [sortBy, setSortBy] = useState<'position' | 'overall' | 'name' | 'age' | 'shirt'>('position');
  const [lineFilter, setLineFilter] = useState<'all' | 'GK' | 'DEF' | 'MID' | 'ATT'>('all');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Modals: Register existing player / New player / Edit player / Transfer player / Injury modal
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [registerSearch, setRegisterSearch] = useState('');
  const [isNewPlayerModalOpen, setIsNewPlayerModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [transferringPlayer, setTransferringPlayer] = useState<Player | null>(null);
  const [targetTransferClubId, setTargetTransferClubId] = useState('');
  const [injuryModalOpen, setInjuryModalOpen] = useState(false);

  // New Player form state
  const [npName, setNpName] = useState('');
  const [npFullName, setNpFullName] = useState('');
  const [npPos, setNpPos] = useState<PlayerPosition>('MID');
  const [npDetail, setNpDetail] = useState('CM');
  const [npOvr, setNpOvr] = useState(80);
  const [npShirt, setNpShirt] = useState(18);
  const [npDob, setNpDob] = useState('');
  const [npAge, setNpAge] = useState(23);
  const [npNat, setNpNat] = useState(team.country);

  // Injury form state
  const [injPlayerId, setInjPlayerId] = useState('');
  const [injStatus, setInjStatus] = useState<'injured' | 'doubtful'>('injured');
  const [injReturnDate, setInjReturnDate] = useState('2026-12-01');
  const [injNote, setInjNote] = useState('Hamstring strain');

  const filteredAndSorted = useMemo(() => {
    const posRank: Record<PlayerPosition, number> = { GK: 0, DEF: 1, MID: 2, ATT: 3 };
    let list = [...team.squad];
    if (lineFilter !== 'all') {
      list = list.filter((p) => p.position === lineFilter);
    }
    list.sort((a, b) => {
      if (sortBy === 'overall') return b.overallRating - a.overallRating;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'age') return resolvePlayerAge(a.dateOfBirth, a.age) - resolvePlayerAge(b.dateOfBirth, b.age);
      if (sortBy === 'shirt') return a.shirtNumber - b.shirtNumber;
      const diff = posRank[a.position] - posRank[b.position];
      return diff !== 0 ? diff : b.overallRating - a.overallRating;
    });
    return list;
  }, [team.squad, sortBy, lineFilter]);

  const goalkeepers = filteredAndSorted.filter((p) => p.position === 'GK');
  const outfieldPlayers = filteredAndSorted.filter((p) => p.position !== 'GK');
  const injuredPlayers = team.squad.filter(
    (p) => p.injuryStatus === 'injured' || p.injuryStatus === 'doubtful'
  );

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const comparedPair = compareIds
    .map((id) => team.squad.find((p) => p.id === id))
    .filter(Boolean) as Player[];

  const leadershipHistory = team.leadershipHistory?.length
    ? team.leadershipHistory
    : [
        ...(captain
          ? [
              {
                id: 'lh-c',
                role: 'C' as const,
                playerName: captain.name,
                since: captain.since,
                until: 'present',
              },
            ]
          : []),
        ...(viceCaptain
          ? [
              {
                id: 'lh-vc',
                role: 'VC' as const,
                playerName: viceCaptain.name,
                since: viceCaptain.since,
                until: 'present',
              },
            ]
          : []),
      ];

  const handleCreatePlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!npName.trim()) return;
    const nickname = npName.trim();
    const fullName = npFullName.trim() || nickname;
    const shortName = makePitchShortName(nickname);
    const resolvedDob = npDob.trim() || undefined;
    addPlayerToSquad(team.id, {
      name: nickname,
      nickname,
      fullName,
      shortName,
      position: npPos,
      positionDetail: npDetail.trim() || npPos,
      overallRating: Math.min(99, Math.max(45, npOvr)),
      nationality: npNat.trim() || team.country,
      shirtNumber: npShirt,
      dateOfBirth: resolvedDob,
      age: resolvePlayerAge(resolvedDob, npAge),
      attributes: {
        pace: npPos === 'GK' ? 50 : Math.min(99, npOvr + 1),
        shooting: npPos === 'ATT' ? npOvr : npPos === 'MID' ? Math.max(55, npOvr - 6) : 48,
        passing: Math.min(99, npOvr - 2),
        dribbling: npPos === 'GK' ? 54 : Math.min(99, npOvr - 1),
        defending: npPos === 'DEF' ? npOvr : npPos === 'MID' ? Math.max(55, npOvr - 8) : 40,
        physical: Math.max(55, npOvr - 4),
      },
    });
    setNpName('');
    setNpFullName('');
    setNpDob('');
    setIsNewPlayerModalOpen(false);
  };

  const handleSaveEditPlayer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    const resolvedAge = resolvePlayerAge(editingPlayer.dateOfBirth, editingPlayer.age);
    updatePlayerInSquad(team.id, {
      ...editingPlayer,
      age: resolvedAge,
    });
    setEditingPlayer(null);
  };

  const handleConfirmTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferringPlayer || !targetTransferClubId) return;
    transferPlayer(team.id, targetTransferClubId, transferringPlayer.id);
    setTransferringPlayer(null);
    setTargetTransferClubId('');
  };

  const handleAddInjurySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!injPlayerId) return;
    togglePlayerInjury(team.id, injPlayerId, injStatus, injReturnDate, injNote);
    setInjuryModalOpen(false);
    setInjPlayerId('');
  };

  const otherClubs = teams.filter(
    (t) => t.id !== team.id && getTeamType(t) === 'club' && t.gender === team.gender
  );

  const teamNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) map.set(t.id, t.name);
    return map;
  }, [teams]);

  const eligibleNationCallUpCandidates = useMemo(() => {
    if (!isNationalTeam || !isRegisterModalOpen) return [];
    const currentSquadIds = new Set(team.squad.map((p) => p.id));
    const q = registerSearch.trim().toLowerCase();
    const targetCountry = team.country.toLowerCase();
    const list: Array<{
      id: string;
      name: string;
      nationality: string;
      positionDetail: string;
      overallRating: number;
      activeClubName?: string;
      isNationalityMatch: boolean;
    }> = [];

    for (const identity of registry.identities.values()) {
      if (identity.gender !== team.gender) continue;
      if (currentSquadIds.has(identity.id)) continue;
      const matchesCountry =
        identity.nationality.toLowerCase() === targetCountry ||
        identity.secondaryNationality?.toLowerCase() === targetCountry;
      if (!q && !matchesCountry) continue;
      const displayName = getPlayerDisplayName(identity);
      if (
        q &&
        !displayName.toLowerCase().includes(q) &&
        !identity.name.toLowerCase().includes(q) &&
        !(identity.fullName && identity.fullName.toLowerCase().includes(q)) &&
        !identity.nationality.toLowerCase().includes(q) &&
        !identity.positionDetail.toLowerCase().includes(q)
      ) {
        continue;
      }
      const activeClubReg = Array.from(registry.clubRegistrations.values()).find(
        (r) => r.playerId === identity.id && r.status === 'active'
      );
      list.push({
        id: identity.id,
        name: displayName,
        nationality: identity.nationality,
        positionDetail: identity.positionDetail,
        overallRating: identity.overallRating,
        activeClubName: activeClubReg ? teamNameMap.get(activeClubReg.teamId) : undefined,
        isNationalityMatch: Boolean(matchesCountry),
      });
    }

    list.sort((a, b) => {
      if (a.isNationalityMatch !== b.isNationalityMatch) {
        return a.isNationalityMatch ? -1 : 1;
      }
      return b.overallRating - a.overallRating;
    });
    return list.slice(0, 60);
  }, [isNationalTeam, isRegisterModalOpen, team.squad, team.gender, team.country, registerSearch, registry, teamNameMap]);

  const filteredFreeAgentsForModal = useMemo(() => {
    if (isNationalTeam || !isRegisterModalOpen) return [];
    const q = registerSearch.trim().toLowerCase();
    return freeAgents
      .filter((fa) => (fa.gender || 'men') === team.gender)
      .filter(
        (fa) =>
          !q ||
          getPlayerDisplayName(fa).toLowerCase().includes(q) ||
          (fa.fullName && fa.fullName.toLowerCase().includes(q)) ||
          fa.nationality.toLowerCase().includes(q) ||
          fa.positionDetail.toLowerCase().includes(q)
      )
      .slice(0, 60);
  }, [isNationalTeam, isRegisterModalOpen, freeAgents, team.gender, registerSearch]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. CAPTAINCY PANEL */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#A78BFA] light:text-violet-600" />
            <h3 className="font-display text-lg text-white light:text-slate-900 uppercase tracking-wide">
              CAPTAINCY
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 light:text-slate-500">
            {isNationalTeam
              ? 'International armband — independent from club captaincies; passes on at substitution'
              : 'Club armband — independent from national-team captaincy; passes on at substitution'}
          </span>
        </div>

        {/* Captain & Vice-Captain Cards */}
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-3.5">
          {/* Captain Card */}
          <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center">
                  C
                </span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
                  CAPTAIN
                </span>
              </div>
              {canManage && captain?.player && (
                <button
                  type="button"
                  onClick={() => updateCaptaincy(team.id, 'captain', null)}
                  className="text-[11px] text-slate-400 hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {captain?.player ? (
              <div>
                <button
                  type="button"
                  onClick={() => openPlayerProfile(captain.player!.id)}
                  className="font-bold text-base text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 cursor-pointer text-left block transition-colors"
                >
                  {captain.name}
                </button>
                <span className="text-[11px] text-slate-400 light:text-slate-500 font-mono block mt-0.5">
                  No. {captain.player.shirtNumber} · {captain.player.positionDetail} · OVR{' '}
                  {captain.player.overallRating} · since {captain.since}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 light:text-slate-500 italic block">
                Not appointed
              </span>
            )}

            {canManage && (
              selectingRole === 'captain' ? (
                <select
                  value={captain?.player?.id || ''}
                  onChange={(e) => {
                    updateCaptaincy(team.id, 'captain', e.target.value || null);
                    setSelectingRole(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-[#8B5CF6]/60 text-xs text-white light:text-slate-900 cursor-pointer"
                >
                  <option value="">Choose registered player...</option>
                  {team.squad.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.shirtNumber} {p.name} ({p.positionDetail} · {p.overallRating})
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectingRole('captain')}
                  className="w-full py-2 rounded-lg bg-[#0C131F] light:bg-white hover:bg-[#131C2E] light:hover:bg-slate-100 border border-white/[0.08] light:border-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>{captain ? 'Change captain' : 'Appoint captain'}</span>
                </button>
              )
            )}
          </div>

          {/* Vice-Captain Card */}
          <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-1 h-4 rounded bg-slate-600/70 light:bg-slate-300 text-slate-200 light:text-slate-800 font-mono text-[9px] font-bold flex items-center justify-center">
                  VC
                </span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
                  VICE-CAPTAIN
                </span>
              </div>
              {canManage && viceCaptain?.player && (
                <button
                  type="button"
                  onClick={() => updateCaptaincy(team.id, 'viceCaptain', null)}
                  className="text-[11px] text-slate-400 hover:text-rose-400 inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {viceCaptain?.player ? (
              <div>
                <button
                  type="button"
                  onClick={() => openPlayerProfile(viceCaptain.player!.id)}
                  className="font-bold text-base text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 cursor-pointer text-left block transition-colors"
                >
                  {viceCaptain.name}
                </button>
                <span className="text-[11px] text-slate-400 light:text-slate-500 font-mono block mt-0.5">
                  No. {viceCaptain.player.shirtNumber} · {viceCaptain.player.positionDetail} · OVR{' '}
                  {viceCaptain.player.overallRating} · since {viceCaptain.since}
                </span>
              </div>
            ) : (
              <span className="text-xs text-slate-400 light:text-slate-500 italic block">
                Not appointed
              </span>
            )}

            {canManage && (
              selectingRole === 'viceCaptain' ? (
                <select
                  value={viceCaptain?.player?.id || ''}
                  onChange={(e) => {
                    updateCaptaincy(team.id, 'viceCaptain', e.target.value || null);
                    setSelectingRole(null);
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-[#8B5CF6]/60 text-xs text-white light:text-slate-900 cursor-pointer"
                >
                  <option value="">Choose registered player...</option>
                  {team.squad.map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.shirtNumber} {p.name} ({p.positionDetail} · {p.overallRating})
                    </option>
                  ))}
                </select>
              ) : (
                <button
                  type="button"
                  onClick={() => setSelectingRole('viceCaptain')}
                  className="w-full py-2 rounded-lg bg-[#0C131F] light:bg-white hover:bg-[#131C2E] light:hover:bg-slate-100 border border-white/[0.08] light:border-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5 text-slate-400" />
                  <span>{viceCaptain ? 'Change vice-captain' : 'Appoint vice-captain'}</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Pick the leadership pair bar */}
        {canManage && (
          <>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={() => {
                  setPairCapId(captain?.player?.id || '');
                  setPairVcId(viceCaptain?.player?.id || '');
                  setSelectingRole(selectingRole === 'pair' ? null : 'pair');
                }}
                className="px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-100 hover:bg-[#8B5CF6]/15 border border-white/10 light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 inline-flex items-center gap-2 cursor-pointer transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#A78BFA] light:text-violet-600" />
                <span>Pick the leadership pair</span>
              </button>
              <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400 light:text-slate-500 uppercase">
                CHOOSES FROM REGISTERED PLAYERS ONLY · NEVER A RANDOM PICK
              </span>
            </div>

            {selectingRole === 'pair' && (
              <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-[#8B5CF6]/50 p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Captain
                  </label>
                  <select
                    value={pairCapId}
                    onChange={(e) => setPairCapId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  >
                    <option value="">None</option>
                    {team.squad.map((p) => (
                      <option key={p.id} value={p.id}>
                        #{p.shirtNumber} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Vice-Captain
                  </label>
                  <select
                    value={pairVcId}
                    onChange={(e) => setPairVcId(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  >
                    <option value="">None</option>
                    {team.squad
                      .filter((p) => p.id !== pairCapId)
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          #{p.shirtNumber} {p.name}
                        </option>
                      ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    updateLeadershipPair(team.id, pairCapId || null, pairVcId || null);
                    setSelectingRole(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-[#8B5CF6] hover:bg-[#A78BFA] text-white font-semibold text-xs inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirm pair</span>
                </button>
              </div>
            )}
          </>
        )}

        {/* Captaincy History */}
        {leadershipHistory.length > 0 && (
          <div className="pt-2 space-y-2">
            <span className="block font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
              CAPTAINCY HISTORY
            </span>
            <div className="space-y-1.5">
              {leadershipHistory.map((h) => (
                <div
                  key={h.id}
                  className="rounded-lg bg-[#080E18] light:bg-slate-50 border border-white/[0.05] light:border-slate-200 px-3 py-2 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-black shrink-0 ${
                        h.role === 'C'
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-700 text-slate-200'
                      }`}
                    >
                      {h.role}
                    </span>
                    <span className="font-semibold text-white light:text-slate-900 truncate">
                      {h.playerName}
                    </span>
                    {h.until === 'present' && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 light:bg-emerald-50 light:text-emerald-700 font-mono text-[9px] font-bold uppercase">
                        CURRENT
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 light:text-slate-500 shrink-0 tabular-nums">
                    {h.since} → {h.until}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. SQUAD HEADER & REGISTRATION CONTROLS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
        <div>
          <h3 className="font-display text-2xl text-white light:text-slate-900 uppercase tracking-wide leading-none">
            SQUAD
          </h3>
          <p className="text-xs text-slate-400 light:text-slate-600 mt-1">
            {team.squad.length} registered players · filter by goalkeeper, defence, midfield or attack
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setRegisterSearch('');
                setIsRegisterModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#0C131F] light:bg-white hover:bg-[#131C2E] light:hover:bg-slate-100 border border-white/[0.12] light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
              <span>{isNationalTeam ? 'Call up player' : 'Register existing player'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsNewPlayerModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#9BE6F6] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all shadow-[0_0_16px_rgba(122,219,240,0.25)]"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>New player</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. FILTER & COMPARE BAR */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase">
                SORT BY
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 cursor-pointer"
              >
                <option value="position">Position</option>
                <option value="overall">Overall</option>
                <option value="name">Name</option>
                <option value="age">Age</option>
                <option value="shirt">Shirt #</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 uppercase">
                SHOW
              </span>
              <select
                value={lineFilter}
                onChange={(e) => setLineFilter(e.target.value as any)}
                className="px-3 py-1.5 rounded-xl bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 cursor-pointer"
              >
                <option value="all">All lines</option>
                <option value="GK">Goalkeepers</option>
                <option value="DEF">Defence</option>
                <option value="MID">Midfield</option>
                <option value="ATT">Attack</option>
              </select>
            </div>
          </div>

          <span className="font-mono text-xs text-slate-400 light:text-slate-600 tabular-nums">
            {filteredAndSorted.length} of {team.squad.length} players
          </span>
        </div>

        <div className="border-t border-white/[0.06] light:border-slate-200 pt-3 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-xs text-slate-400 light:text-slate-600">
            {compareIds.length === 0
              ? 'Tick two players to compare them.'
              : compareIds.length === 1
              ? 'Select 1 more player to compare.'
              : '2 players selected for comparison.'}
          </span>

          <button
            type="button"
            disabled={compareIds.length !== 2}
            onClick={() => setIsCompareModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all ${
              compareIds.length === 2
                ? 'bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white cursor-pointer shadow-md'
                : 'bg-[#121D2D] light:bg-slate-100 text-slate-400 light:text-slate-500 border border-white/[0.06] light:border-slate-200 cursor-not-allowed'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Compare players</span>
          </button>
        </div>
      </div>

      {/* 4. SQUAD TABLES (Empty state OR Goalkeepers + Outfield Players) */}
      {team.squad.length === 0 ? (
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-dashed border-white/15 light:border-slate-300 p-10 text-center space-y-3">
          <p className="text-sm font-semibold text-white light:text-slate-900">
            No players registered in this squad yet
          </p>
          {canManage && (
            <button
              type="button"
              onClick={() => setIsNewPlayerModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#8B5CF6] hover:bg-[#A78BFA] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add the first player</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* GOALKEEPERS TABLE */}
          {goalkeepers.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[10px] tracking-[0.22em] text-slate-400 light:text-slate-600 uppercase">
                  GOALKEEPERS
                </span>
                <span className="font-mono text-[10px] tracking-[0.18em] text-slate-500 uppercase hidden sm:inline">
                  DIV · HAN · KIC · REF · SPD · POS
                </span>
              </div>

              <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[680px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] light:border-slate-200 font-mono text-[10px] tracking-[0.18em] text-slate-400 light:text-slate-500 uppercase">
                      <th className="py-3 pl-4 pr-2 w-10"></th>
                      <th className="py-3 px-2 w-14">NO.</th>
                      <th className="py-3 px-2">GOALKEEPER</th>
                      <th className="py-3 px-2 text-center">AGE</th>
                      <th className="py-3 px-2 text-center">OVR</th>
                      <th className="py-3 px-2 text-center">DIV</th>
                      <th className="py-3 px-2 text-center">HAN</th>
                      <th className="py-3 px-2 text-center">KIC</th>
                      <th className="py-3 px-2 text-center">REF</th>
                      <th className="py-3 px-2 text-center">SPD</th>
                      <th className="py-3 px-2 text-center">POS</th>
                      {showActionsColumn && (
                        <th className="py-3 pl-2 pr-4 text-right">ACTIONS</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] light:divide-slate-200 text-xs">
                    {goalkeepers.map((p) => {
                      const gk = getGkDerivedStats(p);
                      const displayName = getPlayerDisplayName(p);
                      const init = displayName
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase();
                      const checked = compareIds.includes(p.id);
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-white/[0.03] light:hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 pl-4 pr-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCompare(p.id)}
                              className="rounded border-white/20 bg-transparent accent-[#7ADBF0] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-400 light:text-slate-600 tabular-nums">
                            {p.shirtNumber}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${AVATAR_RING.GK}`}
                              >
                                {init}
                              </span>
                              <button
                                type="button"
                                onClick={() => openPlayerProfile(p.id)}
                                className="font-semibold text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 cursor-pointer text-left transition-colors"
                              >
                                {displayName}
                              </button>
                              {p.isCaptain && (
                                <span className="w-4 h-4 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center">
                                  C
                                </span>
                              )}
                            </div>
                          </td>
                          <td
                            className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums"
                            title={p.dateOfBirth ? `DOB: ${p.dateOfBirth}` : undefined}
                          >
                            {resolvePlayerAge(p.dateOfBirth, p.age)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-[#112636] light:bg-cyan-50 border border-[#7ADBF0]/40 light:border-cyan-500/50 font-mono font-bold text-[#7ADBF0] light:text-cyan-800 tabular-nums">
                              {p.overallRating}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {gk.diving}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {gk.handling}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {gk.kicking}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {gk.reflexes}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {gk.speed}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {gk.positioning}
                          </td>
                          {showActionsColumn && (
                            <td className="py-3 pl-2 pr-4">
                              <div className="flex items-center justify-end gap-2 text-slate-400">
                                {isAdmin && !isNationalTeam && (
                                  <button
                                    type="button"
                                    onClick={() => setTransferringPlayer(p)}
                                    className="p-1.5 rounded-lg hover:bg-white/[0.08] light:hover:bg-slate-200 hover:text-[#7ADBF0] cursor-pointer"
                                    title={`Transfer ${p.name}`}
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPlayer(p)}
                                      className="p-1.5 rounded-lg hover:bg-white/[0.08] light:hover:bg-slate-200 hover:text-white light:hover:text-slate-900 cursor-pointer"
                                      title={`Edit ${p.name}`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deletePlayerFromSquad(team.id, p.id)}
                                      className="p-1.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer"
                                      title={
                                        isNationalTeam
                                          ? `End ${p.name}'s national call-up`
                                          : `Release ${p.name} from ${team.shortName}`
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* OUTFIELD PLAYERS TABLE */}
          {outfieldPlayers.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-mono text-[10px] tracking-[0.22em] text-slate-400 light:text-slate-600 uppercase">
                  OUTFIELD PLAYERS
                </span>
              </div>

              <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[680px]">
                  <thead>
                    <tr className="border-b border-white/[0.06] light:border-slate-200 font-mono text-[10px] tracking-[0.18em] text-slate-400 light:text-slate-500 uppercase">
                      <th className="py-3 pl-4 pr-2 w-10"></th>
                      <th className="py-3 px-2 w-14">NO.</th>
                      <th className="py-3 px-2">PLAYER</th>
                      <th className="py-3 px-2 text-center">POS</th>
                      <th className="py-3 px-2 text-center">AGE</th>
                      <th className="py-3 px-2 text-center">OVR</th>
                      <th className="py-3 px-2 text-center">PAC</th>
                      <th className="py-3 px-2 text-center">PAS</th>
                      <th className="py-3 px-2 text-center">SHO</th>
                      <th className="py-3 px-2 text-center">DEF</th>
                      <th className="py-3 px-2 text-center">PHY</th>
                      {showActionsColumn && (
                        <th className="py-3 pl-2 pr-4 text-right">ACTIONS</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05] light:divide-slate-200 text-xs">
                    {outfieldPlayers.map((p) => {
                      const displayName = getPlayerDisplayName(p);
                      const init = displayName
                        .split(' ')
                        .slice(0, 2)
                        .map((w) => w[0])
                        .join('')
                        .toUpperCase();
                      const checked = compareIds.includes(p.id);
                      const posStyle =
                        POS_DETAIL_BADGE[p.positionDetail] ||
                        'bg-emerald-500/15 text-emerald-300 border-emerald-500/40';
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-white/[0.03] light:hover:bg-slate-50 transition-colors"
                        >
                          <td className="py-3 pl-4 pr-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleCompare(p.id)}
                              className="rounded border-white/20 bg-transparent accent-[#7ADBF0] cursor-pointer"
                            />
                          </td>
                          <td className="py-3 px-2 font-mono text-slate-400 light:text-slate-600 tabular-nums">
                            {p.shirtNumber}
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[10px] font-bold shrink-0 ${
                                  AVATAR_RING[p.position]
                                }`}
                              >
                                {init}
                              </span>
                              <button
                                type="button"
                                onClick={() => openPlayerProfile(p.id)}
                                className="font-semibold text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 cursor-pointer text-left transition-colors"
                              >
                                {displayName}
                              </button>
                              {p.isCaptain && (
                                <span className="w-4 h-4 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center">
                                  C
                                </span>
                              )}
                              {p.isViceCaptain && (
                                <span className="px-1 rounded bg-slate-700 text-slate-200 font-mono text-[9px] font-bold">
                                  VC
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded border font-mono text-[10px] font-bold ${posStyle}`}
                            >
                              {p.positionDetail}
                            </span>
                          </td>
                          <td
                            className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums"
                            title={p.dateOfBirth ? `DOB: ${p.dateOfBirth}` : undefined}
                          >
                            {resolvePlayerAge(p.dateOfBirth, p.age)}
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-7 rounded-lg bg-[#112636] light:bg-cyan-50 border border-[#7ADBF0]/40 light:border-cyan-500/50 font-mono font-bold text-[#7ADBF0] light:text-cyan-800 tabular-nums">
                              {p.overallRating}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {p.attributes.pace}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {p.attributes.passing}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {p.attributes.shooting}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {p.attributes.defending}
                          </td>
                          <td className="py-3 px-2 text-center font-mono text-slate-300 light:text-slate-700 tabular-nums">
                            {p.attributes.physical}
                          </td>
                          {showActionsColumn && (
                            <td className="py-3 pl-2 pr-4">
                              <div className="flex items-center justify-end gap-2 text-slate-400">
                                {isAdmin && !isNationalTeam && (
                                  <button
                                    type="button"
                                    onClick={() => setTransferringPlayer(p)}
                                    className="p-1.5 rounded-lg hover:bg-white/[0.08] light:hover:bg-slate-200 hover:text-[#7ADBF0] cursor-pointer"
                                    title={`Transfer ${p.name}`}
                                  >
                                    <ArrowLeftRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canManage && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setEditingPlayer(p)}
                                      className="p-1.5 rounded-lg hover:bg-white/[0.08] light:hover:bg-slate-200 hover:text-white light:hover:text-slate-900 cursor-pointer"
                                      title={`Edit ${p.name}`}
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => deletePlayerFromSquad(team.id, p.id)}
                                      className="p-1.5 rounded-lg hover:bg-rose-500/20 hover:text-rose-400 cursor-pointer"
                                      title={
                                        isNationalTeam
                                          ? `End ${p.name}'s national call-up`
                                          : `Release ${p.name} from ${team.shortName}`
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. INJURIES SECTION (InjuryList) */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#A78BFA] light:text-violet-600" />
            <h3 className="font-bold text-sm text-white light:text-slate-900">Injuries</h3>
          </div>
          {canManage && team.squad.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setInjPlayerId(team.squad[0].id);
                setInjuryModalOpen(!injuryModalOpen);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#080E18] light:bg-slate-100 border border-white/10 light:border-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800 cursor-pointer"
            >
              {injuryModalOpen ? 'Cancel' : 'Log injury'}
            </button>
          )}
        </div>

        {canManage && injuryModalOpen && (
          <form
            onSubmit={handleAddInjurySubmit}
            className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-violet-500/40 p-3.5 grid grid-cols-1 landscape-mobile:grid-cols-4 sm:grid-cols-4 gap-2.5 items-end"
          >
            <select
              value={injPlayerId}
              onChange={(e) => setInjPlayerId(e.target.value)}
              className="px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            >
              {team.squad.map((p) => (
                <option key={p.id} value={p.id}>
                  #{p.shirtNumber} {p.name}
                </option>
              ))}
            </select>
            <select
              value={injStatus}
              onChange={(e) => setInjStatus(e.target.value as any)}
              className="px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            >
              <option value="injured">Injured (Unavailable)</option>
              <option value="doubtful">Doubtful</option>
            </select>
            <input
              type="text"
              value={injReturnDate}
              onChange={(e) => setInjReturnDate(e.target.value)}
              placeholder="Return date (e.g. 2026-12-01)"
              className="px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            />
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#8B5CF6] text-white font-semibold text-xs cursor-pointer"
            >
              Save status
            </button>
          </form>
        )}

        {injuredPlayers.length > 0 ? (
          <div className="space-y-2">
            {injuredPlayers.map((p) => (
              <div
                key={p.id}
                className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <button
                    type="button"
                    onClick={() => openPlayerProfile(p.id)}
                    className="font-semibold text-white light:text-slate-900 hover:text-[#7ADBF0] cursor-pointer transition-colors"
                  >
                    {p.name}
                  </button>
                  <span className="text-slate-400 light:text-slate-600 ml-2">
                    {p.injuryNote || 'Unavailable'} · Return: {p.injuryReturnDate || 'TBD'}
                  </span>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => togglePlayerInjury(team.id, p.id, 'fit')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 light:text-emerald-700 font-semibold text-[11px] cursor-pointer"
                  >
                    Mark fit
                  </button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 light:text-slate-500">
            Nobody is on the treatment table.
          </p>
        )}
      </div>

      {/* MODAL: Call Up Eligible Player (National) OR Register Free Agent (Club) */}
      {canManage && isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 landscape-mobile:p-3">
          <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-base text-white light:text-slate-900">
                  {isNationalTeam
                    ? `Call Up Player to ${team.shortName}`
                    : 'Register Existing Player (Club Free Agents)'}
                </h3>
                <p className="text-[11px] text-slate-400 light:text-slate-500 mt-0.5">
                  {isNationalTeam
                    ? 'Active club players and free agents keep their club status when called up.'
                    : 'Signing a club free agent preserves their permanent identity and national call-ups.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRegisterModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <input
              type="text"
              value={registerSearch}
              onChange={(e) => setRegisterSearch(e.target.value)}
              placeholder={
                isNationalTeam
                  ? `Search eligible players (${team.country} shown first)...`
                  : 'Filter free agents by name, nationality or role...'
              }
              className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            />

            <div className="max-h-72 landscape-mobile:max-h-40 overflow-y-auto space-y-2 pr-1">
              {isNationalTeam ? (
                eligibleNationCallUpCandidates.length > 0 ? (
                  eligibleNationCallUpCandidates.map((cand) => (
                    <div
                      key={cand.id}
                      className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => {
                            setIsRegisterModalOpen(false);
                            openPlayerProfile(cand.id);
                          }}
                          className="font-semibold text-white light:text-slate-900 hover:text-[#7ADBF0] block text-left truncate cursor-pointer"
                        >
                          {cand.name}
                        </button>
                        <span className="text-[11px] text-slate-400 light:text-slate-500 block truncate">
                          {cand.positionDetail} · {cand.nationality} · OVR {cand.overallRating} ·{' '}
                          {cand.activeClubName || 'Club Free Agent'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          void callUpPlayerToNation(team.id, cand.id);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold shrink-0 cursor-pointer"
                      >
                        Call up
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 text-center py-4">
                    No matching eligible players found.
                  </p>
                )
              ) : filteredFreeAgentsForModal.length > 0 ? (
                filteredFreeAgentsForModal.map((fa) => (
                  <div
                    key={fa.id}
                    className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsRegisterModalOpen(false);
                          openPlayerProfile(fa.id);
                        }}
                        className="font-semibold text-white light:text-slate-900 hover:text-[#7ADBF0] block text-left truncate cursor-pointer"
                      >
                        {fa.name}
                      </button>
                      <span className="text-[11px] text-slate-400 light:text-slate-500">
                        {fa.positionDetail} · {fa.nationality} · OVR {fa.overallRating}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        signFreeAgent(team.id, fa);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-semibold shrink-0 cursor-pointer"
                    >
                      Register
                    </button>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">
                  No free agents currently available.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: New Player */}
      {canManage && isNewPlayerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 landscape-mobile:p-3">
          <form
            onSubmit={handleCreatePlayer}
            className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white light:text-slate-900">
                Add new player to {team.shortName}
              </h3>
              <button
                type="button"
                onClick={() => setIsNewPlayerModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                required
                value={npName}
                onChange={(e) => setNpName(e.target.value)}
                placeholder="Player nickname / display name (e.g. Pedri)"
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
              <input
                type="text"
                value={npFullName}
                onChange={(e) => setNpFullName(e.target.value)}
                placeholder="Player full legal name (shown on profile, optional)"
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={npPos}
                  onChange={(e) => {
                    const pos = e.target.value as PlayerPosition;
                    setNpPos(pos);
                    setNpDetail(pos === 'GK' ? 'GK' : pos === 'DEF' ? 'CB' : pos === 'MID' ? 'CM' : 'ST');
                  }}
                  className="px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                >
                  <option value="GK">GK</option>
                  <option value="DEF">DEF</option>
                  <option value="MID">MID</option>
                  <option value="ATT">ATT</option>
                </select>
                <input
                  type="text"
                  value={npDetail}
                  onChange={(e) => setNpDetail(e.target.value.toUpperCase())}
                  placeholder="Role (e.g. CB, CM, ST)"
                  className="px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    value={npDob}
                    onChange={(e) => {
                      const nextDob = e.target.value;
                      setNpDob(nextDob);
                      const dobAge = calculateAgeFromDob(nextDob);
                      if (dobAge !== null) setNpAge(dobAge);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Age {calculateAgeFromDob(npDob) !== null ? '(DOB)' : ''}
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={45}
                    disabled={calculateAgeFromDob(npDob) !== null}
                    value={calculateAgeFromDob(npDob) ?? npAge}
                    onChange={(e) => setNpAge(Number(e.target.value) || 21)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900 disabled:opacity-65 disabled:cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    OVR
                  </label>
                  <input
                    type="number"
                    min={45}
                    max={99}
                    value={npOvr}
                    onChange={(e) => setNpOvr(Number(e.target.value) || 75)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                    Shirt #
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={npShirt}
                    onChange={(e) => setNpShirt(Number(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  />
                </div>
              </div>
              <input
                type="text"
                value={npNat}
                onChange={(e) => setNpNat(e.target.value)}
                placeholder="Nationality"
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsNewPlayerModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs text-slate-300 light:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold text-xs cursor-pointer"
              >
                Add player
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Edit Player */}
      {canManage && editingPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 landscape-mobile:p-3">
          <form
            onSubmit={handleSaveEditPlayer}
            className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white light:text-slate-900">
                Edit {getPlayerDisplayName(editingPlayer)}
              </h3>
              <button
                type="button"
                onClick={() => setEditingPlayer(null)}
                className="p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Nickname (Displayed)
                </label>
                <input
                  type="text"
                  value={editingPlayer.nickname ?? editingPlayer.name}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      name: e.target.value,
                      nickname: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Full Name (Profile)
                </label>
                <input
                  type="text"
                  value={editingPlayer.fullName ?? editingPlayer.name}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, fullName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Shirt #
                </label>
                <input
                  type="number"
                  value={editingPlayer.shirtNumber}
                  onChange={(e) =>
                    setEditingPlayer({ ...editingPlayer, shirtNumber: Number(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Overall
                </label>
                <input
                  type="number"
                  min={45}
                  max={99}
                  value={editingPlayer.overallRating}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      overallRating: Number(e.target.value) || 75,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={editingPlayer.dateOfBirth || ''}
                  onChange={(e) => {
                    const nextDob = e.target.value;
                    const dobAge = calculateAgeFromDob(nextDob);
                    setEditingPlayer({
                      ...editingPlayer,
                      dateOfBirth: nextDob,
                      age: dobAge !== null ? dobAge : editingPlayer.age,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                  Age {calculateAgeFromDob(editingPlayer.dateOfBirth) !== null ? '(DOB)' : ''}
                </label>
                <input
                  type="number"
                  min={15}
                  max={55}
                  disabled={calculateAgeFromDob(editingPlayer.dateOfBirth) !== null}
                  value={calculateAgeFromDob(editingPlayer.dateOfBirth) ?? editingPlayer.age}
                  onChange={(e) =>
                    setEditingPlayer({
                      ...editingPlayer,
                      age: Number(e.target.value) || 20,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900 disabled:opacity-65 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold text-xs cursor-pointer"
              >
                Save player
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Transfer Player (Admin-only, Clubs Only) */}
      {isAdmin && !isNationalTeam && transferringPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 landscape-mobile:p-3">
          <form
            onSubmit={handleConfirmTransfer}
            className="w-full max-w-md max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white light:text-slate-900">
                Transfer {transferringPlayer.name}
              </h3>
              <button
                type="button"
                onClick={() => setTransferringPlayer(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <select
              required
              value={targetTransferClubId}
              onChange={(e) => setTargetTransferClubId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            >
              <option value="">Select destination club...</option>
              {otherClubs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.league})
                </option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold text-xs cursor-pointer"
              >
                Complete transfer
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Compare 2 Players */}
      {isCompareModalOpen && comparedPair.length === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 landscape-mobile:p-3">
          <div className="w-full max-w-lg max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-6 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white light:text-slate-900">
                Player comparison
              </h3>
              <button
                type="button"
                onClick={() => setIsCompareModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 text-xs items-center font-bold text-center border-b border-white/10 light:border-slate-200 pb-3">
              <div className="text-[#7ADBF0] light:text-cyan-700 truncate">
                {comparedPair[0].name}
              </div>
              <div className="font-mono text-[10px] text-slate-400">STAT</div>
              <div className="text-[#A78BFA] light:text-violet-700 truncate">
                {comparedPair[1].name}
              </div>
            </div>
            {(
              [
                ['OVR', comparedPair[0].overallRating, comparedPair[1].overallRating],
                ['PAC', comparedPair[0].attributes.pace, comparedPair[1].attributes.pace],
                ['PAS', comparedPair[0].attributes.passing, comparedPair[1].attributes.passing],
                ['SHO', comparedPair[0].attributes.shooting, comparedPair[1].attributes.shooting],
                ['DEF', comparedPair[0].attributes.defending, comparedPair[1].attributes.defending],
                ['PHY', comparedPair[0].attributes.physical, comparedPair[1].attributes.physical],
              ] as const
            ).map(([label, a, b]) => (
              <div key={label} className="grid grid-cols-3 gap-3 text-xs text-center font-mono">
                <div className={a >= b ? 'text-white light:text-slate-900 font-bold' : 'text-slate-400'}>
                  {a}
                </div>
                <div className="text-slate-500">{label}</div>
                <div className={b >= a ? 'text-white light:text-slate-900 font-bold' : 'text-slate-400'}>
                  {b}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
