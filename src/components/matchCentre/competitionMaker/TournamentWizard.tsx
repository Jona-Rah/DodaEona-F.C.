import React, { useDeferredValue, useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  Globe,
  ImagePlus,
  Layers,
  Lock,
  PenTool,
  Plus,
  RotateCcw,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import type {
  CompetitionMakerTournament,
  TeamScopeMode,
  TieBreakerKey,
  TournamentPresetId,
  TournamentStageConfig,
  TournamentStageType,
  TrophyCategory,
  TrophyDesignConfig,
  TrophyDisplayStyle,
  TrophyMaterial,
  TrophyPrestigeTier,
  TrophySilhouette,
} from '../../../types/competitionMaker';
import { getTeamType, Team } from '../../../types/matchCentre';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { useAuth } from '../../../context/AuthContext';
import {
  autoPickTeamsForPreset,
  COMPETITION_PRESETS,
  estimateStageMatchesCount,
  PRESET_TROPHIES,
  TROPHY_CATEGORIES,
  UCL_36_CLUB_IDS,
  validateTournamentConfig,
  WORLD_CUP_2026_TEAM_IDS,
} from '../../../utils/competitionEngine';
import { TeamEmblem } from '../TeamEmblem';
import { AI_TROPHY_PORTRAIT_OPTIONS, TrophyArtwork } from './TrophyArtwork';
import { TrophyGalleryModal } from './TrophyGalleryModal';
import { filterTeamsFast } from '../../../utils/globalDatabaseSearch';

interface TournamentWizardProps {
  initialTrophy?: TrophyDesignConfig | null;
  onCancel: () => void;
  onCreated: (competition: CompetitionMakerTournament) => void;
}

const OTHER_PRESETS: TournamentPresetId[] = [
  'domestic-league',
  'euros-24',
  'continental-championship',
  'international-knockout',
  'domestic-cup',
  'knockout-cup',
  'round-robin',
  'custom',
];

const WIZARD_STEPS = [
  { id: 1, label: 'Identity' },
  { id: 2, label: 'Clubs' },
  { id: 3, label: 'Structure' },
  { id: 4, label: 'Trophy' },
  { id: 5, label: 'Review' },
] as const;

const TROPHY_STYLE_FILTERS: Array<{ id: 'competitions' | 'all' | TrophyDisplayStyle; label: string }> = [
  { id: 'competitions', label: 'COMPETITIONS' },
  { id: 'all', label: 'ALL DESIGNS' },
  { id: 'gold', label: 'GOLD' },
  { id: 'silver', label: 'SILVER' },
  { id: 'crystal', label: 'CRYSTAL' },
  { id: 'metal', label: 'METAL' },
  { id: 'grand-cup', label: 'GRAND CUP' },
  { id: 'medal', label: 'MEDAL' },
];

const SILHOUETTES: Array<{ id: TrophySilhouette; label: string }> = [
  { id: 'chalice', label: 'Chalice' },
  { id: 'amphora', label: 'Grand Cup' },
  { id: 'globe', label: 'Globe' },
  { id: 'crown', label: 'Crown' },
  { id: 'shield', label: 'Shield' },
  { id: 'obelisk', label: 'Obelisk' },
  { id: 'plate', label: 'Plate' },
  { id: 'medal', label: 'Medal' },
];

const MATERIALS: Array<{ id: TrophyMaterial; label: string }> = [
  { id: 'gold', label: 'Gold' },
  { id: 'silver', label: 'Silver' },
  { id: 'crystal', label: 'Crystal' },
  { id: 'metal', label: 'Metal' },
  { id: 'platinum', label: 'Platinum' },
  { id: 'obsidian-gold', label: 'Obsidian' },
  { id: 'rose-gold', label: 'Rose Gold' },
];

const PRESTIGE_TIERS: TrophyPrestigeTier[] = ['Legendary', 'Major', 'Domestic', 'Invitational'];

function getRatingRingColor(ovr: number): string {
  if (ovr >= 85) return 'border-amber-400 text-amber-300 light:text-amber-700';
  if (ovr >= 78) return 'border-[#7ADBF0] text-[#7ADBF0] light:text-cyan-700';
  if (ovr >= 70) return 'border-violet-400 text-violet-300 light:text-violet-700';
  return 'border-rose-400/80 text-rose-300 light:text-rose-700';
}

function getTrophyStyleBadge(tr: TrophyDesignConfig): string {
  const styleLabel = (tr.displayStyle || tr.material || 'GOLD').replace('-', ' ').toUpperCase();
  const catLabel = (tr.category || 'COMPETITION')
    .replace('Domestic ', '')
    .toUpperCase();
  return `${styleLabel} · ${catLabel}`;
}

export const TournamentWizard: React.FC<TournamentWizardProps> = ({
  initialTrophy,
  onCancel,
  onCreated,
}) => {
  const { teams, competitionTrophies, createCompetitionMaker, saveCustomTrophyDesign } =
    useMatchCentre();
  const { isAdmin } = useAuth();

  const [step, setStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 1 — Identity & Settings
  const [presetId, setPresetId] = useState<TournamentPresetId>('custom');
  const [name, setName] = useState('DodaEona Invitational');
  const [shortName, setShortName] = useState('DEI');
  const [season, setSeason] = useState('2026/27');
  const [description, setDescription] = useState('');
  const [customLogoUrl, setCustomLogoUrl] = useState<string>('');
  const [teamScope, setTeamScope] = useState<TeamScopeMode>('mixed');
  const [primaryTieBreaker, setPrimaryTieBreaker] = useState<'goal-diff' | 'goals-for' | 'wins'>(
    'goal-diff'
  );
  const [homeAdvantageEnabled, setHomeAdvantageEnabled] = useState(true);
  const [homeAdvantageBoost, setHomeAdvantageBoost] = useState(5);
  const [preventSameCountry, setPreventSameCountry] = useState(true);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const [logoTargetPreset, setLogoTargetPreset] = useState<TournamentPresetId | 'active'>('active');

  // Step 2 — Teams (max 128)
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(() =>
    autoPickTeamsForPreset('custom', teams, 4).map((t) => t.id)
  );
  const [teamSearch, setTeamSearch] = useState('');
  const deferredTeamSearch = useDeferredValue(teamSearch);
  const [typeFilter, setTypeFilter] = useState<'all' | 'club' | 'country'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'men' | 'women'>('all');
  const [leagueFilter, setLeagueFilter] = useState('all');

  // Step 3 — Stages (up to 6)
  const [stages, setStages] = useState<TournamentStageConfig[]>(() => [
    {
      id: 'stage-init-0',
      order: 0,
      name: 'League phase',
      type: 'league',
      inputTeamCount: 4,
      advanceCount: 1,
      roundsMode: 'single-rr',
      matchesPerTeam: 3,
      homeAndAway: false,
      directQualifyCount: 1,
      playoffQualifyCount: 0,
      seedingMode: 'seeded',
    },
  ]);

  // Step 4 — Trophy
  const [trophyStyleFilter, setTrophyStyleFilter] = useState<
    'competitions' | 'all' | TrophyDisplayStyle
  >('competitions');
  const [trophy, setTrophy] = useState<TrophyDesignConfig>(
    () => initialTrophy || PRESET_TROPHIES[12] || PRESET_TROPHIES[2]
  );
  const [customModalOpen, setCustomModalOpen] = useState(false);
  const [galleryModalOpen, setGalleryModalOpen] = useState(false);
  const [savingTrophy, setSavingTrophy] = useState(false);

  const teamsMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const tieBreakers = useMemo<TieBreakerKey[]>(() => {
    const rest: TieBreakerKey[] = ['goal-diff', 'goals-for', 'wins'].filter(
      (k) => k !== primaryTieBreaker
    ) as TieBreakerKey[];
    return ['points', primaryTieBreaker, ...rest, 'head-to-head', 'rating'];
  }, [primaryTieBreaker]);

  const effectiveHomeBoost = homeAdvantageEnabled ? homeAdvantageBoost : 0;

  const validation = useMemo(
    () =>
      validateTournamentConfig({
        name,
        season,
        teamIds: selectedTeamIds,
        stages,
      }),
    [name, season, selectedTeamIds, stages]
  );

  // Use the live Trophy Gallery (competitionTrophies) as the authoritative silverware collection
  const mergedMuseumTrophies = useMemo(() => {
    return competitionTrophies.length > 0 ? competitionTrophies : PRESET_TROPHIES;
  }, [competitionTrophies]);

  React.useEffect(() => {
    if (initialTrophy) {
      setTrophy(initialTrophy);
    }
  }, [initialTrophy]);

  const displayedCaseTrophies = useMemo(() => {
    if (trophyStyleFilter === 'competitions' || trophyStyleFilter === 'all') {
      return mergedMuseumTrophies;
    }
    return mergedMuseumTrophies.filter((tr) => {
      const style: TrophyDisplayStyle =
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
      return style === trophyStyleFilter;
    });
  }, [trophyStyleFilter, mergedMuseumTrophies]);

  const syncStagesToTeamCount = (
    nextStages: TournamentStageConfig[],
    teamCount: number
  ): TournamentStageConfig[] => {
    if (nextStages.length === 0) return nextStages;
    return nextStages.map((s, idx) => {
      if (idx !== 0) return { ...s, order: idx };
      const count = Math.max(2, teamCount);
      if (s.type === 'group') {
        const gs = Math.max(3, s.groupSize || 4);
        const gc = Math.max(1, Math.floor(count / gs));
        const qpg = Math.min(gs - 1, Math.max(1, s.qualifyPerGroup || 2));
        const b3 = Math.min(gc, Math.max(0, s.bestThirdPlacedCount || 0));
        const adv = gc * qpg + b3;
        return {
          ...s,
          order: 0,
          inputTeamCount: count,
          groupCount: gc,
          groupSize: gs,
          qualifyPerGroup: qpg,
          bestThirdPlacedCount: b3,
          advanceCount: adv,
        };
      }
      if (s.type === 'league') {
        return {
          ...s,
          order: 0,
          inputTeamCount: count,
          matchesPerTeam:
            s.roundsMode === 'swiss-n'
              ? Math.min(Math.max(1, count - 1), s.matchesPerTeam || 8)
              : s.roundsMode === 'double-rr' || s.homeAndAway
              ? (count - 1) * 2
              : count - 1,
        };
      }
      return {
        ...s,
        order: 0,
        inputTeamCount: count,
        advanceCount: nextStages.length > 1 ? s.advanceCount : 1,
      };
    });
  };

  const handleUploadLogoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCustomLogoUrl(reader.result);
        if (logoTargetPreset === 'ucl-36' || logoTargetPreset === 'world-cup-2026') {
          setPresetId(logoTargetPreset);
        }
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const applyPreset = (targetPresetId: TournamentPresetId, populateTeams = true) => {
    const def = COMPETITION_PRESETS[targetPresetId];
    setPresetId(targetPresetId);
    setTeamScope(def.teamScope);
    if (targetPresetId !== 'custom') {
      setName(
        targetPresetId === 'world-cup-2026'
          ? 'FIFA World Cup 2026'
          : targetPresetId === 'ucl-36'
          ? 'UEFA Champions League'
          : targetPresetId === 'domestic-league'
          ? 'Premier League'
          : def.name
      );
      setShortName(def.shortName);
      if (targetPresetId === 'world-cup-2026') setSeason('2026');
    } else if (!name.trim()) {
      setName('DodaEona Invitational');
      setShortName('DEI');
    }
    setDescription(def.description);
    setHomeAdvantageBoost(Math.max(1, def.homeAdvantageBoost));
    setHomeAdvantageEnabled(def.homeAdvantageBoost > 0);
    setPreventSameCountry(targetPresetId === 'ucl-36' || targetPresetId === 'domestic-cup' ? false : true);
    setTrophy(def.defaultTrophy);

    if (populateTeams) {
      let pickedIds: string[];
      if (targetPresetId === 'world-cup-2026') {
        pickedIds = WORLD_CUP_2026_TEAM_IDS.filter((id) => teamsMap.has(id));
        if (pickedIds.length < 48) {
          pickedIds = autoPickTeamsForPreset('world-cup-2026', teams, 48).map((t) => t.id);
        }
      } else if (targetPresetId === 'ucl-36') {
        pickedIds = UCL_36_CLUB_IDS.filter((id) => teamsMap.has(id));
        if (pickedIds.length < 36) {
          pickedIds = autoPickTeamsForPreset('ucl-36', teams, 36).map((t) => t.id);
        }
      } else {
        pickedIds = autoPickTeamsForPreset(targetPresetId, teams, def.recommendedTeamCount).map(
          (t) => t.id
        );
      }
      setSelectedTeamIds(pickedIds);
      setStages(def.buildStages(pickedIds.length));
    } else {
      setStages(def.buildStages(Math.max(2, selectedTeamIds.length)));
    }
  };

  // Counts & Filtered Lists for Step 2
  const scopeCounts = useMemo(() => {
    let clubs = 0;
    let nations = 0;
    for (const t of teams) {
      if (getTeamType(t) === 'country') nations += 1;
      else clubs += 1;
    }
    return { total: teams.length, clubs, nations };
  }, [teams]);

  const availableLeagues = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of teams) {
      if (t.league) {
        counts.set(t.league, (counts.get(t.league) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 60)
      .map(([l]) => l);
  }, [teams]);

  const matchingBrowserTeams = useMemo(() => {
    return filterTeamsFast(
      teams,
      deferredTeamSearch,
      (t) => {
        if (typeFilter !== 'all' && getTeamType(t) !== typeFilter) return false;
        if (genderFilter !== 'all' && t.gender !== genderFilter) return false;
        if (leagueFilter !== 'all' && t.league !== leagueFilter) return false;
        return true;
      }
    );
  }, [teams, deferredTeamSearch, typeFilter, genderFilter, leagueFilter]);

  const visibleBrowserTeams = useMemo(
    () => matchingBrowserTeams.slice(0, 240),
    [matchingBrowserTeams]
  );

  const visibleNations = useMemo(
    () => visibleBrowserTeams.filter((t) => getTeamType(t) === 'country'),
    [visibleBrowserTeams]
  );
  const visibleClubs = useMemo(
    () => visibleBrowserTeams.filter((t) => getTeamType(t) === 'club'),
    [visibleBrowserTeams]
  );

  const selectedSet = useMemo(() => new Set(selectedTeamIds), [selectedTeamIds]);

  const setTeamSelectionAndSync = (nextIds: string[]) => {
    const clamped = nextIds.slice(0, 128);
    setSelectedTeamIds(clamped);
    setStages((cur) => syncStagesToTeamCount(cur, clamped.length));
  };

  const toggleTeamId = (teamId: string) => {
    if (selectedSet.has(teamId)) {
      setTeamSelectionAndSync(selectedTeamIds.filter((id) => id !== teamId));
    } else if (selectedTeamIds.length < 128) {
      setTeamSelectionAndSync([...selectedTeamIds, teamId]);
    }
  };

  const addManyTeams = (pool: Team[]) => {
    const next = [...selectedTeamIds];
    const seen = new Set(next);
    for (const t of pool) {
      if (next.length >= 128) break;
      if (!seen.has(t.id)) {
        seen.add(t.id);
        next.push(t.id);
      }
    }
    setTeamSelectionAndSync(next);
  };

  const getStageInputCount = (idx: number): number => {
    if (idx === 0) return selectedTeamIds.length;
    let byeArrivals = 0;
    for (let k = 0; k < idx; k++) {
      const prev = stages[k];
      if ((prev.byeTopCount || 0) > 0 && prev.byeTargetStageOrder === idx) {
        byeArrivals += prev.byeTopCount || 0;
      }
    }
    const prevStage = stages[idx - 1];
    const directFromPrev =
      prevStage.advanceCount -
      ((prevStage.byeTopCount || 0) > 0 && prevStage.byeTargetStageOrder !== idx
        ? prevStage.byeTopCount || 0
        : 0);
    return Math.max(0, directFromPrev + byeArrivals);
  };

  const cascadeStageInputCounts = (list: TournamentStageConfig[]): TournamentStageConfig[] => {
    const normalized = list.map((s, idx) => ({ ...s, order: idx }));
    for (let i = 0; i < normalized.length; i++) {
      let incoming = i === 0 ? Math.max(2, selectedTeamIds.length) : 2;
      if (i > 0) {
        let byeArrivals = 0;
        for (let k = 0; k < i; k++) {
          const prev = normalized[k];
          if ((prev.byeTopCount || 0) > 0 && prev.byeTargetStageOrder === i) {
            byeArrivals += prev.byeTopCount || 0;
          }
        }
        const prevStage = normalized[i - 1];
        const directFromPrev =
          prevStage.advanceCount -
          ((prevStage.byeTopCount || 0) > 0 && prevStage.byeTargetStageOrder !== i
            ? prevStage.byeTopCount || 0
            : 0);
        incoming = Math.max(2, directFromPrev + byeArrivals);
      }
      normalized[i] = {
        ...normalized[i],
        inputTeamCount: incoming,
      };
    }
    return normalized;
  };

  const handleAddStage = (type: TournamentStageType) => {
    if (stages.length >= 6) return;
    const updatedPrevList = [...stages];
    const prevIdx = updatedPrevList.length - 1;
    let inputCount = Math.max(2, selectedTeamIds.length);

    if (prevIdx >= 0) {
      const prev = updatedPrevList[prevIdx];
      const prevIn = getStageInputCount(prevIdx);
      const minQualifiers =
        prev.advanceCount >= 2
          ? prev.advanceCount
          : Math.max(2, Math.min(prevIn, Math.pow(2, Math.floor(Math.log2(Math.max(2, Math.floor(prevIn / 2)))))));
      if (prev.advanceCount < 2) {
        updatedPrevList[prevIdx] = {
          ...prev,
          advanceCount: minQualifiers,
          directQualifyCount: prev.type === 'league' ? minQualifiers : prev.directQualifyCount,
        };
      }
      inputCount = minQualifiers;
    }

    const order = updatedPrevList.length;

    let newStage: TournamentStageConfig;
    if (type === 'group') {
      const gc = Math.max(1, Math.floor(inputCount / 4));
      newStage = {
        id: `stage-${Date.now()}-${order}`,
        order,
        name: `Group Stage ${order + 1}`,
        type: 'group',
        inputTeamCount: inputCount,
        advanceCount: Math.max(2, gc * 2),
        groupCount: gc,
        groupSize: Math.max(3, Math.floor(inputCount / Math.max(1, gc))),
        qualifyPerGroup: 2,
        bestThirdPlacedCount: 0,
        homeAndAway: false,
        neutralVenue: false,
        seedingMode: 'seeded',
      };
    } else if (type === 'league') {
      newStage = {
        id: `stage-${Date.now()}-${order}`,
        order,
        name: order === 0 ? 'League phase' : `League phase ${order + 1}`,
        type: 'league',
        inputTeamCount: inputCount,
        advanceCount: Math.max(2, Math.min(inputCount, 8)),
        roundsMode: 'single-rr',
        matchesPerTeam: Math.max(1, inputCount - 1),
        homeAndAway: false,
        directQualifyCount: Math.max(1, Math.min(inputCount, 4)),
        playoffQualifyCount: 0,
        seedingMode: 'seeded',
      };
    } else {
      newStage = {
        id: `stage-${Date.now()}-${order}`,
        order,
        name: order === 0 ? 'Knockout Bracket' : 'Knockout Finals',
        type: 'knockout',
        inputTeamCount: inputCount,
        advanceCount: 1,
        homeAndAway: false,
        neutralVenue: false,
        twoLegged: false,
        finalSingleLeg: true,
        awayGoalsRule: false,
        extraTimeEnabled: true,
        penaltiesEnabled: true,
        seedingMode: 'seeded',
        thirdPlacePlayoff: false,
      };
    }

    setStages(cascadeStageInputCounts([...updatedPrevList, newStage]));
  };

  const handleDuplicateStage = (order: number) => {
    if (stages.length >= 6) return;
    const src = stages[order];
    if (!src) return;
    const copy: TournamentStageConfig = {
      ...src,
      id: `stage-dup-${Date.now()}`,
      name: `${src.name} (Copy)`,
    };
    const next = [...stages];
    next.splice(order + 1, 0, copy);
    setStages(cascadeStageInputCounts(next));
  };

  const handleUpdateStage = (order: number, patch: Partial<TournamentStageConfig>) => {
    setStages((prev) =>
      cascadeStageInputCounts(
        prev.map((s) => {
          if (s.order !== order) return s;
          const next = { ...s, ...patch };
          if (next.type === 'group') {
            const gc = Math.max(1, Number(next.groupCount) || 1);
            const gs = Math.max(3, Number(next.groupSize) || 4);
            const qpg = Math.max(1, Math.min(gs - 1, Number(next.qualifyPerGroup) || 1));
            const b3 = Math.max(0, Math.min(gc, Number(next.bestThirdPlacedCount) || 0));
            next.groupCount = gc;
            next.groupSize = gs;
            next.qualifyPerGroup = qpg;
            next.bestThirdPlacedCount = b3;
            next.advanceCount = gc * qpg + b3;
          }
          return next;
        })
      )
    );
  };

  const handleMoveStage = (order: number, dir: -1 | 1) => {
    const target = order + dir;
    if (target < 0 || target >= stages.length) return;
    const copy = [...stages];
    const [moved] = copy.splice(order, 1);
    copy.splice(target, 0, moved);
    setStages(copy.map((s, idx) => ({ ...s, order: idx })));
  };

  const handleRemoveStage = (order: number) => {
    if (stages.length <= 1) return;
    setStages((prev) =>
      prev.filter((s) => s.order !== order).map((s, idx) => ({ ...s, order: idx }))
    );
  };

  const handleSaveCustomTrophy = async () => {
    if (!isAdmin) return;
    setSavingTrophy(true);
    const res = await saveCustomTrophyDesign({
      ...trophy,
      id: `trophy-custom-${Date.now()}`,
      isCustom: true,
    });
    setSavingTrophy(false);
    if (res.ok && res.data) {
      setTrophy(res.data);
      setCustomModalOpen(false);
    }
  };

  const handleCreate = async () => {
    if (!validation.valid || submitting) return;
    setSubmitError(null);
    setSubmitting(true);
    const res = await createCompetitionMaker({
      name: name.trim(),
      shortName: (shortName.trim() || name.trim().slice(0, 6)).toUpperCase(),
      season: season.trim(),
      description: description.trim(),
      customLogoUrl: customLogoUrl.trim() || undefined,
      presetId,
      teamScope,
      teamIds: selectedTeamIds,
      tieBreakers,
      homeAdvantageBoost: effectiveHomeBoost,
      preventSameCountry,
      trophy,
      stages,
    });
    setSubmitting(false);
    if (!res.ok || !res.data) {
      setSubmitError(res.error || 'Could not create competition.');
      return;
    }
    onCreated(res.data);
  };

  const finalWinnerCount = stages[stages.length - 1]?.type === 'knockout' ? 1 : stages[stages.length - 1]?.advanceCount || 1;

  return (
    <div className="space-y-5 pb-20">
      {/* Hidden File Input for Competition Custom Logo Upload */}
      <input
        ref={logoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUploadLogoFile}
      />

      {/* ================================================================== */}
      {/* HERO BANNER (Obsidian-Navy Gradient + Live Stat Pills)              */}
      {/* ================================================================== */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 light:border-slate-200 bg-gradient-to-r from-[#091224] via-[#0B111E] to-[#1A140B] light:from-slate-900 light:via-slate-900 light:to-slate-800 p-6 sm:p-8 shadow-xl">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[#7ADBF0]/30 bg-[#7ADBF0]/10 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7ADBF0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0]" />
            <span>Match Centre · Competition Builder</span>
          </div>

          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/15 bg-white/[0.04] text-xs font-medium text-slate-300 hover:text-white hover:border-white/30 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Tournaments</span>
          </button>
        </div>

        <h1 className="font-display text-3xl sm:text-5xl tracking-wide uppercase text-white">
          NEW COMPETITION
        </h1>
        <p className="text-xs sm:text-sm text-slate-300/90 max-w-2xl mt-2 leading-relaxed">
          Build any competition you can imagine: name it, pick the field, then stack league, group and knockout stages in whatever order you want. Progression between stages is automatic.
        </p>

        {/* Bottom Live KPI Stat Pills */}
        <div className="flex flex-wrap items-center gap-2.5 mt-5">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#050A12]/80 text-white">
            <Users className="w-3.5 h-3.5 text-[#7ADBF0]" />
            <span className="font-mono text-xs font-bold tabular-nums">{selectedTeamIds.length}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">TEAMS</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#050A12]/80 text-white">
            <Layers className="w-3.5 h-3.5 text-violet-400" />
            <span className="font-mono text-xs font-bold tabular-nums">{stages.length}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">STAGES</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#050A12]/80 text-white">
            <Swords className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono text-xs font-bold tabular-nums">{validation.estimatedMatches}</span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400">MATCHES</span>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-[#050A12]/80 text-white">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-medium text-slate-200 truncate max-w-[200px]">
              {trophy.name}
            </span>
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* HORIZONTAL 5-STEP PROGRESS STEPPER                                  */}
      {/* ================================================================== */}
      <div className="sticky top-[118px] sm:top-[126px] lg:top-[174px] z-20 rounded-xl border border-white/10 light:border-slate-200 bg-[#060C15]/95 light:bg-white/95 backdrop-blur-md px-4 py-3">
        <div className="flex items-center justify-between gap-2 overflow-x-auto">
          {WIZARD_STEPS.map((ws, idx) => {
            const active = step === ws.id;
            const completed = step > ws.id;
            const activeColor =
              ws.id === 1
                ? 'border-amber-400/50 bg-amber-500/10 text-white'
                : ws.id === 4
                ? 'border-amber-400/50 bg-amber-500/10 text-white'
                : ws.id === 5
                ? 'border-emerald-400/60 bg-emerald-500/10 text-white'
                : 'border-[#7ADBF0]/50 bg-[#7ADBF0]/10 text-white';
            const activeBadge =
              ws.id === 1 || ws.id === 4
                ? 'bg-amber-400 text-slate-950'
                : ws.id === 5
                ? 'bg-emerald-400 text-slate-950'
                : 'bg-[#7ADBF0] text-slate-950';

            return (
              <React.Fragment key={ws.id}>
                <button
                  type="button"
                  onClick={() => setStep(ws.id)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all cursor-pointer shrink-0 ${
                    active
                      ? `${activeColor} light:bg-slate-900 light:text-white`
                      : completed
                      ? 'border-transparent text-emerald-300 light:text-emerald-700 hover:bg-white/[0.04]'
                      : 'border-transparent text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  <span
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      active
                        ? activeBadge
                        : completed
                        ? 'border border-emerald-400/70 bg-emerald-500/15 text-emerald-300 light:text-emerald-700'
                        : 'border border-white/15 light:border-slate-300 text-slate-400'
                    }`}
                  >
                    {completed ? <Check className="w-3.5 h-3.5" /> : ws.id}
                  </span>
                  <div className="text-left leading-tight">
                    <div className="font-mono text-[9px] uppercase tracking-wider opacity-70">
                      STEP {ws.id}
                    </div>
                    <div className="text-xs font-semibold">{ws.label}</div>
                  </div>
                </button>
                {idx < WIZARD_STEPS.length - 1 && (
                  <div
                    className={`hidden sm:block flex-1 h-px min-w-[20px] ${
                      completed
                        ? 'bg-emerald-400/60'
                        : 'bg-white/10 light:bg-slate-200'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ================================================================== */}
      {/* STEP 1: COMPETITION IDENTITY + FEATURED BLUEPRINTS                 */}
      {/* ================================================================== */}
      {step === 1 && (
        <div className="space-y-6">
          {/* Competition Identity Card */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10 light:border-slate-200 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent border-l-2 border-l-amber-400 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-400/15 border border-amber-400/35 flex items-center justify-center text-amber-300 light:text-amber-700">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-white light:text-slate-950">
                    Competition identity
                  </h2>
                  <p className="text-xs text-slate-400 light:text-slate-600">
                    What this competition is called, and which season it belongs to.
                  </p>
                </div>
              </div>

              {/* Active Logo Preview + Upload Control */}
              <div className="flex items-center gap-2 shrink-0">
                {customLogoUrl && (
                  <img
                    src={customLogoUrl}
                    alt="Competition logo"
                    className="w-9 h-9 rounded-lg object-contain bg-[#040810] border border-white/15 p-1"
                  />
                )}
                <button
                  type="button"
                  onClick={() => {
                    setLogoTargetPreset('active');
                    logoInputRef.current?.click();
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-300 light:text-slate-700 hover:border-[#7ADBF0]/50 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ImagePlus className="w-3.5 h-3.5 text-[#7ADBF0]" />
                  <span>{customLogoUrl ? 'Replace logo' : 'Custom logo'}</span>
                </button>
                {customLogoUrl && (
                  <button
                    type="button"
                    onClick={() => setCustomLogoUrl('')}
                    className="px-2 py-1.5 rounded-lg border border-white/15 light:border-slate-300 font-mono text-[10px] uppercase text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
                    title="Reset logo to default"
                  >
                    Default
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                    COMPETITION NAME
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="DodaEona Invitational"
                    className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3.5 py-2.5 text-sm text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                    SEASON / YEAR
                  </label>
                  <input
                    type="text"
                    value={season}
                    onChange={(e) => setSeason(e.target.value)}
                    placeholder="2026/27"
                    className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3.5 py-2.5 text-sm text-white light:text-slate-900 tabular-nums focus:outline-none focus:border-[#7ADBF0]"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                  DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="A short note about the competition, its rules or its history."
                  className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3.5 py-2.5 text-sm text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="block font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                    TIE-BREAKER
                  </label>
                  <select
                    value={primaryTieBreaker}
                    onChange={(e) =>
                      setPrimaryTieBreaker(e.target.value as 'goal-diff' | 'goals-for' | 'wins')
                    }
                    className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3.5 py-2.5 text-sm text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
                  >
                    <option value="goal-diff">Goal difference</option>
                    <option value="goals-for">Goals scored</option>
                    <option value="wins">Most wins</option>
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-5 pb-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 light:text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={homeAdvantageEnabled}
                      onChange={(e) => setHomeAdvantageEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#7ADBF0]"
                    />
                    <span>Home advantage applies</span>
                  </label>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-200 light:text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preventSameCountry}
                      onChange={(e) => setPreventSameCountry(e.target.checked)}
                      className="w-4 h-4 rounded accent-[#7ADBF0]"
                    />
                    <span>Same-country protection</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Official Competition Blueprint Cards (UCL 36 & FIFA World Cup 48) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* UEFA Champions League Blueprint */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                presetId === 'ucl-36'
                  ? 'border-[#7ADBF0]/70 bg-gradient-to-br from-[#081530] via-[#070E1A] to-[#050912] light:from-indigo-50 light:to-white'
                  : 'border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3.5 pb-4 border-b border-white/10 light:border-slate-200">
                  <div className="w-12 h-12 rounded-xl border border-[#7ADBF0]/30 bg-[#050B16] light:bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                    {customLogoUrl && presetId === 'ucl-36' ? (
                      <img src={customLogoUrl} alt="UCL logo" className="w-full h-full object-contain" />
                    ) : (
                      <Sparkles className="w-6 h-6 text-[#7ADBF0]" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#7ADBF0] light:text-indigo-700">
                      LEAGUE PHASE · KNOCKOUT BRACKET
                    </div>
                    <h3 className="text-lg font-bold text-white light:text-slate-950 truncate">
                      UEFA Champions League
                    </h3>
                    <div className="font-mono text-[11px] text-slate-400 light:text-slate-600 flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      <span>36 TEAMS</span>
                    </div>
                  </div>
                </div>

                {/* Stage Flow Pills */}
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase">
                  <span className="px-2 py-1 rounded border border-emerald-500/40 bg-emerald-500/10 text-emerald-300 light:bg-emerald-50 light:text-emerald-800">
                    LEAGUE PHASE 36 · 8 MATCHES
                  </span>
                  <span className="text-slate-500">&rsaquo;</span>
                  <span className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800">
                    PLAY-OFFS 24 QUALIFY
                  </span>
                  <span className="text-slate-500">&rsaquo;</span>
                  <span className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800">
                    ROUND OF 16 16
                  </span>
                  <span className="text-slate-500">&rsaquo;</span>
                  <span className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800">
                    FINAL 2
                  </span>
                </div>

                <p className="text-xs text-slate-300 light:text-slate-700">
                  One 36-club league phase, eight matches each, then a two-legged run to the final.
                </p>

                <ul className="space-y-1 text-xs text-slate-400 light:text-slate-600">
                  <li>· 36 clubs in a single league phase</li>
                  <li>· Each club plays 8 matches</li>
                  <li>· Top 8 qualify directly for the Round of 16</li>
                  <li>· 9th–24th enter the knockout play-offs</li>
                  <li>· 25th–36th are eliminated</li>
                  <li>· Play-offs, Round of 16, Quarter-finals, Semi-finals, Final</li>
                </ul>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoTargetPreset('ucl-36');
                      logoInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-300 light:text-slate-700 hover:border-white/30 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ImagePlus className="w-3 h-3" />
                    <span>REPLACE LOGO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomLogoUrl('')}
                    className="px-3 py-1.5 rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>DEFAULT</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    applyPreset('ucl-36', true);
                    setStep(2);
                  }}
                  className="w-full py-2.5 rounded-xl border border-white/15 light:border-slate-300 bg-white/[0.04] light:bg-slate-900 hover:bg-[#7ADBF0] hover:text-slate-950 hover:border-[#7ADBF0] text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Use this format
                </button>
                <div className="text-[11px] text-slate-500 light:text-slate-600">
                  Built for 36 teams — this field has {selectedTeamIds.length}. Every stage stays editable.
                </div>
              </div>
            </div>

            {/* FIFA World Cup Blueprint */}
            <div
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-colors ${
                presetId === 'world-cup-2026'
                  ? 'border-amber-400/70 bg-gradient-to-br from-[#171207] via-[#09101C] to-[#050912] light:from-amber-50 light:to-white'
                  : 'border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3.5 pb-4 border-b border-white/10 light:border-slate-200">
                  <div className="w-12 h-12 rounded-xl border border-amber-400/35 bg-[#0A0906] flex items-center justify-center shrink-0 overflow-hidden p-1.5">
                    {customLogoUrl && presetId === 'world-cup-2026' ? (
                      <img src={customLogoUrl} alt="World Cup logo" className="w-full h-full object-contain" />
                    ) : (
                      <Globe className="w-6 h-6 text-amber-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-amber-300 light:text-amber-700">
                      GROUPS · KNOCKOUT BRACKET
                    </div>
                    <h3 className="text-lg font-bold text-white light:text-slate-950 truncate">
                      FIFA World Cup
                    </h3>
                    <div className="font-mono text-[11px] text-slate-400 light:text-slate-600 flex items-center gap-1.5">
                      <Users className="w-3 h-3" />
                      <span>48 TEAMS</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] uppercase">
                  <span className="px-2 py-1 rounded border border-sky-500/40 bg-sky-500/10 text-sky-300 light:bg-sky-50 light:text-sky-800">
                    GROUPS 12 × 4
                  </span>
                  <span className="text-slate-500">&rsaquo;</span>
                  <span className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800">
                    ROUND OF 32 32
                  </span>
                  <span className="text-slate-500">&rsaquo;</span>
                  <span className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800">
                    ROUND OF 16 16
                  </span>
                  <span className="text-slate-500">&rsaquo;</span>
                  <span className="px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800">
                    FINAL 2
                  </span>
                </div>

                <p className="text-xs text-slate-300 light:text-slate-700">
                  Twelve groups of four, the best thirds rescued, then a Round of 32 to the final.
                </p>

                <ul className="space-y-1 text-xs text-slate-400 light:text-slate-600">
                  <li>· 48 national teams (Official Groups A–L draw)</li>
                  <li>· 12 groups of 4 teams</li>
                  <li>· Top 2 from each group qualify</li>
                  <li>· Best 8 third-placed teams also qualify</li>
                  <li>· Round of 32, Round of 16, Quarter-finals, Semi-finals, Final</li>
                </ul>
              </div>

              <div className="space-y-2.5 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLogoTargetPreset('world-cup-2026');
                      logoInputRef.current?.click();
                    }}
                    className="px-3 py-1.5 rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-300 light:text-slate-700 hover:border-white/30 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <ImagePlus className="w-3 h-3" />
                    <span>REPLACE LOGO</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCustomLogoUrl('')}
                    className="px-3 py-1.5 rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>DEFAULT</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    applyPreset('world-cup-2026', true);
                    setStep(2);
                  }}
                  className="w-full py-2.5 rounded-xl border border-white/15 light:border-slate-300 bg-white/[0.04] light:bg-slate-900 hover:bg-amber-400 hover:text-slate-950 hover:border-amber-400 text-xs font-semibold text-white transition-colors cursor-pointer"
                >
                  Use this format
                </button>
                <div className="text-[11px] text-slate-500 light:text-slate-600">
                  Built for 48 teams — this field has {selectedTeamIds.length}. Every stage stays editable.
                </div>
              </div>
            </div>
          </div>

          {/* All Remaining Format Presets */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                MORE FORMAT BLUEPRINTS ({OTHER_PRESETS.length})
              </div>
              <span className="text-[11px] text-slate-400 light:text-slate-600">
                Click any blueprint to auto-populate teams &amp; stages
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {OTHER_PRESETS.map((id) => {
                const p = COMPETITION_PRESETS[id];
                const active = presetId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => applyPreset(id, true)}
                    className={`text-left rounded-xl border p-3 transition-colors cursor-pointer ${
                      active
                        ? 'border-[#7ADBF0] bg-[#7ADBF0]/10 light:bg-cyan-50 light:border-cyan-600'
                        : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-xs text-white light:text-slate-900 truncate">
                        {p.name}
                      </span>
                      <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-white/[0.06] light:bg-slate-200 text-slate-300 light:text-slate-700 shrink-0">
                        {p.shortName}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 light:text-slate-600 mt-1 line-clamp-2">
                      {p.tagline}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 2: TEAM LIST & YOUR FIELD SIDEBAR                             */}
      {/* ================================================================== */}
      {step === 2 && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_310px] gap-5 items-start">
          {/* Left: Team List Browser */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-600">
                  TEAM LIST
                </div>
                <div className="text-sm font-bold text-white light:text-slate-950 tabular-nums">
                  {selectedTeamIds.length} selected · 128 max
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset('world-cup-2026', true)}
                  className="px-2.5 py-1.5 rounded-lg border border-amber-400/35 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800 font-mono text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  WC 48 Qualifiers
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset('ucl-36', true)}
                  className="px-2.5 py-1.5 rounded-lg border border-[#7ADBF0]/35 bg-[#7ADBF0]/10 text-[#7ADBF0] light:bg-cyan-50 light:text-cyan-800 font-mono text-[10px] uppercase tracking-wider cursor-pointer"
                >
                  UCL 36 Clubs
                </button>
                <button
                  type="button"
                  onClick={() => addManyTeams(matchingBrowserTeams)}
                  disabled={selectedTeamIds.length >= 128 || matchingBrowserTeams.length === 0}
                  className="px-3 py-1.5 rounded-lg border border-white/15 light:border-slate-300 bg-white/[0.04] light:bg-slate-100 text-xs font-semibold text-white light:text-slate-900 hover:border-[#7ADBF0]/50 disabled:opacity-40 cursor-pointer"
                >
                  Add all {matchingBrowserTeams.length}
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && teamSearch.trim() && matchingBrowserTeams.length > 0) {
                    e.preventDefault();
                    toggleTeamId(matchingBrowserTeams[0].id);
                  }
                }}
                placeholder="Search a club, nation or league..."
                className="w-full rounded-xl border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 pl-10 pr-9 py-2.5 text-sm text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
              />
              {teamSearch && (
                <button
                  type="button"
                  onClick={() => setTeamSearch('')}
                  className="p-1 rounded-md text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label="Clear team search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Pill Filter Row */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: 'All', count: scopeCounts.total },
                  { id: 'club', label: 'Clubs', count: scopeCounts.clubs },
                  { id: 'country', label: 'Nations', count: scopeCounts.nations },
                ] as const
              ).map((chip) => {
                const active = typeFilter === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setTypeFilter(chip.id)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5 ${
                      active
                        ? 'border-[#7ADBF0] bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-600 light:text-cyan-800'
                        : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-300 light:text-slate-700 hover:border-white/25'
                    }`}
                  >
                    <span>{chip.label}</span>
                    <span className="font-mono text-[10px] opacity-75 tabular-nums">
                      {chip.count}
                    </span>
                  </button>
                );
              })}

              <span className="text-slate-600 mx-1">|</span>

              {(
                [
                  { id: 'all', label: 'Everyone' },
                  { id: 'men', label: "Men's" },
                  { id: 'women', label: "Women's" },
                ] as const
              ).map((g) => {
                const active = genderFilter === g.id;
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setGenderFilter(g.id)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors cursor-pointer ${
                      active
                        ? 'border-[#7ADBF0] bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-600 light:text-cyan-800'
                        : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-300 light:text-slate-700 hover:border-white/25'
                    }`}
                  >
                    {g.label}
                  </button>
                );
              })}
            </div>

            {/* League Select + Count */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                  LEAGUE
                </span>
                <select
                  value={leagueFilter}
                  onChange={(e) => setLeagueFilter(e.target.value)}
                  className="rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3 py-1.5 text-xs text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
                >
                  <option value="all">All leagues</option>
                  {availableLeagues.map((l) => (
                    <option key={l} value={l}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 light:text-slate-600 tabular-nums">
              {matchingBrowserTeams.length} of {teams.length} teams · showing the first{' '}
              {visibleBrowserTeams.length}, narrow the search to see the rest
            </div>

            {/* Grouped Scrollable Team Cards */}
            <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
              {visibleNations.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 light:border-slate-200 sticky top-0 bg-[#08101C] light:bg-white z-10">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 light:text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0]" />
                      <span>NATIONS</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] light:bg-slate-100 tabular-nums">
                        {visibleNations.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addManyTeams(visibleNations)}
                      disabled={selectedTeamIds.length >= 128}
                      className="px-2.5 py-1 rounded-full border border-white/15 light:border-slate-300 font-mono text-[10px] text-slate-300 light:text-slate-700 hover:border-[#7ADBF0]/50 cursor-pointer disabled:opacity-40"
                    >
                      Add {visibleNations.length}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visibleNations.map((t) => {
                      const picked = selectedSet.has(t.id);
                      const disabled = !picked && selectedTeamIds.length >= 128;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleTeamId(t.id)}
                          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-40 ${
                            picked
                              ? 'border-[#7ADBF0] bg-[#7ADBF0]/10 light:bg-cyan-50 light:border-cyan-600'
                              : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TeamEmblem team={t} className="w-7 h-7 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white light:text-slate-900 truncate">
                                  {t.name}
                                </span>
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 light:bg-sky-100 light:text-sky-800 shrink-0">
                                  NATION
                                </span>
                              </div>
                              <div className="font-mono text-[10px] uppercase text-slate-400 light:text-slate-600 truncate">
                                {t.country} · {t.confederation || (t.gender === 'women' ? 'WOMEN' : 'INT')}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[11px] font-bold tabular-nums ${getRatingRingColor(
                                t.overallRating
                              )}`}
                            >
                              {t.overallRating}
                            </span>
                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                picked
                                  ? 'border-[#7ADBF0] bg-[#7ADBF0] text-slate-950'
                                  : 'border-white/20 light:border-slate-300'
                              }`}
                            >
                              {picked && <Check className="w-3 h-3" />}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {visibleClubs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-white/10 light:border-slate-200 sticky top-0 bg-[#08101C] light:bg-white z-10">
                    <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 light:text-slate-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span>CLUBS</span>
                      <span className="px-1.5 py-0.5 rounded bg-white/[0.06] light:bg-slate-100 tabular-nums">
                        {visibleClubs.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => addManyTeams(visibleClubs)}
                      disabled={selectedTeamIds.length >= 128}
                      className="px-2.5 py-1 rounded-full border border-white/15 light:border-slate-300 font-mono text-[10px] text-slate-300 light:text-slate-700 hover:border-emerald-400/50 cursor-pointer disabled:opacity-40"
                    >
                      Add {visibleClubs.length}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visibleClubs.map((t) => {
                      const picked = selectedSet.has(t.id);
                      const disabled = !picked && selectedTeamIds.length >= 128;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          disabled={disabled}
                          onClick={() => toggleTeamId(t.id)}
                          className={`flex items-center justify-between gap-2.5 p-2.5 rounded-xl border text-left transition-colors cursor-pointer disabled:opacity-40 ${
                            picked
                              ? 'border-[#7ADBF0] bg-[#7ADBF0]/10 light:bg-cyan-50 light:border-cyan-600'
                              : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 hover:border-white/25'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <TeamEmblem team={t} className="w-7 h-7 shrink-0" />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-bold text-white light:text-slate-900 truncate">
                                  {t.name}
                                </span>
                                <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 light:bg-emerald-100 light:text-emerald-800 shrink-0">
                                  CLUB
                                </span>
                              </div>
                              <div className="font-mono text-[10px] uppercase text-slate-400 light:text-slate-600 truncate">
                                {t.league || t.country}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`w-7 h-7 rounded-full border flex items-center justify-center font-mono text-[11px] font-bold tabular-nums ${getRatingRingColor(
                                t.overallRating
                              )}`}
                            >
                              {t.overallRating}
                            </span>
                            <span
                              className={`w-5 h-5 rounded-full border flex items-center justify-center ${
                                picked
                                  ? 'border-[#7ADBF0] bg-[#7ADBF0] text-slate-950'
                                  : 'border-white/20 light:border-slate-300'
                              }`}
                            >
                              {picked && <Check className="w-3 h-3" />}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar: YOUR FIELD + FIELD SIZE */}
          <div className="space-y-4 sticky top-[200px]">
            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                    YOUR FIELD
                  </div>
                  <div className="flex items-baseline gap-1 mt-0.5 tabular-nums">
                    <span className="font-display text-3xl text-white light:text-slate-950">
                      {selectedTeamIds.length}
                    </span>
                    <span className="font-mono text-xs text-slate-400">/ 128 TEAMS</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setTeamSelectionAndSync([])}
                  disabled={selectedTeamIds.length === 0}
                  className="px-2.5 py-1 rounded-lg border border-white/15 light:border-slate-300 text-xs text-slate-300 light:text-slate-700 hover:border-rose-400/50 hover:text-rose-300 disabled:opacity-40 cursor-pointer"
                >
                  Clear
                </button>
              </div>

              <div className="h-1.5 rounded-full bg-white/[0.06] light:bg-slate-200 overflow-hidden">
                <div
                  className="h-full bg-[#7ADBF0] rounded-full transition-all"
                  style={{ width: `${Math.min(100, (selectedTeamIds.length / 128) * 100)}%` }}
                />
              </div>

              {selectedTeamIds.length === 0 ? (
                <p className="text-xs text-slate-400 light:text-slate-600">
                  Pick teams from the list to build the competition.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1 pt-1">
                  {selectedTeamIds.map((id, idx) => {
                    const t = teamsMap.get(id);
                    if (!t) return null;
                    return (
                      <div
                        key={id}
                        className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-white/[0.07] light:border-slate-200 bg-[#050A12] light:bg-slate-50"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] text-slate-500 w-5 tabular-nums">
                            {idx + 1}.
                          </span>
                          <TeamEmblem team={t} className="w-5 h-5 shrink-0" />
                          <span className="text-xs text-white light:text-slate-900 truncate">
                            {t.name}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTeamId(id)}
                          className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Remove team"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-1">
              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                FIELD SIZE
              </div>
              <div className="font-display text-3xl text-white light:text-slate-950 tabular-nums">
                {selectedTeamIds.length}
              </div>
              <div className="text-xs text-slate-400 light:text-slate-600">
                teams will enter the opening stage.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 3: TOURNAMENT STRUCTURE + COMPETITION PREVIEW                 */}
      {/* ================================================================== */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 sm:p-6 space-y-5">
            {/* Header & Add Stage Buttons */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700">
                  <Layers className="w-3.5 h-3.5" />
                  <span>TOURNAMENT STRUCTURE</span>
                </div>
                <h2 className="text-lg font-bold text-white light:text-slate-950 mt-0.5">
                  Build the road to the trophy
                </h2>
                <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5">
                  Add as many stages as you like. Each stage is played to completion, then its qualifiers are drawn into the next one — automatically. A knockout stage always closes the competition.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={stages.length >= 6}
                  onClick={() => handleAddStage('league')}
                  className="px-3.5 py-1.5 rounded-full border border-emerald-400/50 bg-emerald-500/10 text-emerald-300 light:bg-emerald-50 light:text-emerald-800 text-xs font-semibold hover:bg-emerald-500/20 disabled:opacity-40 cursor-pointer"
                >
                  + League
                </button>
                <button
                  type="button"
                  disabled={stages.length >= 6}
                  onClick={() => handleAddStage('group')}
                  className="px-3.5 py-1.5 rounded-full border border-sky-400/50 bg-sky-500/10 text-sky-300 light:bg-sky-50 light:text-sky-800 text-xs font-semibold hover:bg-sky-500/20 disabled:opacity-40 cursor-pointer"
                >
                  + Groups
                </button>
                <button
                  type="button"
                  disabled={stages.length >= 6}
                  onClick={() => handleAddStage('knockout')}
                  className="px-3.5 py-1.5 rounded-full border border-amber-400/50 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800 text-xs font-semibold hover:bg-amber-500/20 disabled:opacity-40 cursor-pointer"
                >
                  + Knockout
                </button>
              </div>
            </div>

            {/* Stage Cards */}
            <div className="space-y-3">
              {stages.map((st, idx) => {
                const inputCount = getStageInputCount(idx);
                const estMatches = estimateStageMatchesCount(st, inputCount);
                const isLast = idx === stages.length - 1;
                const borderStyle =
                  st.type === 'league'
                    ? 'border-emerald-400/60 bg-gradient-to-b from-emerald-500/[0.06] to-[#050A12] light:from-emerald-50/40 light:to-white'
                    : st.type === 'group'
                    ? 'border-sky-400/60 bg-gradient-to-b from-sky-500/[0.06] to-[#050A12] light:from-sky-50/40 light:to-white'
                    : 'border-amber-400/60 bg-gradient-to-b from-amber-500/[0.06] to-[#050A12] light:from-amber-50/40 light:to-white';

                const badgeStyle =
                  st.type === 'league'
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300 light:bg-emerald-100 light:text-emerald-800'
                    : st.type === 'group'
                    ? 'border-sky-400/50 bg-sky-500/15 text-sky-300 light:bg-sky-100 light:text-sky-800'
                    : 'border-amber-400/50 bg-amber-500/15 text-amber-300 light:bg-amber-100 light:text-amber-800';

                const leagueMatchdaysValue =
                  st.roundsMode === 'swiss-n' ? st.matchesPerTeam || 8 : 0;

                return (
                  <div
                    key={st.id}
                    className={`rounded-xl border p-4 space-y-3 ${borderStyle}`}
                  >
                    {/* Card Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 flex-1 min-w-[200px]">
                        <span className="w-7 h-7 rounded-full bg-white/[0.08] light:bg-slate-200 flex items-center justify-center font-mono text-xs font-bold text-white light:text-slate-900 shrink-0">
                          {idx + 1}
                        </span>
                        <input
                          type="text"
                          value={st.name}
                          onChange={(e) => handleUpdateStage(idx, { name: e.target.value })}
                          className="flex-1 bg-transparent text-sm font-bold text-white light:text-slate-950 focus:outline-none border-b border-transparent focus:border-white/25 py-0.5"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2.5 py-0.5 rounded-full border font-mono text-[10px] uppercase tracking-wider font-semibold ${badgeStyle}`}
                        >
                          {st.type.toUpperCase()}
                        </span>
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveStage(idx, -1)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 disabled:opacity-25 cursor-pointer"
                          title="Move up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === stages.length - 1}
                          onClick={() => handleMoveStage(idx, 1)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 disabled:opacity-25 cursor-pointer"
                          title="Move down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={stages.length >= 6}
                          onClick={() => handleDuplicateStage(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-[#7ADBF0] disabled:opacity-25 cursor-pointer"
                          title="Duplicate stage"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={stages.length <= 1}
                          onClick={() => handleRemoveStage(idx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 disabled:opacity-25 cursor-pointer"
                          title="Delete stage"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* League Controls matching image_cc2df20f */}
                    {st.type === 'league' && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                          <div className="space-y-1">
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                              QUALIFIERS
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, inputCount)}
                              value={st.advanceCount}
                              onChange={(e) => {
                                const val = Math.max(1, Number(e.target.value) || 1);
                                handleUpdateStage(idx, {
                                  advanceCount: val,
                                  directQualifyCount: val,
                                });
                              }}
                              className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#04070D] light:bg-white px-3 py-2 text-sm text-white light:text-slate-900 tabular-nums focus:outline-none focus:border-emerald-400"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                              MATCHDAYS (0 = FULL)
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={Math.max(0, (inputCount - 1) * (st.homeAndAway ? 2 : 1))}
                              value={leagueMatchdaysValue}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value) || 0);
                                if (val === 0) {
                                  handleUpdateStage(idx, {
                                    roundsMode: st.homeAndAway ? 'double-rr' : 'single-rr',
                                    matchesPerTeam: Math.max(
                                      1,
                                      (inputCount - 1) * (st.homeAndAway ? 2 : 1)
                                    ),
                                  });
                                } else {
                                  handleUpdateStage(idx, {
                                    roundsMode: 'swiss-n',
                                    matchesPerTeam: val,
                                  });
                                }
                              }}
                              className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#04070D] light:bg-white px-3 py-2 text-sm text-white light:text-slate-900 tabular-nums focus:outline-none focus:border-emerald-400"
                            />
                          </div>

                          <label className="inline-flex items-center gap-2 text-xs text-slate-200 light:text-slate-800 pb-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={st.homeAndAway}
                              onChange={(e) => {
                                const ha = e.target.checked;
                                handleUpdateStage(idx, {
                                  homeAndAway: ha,
                                  roundsMode:
                                    st.roundsMode === 'swiss-n'
                                      ? 'swiss-n'
                                      : ha
                                      ? 'double-rr'
                                      : 'single-rr',
                                });
                              }}
                              className="w-4 h-4 rounded accent-emerald-400"
                            />
                            <span>Home &amp; away</span>
                          </label>
                        </div>

                        <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400 light:text-slate-600 flex flex-wrap items-center justify-between gap-2">
                          <span>
                            {isLast
                              ? 'THE TABLE DECIDES THE CHAMPION'
                              : `${st.advanceCount} QUALIFY TO ${stages[idx + 1]?.name.toUpperCase()}`}
                          </span>
                          <span className="tabular-nums">{estMatches} MATCHES ESTIMATED</span>
                        </div>
                      </div>
                    )}

                    {/* Groups Controls */}
                    {st.type === 'group' && (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="space-y-1">
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                              GROUPS
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={32}
                              value={st.groupCount || 4}
                              onChange={(e) =>
                                handleUpdateStage(idx, { groupCount: Number(e.target.value) || 1 })
                              }
                              className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#04070D] light:bg-white px-3 py-2 text-sm text-white light:text-slate-900 tabular-nums"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                              GROUP SIZE (MIN 3)
                            </label>
                            <input
                              type="number"
                              min={3}
                              max={16}
                              value={st.groupSize || 4}
                              onChange={(e) =>
                                handleUpdateStage(idx, { groupSize: Number(e.target.value) || 3 })
                              }
                              className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#04070D] light:bg-white px-3 py-2 text-sm text-white light:text-slate-900 tabular-nums"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                              QUALIFIERS / GROUP
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, (st.groupSize || 4) - 1)}
                              value={st.qualifyPerGroup || 2}
                              onChange={(e) =>
                                handleUpdateStage(idx, {
                                  qualifyPerGroup: Number(e.target.value) || 1,
                                })
                              }
                              className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#04070D] light:bg-white px-3 py-2 text-sm text-white light:text-slate-900 tabular-nums"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                              BEST 3RD-PLACED
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={st.groupCount || 12}
                              value={st.bestThirdPlacedCount || 0}
                              onChange={(e) =>
                                handleUpdateStage(idx, {
                                  bestThirdPlacedCount: Number(e.target.value) || 0,
                                })
                              }
                              className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#04070D] light:bg-white px-3 py-2 text-sm text-white light:text-slate-900 tabular-nums"
                            />
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200 light:text-slate-800">
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={st.homeAndAway}
                                onChange={(e) =>
                                  handleUpdateStage(idx, { homeAndAway: e.target.checked })
                                }
                                className="w-4 h-4 rounded accent-sky-400"
                              />
                              <span>Home &amp; away</span>
                            </label>
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(st.neutralVenue)}
                                onChange={(e) =>
                                  handleUpdateStage(idx, { neutralVenue: e.target.checked })
                                }
                                className="w-4 h-4 rounded accent-sky-400"
                              />
                              <span>Neutral venues</span>
                            </label>
                          </div>
                          <span className="font-mono text-[10px] uppercase text-sky-300 light:text-sky-700 tabular-nums">
                            {st.advanceCount} QUALIFY · {estMatches} MATCHES
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Knockout Controls */}
                    {st.type === 'knockout' && (
                      <div className="space-y-2.5">
                        <div className="flex flex-wrap items-center gap-4 text-xs text-slate-200 light:text-slate-800">
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(st.twoLegged)}
                              onChange={(e) =>
                                handleUpdateStage(idx, { twoLegged: e.target.checked })
                              }
                              className="w-4 h-4 rounded accent-amber-400"
                            />
                            <span>Two-legged ties</span>
                          </label>
                          {st.twoLegged && (
                            <label className="inline-flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={st.finalSingleLeg !== false}
                                onChange={(e) =>
                                  handleUpdateStage(idx, { finalSingleLeg: e.target.checked })
                                }
                                className="w-4 h-4 rounded accent-amber-400"
                              />
                              <span>Final single leg</span>
                            </label>
                          )}
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={st.extraTimeEnabled !== false}
                              onChange={(e) =>
                                handleUpdateStage(idx, { extraTimeEnabled: e.target.checked })
                              }
                              className="w-4 h-4 rounded accent-amber-400"
                            />
                            <span>Extra time</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={st.penaltiesEnabled !== false}
                              onChange={(e) =>
                                handleUpdateStage(idx, { penaltiesEnabled: e.target.checked })
                              }
                              className="w-4 h-4 rounded accent-amber-400"
                            />
                            <span>Penalties</span>
                          </label>
                          <label className="inline-flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(st.thirdPlacePlayoff)}
                              onChange={(e) =>
                                handleUpdateStage(idx, { thirdPlacePlayoff: e.target.checked })
                              }
                              className="w-4 h-4 rounded accent-amber-400"
                            />
                            <span>3rd-place play-off</span>
                          </label>
                        </div>

                        <div className="font-mono text-[10px] uppercase text-amber-300 light:text-amber-700 flex items-center justify-between">
                          <span>
                            {isLast
                              ? 'CROWN THE CHAMPION IN THE FINAL'
                              : `${st.advanceCount} ADVANCE TO NEXT STAGE`}
                          </span>
                          <span className="tabular-nums">{estMatches} MATCHES ESTIMATED</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600 tabular-nums">
              {stages.length} OF 6 STAGES · {selectedTeamIds.length} TEAMS ENTER STAGE 1 ·{' '}
              {finalWinnerCount} {finalWinnerCount === 1 ? 'LIFTS THE TROPHY' : 'LIFTS THE TROPHY'}
            </div>
          </div>

          {/* Competition Preview Bar */}
          <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-600">
              COMPETITION PREVIEW
            </div>

            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-100 text-white light:text-slate-900 font-semibold tabular-nums">
                {selectedTeamIds.length} TEAMS
              </span>
              {stages.map((st, idx) => (
                <React.Fragment key={st.id}>
                  <span className="text-slate-500">&rarr;</span>
                  <span
                    className={`px-2.5 py-1 rounded border uppercase font-semibold ${
                      st.type === 'league'
                        ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300 light:bg-emerald-50 light:text-emerald-800'
                        : st.type === 'group'
                        ? 'border-sky-400/50 bg-sky-500/15 text-sky-300 light:bg-sky-50 light:text-sky-800'
                        : 'border-amber-400/50 bg-amber-500/15 text-amber-300 light:bg-amber-50 light:text-amber-800'
                    }`}
                  >
                    {st.name}
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums">
                    &rarr; {idx === stages.length - 1 && st.type === 'knockout' ? 'CHAMPION' : st.advanceCount}
                  </span>
                </React.Fragment>
              ))}
            </div>

            <div className="font-mono text-[11px] uppercase tracking-wider text-slate-400 light:text-slate-600 tabular-nums">
              {validation.estimatedMatches} MATCHES IN TOTAL
            </div>

            {validation.errors.length > 0 && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-1">
                {validation.errors.map((err, i) => (
                  <div key={i} className="text-xs text-rose-300 light:text-rose-700">
                    • {err}
                  </div>
                ))}
              </div>
            )}
            {validation.warnings.length > 0 && (
              <div className="rounded-xl border border-amber-400/35 bg-amber-500/10 p-3 space-y-1">
                {validation.warnings.map((w, i) => (
                  <div key={i} className="text-xs text-amber-300 light:text-amber-800">
                    • {w}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 4: MUSEUM DISPLAY CASE SILVERWARE + CUSTOM DESIGNER           */}
      {/* ================================================================== */}
      {step === 4 && (
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white p-5 sm:p-6 space-y-5">
          {/* Header Row */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#7ADBF0] light:text-cyan-700">
                <Trophy className="w-3.5 h-3.5" />
                <span>TOURNAMENT TROPHY</span>
                <span className="px-2 py-0.5 rounded border border-white/15 bg-white/[0.04] text-slate-300 light:text-slate-700">
                  REQUIRED
                </span>
              </div>
              <h2 className="text-xl font-bold text-white light:text-slate-950 mt-1">
                Choose the silverware
              </h2>
              <p className="text-xs text-slate-400 light:text-slate-600 mt-0.5 max-w-xl">
                This trophy is built into the competition and awarded to the confirmed winner. Preview the designs below, then name your trophy.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setCustomModalOpen(true)}
                className="px-3.5 py-2 rounded-xl border border-white/20 light:border-slate-300 bg-[#050A12] light:bg-slate-900 text-xs font-semibold text-white hover:border-amber-400/60 cursor-pointer inline-flex items-center gap-1.5"
              >
                <PenTool className="w-3.5 h-3.5 text-amber-400" />
                <span>Design a custom trophy</span>
              </button>
              <button
                type="button"
                onClick={() => setGalleryModalOpen(true)}
                className="px-3 py-2 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 cursor-pointer"
              >
                Trophy gallery
              </button>
            </div>
          </div>

          {/* Style Filter Pills */}
          <div className="flex flex-wrap items-center gap-2">
            {TROPHY_STYLE_FILTERS.map((f) => {
              const active = trophyStyleFilter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setTrophyStyleFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full border font-mono text-[10px] uppercase tracking-wider font-semibold transition-colors cursor-pointer ${
                    active
                      ? 'border-[#7ADBF0] bg-[#7ADBF0]/15 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-600 light:text-cyan-800'
                      : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900'
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          {/* OBSIDIAN-NAVY GOLD MUSEUM DISPLAY CASE */}
          <div className="rounded-3xl border border-amber-400/40 bg-gradient-to-b from-[#071021] via-[#040914] to-[#03060C] p-5 sm:p-7 shadow-2xl space-y-6">
            {/* Inner Gold Frame + Greek-Key Frieze Header */}
            <div className="rounded-2xl border border-amber-400/25 bg-[#050B16]/80 p-4 sm:p-6 space-y-6">
              {/* Greek-Key Geometric Frieze Strip */}
              <div className="flex items-center justify-center gap-3 overflow-hidden py-1 border-b border-amber-400/20">
                {Array.from({ length: 18 }).map((_, idx) => (
                  <svg
                    key={idx}
                    viewBox="0 0 24 14"
                    className="w-6 h-3.5 text-amber-400/75 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path d="M1 12 H11 V3 H4 V8 H8 M13 12 H23 V3 H16 V8 H20" />
                  </svg>
                ))}
              </div>

              {/* Shelf Showcase Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-8 pb-4 border-b border-amber-400/25">
                {displayedCaseTrophies.map((tr) => {
                  const selected = trophy.id === tr.id;
                  return (
                    <button
                      key={tr.id}
                      type="button"
                      onClick={() => setTrophy(tr)}
                      className="group flex flex-col items-center text-center cursor-pointer focus:outline-none"
                    >
                      {/* Velvet Alcove Spotlight */}
                      <div
                        className={`w-full aspect-square max-w-[124px] rounded-xl border flex items-center justify-center p-2 transition-all relative overflow-hidden ${
                          selected
                            ? 'border-amber-400 bg-gradient-to-b from-amber-500/15 via-[#070E1A] to-[#03060B] shadow-[0_0_24px_rgba(251,191,36,0.22)]'
                            : 'border-white/10 bg-gradient-to-b from-white/[0.04] via-[#060B14] to-[#030509] group-hover:border-amber-400/45'
                        }`}
                      >
                        <TrophyArtwork trophy={tr} size="lg" />
                      </div>

                      {/* Gold-Trimmed Nameplate Plaque */}
                      <div
                        className={`mt-2.5 w-full rounded-lg border px-2 py-1.5 transition-colors ${
                          selected
                            ? 'border-amber-400 bg-amber-400/15'
                            : 'border-amber-400/30 bg-[#040810] group-hover:border-amber-400/60'
                        }`}
                      >
                        <div className="text-[10px] font-bold uppercase tracking-wide text-amber-100 truncate">
                          {tr.name}
                        </div>
                        <div className="font-mono text-[8.5px] uppercase tracking-wider text-amber-300/80 truncate mt-0.5">
                          {getTrophyStyleBadge(tr)}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Bottom 3 Chamfered Vault Plaques */}
              <div className="grid grid-cols-1 md:grid-cols-[1fr_200px_1fr] gap-3 items-center pt-1">
                <div className="hidden md:flex h-16 rounded-xl border border-amber-400/20 bg-[#040811] items-center justify-between px-5">
                  <Shield className="w-5 h-5 text-slate-600" />
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                </div>

                <button
                  type="button"
                  onClick={() => setGalleryModalOpen(true)}
                  className="h-16 rounded-xl border border-amber-400/45 bg-[#060C18] hover:bg-amber-400/10 flex items-center justify-center font-mono text-xs uppercase tracking-[0.2em] text-amber-200 font-semibold cursor-pointer transition-colors"
                >
                  TROPHY GALLERY
                </button>

                <div className="hidden md:flex h-16 rounded-xl border border-amber-400/20 bg-[#040811] items-center justify-between px-5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400/60" />
                  <Shield className="w-5 h-5 text-slate-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Selected Trophy Name & Category Customiser */}
          <div className="rounded-xl border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 p-4 grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr] gap-4 items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl border border-amber-400/35 bg-[#08101C]">
                <TrophyArtwork trophy={trophy} size="md" />
              </div>
              <div className="md:hidden">
                <div className="font-mono text-[10px] uppercase text-amber-300">Selected</div>
                <div className="text-sm font-bold text-white light:text-slate-950">{trophy.name}</div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                TROPHY NAME
              </label>
              <input
                type="text"
                value={trophy.name}
                onChange={(e) => setTrophy((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#08101C] light:bg-white px-3 py-2 text-xs text-white light:text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                CATEGORY
              </label>
              <select
                value={trophy.category || 'Domestic League'}
                onChange={(e) =>
                  setTrophy((prev) => ({ ...prev, category: e.target.value as TrophyCategory }))
                }
                className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#08101C] light:bg-white px-3 py-2 text-xs text-white light:text-slate-900"
              >
                {TROPHY_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="block font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                ENGRAVING INSCRIPTION
              </label>
              <input
                type="text"
                value={trophy.engraving}
                onChange={(e) => setTrophy((prev) => ({ ...prev, engraving: e.target.value }))}
                className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#08101C] light:bg-white px-3 py-2 text-xs font-mono uppercase text-white light:text-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STEP 5: REVIEW & KICK OFF                                          */}
      {/* ================================================================== */}
      {step === 5 && (
        <div className="rounded-2xl border border-white/10 light:border-slate-200 bg-[#08101C] light:bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-white/10 light:border-slate-200 bg-gradient-to-r from-emerald-500/15 via-emerald-500/5 to-transparent border-l-2 border-l-emerald-400 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-300 light:text-emerald-700">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white light:text-slate-950">
                Review &amp; kick off
              </h2>
              <p className="text-xs text-slate-400 light:text-slate-600">
                One last look before the fixture list is built.
              </p>
            </div>
          </div>

          <div className="p-6">
            <div className="rounded-xl border border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 p-5 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-white light:text-slate-950">
                    {name.trim() || 'DodaEona Invitational'}
                  </h3>
                  <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase">
                    <span className="px-2.5 py-0.5 rounded-full border border-amber-400/45 bg-amber-500/10 text-amber-300 light:bg-amber-50 light:text-amber-800">
                      {season || '2026/27'}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full border border-sky-400/45 bg-sky-500/10 text-sky-300 light:bg-sky-50 light:text-sky-800 tabular-nums">
                      {selectedTeamIds.length} TEAMS
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full border border-emerald-400/45 bg-emerald-500/10 text-emerald-300 light:bg-emerald-50 light:text-emerald-800 tabular-nums">
                      {validation.estimatedMatches} MATCHES
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full border border-violet-400/45 bg-violet-500/10 text-violet-300 light:bg-violet-50 light:text-violet-800 tabular-nums">
                      {stages.length} STAGES
                    </span>
                  </div>
                </div>

                {customLogoUrl && (
                  <img
                    src={customLogoUrl}
                    alt="Competition emblem"
                    className="w-12 h-12 rounded-xl object-contain border border-white/15 bg-[#08101C] p-1"
                  />
                )}
              </div>

              {/* Stage List */}
              <div className="space-y-2">
                {stages.map((st, idx) => (
                  <div
                    key={st.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-400/35 bg-[#070E18] light:bg-white px-4 py-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-full bg-white/[0.08] light:bg-slate-200 flex items-center justify-center font-mono text-[11px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-bold text-white light:text-slate-900">
                        {st.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full border border-emerald-400/40 bg-emerald-500/10 font-mono text-[9px] uppercase text-emerald-300 light:text-emerald-700">
                        {st.type.toUpperCase()}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                      {st.type === 'league'
                        ? st.roundsMode === 'swiss-n'
                          ? `${st.matchesPerTeam || 8} MATCHDAYS`
                          : st.homeAndAway
                          ? 'DOUBLE ROUND'
                          : 'SINGLE ROUND'
                        : st.type === 'group'
                        ? `${st.groupCount} × ${st.groupSize} TEAMS`
                        : st.twoLegged
                        ? 'TWO-LEGGED KO'
                        : 'SINGLE-LEG KO'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 light:text-slate-600">
                TROPHY · {trophy.name.toUpperCase()}
              </div>

              {/* Error Banner if Invalid */}
              {(!validation.valid || submitError) && (
                <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-3 space-y-1">
                  {validation.errors.map((err, i) => (
                    <div key={i} className="text-xs text-rose-300 light:text-rose-700">
                      • {err}
                    </div>
                  ))}
                  {submitError && (
                    <div className="text-xs text-rose-300 light:text-rose-700">• {submitError}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================== */}
      {/* STICKY BOTTOM WIZARD ACTION FOOTER                                 */}
      {/* ================================================================== */}
      <div className="sticky bottom-3 z-30 rounded-2xl border border-white/10 light:border-slate-200 border-t-2 border-t-emerald-400 bg-[#060E18]/95 light:bg-white/95 backdrop-blur-md px-5 py-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-bold text-white light:text-slate-950 truncate">
            {name.trim() || 'DodaEona Invitational'}
          </div>
          <div className="text-xs text-slate-400 light:text-slate-600 tabular-nums">
            {selectedTeamIds.length} teams · {stages.length} stage{stages.length > 1 ? 's' : ''} ·{' '}
            {validation.estimatedMatches} matches
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              className="px-4 py-2 rounded-xl border border-white/15 light:border-slate-300 bg-[#08101C] light:bg-slate-100 text-xs font-semibold text-white light:text-slate-900 hover:border-white/35 cursor-pointer inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          )}

          {step < 5 ? (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(5, s + 1))}
              className="px-5 py-2 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold hover:bg-[#9CE7F7] cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Next step</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              type="button"
              disabled={!validation.valid || submitting}
              onClick={handleCreate}
              className="px-5 py-2 rounded-xl bg-emerald-400 text-slate-950 text-xs font-bold hover:bg-emerald-300 disabled:opacity-40 cursor-pointer inline-flex items-center gap-2 shadow-lg"
            >
              <Trophy className="w-4 h-4" />
              <span>{submitting ? 'Building & Drawing...' : 'Create competition'}</span>
            </button>
          )}
        </div>
      </div>

      {/* ================================================================== */}
      {/* CUSTOM TROPHY SCULPTOR MODAL (From "Design a custom trophy")       */}
      {/* ================================================================== */}
      {customModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          onClick={() => setCustomModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/15 light:border-slate-200 bg-[#07101D] light:bg-white p-6 space-y-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 light:border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-white light:text-slate-950">
                  Custom Trophy Sculptor
                </h3>
                <p className="text-xs text-slate-400 light:text-slate-600">
                  Craft custom silverware silhouette, finish, accents and engraving
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[170px_1fr] gap-5 items-center">
              <div className="rounded-2xl border border-amber-400/35 bg-[#040912] p-4 flex flex-col items-center justify-center gap-2">
                <TrophyArtwork trophy={trophy} size="xl" />
                <div className="text-xs font-bold text-amber-100 text-center">{trophy.name}</div>
                <div className="font-mono text-[9px] uppercase text-amber-300/80 text-center">
                  {trophy.engraving}
                </div>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-400 light:text-slate-600">
                      Trophy Name
                    </label>
                    <input
                      type="text"
                      value={trophy.name}
                      onChange={(e) => setTrophy((p) => ({ ...p, name: e.target.value }))}
                      className="w-full rounded-lg border border-white/15 light:border-slate-300 bg-[#050A12] light:bg-slate-50 px-3 py-1.5 text-xs text-white light:text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block font-mono text-[10px] uppercase text-slate-400 light:text-slate-600">
                      Prestige Tier
                    </label>
                    <select
                      value={trophy.prestigeTier}
                      onChange={(e) =>
                        setTrophy((p) => ({ ...p, prestigeTier: e.target.value as TrophyPrestigeTier }))
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

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block font-mono text-[10px] uppercase text-amber-300 light:text-amber-700 font-bold">
                      AI Trophy Portrait Studio
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        setTrophy((p) => ({
                          ...p,
                          imageUrl: p.imageUrl === 'svg' ? AI_TROPHY_PORTRAIT_OPTIONS[0].url : 'svg',
                        }))
                      }
                      className="font-mono text-[9px] uppercase text-[#7ADBF0] light:text-cyan-700 hover:underline cursor-pointer"
                    >
                      {trophy.imageUrl === 'svg' ? 'Use AI Photorealistic Render' : 'Switch to Vector SVG'}
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {AI_TROPHY_PORTRAIT_OPTIONS.map((opt) => {
                      const active = trophy.imageUrl === opt.url || trophy.imageUrl === opt.rawPath;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setTrophy((p) => ({ ...p, imageUrl: opt.url }))}
                          className={`flex items-center gap-2 p-1.5 rounded-lg border text-left transition-all cursor-pointer ${
                            active
                              ? 'border-amber-400 bg-amber-500/15 text-amber-200 light:bg-amber-50 light:text-amber-950'
                              : 'border-white/10 light:border-slate-200 bg-[#050A12] light:bg-slate-50 text-slate-300 light:text-slate-700 hover:border-white/25'
                          }`}
                        >
                          <img
                            src={opt.url}
                            alt={opt.label}
                            className="w-7 h-7 rounded object-cover shrink-0 border border-white/15"
                          />
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold truncate">{opt.label}</div>
                            <div className="font-mono text-[8px] text-slate-400 truncate">{opt.subtitle}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase text-slate-400 light:text-slate-600">
                    Silhouette
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SILHOUETTES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setTrophy((p) => ({ ...p, silhouette: s.id }))}
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          trophy.silhouette === s.id
                            ? 'bg-amber-400 text-slate-950'
                            : 'bg-white/5 light:bg-slate-200 text-slate-300 light:text-slate-700'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block font-mono text-[10px] uppercase text-slate-400 light:text-slate-600">
                    Material Finish
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {MATERIALS.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setTrophy((p) => ({
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
                        className={`px-2.5 py-1 rounded text-[11px] font-semibold cursor-pointer ${
                          trophy.material === m.id
                            ? 'bg-[#7ADBF0] text-slate-950'
                            : 'bg-white/5 light:bg-slate-200 text-slate-300 light:text-slate-700'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <label className="flex items-center justify-between text-xs text-slate-300 light:text-slate-700">
                    <span>Accent Color</span>
                    <input
                      type="color"
                      value={trophy.accentColor}
                      onChange={(e) => setTrophy((p) => ({ ...p, accentColor: e.target.value }))}
                      className="w-8 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                  <label className="flex items-center justify-between text-xs text-slate-300 light:text-slate-700">
                    <span>Trim Color</span>
                    <input
                      type="color"
                      value={trophy.primaryColor}
                      onChange={(e) => setTrophy((p) => ({ ...p, primaryColor: e.target.value }))}
                      className="w-8 h-6 rounded border-0 bg-transparent cursor-pointer"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 light:border-slate-200">
              {isAdmin ? (
                <button
                  type="button"
                  disabled={savingTrophy}
                  onClick={handleSaveCustomTrophy}
                  className="px-4 py-2 rounded-xl bg-amber-400 text-slate-950 text-xs font-bold hover:bg-amber-300 disabled:opacity-50 cursor-pointer"
                >
                  {savingTrophy ? 'Saving...' : 'Save Permanently to Trophy Gallery'}
                </button>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                  Admin sign-in required to save reusable designs permanently
                </span>
              )}

              <button
                type="button"
                onClick={() => setCustomModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-[#7ADBF0] text-slate-950 text-xs font-bold cursor-pointer"
              >
                Use in Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      <TrophyGalleryModal
        isOpen={galleryModalOpen}
        initialTab="trophies"
        onClose={() => setGalleryModalOpen(false)}
        onSelectTrophyForNewCompetition={(selected) => {
          setTrophy(selected);
          setGalleryModalOpen(false);
        }}
      />
    </div>
  );
};
