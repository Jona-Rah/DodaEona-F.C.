import React, { useEffect, useState, useMemo } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Edit2,
  HelpCircle,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';
import { getPlayerDisplayName, TacticalProfile, Team } from '../../../types/matchCentre';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import {
  getEffectiveComposureRating,
  getEffectivePenaltyRating,
  getOrderedPenaltySquad,
  getPenaltyOrderVerificationLabel,
} from '../../../utils/penaltyOrder';
import {
  AVAILABLE_FORMATIONS,
  assignPlayersToFormation,
  generateStrictStartingXi,
  getFormationBlueprint,
  getStartingXiPlayers,
  getTacticalIdentityData,
  isLightHex,
  normalizeHex,
  normalizePositionDetail,
} from './dossierUtils';

interface DossierTacticsTabProps {
  team: Team;
}

export const FormationPitch: React.FC<{ formation: string; team?: Team }> = ({ formation, team }) => {
  const blueprint = getFormationBlueprint(formation);
  const primaryHex = team ? normalizeHex(team.primaryColor) : '#1E293B';
  const lightPrimary = isLightHex(primaryHex);

  const assignedPlayers = useMemo(() => {
    if (!team) return blueprint.nodes.map((node) => ({ node, player: undefined }));
    const xi =
      formation === team.defaultFormation
        ? getStartingXiPlayers(team)
        : generateStrictStartingXi(team.squad, formation);
    return assignPlayersToFormation(xi, formation);
  }, [team, formation, blueprint.nodes]);

  return (
    <div className="relative w-full landscape-mobile:max-w-[320px] landscape-mobile:mx-auto aspect-[4/4.8] rounded-2xl overflow-hidden border border-white/[0.08] shadow-inner select-none bg-[#0D2B1B]">
      {/* Alternating mown grass stripes */}
      <div
        className="absolute inset-0 pointer-events-none opacity-45"
        style={{
          backgroundImage:
            'repeating-linear-gradient(to bottom, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 44px, transparent 44px, transparent 88px)',
        }}
      />
      {/* Pitch outline markings */}
      <div className="absolute inset-4 border border-white/20 rounded pointer-events-none" />
      <div className="absolute top-1/2 inset-x-4 h-[1px] bg-white/20 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full border border-white/20 pointer-events-none" />
      {/* Top box */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 w-40 h-16 border-b border-x border-white/20 pointer-events-none" />
      {/* Bottom box */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-40 h-16 border-t border-x border-white/20 pointer-events-none" />

      {/* Position nodes */}
      {assignedPlayers.map(({ node, player }, i) => {
        const isCover = Boolean(
          player && normalizePositionDetail(player.positionDetail, player.position) !== node.posReq
        );
        return (
          <div
            key={i}
            className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
            style={{ left: `${node.x}%`, top: `${node.y}%` }}
          >
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shadow-md ${
                player
                  ? 'border-2 border-white'
                  : 'border-2 border-dashed border-white/40 bg-black/45 text-white/60'
              }`}
              style={
                player
                  ? {
                      backgroundColor: team ? primaryHex : '#091610',
                      color: team ? (lightPrimary ? '#050A12' : '#FFFFFF') : '#FFFFFF',
                    }
                  : undefined
              }
            >
              {player ? player.shirtNumber : '—'}
            </div>
            <span
              className={`text-[9px] font-bold drop-shadow truncate max-w-[75px] mt-0.5 ${
                player ? 'text-white' : 'text-white/55 italic'
              }`}
            >
              {player ? player.shortName : 'Vacant'}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-mono text-[8px] font-bold text-white/90 bg-black/60 px-1 py-0.2 rounded border border-white/20 uppercase leading-none">
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
    </div>
  );
};

export const DossierTacticsTab: React.FC<DossierTacticsTabProps> = ({ team }) => {
  const { updateTactics, updatePenaltyOrder, resetPenaltyOrderToVerified, canManageTeam } =
    useMatchCentre();
  const canManage = canManageTeam(team);
  const initialData = getTacticalIdentityData(team);

  const [isEditing, setIsEditing] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState(team.defaultFormation);
  const [styleInput, setStyleInput] = useState(initialData.styleLabel);
  const [summaryInput, setSummaryInput] = useState(initialData.summary);
  const [setPiecesInput, setSetPiecesInput] = useState(initialData.setPieces);
  const [mentalityInput, setMentalityInput] = useState(initialData.mentalitySettings);

  // Penalty Kick Hierarchy state
  const orderedPenaltySquad = useMemo(() => getOrderedPenaltySquad(team), [team]);
  const penaltyMeta = useMemo(() => getPenaltyOrderVerificationLabel(team), [team]);
  const [isEditingPenaltyOrder, setIsEditingPenaltyOrder] = useState(false);
  const [showFullPenaltySquad, setShowFullPenaltySquad] = useState(false);
  const [draftPenaltyIds, setDraftPenaltyIds] = useState<string[]>(() =>
    orderedPenaltySquad.map((p) => p.id)
  );

  useEffect(() => {
    setSelectedFormation(team.defaultFormation);
  }, [team.id, team.defaultFormation]);

  useEffect(() => {
    setDraftPenaltyIds(orderedPenaltySquad.map((p) => p.id));
    setIsEditingPenaltyOrder(false);
  }, [team.id, orderedPenaltySquad]);

  const moveDraftPenaltyRank = (fromIdx: number, toIdx: number) => {
    if (toIdx < 0 || toIdx >= draftPenaltyIds.length || fromIdx === toIdx) return;
    setDraftPenaltyIds((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      return next;
    });
  };

  const handleSavePenaltyOrder = () => {
    updatePenaltyOrder(team.id, draftPenaltyIds, 'user-set');
    setIsEditingPenaltyOrder(false);
  };

  const activeBlueprint = getFormationBlueprint(selectedFormation);
  const dataStatus = team.tacticalProfile?.dataStatus || 'estimated';

  // Squad-aware gameplan highlights
  const topCreator = [...team.squad].sort((a, b) => b.attributes.passing - a.attributes.passing)[0];
  const topFinisher = [...team.squad].sort((a, b) => b.attributes.shooting - a.attributes.shooting)[0];
  const topBallWinner = [...team.squad].sort((a, b) => b.attributes.defending - a.attributes.defending)[0];
  const topRunner = [...team.squad].sort((a, b) => b.attributes.pace - a.attributes.pace)[0];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile: TacticalProfile = {
      playingStyle: styleInput.trim() || 'Balanced Control',
      formationFamily: activeBlueprint.family,
      dataStatus: 'user-set',
      summary: summaryInput,
      notes: initialData.notes,
      setPieces: setPiecesInput,
      alternativeFormations: initialData.alternativeFormations,
      mentalitySettings: mentalityInput,
      pressingIntensity:
        mentalityInput.pressingIntensityLabel === 'High'
          ? 86
          : mentalityInput.pressingIntensityLabel === 'Medium'
          ? 70
          : 52,
      buildUpSpeed: mentalityInput.tempo === 'Fast' ? 84 : 68,
      defensiveLine: mentalityInput.defensiveLine === 'High' ? 82 : mentalityInput.defensiveLine === 'Balanced' ? 68 : 48,
      width: mentalityInput.attackingWidth === 'Wide' ? 82 : 64,
    };
    updateTactics(team.id, updatedProfile, selectedFormation);
    setIsEditing(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="block font-mono text-[10px] tracking-[0.22em] text-slate-400 light:text-slate-500 uppercase mb-1">
            TACTICAL IDENTITY
          </span>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 uppercase tracking-wide leading-none">
              {initialData.styleLabel}
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-md border font-mono text-[10px] font-bold uppercase inline-flex items-center gap-1 ${
                dataStatus === 'verified'
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300 light:bg-emerald-50 light:text-emerald-700'
                  : dataStatus === 'user-set'
                  ? 'bg-indigo-500/15 border-indigo-400/50 text-indigo-300 light:bg-indigo-50 light:text-indigo-700'
                  : 'bg-amber-500/15 border-amber-400/50 text-amber-300 light:bg-amber-50 light:text-amber-700'
              }`}
            >
              {dataStatus === 'verified' ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <HelpCircle className="w-3 h-3" />
              )}
              <span>{dataStatus.toUpperCase()}</span>
            </span>
          </div>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 rounded-xl bg-[#0C131F] light:bg-white hover:bg-[#141E30] light:hover:bg-slate-50 border border-white/[0.12] light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 inline-flex items-center gap-2 cursor-pointer transition-all self-start sm:self-auto"
          >
            {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5 text-[#818CF8]" />}
            <span>{isEditing ? 'Cancel edit' : 'Edit profile'}</span>
          </button>
        )}
      </div>

      {/* Inline Tactical Editor (when Edit profile clicked) */}
      {canManage && isEditing && (
        <form
          onSubmit={handleSave}
          className="rounded-2xl bg-[#0C131F] light:bg-white border border-[#6366F1]/60 p-5 space-y-4 shadow-xl"
        >
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.2em] text-[#818CF8] light:text-indigo-700 uppercase font-bold">
              EDIT TACTICAL PROFILE
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 light:text-slate-700 block mb-1">
                Playing Style Label
              </label>
              <input
                type="text"
                value={styleInput}
                onChange={(e) => setStyleInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 light:text-slate-700 block mb-1">
                Preferred Formation
              </label>
              <select
                value={selectedFormation}
                onChange={(e) => setSelectedFormation(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              >
                {AVAILABLE_FORMATIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 light:text-slate-700 block mb-1">
                Mentality
              </label>
              <select
                value={mentalityInput.mentality}
                onChange={(e) => setMentalityInput({ ...mentalityInput, mentality: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              >
                <option value="Very Attacking">Very Attacking</option>
                <option value="Positive">Positive</option>
                <option value="Balanced">Balanced</option>
                <option value="Cautious">Cautious</option>
                <option value="Defensive">Defensive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 light:text-slate-700 block mb-1">
                Tactical Summary
              </label>
              <textarea
                rows={3}
                value={summaryInput}
                onChange={(e) => setSummaryInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-300 light:text-slate-700 block mb-1">
                Set Pieces Instruction
              </label>
              <textarea
                rows={3}
                value={setPiecesInput}
                onChange={(e) => setSetPiecesInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                Build-up
              </label>
              <select
                value={mentalityInput.buildUp}
                onChange={(e) => setMentalityInput({ ...mentalityInput, buildUp: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              >
                <option value="Short & patient">Short &amp; patient</option>
                <option value="Mixed progression">Mixed progression</option>
                <option value="Direct passing">Direct passing</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                Tempo
              </label>
              <select
                value={mentalityInput.tempo}
                onChange={(e) => setMentalityInput({ ...mentalityInput, tempo: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              >
                <option value="Fast">Fast</option>
                <option value="Standard">Standard</option>
                <option value="Deliberate">Deliberate</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                Defensive Line
              </label>
              <select
                value={mentalityInput.defensiveLine}
                onChange={(e) => setMentalityInput({ ...mentalityInput, defensiveLine: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              >
                <option value="High">High</option>
                <option value="Balanced">Balanced</option>
                <option value="Deep block">Deep block</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-mono text-slate-400 uppercase block mb-1">
                Pressing
              </label>
              <select
                value={mentalityInput.pressingIntensityLabel}
                onChange={(e) =>
                  setMentalityInput({ ...mentalityInput, pressingIntensityLabel: e.target.value })
                }
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070C15] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#6366F1] hover:bg-[#818CF8] text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Save tactical blueprint</span>
            </button>
          </div>
        </form>
      )}

      {/* Main 2-Column Blueprint Layout */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-5 landscape-mobile:gap-4 items-start">
        {/* Left Column: Preferred Shape + FormationPitch Diagram + Blurb */}
        <div className="landscape-mobile:col-span-5 lg:col-span-6 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-white light:text-slate-900">
              Preferred shape - {selectedFormation}
            </span>
            <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
              {activeBlueprint.family}
            </span>
          </div>

          <FormationPitch formation={selectedFormation} team={team} />

          <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed pt-1">
            {activeBlueprint.blurb}
          </p>
        </div>

        {/* Right Column: Identity Card + Mentality Settings Card */}
        <div className="landscape-mobile:col-span-7 lg:col-span-6 space-y-4">
          {/* Identity Card */}
          <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3">
            <h3 className="font-bold text-sm text-white light:text-slate-900">Identity</h3>
            <p className="text-xs text-slate-200 light:text-slate-700 leading-relaxed">
              {initialData.summary}
            </p>
            <p className="text-xs text-slate-300 light:text-slate-600 leading-relaxed">
              {initialData.notes}
            </p>
            <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed pt-1">
              <strong className="text-white light:text-slate-900">Set pieces:</strong>{' '}
              {initialData.setPieces}
            </p>
          </div>

          {/* Mentality Card */}
          <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-4">
            <div>
              <h3 className="font-bold text-sm text-white light:text-slate-900">Mentality</h3>
              <span className="text-sm font-semibold text-[#38BDF8] light:text-indigo-700 block mt-0.5">
                {initialData.mentalitySettings.mentality}
              </span>
            </div>

            {/* IN POSSESSION */}
            <div className="space-y-2">
              <span className="block font-mono text-[9px] tracking-[0.22em] text-slate-400 light:text-slate-500 uppercase">
                IN POSSESSION
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {[
                  ['Build-up', initialData.mentalitySettings.buildUp],
                  ['Tempo', initialData.mentalitySettings.tempo],
                  ['Attacking width', initialData.mentalitySettings.attackingWidth],
                  ['Chance creation', initialData.mentalitySettings.chanceCreation],
                  ['Passing risk', initialData.mentalitySettings.passingRisk],
                  ['Crossing', initialData.mentalitySettings.crossing],
                  ['Creative freedom', initialData.mentalitySettings.creativeFreedom],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1 border-b border-white/[0.05] light:border-slate-100"
                  >
                    <span className="text-slate-400 light:text-slate-500">{label}</span>
                    <span className="font-semibold text-white light:text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* OUT OF POSSESSION */}
            <div className="space-y-2">
              <span className="block font-mono text-[9px] tracking-[0.22em] text-slate-400 light:text-slate-500 uppercase">
                OUT OF POSSESSION
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {[
                  ['Defensive line', initialData.mentalitySettings.defensiveLine],
                  ['Pressing intensity', initialData.mentalitySettings.pressingIntensityLabel],
                  ['Pressing trigger', initialData.mentalitySettings.pressingTrigger],
                  ['Defensive width', initialData.mentalitySettings.defensiveWidth],
                  ['Marking', initialData.mentalitySettings.marking],
                  ['Tackling', initialData.mentalitySettings.tackling],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1 border-b border-white/[0.05] light:border-slate-100"
                  >
                    <span className="text-slate-400 light:text-slate-500">{label}</span>
                    <span className="font-semibold text-white light:text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* TRANSITIONS */}
            <div className="space-y-2">
              <span className="block font-mono text-[9px] tracking-[0.22em] text-slate-400 light:text-slate-500 uppercase">
                TRANSITIONS
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {[
                  ['Attacking transition', initialData.mentalitySettings.attackingTransition],
                  ['Overlapping full-backs', initialData.mentalitySettings.overlappingFullBacks],
                  ['Underlapping runs', initialData.mentalitySettings.underlappingRuns],
                ].map(([label, val]) => (
                  <div
                    key={label}
                    className="flex items-center justify-between py-1 border-b border-white/[0.05] light:border-slate-100"
                  >
                    <span className="text-slate-400 light:text-slate-500">{label}</span>
                    <span className="font-semibold text-white light:text-slate-900">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* TeamGamePlan: Squad-Aware Tactical Plan */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="block font-mono text-[9px] tracking-[0.2em] text-[#818CF8] light:text-indigo-700 uppercase">
              SQUAD-AWARE GAME PLAN
            </span>
            <h3 className="font-bold text-sm text-white light:text-slate-900 mt-0.5">
              Key Tactical Focal Points
            </h3>
          </div>
          <Sparkles className="w-4 h-4 text-[#818CF8] light:text-indigo-600" />
        </div>

        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              role: 'PRIMARY PLAYMAKER',
              player: topCreator,
              stat: topCreator ? `${topCreator.attributes.passing} PAS` : '—',
            },
            {
              role: 'LEAD FINISHER',
              player: topFinisher,
              stat: topFinisher ? `${topFinisher.attributes.shooting} SHO` : '—',
            },
            {
              role: 'DEFENSIVE ANCHOR',
              player: topBallWinner,
              stat: topBallWinner ? `${topBallWinner.attributes.defending} DEF` : '—',
            },
            {
              role: 'TRANSITION OUTLET',
              player: topRunner,
              stat: topRunner ? `${topRunner.attributes.pace} PAC` : '—',
            },
          ].map((item) => (
            <div
              key={item.role}
              className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3.5"
            >
              <span className="block font-mono text-[9px] tracking-[0.18em] text-slate-400 light:text-slate-500 uppercase">
                {item.role}
              </span>
              <div className="flex items-center justify-between gap-2 mt-1.5">
                <span className="font-semibold text-xs text-white light:text-slate-900 truncate">
                  {item.player?.name || 'Unassigned'}
                </span>
                <span className="font-mono text-[10px] font-bold text-[#818CF8] light:text-indigo-700 shrink-0 tabular-nums">
                  {item.stat}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Penalty Kick Order Hierarchy */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-[9px] tracking-[0.2em] text-[#38BDF8] light:text-indigo-700 uppercase">
                PENALTY KICK HIERARCHY
              </span>
              <span
                className={`px-2 py-0.5 rounded border font-mono text-[9px] uppercase ${
                  penaltyMeta.source === 'user-set'
                    ? 'bg-indigo-500/15 border-indigo-400/50 text-indigo-300 light:bg-indigo-50 light:text-indigo-700'
                    : 'bg-emerald-500/15 border-emerald-400/50 text-emerald-300 light:bg-emerald-50 light:text-emerald-700'
                }`}
              >
                {penaltyMeta.source === 'user-set' ? 'ADMIN-EDITED' : 'VERIFIED'}
              </span>
            </div>
            <h3 className="text-sm text-white light:text-slate-900 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-[#38BDF8] light:text-indigo-600" />
              <span>Ordered Penalty Takers ({orderedPenaltySquad.length} Ranked)</span>
            </h3>
            <p className="text-[11px] text-slate-400 light:text-slate-600">
              {penaltyMeta.detail}. First-choice taker steps up when on the pitch and fit; unavailable, substituted, or sent-off players are automatically skipped during matches and shootouts.
            </p>
          </div>

          {canManage && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {isEditingPenaltyOrder ? (
                <>
                  <button
                    type="button"
                    onClick={handleSavePenaltyOrder}
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save order</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPenaltyIds(orderedPenaltySquad.map((p) => p.id));
                      setIsEditingPenaltyOrder(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/10 light:border-slate-300 text-xs text-slate-300 light:text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPenaltyIds(orderedPenaltySquad.map((p) => p.id));
                      setIsEditingPenaltyOrder(true);
                      setShowFullPenaltySquad(true);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 hover:bg-[#141E30] light:hover:bg-slate-100 border border-white/[0.12] light:border-slate-300 text-xs text-white light:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-[#38BDF8] light:text-indigo-600" />
                    <span>Edit order</span>
                  </button>
                  {penaltyMeta.source === 'user-set' && (
                    <button
                      type="button"
                      onClick={() => resetPenaltyOrderToVerified(team.id)}
                      className="px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 hover:bg-[#141E30] light:hover:bg-slate-100 border border-white/[0.12] light:border-slate-300 text-xs text-slate-300 light:text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset verified</span>
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Ordered Takers List */}
        {(() => {
          const squadById = new Map(team.squad.map((p) => [p.id, p]));
          const displayList = isEditingPenaltyOrder
            ? draftPenaltyIds.map((id) => squadById.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p))
            : showFullPenaltySquad
            ? orderedPenaltySquad
            : orderedPenaltySquad.slice(0, 5);

          return (
            <div className="space-y-1.5">
              {displayList.map((player, idx) => {
                const isFirst = idx === 0;
                const isTopFive = idx < 5;
                const isInjured = player.injuryStatus === 'injured';
                return (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl border transition-colors ${
                      isFirst
                        ? 'bg-emerald-500/10 border-emerald-400/40 light:bg-emerald-50 light:border-emerald-300'
                        : isTopFive
                        ? 'bg-[#080E18] border-white/[0.08] light:bg-slate-50 light:border-slate-200'
                        : 'bg-[#070B14] border-white/[0.05] light:bg-white light:border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg font-mono text-xs flex items-center justify-center shrink-0 border ${
                          isFirst
                            ? 'bg-emerald-500 text-slate-950 border-emerald-300'
                            : isTopFive
                            ? 'bg-sky-500/15 text-sky-300 light:bg-sky-50 light:text-sky-700 border-sky-400/30'
                            : 'bg-white/[0.04] light:bg-slate-100 text-slate-400 light:text-slate-600 border-white/10 light:border-slate-200'
                        }`}
                      >
                        #{idx + 1}
                      </span>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-white light:text-slate-900 truncate">
                            {getPlayerDisplayName(player)}
                          </span>
                          <span className="font-mono text-[10px] text-slate-400 light:text-slate-500">
                            #{player.shirtNumber} · {player.positionDetail}
                          </span>
                          {isFirst && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 light:bg-emerald-100 light:text-emerald-800 font-mono text-[9px] uppercase">
                              1st Choice
                            </span>
                          )}
                          {!isFirst && isTopFive && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 light:bg-sky-100 light:text-sky-800 font-mono text-[9px] uppercase">
                              Shootout 5
                            </span>
                          )}
                          {isInjured && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 light:bg-rose-100 light:text-rose-700 font-mono text-[9px] uppercase">
                              Unavailable
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="hidden sm:flex items-center gap-2 font-mono text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] light:bg-slate-100 text-cyan-300 light:text-indigo-700">
                          PEN {getEffectivePenaltyRating(player)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-white/[0.04] light:bg-slate-100 text-slate-300 light:text-slate-600">
                          CMP {getEffectiveComposureRating(player)}
                        </span>
                      </div>

                      {isEditingPenaltyOrder && (
                        <div className="flex items-center gap-1">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => moveDraftPenaltyRank(idx, 0)}
                              className="px-2 py-1 rounded-lg bg-white/[0.06] light:bg-slate-100 hover:bg-white/[0.12] text-[10px] text-cyan-300 light:text-indigo-700 cursor-pointer"
                            >
                              Set #1
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => moveDraftPenaltyRank(idx, idx - 1)}
                            className="p-1.5 rounded-lg bg-white/[0.06] light:bg-slate-100 disabled:opacity-30 text-white light:text-slate-800 cursor-pointer"
                            title="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === displayList.length - 1}
                            onClick={() => moveDraftPenaltyRank(idx, idx + 1)}
                            className="p-1.5 rounded-lg bg-white/[0.06] light:bg-slate-100 disabled:opacity-30 text-white light:text-slate-800 cursor-pointer"
                            title="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {!isEditingPenaltyOrder && orderedPenaltySquad.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowFullPenaltySquad((prev) => !prev)}
                  className="w-full mt-2 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 hover:bg-[#101829] light:hover:bg-slate-100 border border-white/[0.06] light:border-slate-200 text-xs text-slate-300 light:text-slate-700 inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  {showFullPenaltySquad ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Show Top 5 Penalty Takers Only</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>
                        Show Full Squad Hierarchy ({orderedPenaltySquad.length} Players)
                      </span>
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })()}
      </div>

      {/* Alternative Formations Chips */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3">
        <span className="block font-mono text-[9px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
          ALTERNATIVE FORMATIONS
        </span>
        <div className="flex flex-wrap items-center gap-2.5">
          {AVAILABLE_FORMATIONS.filter((f) => f !== selectedFormation).map((form) => {
            const fp = getFormationBlueprint(form);
            return (
              <button
                key={form}
                type="button"
                onClick={() => setSelectedFormation(form)}
                className="px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 hover:bg-[#6366F1]/15 border border-white/[0.08] light:border-slate-200 hover:border-[#6366F1]/60 transition-all cursor-pointer flex items-center gap-2.5"
              >
                <span className="font-mono font-bold text-xs text-white light:text-slate-900">
                  {form}
                </span>
                <span className="font-mono text-[9px] tracking-[0.16em] text-slate-400 light:text-slate-500 uppercase">
                  {fp.family}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
