import React, { useMemo } from 'react';
import {
  ArrowRight,
  Clock,
  History,
  Layers,
  ListOrdered,
  Shield,
  MapPin,
} from 'lucide-react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { buildInitialTeamSetup, simulateMatch } from '../../engine/matchSimulator';
import type { SimulationMatchRecord } from '../../../server/types';
import type { CompleteSimulationOutput } from '../../types/simulation';
import { normalizeHex } from './dossier/dossierUtils';

function formatSavedDate(isoDate: string): string {
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString();
}

export const MatchCentreDashboard: React.FC = () => {
  const {
    teams,
    simulationMatches,
    savedSimulations,
    setActiveTab,
    setTeamsSectionTab,
    setOrdering,
    closeDossier,
    openSimulationReport,
    selectTeam,
    getManagerForTeam,
  } = useMatchCentre();

  const teamColorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of teams) {
      map.set(t.id, normalizeHex(t.primaryColor || '#7ADBF0'));
    }
    return map;
  }, [teams]);

  const recentMatches = useMemo(() => simulationMatches.slice(0, 6), [simulationMatches]);

  const handleOpenSimulate = () => {
    closeDossier();
    setActiveTab('simulate');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTeams = (sortMode?: 'overall') => {
    closeDossier();
    if (sortMode === 'overall') {
      setOrdering('overall');
    }
    setTeamsSectionTab('database');
    setActiveTab('teams');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenRecentMatch = (record: SimulationMatchRecord) => {
    if (record.fullPayload) {
      openSimulationReport(record.fullPayload as CompleteSimulationOutput);
      return;
    }

    const homeTeam = teams.find((t) => t.id === record.homeTeamId);
    const awayTeam = teams.find((t) => t.id === record.awayTeamId);
    if (!homeTeam || !awayTeam) {
      handleOpenSimulate();
      return;
    }

    if (record.seed) {
      const homeManager = getManagerForTeam(homeTeam);
      const awayManager = getManagerForTeam(awayTeam);
      const output = simulateMatch({
        seed: record.seed,
        competition: {
          preset: 'friendly',
          competitionId: record.competitionId || 'comp-friendly',
          competitionName: record.competitionName || 'Friendly',
          stageLabel: record.competitionName || 'Exhibition',
          isKnockout: Boolean(record.wentToExtraTime || record.penaltySummary),
          allowExtraTime: Boolean(record.wentToExtraTime || record.penaltySummary),
          allowPenalties: Boolean(record.penaltySummary),
          isTwoLegged: false,
          legNumber: 1,
          awayGoalsRule: false,
        },
        homeTeam,
        awayTeam,
        homeManager,
        awayManager,
        initialHomeSetup: buildInitialTeamSetup(homeTeam, homeManager),
        initialAwaySetup: buildInitialTeamSetup(awayTeam, awayManager),
        tacticalOverrides: [],
      });
      openSimulationReport(output);
      return;
    }

    selectTeam(homeTeam, 'home');
    selectTeam(awayTeam, 'away');
    handleOpenSimulate();
  };

  return (
    <div className="space-y-10 landscape-mobile:space-y-5 pb-8 landscape-mobile:pb-4">
      {/* Hero Banner */}
      <section
        aria-label="Match Centre overview"
        className="relative overflow-hidden rounded-2xl border border-white/10 light:border-slate-200 bg-[#060E1B] light:bg-white shadow-xl"
      >
        {/* Top gradient hairline */}
        <div
          aria-hidden="true"
          className="h-[2px] w-full bg-gradient-to-r from-[#D6B56E] via-[#7ADBF0] to-emerald-400/70"
        />

        {/* Subtle warm-left / cool-right ambient radial sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_48%_70%_at_10%_15%,rgba(214,181,110,0.11),transparent),radial-gradient(ellipse_55%_75%_at_90%_85%,rgba(16,185,129,0.08),transparent)] light:opacity-35"
        />

        <div className="relative p-6 sm:p-8 lg:p-10 landscape-mobile:p-5 grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-8 landscape-mobile:gap-5 items-center">
          {/* Left Hero Copy & Actions */}
          <div className="landscape-mobile:col-span-7 lg:col-span-7 space-y-5 landscape-mobile:space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] light:bg-cyan-50 border border-white/12 light:border-cyan-200 text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.2em] text-slate-300 light:text-cyan-900">
              <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0] light:bg-cyan-600 shrink-0" />
              <span>DodaEona F.C. · Match Centre</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[54px] landscape-mobile:text-3xl tracking-wide text-white light:text-slate-950 leading-[0.95] text-balance max-w-2xl">
              TAKE CHARGE OF THE FIXTURE LIST
            </h1>

            <p className="text-sm sm:text-[15px] leading-relaxed text-slate-300/90 light:text-slate-600 max-w-xl">
              Build a match, set both lineups, and watch a minute-by-minute simulation play out with
              goals, cards, substitutions and match stats. Then run a whole competition and watch
              the table take shape.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleOpenSimulate}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#7ADBF0] hover:bg-[#95E4F5] text-[#050A12] font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 shadow-[0_4px_20px_rgba(122,219,240,0.22)] cursor-pointer"
              >
                <span>Create a match</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenTeams()}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] light:bg-slate-100 light:hover:bg-slate-200 border border-white/12 light:border-slate-300 text-white light:text-slate-900 font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Shield className="w-4 h-4 text-slate-300 light:text-slate-700" />
                <span>Browse teams</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  closeDossier();
                  setTeamsSectionTab('stadium-explorer');
                  setActiveTab('teams');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/40 text-cyan-300 light:text-cyan-800 font-semibold text-xs sm:text-sm whitespace-nowrap shrink-0 cursor-pointer"
              >
                <MapPin className="w-4 h-4 text-cyan-400" />
                <span>Stadium Explorer</span>
              </button>
            </div>
          </div>

          {/* Right Feature Cards */}
          <div className="landscape-mobile:col-span-5 lg:col-span-5 space-y-3 landscape-mobile:space-y-2">
            <button
              type="button"
              onClick={handleOpenSimulate}
              className="group relative w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] light:bg-slate-50 light:hover:bg-slate-100 border border-white/10 light:border-slate-200 overflow-hidden cursor-pointer transition-colors"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-amber-400"
              />
              <div className="w-9 h-9 rounded-lg bg-amber-500/12 border border-amber-400/20 flex items-center justify-center text-amber-400 light:text-amber-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white light:text-slate-900 group-hover:text-amber-300 light:group-hover:text-amber-700 transition-colors">
                  90 minutes
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600">
                  Minute-by-minute simulation
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={handleOpenSimulate}
              className="group relative w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] light:bg-slate-50 light:hover:bg-slate-100 border border-white/10 light:border-slate-200 overflow-hidden cursor-pointer transition-colors"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-[#7ADBF0]"
              />
              <div className="w-9 h-9 rounded-lg bg-[#7ADBF0]/12 border border-[#7ADBF0]/25 flex items-center justify-center text-[#7ADBF0] light:text-cyan-700 shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors">
                  Leagues &amp; cups
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600">
                  Tables, brackets, penalties
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleOpenTeams('overall')}
              className="group relative w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] light:bg-slate-50 light:hover:bg-slate-100 border border-white/10 light:border-slate-200 overflow-hidden cursor-pointer transition-colors"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-emerald-400"
              />
              <div className="w-9 h-9 rounded-lg bg-emerald-500/12 border border-emerald-400/25 flex items-center justify-center text-emerald-400 light:text-emerald-700 shrink-0">
                <ListOrdered className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white light:text-slate-900 group-hover:text-emerald-300 light:group-hover:text-emerald-700 transition-colors">
                  Club rankings
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600">
                  Every result feeds the index
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                closeDossier();
                setTeamsSectionTab('stadium-explorer');
                setActiveTab('teams');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group relative w-full text-left flex items-center gap-3.5 px-4 py-3.5 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] light:bg-slate-50 light:hover:bg-slate-100 border border-white/10 light:border-slate-200 overflow-hidden cursor-pointer transition-colors"
            >
              <span
                aria-hidden="true"
                className="absolute left-0 top-1.5 bottom-1.5 w-[2.5px] rounded-full bg-cyan-400"
              />
              <div className="w-9 h-9 rounded-lg bg-cyan-500/12 border border-cyan-400/25 flex items-center justify-center text-cyan-400 light:text-cyan-700 shrink-0">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white light:text-slate-900 group-hover:text-cyan-300 light:group-hover:text-cyan-700 transition-colors">
                  Stadium Explorer
                </div>
                <div className="text-xs text-slate-400 light:text-slate-600">
                  Google Maps arena atlas &amp; Street View
                </div>
              </div>
            </button>
          </div>
        </div>
      </section>

      {/* Recent Simulations Section */}
      <section aria-labelledby="recent-simulations-heading" className="pt-2 border-t border-white/[0.08] light:border-slate-200 space-y-4">
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <h2
              id="recent-simulations-heading"
              className="font-display text-xl sm:text-2xl tracking-wide text-white light:text-slate-900"
            >
              RECENT SIMULATIONS
            </h2>
          </div>
          <button
            type="button"
            onClick={handleOpenSimulate}
            className="text-xs font-medium text-[#7ADBF0] light:text-cyan-700 hover:underline whitespace-nowrap shrink-0 cursor-pointer"
          >
            Simulate another
          </button>
        </div>

        {recentMatches.length === 0 ? (
          <div className="rounded-xl border border-white/10 light:border-slate-200 bg-[#070F1B]/70 light:bg-white px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-400 light:text-slate-600">
              No completed match simulations recorded yet. Run your first fixture to see results and
              replayable seeds here.
            </p>
            <button
              type="button"
              onClick={handleOpenSimulate}
              className="px-4 py-2 rounded-lg bg-[#7ADBF0]/15 border border-[#7ADBF0]/40 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-300 light:text-cyan-800 text-xs font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Simulate a match
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-3.5">
            {recentMatches.map((match) => {
              const subtitle = match.seed
                ? `SEED ${match.seed}`
                : `${match.competitionName} · ${match.date}`;
              return (
                <button
                  key={match.id}
                  type="button"
                  onClick={() => handleOpenRecentMatch(match)}
                  className="group w-full text-left flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl bg-[#070F1B] hover:bg-[#0B1525] light:bg-white light:hover:bg-slate-50 border border-white/10 hover:border-[#7ADBF0]/45 light:border-slate-200 light:hover:border-cyan-500/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-white/[0.04] light:bg-slate-100 border border-white/[0.08] light:border-slate-200 flex items-center justify-center text-slate-400 light:text-slate-600 shrink-0">
                      <History className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white light:text-slate-900 truncate">
                        <span>{match.homeTeamName}</span>
                        <span className="text-slate-500 light:text-slate-400 font-normal mx-1.5">
                          v
                        </span>
                        <span>{match.awayTeamName}</span>
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-500 truncate mt-0.5">
                        {subtitle}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-white/[0.05] light:bg-slate-100 border border-white/10 light:border-slate-200 font-mono text-xs sm:text-sm font-bold text-white light:text-slate-900 tabular-nums shrink-0">
                    {match.homeScore}-{match.awayScore}
                    {match.penaltySummary ? ` (${match.penaltySummary})` : ''}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Saved Matches Section */}
      <section aria-labelledby="saved-matches-heading" className="pt-2 border-t border-white/[0.08] light:border-slate-200 space-y-4">
        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#7ADBF0] shrink-0" />
            <h2
              id="saved-matches-heading"
              className="font-display text-xl sm:text-2xl tracking-wide text-white light:text-slate-900"
            >
              SAVED MATCHES
            </h2>
          </div>
        </div>

        {savedSimulations.length === 0 ? (
          <div className="rounded-xl border border-white/10 light:border-slate-200 bg-[#070F1B]/70 light:bg-white px-5 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-slate-400 light:text-slate-600">
              No saved matches yet. Simulate a match to Full-Time and click &ldquo;Save Match&rdquo;
              to bookmark its complete report here.
            </p>
            <button
              type="button"
              onClick={handleOpenSimulate}
              className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.09] light:bg-slate-100 light:hover:bg-slate-200 border border-white/12 light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 whitespace-nowrap shrink-0 cursor-pointer"
            >
              Open match builder
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-3.5">
            {savedSimulations.map((item) => {
              const out = item.output;
              const homeColor = normalizeHex(
                teamColorMap.get(out.homeTeamId) || out.homeColor || '#E11D48'
              );
              const awayColor = normalizeHex(
                teamColorMap.get(out.awayTeamId) || out.awayColor || '#38BDF8'
              );
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openSimulationReport(out)}
                  className="group w-full text-left flex items-center justify-between gap-4 px-4 py-3.5 rounded-xl bg-[#070F1B] hover:bg-[#0B1525] light:bg-white light:hover:bg-slate-50 border border-white/10 hover:border-[#7ADBF0]/45 light:border-slate-200 light:hover:border-cyan-500/50 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
                      <span
                        className="w-1.5 h-7 rounded-full"
                        style={{ backgroundColor: homeColor }}
                      />
                      <span
                        className="w-1.5 h-7 rounded-full"
                        style={{ backgroundColor: awayColor }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white light:text-slate-900 truncate">
                        <span>{out.homeTeamName}</span>
                        <span className="text-slate-500 light:text-slate-400 font-normal mx-1.5">
                          v
                        </span>
                        <span>{out.awayTeamName}</span>
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400 light:text-slate-500 truncate mt-0.5">
                        {out.competition.competitionName} · {formatSavedDate(item.savedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="px-3 py-1 rounded-full bg-white/[0.05] light:bg-slate-100 border border-white/10 light:border-slate-200 font-mono text-xs sm:text-sm font-bold text-white light:text-slate-900 tabular-nums shrink-0">
                    {out.homeScore}-{out.awayScore}
                    {out.penaltyShootout
                      ? ` (${out.penaltyShootout.homeScore}-${out.penaltyShootout.awayScore} P)`
                      : ''}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
