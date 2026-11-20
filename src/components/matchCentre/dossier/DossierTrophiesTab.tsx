import React, { useMemo, useState } from 'react';
import { Award, ExternalLink, Plus, Shield, Sparkles, Trophy, X } from 'lucide-react';
import { Team, TrophyRecord } from '../../../types/matchCentre';
import type { TrophyDesignConfig } from '../../../types/competitionMaker';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { useAuth } from '../../../context/AuthContext';
import { TrophyArtwork } from '../competitionMaker/TrophyArtwork';
import { hexToRgba, normalizeHex } from './dossierUtils';

interface DossierTrophiesTabProps {
  team: Team;
}

export const DossierTrophiesTab: React.FC<DossierTrophiesTabProps> = ({ team }) => {
  const {
    recordTeamTrophy,
    competitionTrophies,
    competitionMakers,
    returnToTournamentHub,
    closeDossier,
  } = useMatchCentre();
  const { isAdmin } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [trophyName, setTrophyName] = useState('');
  const [competition, setCompetition] = useState(team.league || 'European Cup');
  const [season, setSeason] = useState('2026/27');
  const [count, setCount] = useState(1);
  const [selectedGalleryTrophyId, setSelectedGalleryTrophyId] = useState<string>('');

  const primaryHex = normalizeHex(team.primaryColor);
  const secondaryHex = normalizeHex(team.secondaryColor || primaryHex);
  const code = team.code || team.shortName.slice(0, 3).toUpperCase();

  // Strictly filter out deleted competitions
  const liveTrophies = (team.trophies || []).filter((t) => !t.isDeletedCompetition);
  const totalTrophiesCount = liveTrophies.reduce((sum, t) => sum + (t.count || 1), 0);

  const userTournamentTrophiesCount = useMemo(
    () =>
      liveTrophies.filter(
        (t) =>
          Boolean(t.competitionId) ||
          Boolean(t.trophyDesign) ||
          t.id.startsWith('tr-cm-')
      ).length,
    [liveTrophies]
  );

  const resolveTrophyArtworkConfig = (tr: TrophyRecord): TrophyDesignConfig | null => {
    if (tr.trophyDesign) return tr.trophyDesign;
    if (tr.competitionId) {
      const matchedComp = competitionMakers.find((c) => c.id === tr.competitionId);
      if (matchedComp?.trophy) return matchedComp.trophy;
    }
    const lowerName = `${tr.name} ${tr.competition}`.toLowerCase();
    const matchedGallery = competitionTrophies.find(
      (g) =>
        g.name.toLowerCase() === tr.name.toLowerCase() ||
        lowerName.includes(g.name.toLowerCase())
    );
    if (matchedGallery) return matchedGallery;

    if (
      tr.iconType === 'ucl' ||
      lowerName.includes('champions league') ||
      lowerName.includes('european cup')
    ) {
      return (
        competitionTrophies.find((g) => g.presetId === 'ucl-36' || g.id === 'trophy-preset-ucl') ||
        null
      );
    }
    if (tr.iconType === 'world' || lowerName.includes('world cup')) {
      return (
        competitionTrophies.find(
          (g) => g.presetId === 'world-cup-2026' || g.id === 'trophy-preset-world-cup'
        ) || null
      );
    }
    if (tr.iconType === 'domestic' || lowerName.includes('league')) {
      return (
        competitionTrophies.find(
          (g) => g.presetId === 'domestic-league' || g.id === 'trophy-preset-domestic-league'
        ) || null
      );
    }
    return competitionTrophies[0] || null;
  };

  const handleSelectGalleryTemplate = (galleryId: string) => {
    setSelectedGalleryTrophyId(galleryId);
    const found = competitionTrophies.find((g) => g.id === galleryId);
    if (found) {
      setTrophyName(found.name);
      if (!competition.trim()) {
        setCompetition(found.name);
      }
    }
  };

  const handleAddTrophy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!trophyName.trim()) return;
    const chosenTemplate = competitionTrophies.find((g) => g.id === selectedGalleryTrophyId);
    recordTeamTrophy(team.id, {
      name: trophyName.trim(),
      competition: competition.trim() || 'Official Competition',
      season: season.trim() || '2026/27',
      count: Math.max(1, count),
      engraving: chosenTemplate?.engraving,
      imageUrl: chosenTemplate?.imageUrl,
      trophyDesign: chosenTemplate,
      iconType:
        competition.toLowerCase().includes('european') || competition.toLowerCase().includes('world')
          ? 'ucl'
          : 'domestic',
    });
    setTrophyName('');
    setSelectedGalleryTrophyId('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Club-Branded Honours Banner (Primary + Secondary Crest Colors) */}
      <div
        className="relative rounded-2xl overflow-hidden border border-white/[0.1] light:border-slate-200 p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4 shadow-xl bg-[#0C131F]"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(8,13,22,0.35) 0%, rgba(8,13,22,0.72) 100%), linear-gradient(112deg, ${hexToRgba(
            primaryHex,
            0.55
          )} 0%, rgba(12,19,31,0.88) 52%, ${hexToRgba(secondaryHex, 0.55)} 100%)`,
          borderTopColor: primaryHex,
          borderTopWidth: '2px',
        }}
      >
        <div className="relative z-10 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="block font-mono text-[10px] tracking-[0.24em] uppercase font-bold"
              style={{ color: primaryHex === '#002B49' ? '#F59E0B' : primaryHex }}
            >
              TROPHY CABINET
            </span>
            {userTournamentTrophiesCount > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/45 font-mono text-[9px] font-bold uppercase tracking-wider text-amber-300">
                <Sparkles className="w-3 h-3" />
                {userTournamentTrophiesCount} Tournament Maker Silverware
              </span>
            )}
          </div>
          <h2 className="font-display text-2xl sm:text-3xl text-white uppercase tracking-wide leading-none">
            {team.name} HONOURS
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            {liveTrophies.length > 0
              ? `${liveTrophies.length} competition honours recorded in club cabinet (automatically includes trophies won in user-created tournaments).`
              : 'No trophies recorded yet. Win any competition in Tournament Maker to automatically award silverware here.'}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="font-display text-3xl text-white tabular-nums leading-none block">
              {totalTrophiesCount}
            </span>
            <span className="font-mono text-[9px] tracking-[0.2em] text-slate-300 uppercase">
              TROPHIES WON
            </span>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsAdding(!isAdding)}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-semibold text-white inline-flex items-center gap-1.5 cursor-pointer transition-all"
              title="Record an honour"
            >
              {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5 text-amber-400" />}
              <span className="hidden sm:inline">{isAdding ? 'Cancel' : 'Add honour'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Add Honour Form */}
      {isAdmin && isAdding && (
        <form
          onSubmit={handleAddTrophy}
          className="rounded-2xl bg-[#0C131F] light:bg-white border border-amber-500/50 p-5 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[10px] tracking-[0.2em] text-amber-400 light:text-amber-700 uppercase font-bold block">
              RECORD NEW COMPETITION TROPHY TO CABINET
            </span>
            <select
              value={selectedGalleryTrophyId}
              onChange={(e) => handleSelectGalleryTemplate(e.target.value)}
              className="px-2.5 py-1 rounded-lg bg-[#080E18] light:bg-slate-50 border border-white/15 light:border-slate-300 text-xs text-amber-300 light:text-amber-800"
            >
              <option value="">Choose design from Trophy Gallery (optional)...</option>
              {competitionTrophies.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.category || g.prestigeTier})
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <input
              type="text"
              required
              value={trophyName}
              onChange={(e) => setTrophyName(e.target.value)}
              placeholder="Trophy title (e.g. Champions Cup)"
              className="sm:col-span-2 px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            />
            <input
              type="text"
              value={competition}
              onChange={(e) => setCompetition(e.target.value)}
              placeholder="Competition"
              className="px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            />
            <div className="flex gap-2">
              <input
                type="text"
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder="Season"
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
              <input
                type="number"
                min={1}
                value={count}
                onChange={(e) => setCount(Number(e.target.value) || 1)}
                className="w-16 px-2.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900 text-center"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Add to cabinet
            </button>
          </div>
        </form>
      )}

      {/* Trophy Cabinet Architectural Showcase */}
      <div className="relative rounded-3xl bg-[#090F1A] light:bg-slate-900 border border-white/[0.08] p-6 sm:p-8 space-y-6 overflow-hidden shadow-2xl">
        {/* Top spotlight bar */}
        <div
          className="h-[2px] w-full rounded-full opacity-80"
          style={{
            background: `linear-gradient(90deg, transparent 0%, ${primaryHex} 30%, #F59E0B 50%, ${primaryHex} 70%, transparent 100%)`,
          }}
        />

        {/* Glass Display Shelf */}
        <div className="rounded-2xl bg-[#060B13] border border-white/[0.07] p-6 min-h-[190px] flex flex-col justify-center">
          {liveTrophies.length > 0 ? (
            <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {liveTrophies.map((trophy) => {
                const resolvedArtwork = resolveTrophyArtworkConfig(trophy);
                const isUserTournamentWin =
                  Boolean(trophy.competitionId) ||
                  Boolean(trophy.trophyDesign) ||
                  trophy.id.startsWith('tr-cm-');
                const matchedTournament = trophy.competitionId
                  ? competitionMakers.find((c) => c.id === trophy.competitionId)
                  : undefined;

                return (
                  <div
                    key={trophy.id}
                    className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 shadow-lg transition-all ${
                      isUserTournamentWin
                        ? 'bg-gradient-to-b from-amber-500/15 via-[#0B1423] to-[#08101C] border-amber-400/50 shadow-[0_0_25px_rgba(251,191,36,0.1)]'
                        : 'bg-gradient-to-b from-amber-500/10 to-[#0C131F] border-amber-400/35'
                    }`}
                  >
                    <div className="flex items-start gap-3.5">
                      {resolvedArtwork ? (
                        <div className="rounded-xl bg-[#040811] border border-amber-400/30 p-1.5 shrink-0">
                          <TrophyArtwork trophy={resolvedArtwork} size="sm" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-400 flex items-center justify-center shrink-0">
                          <Trophy className="w-5 h-5" />
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {isUserTournamentWin ? (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-400/20 text-amber-300 font-mono text-[8px] font-bold uppercase tracking-wider">
                              <Award className="w-2.5 h-2.5" />
                              Tournament Winner
                            </span>
                          ) : (
                            <span className="font-mono text-[8px] uppercase tracking-wider text-slate-400">
                              Club Honour
                            </span>
                          )}
                          <span className="font-mono text-[10px] text-amber-400 font-bold">
                            {trophy.season}
                          </span>
                          {trophy.count && trophy.count > 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 font-mono text-[9px] font-bold">
                              {trophy.count}x
                            </span>
                          )}
                        </div>

                        <h4 className="font-bold text-sm text-white truncate mt-1">
                          {trophy.name}
                        </h4>
                        <span className="text-xs text-slate-300 block truncate mt-0.5">
                          {trophy.competition}
                        </span>
                        {(trophy.engraving || resolvedArtwork?.engraving) && (
                          <span className="font-mono text-[9px] text-amber-200/80 block truncate mt-1">
                            &ldquo;{trophy.engraving || resolvedArtwork?.engraving}&rdquo;
                          </span>
                        )}
                      </div>
                    </div>

                    {matchedTournament && (
                      <div className="pt-2 border-t border-white/[0.07] flex items-center justify-between text-[10px]">
                        <span className="font-mono text-emerald-300 uppercase">
                          Crowned Champion
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            closeDossier();
                            returnToTournamentHub(matchedTournament.id);
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-[#7ADBF0] hover:underline cursor-pointer"
                        >
                          <span>View Tournament</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center space-y-4 py-6">
              <span
                className="font-mono text-[10px] tracking-[0.3em] uppercase block"
                style={{ color: primaryHex === '#002B49' ? '#F59E0B' : primaryHex }}
              >
                WAITING FOR THE FIRST TROPHY
              </span>
              <div className="h-[1px] max-w-md mx-auto bg-gradient-to-r from-transparent via-white/15 to-transparent" />
              <div className="h-[1px] max-w-sm mx-auto bg-gradient-to-r from-transparent via-amber-400/20 to-transparent" />
            </div>
          )}
        </div>

        {/* Cabinet Base Plaque */}
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 sm:grid-cols-3 gap-3 items-center">
          <div className="rounded-xl bg-[#070D17] border border-white/[0.06] py-3 px-4 flex flex-col items-center justify-center gap-1 text-slate-500">
            <Shield className="w-4 h-4 opacity-50" />
            <span className="font-mono text-[9px] tracking-[0.22em] uppercase">{code}</span>
          </div>

          <div
            className="rounded-xl bg-[#070D17] border py-3 px-4 text-center"
            style={{ borderColor: hexToRgba(primaryHex, 0.65) }}
          >
            <span className="font-mono text-[10px] tracking-[0.18em] text-white uppercase font-semibold">
              {team.name} TROPHY CABINET
            </span>
          </div>

          <div className="rounded-xl bg-[#070D17] border border-white/[0.06] py-3 px-4 flex flex-col items-center justify-center gap-1 text-slate-500">
            <Shield className="w-4 h-4 opacity-50" />
            <span className="font-mono text-[9px] tracking-[0.22em] uppercase">{code}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
