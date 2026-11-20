import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowLeftRight,
  Check,
  Edit2,
  Globe,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserMinus,
  X,
} from 'lucide-react';
import {
  GenderType,
  getPlayerDisplayName,
  getPlayerFullName,
  PlayerAttributes,
  PlayerPosition,
  PlayerProfileView,
  resolvePlayerAge,
  calculateAgeFromDob,
  TeamTypeCode,
  getTeamType,
} from '../../types/matchCentre';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { useAuth } from '../../context/AuthContext';
import {
  FIFA_COUNTRY_METADATA,
  getCountryFlag,
  normalizeCountryName,
} from '../../data/countryMetadata';
import { getGkDerivedStats, getOverallScheme } from './dossier/dossierUtils';
import { TeamEmblem } from './TeamEmblem';
import {
  BALLON_DOR_ASSETS,
  getCombinedBallonDorWinsForIdentity,
} from '../../data/ballonDorWinners';
import {
  filterTeamsFast,
  normalizeDatabaseSearchText,
} from '../../utils/globalDatabaseSearch';

interface PlayerProfilePageProps {
  playerId: string;
  onBack: () => void;
  onOpenTeam: (teamId: string) => void;
  onDeleted?: () => void;
}

const POSITION_LIST: PlayerPosition[] = ['GK', 'DEF', 'MID', 'ATT'];
const POSITION_DETAILS = ['GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'ST'];

export const PlayerProfilePage: React.FC<PlayerProfilePageProps> = ({
  playerId,
  onBack,
  onOpenTeam,
  onDeleted,
}) => {
  const {
    teams,
    getPlayerProfile,
    updatePlayerIdentityProfile,
    deletePlayerIdentityProfile,
    registerPlayerToTeamAction,
    updateRegistrationAction,
    releaseRegistrationAction,
    removeRegistrationAction,
    transferClubPlayerAction,
    retirePlayerFromNationAction,
    unretirePlayerFromNationAction,
    changePlayerNationAction,
    toast,
    showToast,
  } = useMatchCentre();
  const { isAdmin } = useAuth();

  // Instant context fallback + live backend fetch for freshest simulated match logs
  const contextProfile = useMemo(() => getPlayerProfile(playerId), [getPlayerProfile, playerId]);
  const [serverProfile, setServerProfile] = useState<PlayerProfileView | null>(null);
  const [loadingRemote, setLoadingRemote] = useState<boolean>(false);

  const loadServerProfile = async () => {
    setLoadingRemote(true);
    try {
      const res = await fetch(`/api/public/players/${encodeURIComponent(playerId)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setServerProfile(data.profile);
        }
      }
    } catch {
      // use contextProfile
    } finally {
      setLoadingRemote(false);
    }
  };

  useEffect(() => {
    setServerProfile(null);
    void loadServerProfile();
  }, [playerId]);

  const profile = contextProfile || serverProfile;

  // Admin modal / form states
  const [isEditingIdentity, setIsEditingIdentity] = useState(false);
  const [editForm, setEditForm] = useState<{
    name: string;
    fullName: string;
    dateOfBirth: string;
    age: number;
    nationality: string;
    secondaryNationality: string;
    gender: GenderType;
    position: PlayerPosition;
    positionDetail: string;
    overallRating: number;
    preferredFoot: 'Right' | 'Left' | '';
    heightCm: string;
    injuryStatus: 'fit' | 'doubtful' | 'injured';
    injuryNote: string;
    injuryReturnDate: string;
    attributes: PlayerAttributes;
    legacyClubApps: number;
    legacyClubGoals: number;
    legacyClubAssists: number;
    legacyIntlApps: number;
    legacyIntlGoals: number;
    legacyIntlAssists: number;
  } | null>(null);

  // Registration & Transfer modal states (admin)
  const [signClubTeamId, setSignClubTeamId] = useState('');
  const [signClubShirt, setSignClubShirt] = useState('');
  const [transferTargetClubId, setTransferTargetClubId] = useState('');
  const [transferShirt, setTransferShirt] = useState('');
  const [transferDate, setTransferDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [callUpNationId, setCallUpNationId] = useState('');
  const [callUpShirt, setCallUpShirt] = useState('');

  // Inline registration edit state
  const [editingRegId, setEditingRegId] = useState<string | null>(null);
  const [editingRegType, setEditingRegType] = useState<TeamTypeCode>('club');
  const [regShirtDraft, setRegShirtDraft] = useState<string>('');
  const [regAppsDraft, setRegAppsDraft] = useState<number>(0);
  const [regGoalsDraft, setRegGoalsDraft] = useState<number>(0);
  const [regAssistsDraft, setRegAssistsDraft] = useState<number>(0);

  // Ballon d'Or modal state
  const [isAddBallonDorOpen, setIsAddBallonDorOpen] = useState(false);
  const [bdYear, setBdYear] = useState<number>(new Date().getFullYear());
  const [bdTeamName, setBdTeamName] = useState('');
  const [bdNote, setBdNote] = useState('');

  // Confirm delete identity modal
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  // Career Action Modals (Transfer Club, Change Nation, Retire from Nation)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferSearch, setTransferSearch] = useState('');
  const deferredTransferSearch = useDeferredValue(transferSearch);
  const [isChangeNationModalOpen, setIsChangeNationModalOpen] = useState(false);
  const [nationSearch, setNationSearch] = useState('');
  const deferredNationSearch = useDeferredValue(nationSearch);
  const [targetNationality, setTargetNationality] = useState('');
  const [switchNationalSquad, setSwitchNationalSquad] = useState(true);
  const [changeNationShirt, setChangeNationShirt] = useState('');
  const [isRetireNationModalOpen, setIsRetireNationModalOpen] = useState(false);
  const [retireDate, setRetireDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [submittingCareerAction, setSubmittingCareerAction] = useState(false);

  const sortedFifaCountries = useMemo(
    () =>
      [...FIFA_COUNTRY_METADATA].sort((a, b) =>
        a.canonicalName.localeCompare(b.canonicalName)
      ),
    []
  );

  const clubOptions = useMemo(() => {
    if (!profile) return [];
    return teams
      .filter((t) => getTeamType(t) === 'club' && t.gender === profile.identity.gender)
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [teams, profile]);

  const filteredTransferClubs = useMemo(() => {
    if (!profile) return [];
    const activeTeamId = profile.activeClub?.teamId;
    return filterTeamsFast(
      clubOptions,
      deferredTransferSearch,
      (c) => c.id !== activeTeamId
    );
  }, [clubOptions, profile, deferredTransferSearch]);

  const filteredFifaCountries = useMemo(() => {
    const q = normalizeDatabaseSearchText(deferredNationSearch);
    if (!q) return sortedFifaCountries;
    return sortedFifaCountries.filter(
      (c) =>
        normalizeDatabaseSearchText(c.canonicalName).includes(q) ||
        normalizeDatabaseSearchText(c.fifaCode).includes(q) ||
        normalizeDatabaseSearchText(c.confederation).includes(q)
    );
  }, [sortedFifaCountries, deferredNationSearch]);

  const nationOptions = useMemo(() => {
    if (!profile) return [];
    return teams
      .filter((t) => getTeamType(t) === 'country' && t.gender === profile.identity.gender)
      .sort((a, b) => {
        const isMatchA = a.country.toLowerCase() === profile.identity.nationality.toLowerCase() ? 0 : 1;
        const isMatchB = b.country.toLowerCase() === profile.identity.nationality.toLowerCase() ? 0 : 1;
        if (isMatchA !== isMatchB) return isMatchA - isMatchB;
        return a.name.localeCompare(b.name);
      });
  }, [teams, profile]);

  useEffect(() => {
    if (!profile) return;
    const natDefault =
      nationOptions.find(
        (n) => n.country.toLowerCase() === profile.identity.nationality.toLowerCase()
      ) || nationOptions[0];
    if (natDefault && !callUpNationId) {
      setCallUpNationId(natDefault.id);
    }
    const firstClub = clubOptions.find((c) => c.id !== profile.activeClub?.teamId);
    if (firstClub && (!transferTargetClubId || transferTargetClubId === profile.activeClub?.teamId)) {
      setTransferTargetClubId(firstClub.id);
    }
    if (clubOptions[0] && !signClubTeamId) {
      setSignClubTeamId(clubOptions[0].id);
    }
  }, [profile, clubOptions, nationOptions, callUpNationId, transferTargetClubId, signClubTeamId]);

  const openEditIdentity = () => {
    if (!profile) return;
    const id = profile.identity;
    setEditForm({
      name: getPlayerDisplayName(id),
      fullName: getPlayerFullName(id),
      dateOfBirth: id.dateOfBirth || '',
      age: resolvePlayerAge(id.dateOfBirth, id.age),
      nationality: id.nationality,
      secondaryNationality: id.secondaryNationality || '',
      gender: id.gender,
      position: id.position,
      positionDetail: id.positionDetail,
      overallRating: id.overallRating,
      preferredFoot: id.preferredFoot || '',
      heightCm: id.heightCm ? String(id.heightCm) : '',
      injuryStatus: id.injuryStatus || 'fit',
      injuryNote: id.injuryNote || '',
      injuryReturnDate: id.injuryReturnDate || '',
      attributes: { ...id.attributes },
      legacyClubApps: id.legacyClubStats?.appearances || 0,
      legacyClubGoals: id.legacyClubStats?.goals || 0,
      legacyClubAssists: id.legacyClubStats?.assists || 0,
      legacyIntlApps: id.legacyInternationalStats?.appearances || 0,
      legacyIntlGoals: id.legacyInternationalStats?.goals || 0,
      legacyIntlAssists: id.legacyInternationalStats?.assists || 0,
    });
    setIsEditingIdentity(true);
  };

  const handleSaveIdentity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !editForm) return;
    const derivedAge = calculateAgeFromDob(editForm.dateOfBirth);
    const res = await updatePlayerIdentityProfile(profile.identity.id, {
      name: editForm.name,
      nickname: editForm.name,
      fullName: editForm.fullName,
      dateOfBirth: editForm.dateOfBirth,
      age: derivedAge !== null ? derivedAge : editForm.age,
      nationality: editForm.nationality,
      secondaryNationality: editForm.secondaryNationality,
      gender: editForm.gender,
      position: editForm.position,
      positionDetail: editForm.positionDetail,
      overallRating: editForm.overallRating,
      preferredFoot: editForm.preferredFoot || undefined,
      heightCm: editForm.heightCm ? Number(editForm.heightCm) : undefined,
      injuryStatus: editForm.injuryStatus,
      injuryNote: editForm.injuryNote,
      injuryReturnDate: editForm.injuryReturnDate,
      attributes: editForm.attributes,
      legacyClubStats: {
        appearances: Math.max(0, editForm.legacyClubApps),
        goals: Math.max(0, editForm.legacyClubGoals),
        assists: Math.max(0, editForm.legacyClubAssists),
        source: 'legacy',
      },
      legacyInternationalStats: {
        appearances: Math.max(0, editForm.legacyIntlApps),
        goals: Math.max(0, editForm.legacyIntlGoals),
        assists: Math.max(0, editForm.legacyIntlAssists),
        source: 'legacy',
      },
    });
    if (res.ok) {
      if (res.data) setServerProfile(res.data);
      setIsEditingIdentity(false);
    }
  };

  if (!profile) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[#7ADBF0] light:text-cyan-700 hover:underline cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>BACK TO MATCH CENTRE</span>
        </button>

        <div className="rounded-3xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-12 text-center space-y-3">
          <h2 className="font-display text-2xl text-white light:text-slate-900 uppercase">
            {loadingRemote ? 'Loading Player Identity...' : 'Player Identity Not Found'}
          </h2>
          <p className="text-xs text-slate-400 light:text-slate-600">
            No permanent player record matches ID <span className="font-mono">{playerId}</span>.
          </p>
        </div>
      </div>
    );
  }

  const { identity, activeClub, formerClubs, nationalRegistrations, careerStats, captaincies } =
    profile;
  const combinedBallonDorWins = getCombinedBallonDorWinsForIdentity(identity);
  const scheme = getOverallScheme(identity.overallRating);
  const natFlag = getCountryFlag(identity.nationality);
  const secFlag = identity.secondaryNationality ? getCountryFlag(identity.secondaryNationality) : '';
  const activeNationalCallUp =
    nationalRegistrations.find((r) => r.status === 'called_up') || null;
  const computedAge = resolvePlayerAge(identity.dateOfBirth, identity.age);
  const gkStats =
    identity.position === 'GK'
      ? getGkDerivedStats({
          id: identity.id,
          name: identity.name,
          shortName: identity.shortName,
          position: identity.position,
          positionDetail: identity.positionDetail,
          overallRating: identity.overallRating,
          nationality: identity.nationality,
          shirtNumber: activeClub?.shirtNumber || activeNationalCallUp?.shirtNumber || 1,
          age: computedAge,
          attributes: identity.attributes,
          gkAttributes: identity.gkAttributes,
        })
      : null;

  const displayName = getPlayerDisplayName(identity);
  const fullName = getPlayerFullName(identity);
  const initials = displayName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24 landscape-mobile:py-4 landscape-mobile:pb-10 space-y-6 landscape-mobile:space-y-4 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="px-4 py-3 rounded-2xl bg-[var(--bg-surface)] border border-[#7ADBF0]/60 shadow-2xl flex items-center gap-3 text-xs font-bold text-[var(--text-primary)]">
            <Check className="w-4 h-4 text-[#7ADBF0] shrink-0" />
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Breadcrumb & Back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs font-mono">
          <button
            type="button"
            onClick={onBack}
            className="text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>MATCH CENTRE</span>
          </button>
          <span className="text-slate-500">/</span>
          <span className="text-slate-400 light:text-slate-600">PLAYERS</span>
          <span className="text-slate-500">/</span>
          <span className="text-[#7ADBF0] light:text-cyan-700 font-bold uppercase truncate max-w-xs">
            {displayName}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTransferSearch('');
              setTransferShirt('');
              setIsTransferModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] light:bg-white light:hover:bg-slate-50 border border-white/15 light:border-slate-300 text-white light:text-slate-900 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
            <span>{activeClub ? 'Transfer Club' : 'Sign to Club'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setNationSearch('');
              setTargetNationality(normalizeCountryName(identity.nationality));
              setSwitchNationalSquad(!identity.internationalRetired);
              setChangeNationShirt(
                activeNationalCallUp?.shirtNumber ? String(activeNationalCallUp.shirtNumber) : ''
              );
              setIsChangeNationModalOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.11] light:bg-white light:hover:bg-slate-50 border border-white/15 light:border-slate-300 text-white light:text-slate-900 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-700" />
            <span>Change Nation</span>
          </button>

          {identity.internationalRetired ? (
            <button
              type="button"
              disabled={submittingCareerAction}
              onClick={async () => {
                setSubmittingCareerAction(true);
                const res = await unretirePlayerFromNationAction(identity.id);
                if (res.ok && res.data) setServerProfile(res.data);
                setSubmittingCareerAction(false);
              }}
              className="px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 light:text-emerald-700 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Return to Nation</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRetireDate(new Date().toISOString().slice(0, 10));
                setIsRetireNationModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 light:text-rose-700 font-semibold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <UserMinus className="w-3.5 h-3.5" />
              <span>Retire from Nation</span>
            </button>
          )}

          {isAdmin && (
            <button
              type="button"
              onClick={openEditIdentity}
              className="px-3.5 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#9BE6F6] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit identity</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Player Identity Hero Card */}
      <div
        className="relative rounded-3xl overflow-hidden border border-white/[0.1] light:border-slate-200 p-6 sm:p-8 landscape-mobile:p-4 shadow-2xl bg-[#0A111D] light:bg-white"
        style={{
          backgroundImage:
            'radial-gradient(circle at top right, rgba(56,189,248,0.14), transparent 55%)',
        }}
      >
        <div className="flex flex-col landscape-mobile:flex-row lg:flex-row landscape-mobile:items-center lg:items-center justify-between gap-6 landscape-mobile:gap-4">
          {/* Left Identity */}
          <div className="flex flex-col sm:flex-row landscape-mobile:flex-row items-start sm:items-center landscape-mobile:items-center gap-5 landscape-mobile:gap-4 min-w-0">
            <div
              className="w-24 h-24 sm:w-28 sm:h-28 landscape-mobile:w-20 landscape-mobile:h-20 rounded-2xl bg-[#101A2C] light:bg-slate-100 border-2 flex items-center justify-center shrink-0 shadow-xl overflow-hidden"
              style={{ borderColor: scheme.barColor }}
            >
              {identity.portraitUrl ? (
                <img
                  src={identity.portraitUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display text-3xl text-white light:text-slate-800 tracking-wider">
                  {initials}
                </span>
              )}
            </div>

            <div className="space-y-2 landscape-mobile:space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[10px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
                  {identity.gender === 'women' ? "WOMEN'S INTERNATIONAL & CLUB" : "MEN'S PROFESSIONAL"}
                </span>
                <span className="font-mono text-[10px] text-slate-400 light:text-slate-500">
                  · ID {identity.id}
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl landscape-mobile:text-2xl text-white light:text-slate-900 uppercase tracking-wide leading-none">
                {displayName}
              </h1>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-white/[0.04] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 text-xs">
                <span className="font-mono text-[10px] tracking-[0.14em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
                  Full Name
                </span>
                <span className="font-semibold text-slate-100 light:text-slate-900">
                  {fullName}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-slate-200 light:text-slate-700 pt-1">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <span>{natFlag}</span>
                  <span>{identity.nationality}</span>
                  {identity.secondaryNationality && (
                    <span className="text-slate-400">
                      / {secFlag} {identity.secondaryNationality}
                    </span>
                  )}
                </span>
                <span className="font-mono tabular-nums">Age {computedAge}</span>
                <span className="font-mono">
                  DOB: {identity.dateOfBirth || 'Unrecorded'}
                </span>
                <span className="font-mono">
                  Pos: <strong className="text-white light:text-slate-900">{identity.positionDetail}</strong>
                </span>
                {identity.preferredFoot && <span>Foot: {identity.preferredFoot}</span>}
                {identity.heightCm && <span className="tabular-nums">{identity.heightCm} cm</span>}
              </div>

              {/* Active Status Strip */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                {activeClub ? (
                  <button
                    type="button"
                    onClick={() => activeClub.teamId && onOpenTeam(activeClub.teamId)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] light:bg-slate-100 border border-white/[0.1] light:border-slate-300 hover:border-[#7ADBF0]/60 text-xs font-semibold text-white light:text-slate-900 cursor-pointer transition-all"
                  >
                    {activeClub.teamCrestUrl && (
                      <img
                        src={activeClub.teamCrestUrl}
                        alt={activeClub.teamName}
                        className="w-4 h-4 object-contain"
                      />
                    )}
                    <span>Club: {activeClub.teamName}</span>
                    {activeClub.shirtNumber && (
                      <span className="font-mono text-[#7ADBF0] light:text-cyan-700">
                        #{activeClub.shirtNumber}
                      </span>
                    )}
                    {activeClub.isCaptain && (
                      <span className="w-4 h-4 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center">
                        C
                      </span>
                    )}
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs font-semibold text-teal-300 light:text-teal-700">
                    Club Free Agent
                  </span>
                )}

                {activeNationalCallUp ? (
                  <button
                    type="button"
                    onClick={() => onOpenTeam(activeNationalCallUp.teamId)}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] light:bg-slate-100 border border-white/[0.1] light:border-slate-300 hover:border-emerald-400/60 text-xs font-semibold text-white light:text-slate-900 cursor-pointer transition-all"
                  >
                    <span className="w-5 h-3.5 inline-flex items-center justify-center shrink-0">
                      <TeamEmblem
                        crestUrl={activeNationalCallUp.teamCrestUrl}
                        teamType="country"
                        country={activeNationalCallUp.teamCountry || identity.nationality}
                        flag={activeNationalCallUp.teamFlag || natFlag}
                        code={activeNationalCallUp.teamCode}
                      />
                    </span>
                    <span>Nation: {activeNationalCallUp.teamName}</span>
                    {activeNationalCallUp.shirtNumber && (
                      <span className="font-mono text-emerald-400 light:text-emerald-700">
                        #{activeNationalCallUp.shirtNumber}
                      </span>
                    )}
                    {activeNationalCallUp.isCaptain && (
                      <span className="w-4 h-4 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center">
                        C
                      </span>
                    )}
                  </button>
                ) : identity.internationalRetired ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs font-semibold text-rose-300 light:text-rose-700">
                    <UserMinus className="w-3.5 h-3.5" />
                    <span>
                      Retired from Nation
                      {identity.internationalRetiredAt ? ` (${identity.internationalRetiredAt})` : ''}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 text-xs text-slate-400 light:text-slate-600">
                    No active national call-up
                  </span>
                )}

                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                    identity.injuryStatus === 'injured'
                      ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 light:text-rose-700'
                      : identity.injuryStatus === 'doubtful'
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 light:text-amber-700'
                      : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 light:text-emerald-700'
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>
                    {identity.injuryStatus === 'injured'
                      ? `Injured${identity.injuryReturnDate ? ` (Return ${identity.injuryReturnDate})` : ''}`
                      : identity.injuryStatus === 'doubtful'
                      ? 'Doubtful'
                      : 'Match Fit'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Overall Ring + Ballon d'Or Tally */}
          <div className="flex flex-row landscape-mobile:flex-col lg:flex-col items-center landscape-mobile:items-end lg:items-end gap-4 landscape-mobile:gap-2.5 shrink-0">
            <div className="rounded-2xl bg-[#070C15] light:bg-slate-50 border border-white/[0.1] light:border-slate-200 px-5 py-3.5 landscape-mobile:px-4 landscape-mobile:py-2.5 min-w-[180px] landscape-mobile:min-w-[155px]">
              <span className="font-mono text-[9px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase block mb-1">
                OVERALL RATING
              </span>
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className="font-display text-4xl tabular-nums leading-none"
                  style={{ color: scheme.barColor }}
                >
                  {identity.overallRating}
                </span>
                <span className="font-mono text-[10px] font-bold uppercase text-amber-300 light:text-amber-700">
                  {scheme.tierLabel}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/10 light:bg-slate-200 mt-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, identity.overallRating)}%`,
                    backgroundColor: scheme.barColor,
                  }}
                />
              </div>
            </div>

            {combinedBallonDorWins.length > 0 && (
              <div className="rounded-2xl bg-gradient-to-br from-[#0A0805] via-[#171106] to-[#080603] light:from-[#FFFDF7] light:via-[#FCF3D8] light:to-[#F6E6B5] border border-[#D4AF37]/60 px-3.5 py-2.5 flex items-center gap-3 shadow-[0_0_24px_rgba(212,175,55,0.18)]">
                <div className="w-10 h-10 rounded-xl bg-[#FAF6EC] border border-[#D4AF37]/80 p-1 flex items-center justify-center shrink-0 shadow-sm overflow-hidden">
                  <img
                    src={BALLON_DOR_ASSETS.trophyLogo}
                    alt="Ballon d'Or Trophy"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="min-w-0">
                  <span className="font-mono text-[9px] tracking-[0.2em] uppercase text-[#E6C567] light:text-[#85620A] block leading-none mb-1">
                    {identity.gender === 'women' ? "BALLON D'OR FÉMININ" : "BALLON D'OR"}
                  </span>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display text-2xl tabular-nums leading-none text-[#F7DC88] light:text-[#6E4F06]">
                      {combinedBallonDorWins.length}×
                    </span>
                    <span className="text-[11px] font-mono text-amber-200/80 light:text-[#78590C] truncate">
                      {combinedBallonDorWins.length === 1 ? 'Winner' : 'Wins'}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2. Technical Attributes & Career Stats Summary */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-5 landscape-mobile:gap-3.5">
        {/* Technical Attributes */}
        <div className="landscape-mobile:col-span-5 lg:col-span-5 rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-sm text-white light:text-slate-900">
              {gkStats ? 'Goalkeeper & Technical Attributes' : 'Technical & Physical Attributes'}
            </h2>
            <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase">
              {identity.positionDetail}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 landscape-mobile:grid-cols-3 gap-3 landscape-mobile:gap-2">
            {(gkStats
              ? [
                  ['DIV', gkStats.diving],
                  ['HAN', gkStats.handling],
                  ['KIC', gkStats.kicking],
                  ['REF', gkStats.reflexes],
                  ['SPD', gkStats.speed],
                  ['POS', gkStats.positioning],
                ]
              : [
                  ['PAC', identity.attributes.pace],
                  ['SHO', identity.attributes.shooting],
                  ['PAS', identity.attributes.passing],
                  ['DRI', identity.attributes.dribbling],
                  ['DEF', identity.attributes.defending],
                  ['PHY', identity.attributes.physical],
                ]
            ).map(([label, val]) => (
              <div
                key={String(label)}
                className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400 light:text-slate-500">{label}</span>
                  <span className="font-bold text-white light:text-slate-900 tabular-nums">
                    {val}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10 light:bg-slate-200 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#7ADBF0] light:bg-cyan-600"
                    style={{ width: `${Math.min(100, Number(val))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Career Statistics (Club vs International vs Combined) */}
        <div className="landscape-mobile:col-span-7 lg:col-span-7 rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-bold text-sm text-white light:text-slate-900">
              Career Statistics Matrix
            </h2>
            <span className="font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
              CLUB + INTERNATIONAL + SIMULATED
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 landscape-mobile:grid-cols-3 gap-3 landscape-mobile:gap-2.5">
            {/* Club Totals */}
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold">
                  CLUB CAREER
                </span>
                <Shield className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div>
                  <span className="block font-display text-2xl text-white light:text-slate-900 tabular-nums">
                    {careerStats.club.appearances}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">APPS</span>
                </div>
                <div>
                  <span className="block font-display text-2xl text-white light:text-slate-900 tabular-nums">
                    {careerStats.club.goals}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">GOALS</span>
                </div>
                <div>
                  <span className="block font-display text-2xl text-white light:text-slate-900 tabular-nums">
                    {careerStats.club.assists}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">ASSISTS</span>
                </div>
              </div>
              <span className="block text-[10px] text-slate-500 font-mono">
                {careerStats.club.hasLegacyRecord || careerStats.club.simulatedAppearances > 0
                  ? `Legacy ${careerStats.club.legacyAppearances} · Sim ${careerStats.club.simulatedAppearances}`
                  : 'No historical apps recorded yet'}
              </span>
            </div>

            {/* International Totals */}
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.18em] text-emerald-400 light:text-emerald-700 uppercase font-bold">
                  INTERNATIONAL
                </span>
                <Globe className="w-3.5 h-3.5 text-emerald-400 light:text-emerald-700" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div>
                  <span className="block font-display text-2xl text-white light:text-slate-900 tabular-nums">
                    {careerStats.international.appearances}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">CAPS</span>
                </div>
                <div>
                  <span className="block font-display text-2xl text-white light:text-slate-900 tabular-nums">
                    {careerStats.international.goals}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">GOALS</span>
                </div>
                <div>
                  <span className="block font-display text-2xl text-white light:text-slate-900 tabular-nums">
                    {careerStats.international.assists}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">ASSISTS</span>
                </div>
              </div>
              <span className="block text-[10px] text-slate-500 font-mono">
                {careerStats.international.hasLegacyRecord ||
                careerStats.international.simulatedAppearances > 0
                  ? `Legacy ${careerStats.international.legacyAppearances} · Sim ${careerStats.international.simulatedAppearances}`
                  : 'No senior caps recorded yet'}
              </span>
            </div>

            {/* Combined Career Total */}
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-amber-400/25 p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] tracking-[0.18em] text-amber-300 light:text-amber-700 uppercase font-bold">
                  COMBINED TOTAL
                </span>
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                <div>
                  <span className="block font-display text-2xl text-amber-300 light:text-amber-700 tabular-nums">
                    {careerStats.overall.appearances}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">APPS</span>
                </div>
                <div>
                  <span className="block font-display text-2xl text-amber-300 light:text-amber-700 tabular-nums">
                    {careerStats.overall.goals}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">GOALS</span>
                </div>
                <div>
                  <span className="block font-display text-2xl text-amber-300 light:text-amber-700 tabular-nums">
                    {careerStats.overall.assists}
                  </span>
                  <span className="font-mono text-[9px] text-slate-400 uppercase">ASSISTS</span>
                </div>
              </div>
              <span className="block text-[10px] text-slate-500 font-mono">
                Unified permanent identity tally
              </span>
            </div>
          </div>

          {careerStats.recentMatches.length > 0 && (
            <div className="pt-2 space-y-2">
              <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase block">
                RECENT RECORDED APPEARANCES
              </span>
              <div className="divide-y divide-white/[0.05] light:divide-slate-200 max-h-40 overflow-y-auto">
                {careerStats.recentMatches.map((m) => (
                  <div
                    key={m.matchId}
                    className="py-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <span className="font-semibold text-white light:text-slate-900">
                        {m.teamName} vs {m.opponentName}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-2 font-mono">
                        {m.competitionName} · {m.date}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 font-mono shrink-0 tabular-nums">
                      <span className="text-slate-300 light:text-slate-700">{m.scoreline}</span>
                      {(m.goals > 0 || m.assists > 0) && (
                        <span className="text-emerald-400 light:text-emerald-700 font-bold">
                          {m.goals}G {m.assists}A
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. DUAL REGISTRATION LEDGER (SEPARATE CLUB VS NATIONAL TEAM TABLES) */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-6 landscape-mobile:gap-4">
        {/* 3A. CLUB REGISTRATIONS (team_type === 'club') */}
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
              <h2 className="font-display text-lg text-white light:text-slate-900 uppercase tracking-wide">
                Club Registrations
              </h2>
            </div>
            <span className="font-mono text-[10px] tracking-[0.16em] text-slate-400 uppercase">
              MAX 1 ACTIVE CLUB
            </span>
          </div>

          {/* Active Club Card */}
          {activeClub ? (
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-[#7ADBF0]/35 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  {activeClub.teamCrestUrl && (
                    <img
                      src={activeClub.teamCrestUrl}
                      alt={activeClub.teamName}
                      className="w-10 h-10 object-contain shrink-0"
                    />
                  )}
                  <div className="min-w-0">
                    <span className="font-mono text-[9px] tracking-[0.2em] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold block">
                      ACTIVE CLUB
                    </span>
                    <button
                      type="button"
                      onClick={() => activeClub.teamId && onOpenTeam(activeClub.teamId)}
                      className="font-bold text-base text-white light:text-slate-900 hover:text-[#7ADBF0] cursor-pointer text-left truncate block"
                    >
                      {activeClub.teamName}
                    </button>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Shirt #{activeClub.shirtNumber ?? '—'} · Joined {activeClub.joinedAt || '—'} ·{' '}
                      {activeClub.appearances} apps / {activeClub.goals} goals
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeClub.isCaptain && (
                    <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black">
                      CLUB C
                    </span>
                  )}
                  {activeClub.isViceCaptain && (
                    <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 font-mono text-[10px] font-bold">
                      CLUB VC
                    </span>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] light:border-slate-200 flex flex-wrap items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingRegId(activeClub.id);
                        setEditingRegType('club');
                        setRegShirtDraft(activeClub.shirtNumber ? String(activeClub.shirtNumber) : '');
                        setRegAppsDraft(activeClub.appearances || 0);
                        setRegGoalsDraft(activeClub.goals || 0);
                        setRegAssistsDraft(activeClub.assists || 0);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] light:bg-white border border-white/10 light:border-slate-300 text-[11px] font-semibold text-white light:text-slate-900 cursor-pointer"
                    >
                      Edit shirt &amp; stats
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void updateRegistrationAction(activeClub.id, 'club', {
                          isCaptain: !activeClub.isCaptain,
                        })
                      }
                      className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-semibold text-amber-300 light:text-amber-800 cursor-pointer"
                    >
                      {activeClub.isCaptain ? 'Remove club C' : 'Make club captain'}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    const res = await releaseRegistrationAction(activeClub.id, 'club');
                    if (res.ok && res.data) setServerProfile(res.data);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-[11px] font-semibold text-rose-300 light:text-rose-700 inline-flex items-center gap-1 cursor-pointer"
                >
                  <UserMinus className="w-3 h-3" />
                  <span>Release to free agency</span>
                </button>
              </div>

              {/* Club-Only Transfer Panel */}
              {clubOptions.length > 1 && (
                <div className="pt-3 border-t border-white/[0.06] light:border-slate-200 space-y-2">
                  <span className="font-mono text-[9px] tracking-[0.18em] text-slate-400 uppercase flex items-center gap-1.5">
                    <ArrowLeftRight className="w-3 h-3 text-[#7ADBF0]" />
                    <span>CLUB-TO-CLUB TRANSFER (NATIONAL CALL-UPS REMAIN INTACT)</span>
                  </span>
                  <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 sm:grid-cols-12 gap-2">
                    <select
                      value={transferTargetClubId}
                      onChange={(e) => setTransferTargetClubId(e.target.value)}
                      className="landscape-mobile:col-span-6 sm:col-span-6 px-2.5 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                    >
                      {clubOptions
                        .filter((c) => c.id !== activeClub.teamId)
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.league})
                          </option>
                        ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      placeholder="Shirt #"
                      value={transferShirt}
                      onChange={(e) => setTransferShirt(e.target.value)}
                      className="landscape-mobile:col-span-2 sm:col-span-2 px-2.5 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                    />
                    <input
                      type="date"
                      value={transferDate}
                      onChange={(e) => setTransferDate(e.target.value)}
                      className="landscape-mobile:col-span-4 sm:col-span-4 px-2.5 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!transferTargetClubId) return;
                      const res = await transferClubPlayerAction(
                        identity.id,
                        activeClub.teamId,
                        transferTargetClubId,
                        {
                          shirtNumber: transferShirt ? Number(transferShirt) : undefined,
                          transferDate,
                        }
                      );
                      if (res.ok && res.data) setServerProfile(res.data);
                      setTransferShirt('');
                    }}
                    className="px-3.5 py-1.5 rounded-lg bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold text-xs cursor-pointer"
                  >
                    Execute Club Transfer
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-dashed border-white/[0.1] light:border-slate-300 p-4 space-y-3">
              <span className="text-xs font-semibold text-teal-300 light:text-teal-700 block">
                Currently a Club Free Agent (no active club registration)
              </span>
              {clubOptions.length > 0 && (
                <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 sm:grid-cols-12 gap-2 items-center">
                  <select
                    value={signClubTeamId}
                    onChange={(e) => setSignClubTeamId(e.target.value)}
                    className="landscape-mobile:col-span-6 sm:col-span-6 px-2.5 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  >
                    {clubOptions.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.league})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    placeholder="Shirt #"
                    value={signClubShirt}
                    onChange={(e) => setSignClubShirt(e.target.value)}
                    className="landscape-mobile:col-span-2 sm:col-span-2 px-2.5 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (!signClubTeamId) return;
                      const res = await registerPlayerToTeamAction(identity.id, signClubTeamId, {
                        shirtNumber: signClubShirt ? Number(signClubShirt) : undefined,
                      });
                      if (res.ok && res.data) setServerProfile(res.data);
                      setSignClubShirt('');
                    }}
                    className="sm:col-span-4 px-3 py-2 rounded-lg bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold text-xs cursor-pointer"
                  >
                    Sign to Club
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Former Clubs History */}
          <div className="space-y-2">
            <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase block">
              FORMER CLUBS ({formerClubs.length})
            </span>
            {formerClubs.length > 0 ? (
              <div className="space-y-2">
                {formerClubs.map((fc) => (
                  <div
                    key={fc.id}
                    className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      {fc.teamId ? (
                        <button
                          type="button"
                          onClick={() => onOpenTeam(fc.teamId)}
                          className="font-semibold text-white light:text-slate-900 hover:text-[#7ADBF0] cursor-pointer text-left truncate block"
                        >
                          {fc.teamName}
                        </button>
                      ) : (
                        <span className="font-semibold text-white light:text-slate-900 block">
                          {fc.teamName}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 font-mono">
                        {fc.joinedAt || '—'} → {fc.leftAt || 'Former'} · #{fc.shirtNumber ?? '—'} ·{' '}
                        {fc.appearances} apps / {fc.goals} goals
                      </span>
                    </div>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void removeRegistrationAction(fc.id, 'club')}
                        className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer"
                        title="Remove registration record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No former club spells recorded.</p>
            )}
          </div>
        </div>

        {/* 3B. NATIONAL TEAM REGISTRATIONS (team_type === 'country') */}
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-400 light:text-emerald-700" />
              <h2 className="font-display text-lg text-white light:text-slate-900 uppercase tracking-wide">
                International Career
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setNationSearch('');
                  setTargetNationality(normalizeCountryName(identity.nationality));
                  setSwitchNationalSquad(!identity.internationalRetired);
                  setChangeNationShirt(
                    activeNationalCallUp?.shirtNumber
                      ? String(activeNationalCallUp.shirtNumber)
                      : ''
                  );
                  setIsChangeNationModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] light:bg-slate-100 light:hover:bg-slate-200 border border-white/10 light:border-slate-300 text-[11px] font-semibold text-white light:text-slate-900 cursor-pointer"
              >
                Change nation
              </button>
              {identity.internationalRetired ? (
                <button
                  type="button"
                  disabled={submittingCareerAction}
                  onClick={async () => {
                    setSubmittingCareerAction(true);
                    const res = await unretirePlayerFromNationAction(identity.id);
                    if (res.ok && res.data) setServerProfile(res.data);
                    setSubmittingCareerAction(false);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 light:text-emerald-700 cursor-pointer"
                >
                  Unretire
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setRetireDate(new Date().toISOString().slice(0, 10));
                    setIsRetireNationModalOpen(true);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-[11px] font-semibold text-rose-300 light:text-rose-700 cursor-pointer"
                >
                  Retire from nation
                </button>
              )}
            </div>
          </div>

          {identity.internationalRetired && (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs">
              <div className="text-rose-200 light:text-rose-800">
                <strong className="font-bold">Retired from International Duty</strong>
                {identity.internationalRetiredAt ? ` (${identity.internationalRetiredAt})` : ''} ·
                Caps, goals, and club career remain preserved.
              </div>
              <button
                type="button"
                disabled={submittingCareerAction}
                onClick={async () => {
                  setSubmittingCareerAction(true);
                  const res = await unretirePlayerFromNationAction(identity.id);
                  if (res.ok && res.data) setServerProfile(res.data);
                  setSubmittingCareerAction(false);
                }}
                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 light:text-emerald-800 font-semibold text-[11px] shrink-0 cursor-pointer"
              >
                Return to Duty
              </button>
            </div>
          )}

          {nationalRegistrations.length > 0 ? (
            <div className="space-y-3">
              {nationalRegistrations.map((nr) => (
                <div
                  key={nr.id}
                  className={`rounded-xl bg-[#080E18] light:bg-slate-50 p-4 space-y-2.5 border ${
                    nr.status === 'called_up'
                      ? 'border-emerald-500/40'
                      : 'border-white/[0.06] light:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-8 rounded-md bg-white/5 light:bg-white border border-white/10 light:border-slate-200 p-0.5 flex items-center justify-center shrink-0">
                        <TeamEmblem
                          crestUrl={nr.teamCrestUrl}
                          teamType="country"
                          country={nr.teamCountry || identity.nationality}
                          flag={nr.teamFlag || natFlag}
                          code={nr.teamCode}
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[9px] tracking-[0.18em] text-emerald-400 light:text-emerald-700 uppercase font-bold">
                            {nr.status === 'called_up'
                              ? 'ACTIVE CALL-UP'
                              : nr.status === 'standby'
                              ? 'STANDBY LIST'
                              : 'FORMER INTERNATIONAL SPELL'}
                          </span>
                          {nr.confederation && (
                            <span className="font-mono text-[9px] text-slate-400">
                              · {nr.confederation}
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => onOpenTeam(nr.teamId)}
                          className="font-bold text-base text-white light:text-slate-900 hover:text-emerald-400 cursor-pointer text-left truncate block"
                        >
                          {nr.teamFlag || ''} {nr.teamName}
                        </button>
                        <span className="text-[11px] text-slate-400 font-mono">
                          Intl Shirt #{nr.shirtNumber ?? '—'} · {nr.appearances} caps / {nr.goals} goals
                          {nr.calledUpAt ? ` · Since ${nr.calledUpAt}` : ''}
                          {nr.leftAt && nr.status === 'former' ? ` → ${nr.leftAt}` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {nr.isCaptain && (
                        <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black">
                          NAT C
                        </span>
                      )}
                      {nr.isViceCaptain && (
                        <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-200 font-mono text-[10px] font-bold">
                          NAT VC
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/[0.06] light:border-slate-200 flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRegId(nr.id);
                          setEditingRegType('country');
                          setRegShirtDraft(nr.shirtNumber ? String(nr.shirtNumber) : '');
                          setRegAppsDraft(nr.appearances || 0);
                          setRegGoalsDraft(nr.goals || 0);
                          setRegAssistsDraft(nr.assists || 0);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] light:bg-white border border-white/10 light:border-slate-300 text-[11px] font-semibold text-white light:text-slate-900 cursor-pointer"
                      >
                        Edit intl # &amp; caps
                      </button>
                    )}
                    {nr.status === 'called_up' ? (
                      <>
                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() =>
                              void updateRegistrationAction(nr.id, 'country', {
                                isCaptain: !nr.isCaptain,
                              })
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-semibold text-amber-300 light:text-amber-800 cursor-pointer"
                          >
                            {nr.isCaptain ? 'Remove intl C' : 'Make national captain'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await releaseRegistrationAction(nr.id, 'country');
                            if (res.ok && res.data) setServerProfile(res.data);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 border border-rose-500/40 text-[11px] font-semibold text-rose-300 light:text-rose-700 cursor-pointer"
                        >
                          End call-up
                        </button>
                      </>
                    ) : (
                      !identity.internationalRetired && (
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await updateRegistrationAction(nr.id, 'country', {
                              status: 'called_up',
                            });
                            if (res.ok && res.data) setServerProfile(res.data);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 text-[11px] font-semibold text-emerald-300 light:text-emerald-700 cursor-pointer"
                        >
                          Recall to squad
                        </button>
                      )
                    )}
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => void removeRegistrationAction(nr.id, 'country')}
                        className="p-1.5 text-slate-400 hover:text-rose-400 cursor-pointer ml-auto"
                        title="Delete national registration record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 light:text-slate-500">
              No national-team call-ups recorded yet for {identity.nationality}.
            </p>
          )}

          {/* Call-Up Action */}
          {!identity.internationalRetired && nationOptions.length > 0 && (
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3.5 space-y-2">
              <span className="font-mono text-[9px] tracking-[0.18em] text-slate-400 uppercase block">
                CALL UP TO NATIONAL SQUAD (KEEPS CLUB REGISTRATION)
              </span>
              <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 sm:grid-cols-12 gap-2">
                <select
                  value={callUpNationId}
                  onChange={(e) => setCallUpNationId(e.target.value)}
                  className="landscape-mobile:col-span-6 sm:col-span-6 px-2.5 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                >
                  {nationOptions.map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.flag || ''} {n.name} ({n.confederation})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  max={99}
                  placeholder="Intl #"
                  value={callUpShirt}
                  onChange={(e) => setCallUpShirt(e.target.value)}
                  className="landscape-mobile:col-span-2 sm:col-span-2 px-2.5 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
                <button
                  type="button"
                  onClick={async () => {
                    if (!callUpNationId) return;
                    const res = await registerPlayerToTeamAction(identity.id, callUpNationId, {
                      shirtNumber: callUpShirt ? Number(callUpShirt) : undefined,
                    });
                    if (res.ok && res.data) setServerProfile(res.data);
                    setCallUpShirt('');
                  }}
                  className="sm:col-span-4 px-3 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Call up player
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Inline Registration Shirt & Stats Editor Modal */}
      {isAdmin && editingRegId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const res = await updateRegistrationAction(editingRegId, editingRegType, {
                shirtNumber: regShirtDraft ? Number(regShirtDraft) : null,
                appearances: regAppsDraft,
                goals: regGoalsDraft,
                assists: regAssistsDraft,
              });
              if (res.ok) setEditingRegId(null);
            }}
            className="w-full max-w-md rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-5 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white light:text-slate-900">
                Edit {editingRegType === 'country' ? 'National' : 'Club'} Registration
              </h3>
              <button
                type="button"
                onClick={() => setEditingRegId(null)}
                className="p-1 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Shirt Number (1–99)
                </label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={regShirtDraft}
                  onChange={(e) => setRegShirtDraft(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  {editingRegType === 'country' ? 'Caps' : 'Appearances'}
                </label>
                <input
                  type="number"
                  min={0}
                  value={regAppsDraft}
                  onChange={(e) => setRegAppsDraft(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Goals
                </label>
                <input
                  type="number"
                  min={0}
                  value={regGoalsDraft}
                  onChange={(e) => setRegGoalsDraft(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Assists
                </label>
                <input
                  type="number"
                  min={0}
                  value={regAssistsDraft}
                  onChange={(e) => setRegAssistsDraft(Number(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold text-xs cursor-pointer"
              >
                Save registration
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 4. Captaincies, Medical & Ballon d'Or Honours */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 lg:grid-cols-3 gap-5 landscape-mobile:gap-3.5">
        {/* Independent Captaincies */}
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-amber-400" />
            <h3 className="font-bold text-sm text-white light:text-slate-900">
              Captaincies (Club &amp; Nation)
            </h3>
          </div>
          {captaincies.club.length === 0 && captaincies.international.length === 0 ? (
            <p className="text-xs text-slate-400 light:text-slate-500">
              No active or former captaincy appointments recorded.
            </p>
          ) : (
            <div className="space-y-2 text-xs">
              {captaincies.club.map((c) => (
                <div
                  key={c.registrationId}
                  className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-white light:text-slate-900 block">
                      {c.teamName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      Club {c.role === 'C' ? 'Captain' : 'Vice-Captain'} · {c.since || '—'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-black">
                    {c.role}
                  </span>
                </div>
              ))}
              {captaincies.international.map((c) => (
                <div
                  key={c.registrationId}
                  className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-emerald-500/25 px-3 py-2 flex items-center justify-between gap-2"
                >
                  <div>
                    <span className="font-semibold text-white light:text-slate-900 block">
                      {c.teamFlag || ''} {c.teamName}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      International {c.role === 'C' ? 'Captain' : 'Vice-Captain'} · {c.since || '—'}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono text-[10px] font-black">
                    {c.role}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Injuries & Medical */}
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-rose-400" />
              <h3 className="font-bold text-sm text-white light:text-slate-900">
                Medical &amp; Injury Record
              </h3>
            </div>
            {isAdmin && identity.injuryStatus !== 'fit' && (
              <button
                type="button"
                onClick={() =>
                  void updatePlayerIdentityProfile(identity.id, {
                    injuryStatus: 'fit',
                    injuryNote: '',
                    injuryReturnDate: '',
                  })
                }
                className="text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer"
              >
                Clear injury
              </button>
            )}
          </div>
          <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3 text-xs space-y-1">
            <span className="font-semibold text-white light:text-slate-900 block">
              Current Status:{' '}
              {identity.injuryStatus === 'injured'
                ? 'Injured (Unavailable)'
                : identity.injuryStatus === 'doubtful'
                ? 'Doubtful'
                : 'Fit for selection'}
            </span>
            {identity.injuryNote && (
              <span className="text-slate-400 block">
                {identity.injuryNote}
                {identity.injuryReturnDate ? ` · Est. return: ${identity.injuryReturnDate}` : ''}
              </span>
            )}
          </div>
          {identity.injuryHistory && identity.injuryHistory.length > 0 && (
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {identity.injuryHistory.map((h) => (
                <div
                  key={h.id}
                  className="text-[11px] text-slate-400 flex items-center justify-between gap-2"
                >
                  <span className="truncate">{h.note || h.status}</span>
                  <span className="font-mono shrink-0">{h.recordedAt}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ballon d'Or Honours (Gold Luxury Design — Admin-Only Management) */}
        <div className="rounded-2xl bg-gradient-to-br from-[#090704] via-[#141007] to-[#080603] light:from-[#FFFDF7] light:via-[#FCF5DE] light:to-[#F7EBC6] border border-[#D4AF37]/45 p-5 space-y-4 shadow-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-[#FAF6EC] border border-[#D4AF37]/80 p-1.5 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(212,175,55,0.22)]">
                <img
                  src={BALLON_DOR_ASSETS.trophyLogo}
                  alt="Ballon d'Or Trophy"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <span className="font-mono text-[9px] tracking-[0.22em] text-[#D4AF37] light:text-[#85620A] uppercase block">
                  PRESTIGE HONOUR
                </span>
                <h3 className="font-display text-xl text-[#F7DC88] light:text-[#5B4105] uppercase tracking-wide leading-tight">
                  Ballon d&apos;Or Honours
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="text-right px-3 py-1.5 rounded-xl bg-black/50 light:bg-white/80 border border-[#D4AF37]/40">
                <span className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#D4AF37] light:text-[#85620A] block leading-none mb-0.5">
                  Total Wins
                </span>
                <span className="font-display text-2xl tabular-nums leading-none text-[#F7DC88] light:text-[#6B4D07]">
                  {combinedBallonDorWins.length}
                </span>
              </div>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setBdTeamName(activeClub?.teamName || activeNationalCallUp?.teamName || '');
                    setIsAddBallonDorOpen(!isAddBallonDorOpen);
                  }}
                  className="px-3 py-2 rounded-xl bg-gradient-to-r from-[#D4AF37] to-[#B68E28] hover:brightness-110 text-[#090704] text-[11px] font-bold uppercase tracking-wider cursor-pointer shadow-md"
                >
                  + Add Win
                </button>
              )}
            </div>
          </div>

          {isAdmin && isAddBallonDorOpen && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const res = await updatePlayerIdentityProfile(identity.id, {
                  addBallonDorWin: {
                    year: bdYear,
                    teamName: bdTeamName || activeClub?.teamName || 'Club / Nation',
                    note: bdNote || undefined,
                  },
                });
                if (res.ok && res.data) {
                  setServerProfile(res.data);
                }
                setBdNote('');
                setIsAddBallonDorOpen(false);
              }}
              className="rounded-xl bg-black/60 light:bg-white border border-[#D4AF37]/50 p-3.5 space-y-2.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#F5D77F] light:text-[#85620A]">
                  Admin: Award Ballon d&apos;Or Trophy
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddBallonDorOpen(false)}
                  className="text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="number"
                  min={1956}
                  max={2050}
                  value={bdYear}
                  onChange={(e) => setBdYear(Number(e.target.value) || new Date().getFullYear())}
                  aria-label="Ballon d'Or winning year"
                  className="px-2.5 py-1.5 rounded-lg bg-[#0D0B07] light:bg-slate-50 border border-[#D4AF37]/30 light:border-slate-300 text-white light:text-slate-900 tabular-nums"
                />
                <input
                  type="text"
                  required
                  placeholder="Club / Team at win"
                  value={bdTeamName}
                  onChange={(e) => setBdTeamName(e.target.value)}
                  className="col-span-2 px-2.5 py-1.5 rounded-lg bg-[#0D0B07] light:bg-slate-50 border border-[#D4AF37]/30 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <input
                type="text"
                placeholder="Note or award category (optional)"
                value={bdNote}
                onChange={(e) => setBdNote(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#0D0B07] light:bg-slate-50 border border-[#D4AF37]/30 light:border-slate-300 text-white light:text-slate-900"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#E6C567] to-[#C69B2D] text-[#080603] font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Confirm Ballon d&apos;Or Trophy
              </button>
            </form>
          )}

          {combinedBallonDorWins.length > 0 ? (
            <div className="space-y-2">
              {combinedBallonDorWins.map((win) => {
                const isRemovableAdminRecord =
                  isAdmin && identity.ballonDorWins.some((raw) => raw.id === win.id);
                return (
                  <div
                    key={`${win.id}-${win.year}`}
                    className="rounded-xl bg-black/45 light:bg-white/85 border border-[#D4AF37]/30 px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-display text-lg tabular-nums text-[#F5D77F] light:text-[#85620A] leading-none shrink-0">
                        {win.year}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-[#FFF8E7] light:text-[#3D2B03] truncate">
                          {win.teamName}
                        </div>
                        <div className="font-mono text-[10px] text-[#D4AF37]/85 light:text-[#85620A] truncate">
                          {win.note || (identity.gender === 'women' ? "Ballon d'Or Féminin" : "Ballon d'Or")}
                          {win.isOfficialArchive ? ' · Official Archive' : ' · Club Recorded'}
                        </div>
                      </div>
                    </div>
                    {isRemovableAdminRecord && (
                      <button
                        type="button"
                        title="Remove admin-recorded Ballon d'Or win"
                        onClick={async () => {
                          const res = await updatePlayerIdentityProfile(identity.id, {
                            removeBallonDorWinId: win.id,
                          });
                          if (res.ok && res.data) {
                            setServerProfile(res.data);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl bg-black/35 light:bg-white/70 border border-[#D4AF37]/20 px-3.5 py-3 text-xs text-[#D4AF37]/75 light:text-[#7A5C12]">
              No Ballon d&apos;Or wins recorded for this player yet.
            </div>
          )}
        </div>
      </div>

      {/* 5. Admin Identity Deletion Guard */}
      {isAdmin && (
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-rose-500/25 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-white light:text-slate-900">
              Permanent Player Identity Safeguard
            </h3>
            <p className="text-xs text-slate-400 light:text-slate-600">
              {profile.canDeleteIdentity
                ? 'This permanent player identity has zero remaining club or national-team registrations and can be safely deleted.'
                : 'Deletion locked: release or remove all club and national-team registrations before deleting this permanent identity.'}
            </p>
          </div>
          <button
            type="button"
            disabled={!profile.canDeleteIdentity}
            onClick={() => {
              if (!profile.canDeleteIdentity) {
                showToast('Cannot delete player identity while registrations remain.', 'info');
                return;
              }
              setConfirmDeleteOpen(true);
            }}
            className={`px-4 py-2 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 shrink-0 transition-all ${
              profile.canDeleteIdentity
                ? 'bg-rose-500 hover:bg-rose-600 text-white cursor-pointer'
                : 'bg-white/[0.04] light:bg-slate-100 text-slate-500 border border-white/10 light:border-slate-300 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Permanent Identity</span>
          </button>
        </div>
      )}

      {/* Modal: Edit Player Identity */}
      {isAdmin && isEditingIdentity && editForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveIdentity}
            className="w-full max-w-2xl rounded-3xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-6 landscape-mobile:p-4 space-y-5 landscape-mobile:space-y-3.5 shadow-2xl my-auto max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xl text-white light:text-slate-900 uppercase">
                Edit Permanent Identity: {displayName}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingIdentity(false)}
                className="p-1.5 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Nickname (Displayed)
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Full Name (Profile)
                </label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Primary Nationality
                </label>
                <input
                  type="text"
                  required
                  value={editForm.nationality}
                  onChange={(e) => setEditForm({ ...editForm, nationality: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Secondary Nationality
                </label>
                <input
                  type="text"
                  value={editForm.secondaryNationality}
                  onChange={(e) =>
                    setEditForm({ ...editForm, secondaryNationality: e.target.value })
                  }
                  placeholder="Optional"
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={editForm.dateOfBirth}
                  onChange={(e) => {
                    const nextDob = e.target.value;
                    const nextAge = calculateAgeFromDob(nextDob);
                    setEditForm({
                      ...editForm,
                      dateOfBirth: nextDob,
                      age: nextAge !== null ? nextAge : editForm.age,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                    Age {calculateAgeFromDob(editForm.dateOfBirth) !== null ? '(DOB)' : ''}
                  </label>
                  <input
                    type="number"
                    min={15}
                    max={55}
                    disabled={calculateAgeFromDob(editForm.dateOfBirth) !== null}
                    value={calculateAgeFromDob(editForm.dateOfBirth) ?? editForm.age}
                    onChange={(e) =>
                      setEditForm({ ...editForm, age: Number(e.target.value) || 20 })
                    }
                    title={
                      calculateAgeFromDob(editForm.dateOfBirth) !== null
                        ? 'Age is automatically calculated from Date of Birth'
                        : undefined
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900 disabled:opacity-65 disabled:cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                    OVR
                  </label>
                  <input
                    type="number"
                    min={40}
                    max={99}
                    value={editForm.overallRating}
                    onChange={(e) =>
                      setEditForm({ ...editForm, overallRating: Number(e.target.value) || 75 })
                    }
                    className="w-full px-2.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                    Height cm
                  </label>
                  <input
                    type="number"
                    min={140}
                    max={220}
                    value={editForm.heightCm}
                    onChange={(e) => setEditForm({ ...editForm, heightCm: e.target.value })}
                    className="w-full px-2.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Line / Role
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editForm.position}
                    onChange={(e) =>
                      setEditForm({ ...editForm, position: e.target.value as PlayerPosition })
                    }
                    className="px-2.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  >
                    {POSITION_LIST.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                  <select
                    value={editForm.positionDetail}
                    onChange={(e) => setEditForm({ ...editForm, positionDetail: e.target.value })}
                    className="px-2.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  >
                    {POSITION_DETAILS.map((det) => (
                      <option key={det} value={det}>
                        {det}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Foot / Medical
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={editForm.preferredFoot}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        preferredFoot: e.target.value as 'Right' | 'Left' | '',
                      })
                    }
                    className="px-2.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  >
                    <option value="">Foot: Unset</option>
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                  </select>
                  <select
                    value={editForm.injuryStatus}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        injuryStatus: e.target.value as 'fit' | 'doubtful' | 'injured',
                      })
                    }
                    className="px-2.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  >
                    <option value="fit">Fit</option>
                    <option value="doubtful">Doubtful</option>
                    <option value="injured">Injured</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Attributes Grid */}
            <div className="space-y-2">
              <span className="font-mono text-[10px] text-slate-400 uppercase block">
                Attributes
              </span>
              <div className="grid grid-cols-3 landscape-mobile:grid-cols-6 sm:grid-cols-6 gap-2 text-xs">
                {(
                  ['pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'] as const
                ).map((attr) => (
                  <div key={attr}>
                    <label className="font-mono text-[9px] text-slate-400 uppercase block mb-1">
                      {attr.slice(0, 3)}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={editForm.attributes[attr]}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          attributes: {
                            ...editForm.attributes,
                            [attr]: Math.min(99, Math.max(1, Number(e.target.value) || 50)),
                          },
                        })
                      }
                      className="w-full px-2 py-1.5 rounded-lg bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900 font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Legacy Career Baseline Stats */}
            <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl bg-[#080E18] light:bg-slate-50 p-3 space-y-2">
                <span className="font-mono text-[9px] text-[#7ADBF0] light:text-cyan-700 uppercase font-bold block">
                  Legacy Club Baseline Stats
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={editForm.legacyClubApps}
                    onChange={(e) =>
                      setEditForm({ ...editForm, legacyClubApps: Number(e.target.value) || 0 })
                    }
                    placeholder="Apps"
                    className="px-2 py-1.5 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                  <input
                    type="number"
                    min={0}
                    value={editForm.legacyClubGoals}
                    onChange={(e) =>
                      setEditForm({ ...editForm, legacyClubGoals: Number(e.target.value) || 0 })
                    }
                    placeholder="Goals"
                    className="px-2 py-1.5 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                  <input
                    type="number"
                    min={0}
                    value={editForm.legacyClubAssists}
                    onChange={(e) =>
                      setEditForm({ ...editForm, legacyClubAssists: Number(e.target.value) || 0 })
                    }
                    placeholder="Assists"
                    className="px-2 py-1.5 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                </div>
              </div>
              <div className="rounded-xl bg-[#080E18] light:bg-slate-50 p-3 space-y-2">
                <span className="font-mono text-[9px] text-emerald-400 light:text-emerald-700 uppercase font-bold block">
                  Legacy International Baseline Stats
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    min={0}
                    value={editForm.legacyIntlApps}
                    onChange={(e) =>
                      setEditForm({ ...editForm, legacyIntlApps: Number(e.target.value) || 0 })
                    }
                    placeholder="Caps"
                    className="px-2 py-1.5 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                  <input
                    type="number"
                    min={0}
                    value={editForm.legacyIntlGoals}
                    onChange={(e) =>
                      setEditForm({ ...editForm, legacyIntlGoals: Number(e.target.value) || 0 })
                    }
                    placeholder="Goals"
                    className="px-2 py-1.5 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                  <input
                    type="number"
                    min={0}
                    value={editForm.legacyIntlAssists}
                    onChange={(e) =>
                      setEditForm({ ...editForm, legacyIntlAssists: Number(e.target.value) || 0 })
                    }
                    placeholder="Assists"
                    className="px-2 py-1.5 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingIdentity(false)}
                className="px-4 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs text-slate-300 light:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#7ADBF0] text-[#050A12] light:bg-cyan-600 light:text-white font-bold text-xs cursor-pointer"
              >
                Save permanent identity
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Transfer or Sign to Club */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const chosenId = activeClub
                ? filteredTransferClubs.find((c) => c.id === transferTargetClubId)?.id ||
                  filteredTransferClubs[0]?.id
                : filteredTransferClubs.find((c) => c.id === signClubTeamId)?.id ||
                  filteredTransferClubs[0]?.id;
              if (!chosenId) return;
              setSubmittingCareerAction(true);
              const res = activeClub
                ? await transferClubPlayerAction(identity.id, activeClub.teamId, chosenId, {
                    shirtNumber: transferShirt ? Number(transferShirt) : undefined,
                    transferDate,
                  })
                : await registerPlayerToTeamAction(identity.id, chosenId, {
                    shirtNumber: transferShirt ? Number(transferShirt) : undefined,
                  });
              setSubmittingCareerAction(false);
              if (res.ok) {
                if (res.data) setServerProfile(res.data);
                setTransferShirt('');
                setIsTransferModalOpen(false);
              }
            }}
            className="w-full max-w-lg rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-6 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
                <h3 className="font-display text-lg text-white light:text-slate-900 uppercase tracking-wide">
                  {activeClub ? `Transfer ${displayName}` : `Sign ${displayName} to Club`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Club</span>
              <span className="font-bold text-white light:text-slate-900">
                {activeClub ? activeClub.teamName : 'Club Free Agent'}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Search Clubs
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Filter by club name, league, or country..."
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && transferSearch.trim() && filteredTransferClubs.length > 0) {
                        e.preventDefault();
                        const top = filteredTransferClubs[0];
                        if (activeClub) setTransferTargetClubId(top.id);
                        else setSignClubTeamId(top.id);
                      }
                    }}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
                  />
                  {transferSearch && (
                    <button
                      type="button"
                      onClick={() => setTransferSearch('')}
                      className="p-0.5 text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                      aria-label="Clear club search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {transferSearch.trim() && filteredTransferClubs.length > 0 && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-200 divide-y divide-white/[0.06] light:divide-slate-200">
                    {filteredTransferClubs.slice(0, 20).map((c) => {
                      const currentChosen = activeClub
                        ? transferTargetClubId || filteredTransferClubs[0]?.id
                        : signClubTeamId || filteredTransferClubs[0]?.id;
                      const isPicked = currentChosen === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() =>
                            activeClub
                              ? setTransferTargetClubId(c.id)
                              : setSignClubTeamId(c.id)
                          }
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                            isPicked
                              ? 'bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:text-cyan-800 font-semibold'
                              : 'text-slate-200 light:text-slate-800 hover:bg-white/[0.04] light:hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="text-[10px] text-slate-400 light:text-slate-600 shrink-0">
                            {c.league || c.country}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Destination Club ({filteredTransferClubs.length} available)
                </label>
                <select
                  required
                  value={
                    activeClub
                      ? filteredTransferClubs.find((c) => c.id === transferTargetClubId)?.id ||
                        filteredTransferClubs[0]?.id ||
                        ''
                      : filteredTransferClubs.find((c) => c.id === signClubTeamId)?.id ||
                        filteredTransferClubs[0]?.id ||
                        ''
                  }
                  onChange={(e) =>
                    activeClub
                      ? setTransferTargetClubId(e.target.value)
                      : setSignClubTeamId(e.target.value)
                  }
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                >
                  {filteredTransferClubs.length === 0 ? (
                    <option value="">No matching clubs found</option>
                  ) : (
                    filteredTransferClubs.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.league})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                    New Shirt # (Optional)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    placeholder="Auto"
                    value={transferShirt}
                    onChange={(e) => setTransferShirt(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                    Effective Date
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                  />
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 light:text-slate-600">
              National team call-ups, international caps, and career goals remain completely intact.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
              {activeClub ? (
                <button
                  type="button"
                  disabled={submittingCareerAction}
                  onClick={async () => {
                    setSubmittingCareerAction(true);
                    const res = await releaseRegistrationAction(activeClub.id, 'club');
                    setSubmittingCareerAction(false);
                    if (res.ok) {
                      if (res.data) setServerProfile(res.data);
                      setIsTransferModalOpen(false);
                    }
                  }}
                  className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 light:text-rose-700 font-semibold text-xs cursor-pointer disabled:opacity-50"
                >
                  Release to Free Agency
                </button>
              ) : (
                <span />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs text-slate-300 light:text-slate-700 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCareerAction || filteredTransferClubs.length === 0}
                  className="px-4 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#9BE6F6] light:bg-cyan-600 light:hover:bg-cyan-700 text-[#050A12] light:text-white font-bold text-xs cursor-pointer disabled:opacity-50"
                >
                  {submittingCareerAction
                    ? 'Saving...'
                    : activeClub
                    ? 'Confirm Club Transfer'
                    : 'Sign to Club'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Change Player Nation */}
      {isChangeNationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!targetNationality.trim()) return;
              const matchingTeam = nationOptions.find(
                (t) =>
                  normalizeCountryName(t.country).toLowerCase() ===
                  normalizeCountryName(targetNationality).toLowerCase()
              );
              setSubmittingCareerAction(true);
              const res = await changePlayerNationAction(identity.id, {
                nationality: targetNationality.trim(),
                switchNationalSquad,
                newNationalTeamId: matchingTeam?.id,
                shirtNumber: changeNationShirt ? Number(changeNationShirt) : undefined,
              });
              setSubmittingCareerAction(false);
              if (res.ok) {
                if (res.data) setServerProfile(res.data);
                setIsChangeNationModalOpen(false);
              }
            }}
            className="w-full max-w-lg rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-6 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-400 light:text-emerald-700" />
                <h3 className="font-display text-lg text-white light:text-slate-900 uppercase tracking-wide">
                  Change Nation — {displayName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangeNationModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3 flex items-center justify-between text-xs">
              <span className="text-slate-400">Current Nationality</span>
              <span className="font-bold text-white light:text-slate-900">
                {natFlag} {identity.nationality}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Search FIFA Nations
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Type country name, FIFA code (e.g. BRA), or confederation..."
                    value={nationSearch}
                    onChange={(e) => {
                      const nextQ = e.target.value;
                      setNationSearch(nextQ);
                      const qNorm = normalizeDatabaseSearchText(nextQ);
                      if (qNorm) {
                        const firstMatch = sortedFifaCountries.find(
                          (c) =>
                            normalizeDatabaseSearchText(c.canonicalName).includes(qNorm) ||
                            normalizeDatabaseSearchText(c.fifaCode) === qNorm
                        );
                        if (firstMatch) setTargetNationality(firstMatch.canonicalName);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && nationSearch.trim() && filteredFifaCountries.length > 0) {
                        e.preventDefault();
                        setTargetNationality(filteredFifaCountries[0].canonicalName);
                      }
                    }}
                    className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
                  />
                  {nationSearch && (
                    <button
                      type="button"
                      onClick={() => setNationSearch('')}
                      className="p-0.5 text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                      aria-label="Clear nation search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                {nationSearch.trim() && filteredFifaCountries.length > 0 && (
                  <div className="mt-1.5 max-h-36 overflow-y-auto rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-200 divide-y divide-white/[0.06] light:divide-slate-200">
                    {filteredFifaCountries.slice(0, 20).map((c) => {
                      const isPicked = targetNationality === c.canonicalName;
                      return (
                        <button
                          key={c.fifaCode}
                          type="button"
                          onClick={() => setTargetNationality(c.canonicalName)}
                          className={`w-full text-left px-3 py-1.5 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                            isPicked
                              ? 'bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:text-cyan-800 font-semibold'
                              : 'text-slate-200 light:text-slate-800 hover:bg-white/[0.04] light:hover:bg-slate-100'
                          }`}
                        >
                          <span className="truncate">
                            {c.flag} {c.canonicalName}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 light:text-slate-600 shrink-0">
                            {c.fifaCode} · {c.confederation}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                  Select New Nation ({filteredFifaCountries.length})
                </label>
                <select
                  value={
                    filteredFifaCountries.some((c) => c.canonicalName === targetNationality)
                      ? targetNationality
                      : !nationSearch.trim() && targetNationality
                      ? targetNationality
                      : filteredFifaCountries[0]?.canonicalName || ''
                  }
                  onChange={(e) => setTargetNationality(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                >
                  {!nationSearch.trim() &&
                    targetNationality &&
                    !sortedFifaCountries.some((c) => c.canonicalName === targetNationality) && (
                      <option value={targetNationality}>{targetNationality}</option>
                    )}
                  {filteredFifaCountries.length === 0 ? (
                    <option value="">No matching nations found</option>
                  ) : (
                    filteredFifaCountries.map((c) => (
                      <option key={c.fifaCode} value={c.canonicalName}>
                        {c.flag} {c.canonicalName} ({c.fifaCode} · {c.confederation})
                      </option>
                    ))
                  )}
                </select>
              </div>

              {(() => {
                const matchedSquad = nationOptions.find(
                  (t) =>
                    normalizeCountryName(t.country).toLowerCase() ===
                    normalizeCountryName(targetNationality).toLowerCase()
                );
                return (
                  <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3 space-y-2">
                    <label className="flex items-start gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={switchNationalSquad}
                        onChange={(e) => setSwitchNationalSquad(e.target.checked)}
                        className="mt-0.5 rounded border-white/20"
                      />
                      <span className="text-slate-200 light:text-slate-800 leading-snug">
                        Also update active national team squad
                        <span className="block text-[11px] text-slate-400 mt-0.5">
                          {matchedSquad
                            ? `Will assign player to ${matchedSquad.flag || ''} ${matchedSquad.name}${
                                activeNationalCallUp ? ` (releasing ${activeNationalCallUp.teamName})` : ''
                              }.`
                            : `No ${
                                identity.gender === 'women' ? "women's" : "men's"
                              } national squad currently registered for ${targetNationality}; active call-up will be ended if checked.`}
                        </span>
                      </span>
                    </label>

                    {switchNationalSquad && matchedSquad && (
                      <div className="pt-1">
                        <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                          International Shirt # (Optional)
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={99}
                          placeholder="Keep / Auto"
                          value={changeNationShirt}
                          onChange={(e) => setChangeNationShirt(e.target.value)}
                          className="w-36 px-3 py-1.5 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-white light:text-slate-900"
                        />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsChangeNationModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs text-slate-300 light:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingCareerAction || !targetNationality.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {submittingCareerAction ? 'Updating...' : 'Save New Nation'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Retire from Nation */}
      {isRetireNationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSubmittingCareerAction(true);
              const res = await retirePlayerFromNationAction(identity.id, {
                retiredAt: retireDate,
              });
              setSubmittingCareerAction(false);
              if (res.ok) {
                if (res.data) setServerProfile(res.data);
                setIsRetireNationModalOpen(false);
              }
            }}
            className="w-full max-w-md rounded-2xl bg-[#0C131F] light:bg-white border border-rose-500/40 p-6 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-rose-400" />
                <h3 className="font-display text-lg text-white light:text-slate-900 uppercase tracking-wide">
                  Retire from International Duty?
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsRetireNationModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Player</span>
                <span className="font-bold text-white light:text-slate-900">{displayName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nation</span>
                <span className="font-semibold text-white light:text-slate-900">
                  {natFlag} {activeNationalCallUp?.teamName || identity.nationality}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">International Record</span>
                <span className="font-mono text-emerald-400 light:text-emerald-700 tabular-nums">
                  {careerStats.international.appearances} caps · {careerStats.international.goals}{' '}
                  goals
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed">
              This ends any active national team call-up and marks {displayName} as retired from
              international duty. All international caps, goals, and active club registration remain
              preserved.
            </p>

            <div className="text-xs">
              <label className="font-mono text-[10px] text-slate-400 uppercase block mb-1">
                Retirement Date
              </label>
              <input
                type="date"
                value={retireDate}
                onChange={(e) => setRetireDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-white light:text-slate-900"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsRetireNationModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs text-slate-300 light:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingCareerAction}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs cursor-pointer disabled:opacity-50"
              >
                {submittingCareerAction ? 'Retiring...' : 'Confirm Retirement'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Confirm Permanent Identity Delete */}
      {isAdmin && confirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-[#0C131F] light:bg-white border border-rose-500/40 p-5 landscape-mobile:p-4 space-y-4 shadow-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto">
            <h3 className="font-bold text-base text-white light:text-slate-900">
              Delete {identity.name}&apos;s Permanent Identity?
            </h3>
            <p className="text-xs text-slate-400 light:text-slate-600">
              This removes the player&apos;s permanent identity record completely.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(false)}
                className="px-3.5 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs text-slate-300 light:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmDeleteOpen(false);
                  const res = await deletePlayerIdentityProfile(identity.id);
                  if (res.ok) {
                    if (onDeleted) onDeleted();
                    else onBack();
                  }
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
