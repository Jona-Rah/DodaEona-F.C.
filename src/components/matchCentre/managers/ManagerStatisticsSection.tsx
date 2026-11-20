import React, { useEffect, useState } from 'react';
import { BarChart3, Globe, Shield, Trophy } from 'lucide-react';
import {
  formatManagerRoleLabel,
  ManagerStatisticsResponse,
} from '../../../types/manager';
import { useMatchCentre } from '../../../context/MatchCentreContext';

interface ManagerStatisticsSectionProps {
  managerId: string;
  onOpenTeam: (teamId: string) => void;
}

export const ManagerStatisticsSection: React.FC<ManagerStatisticsSectionProps> = ({
  managerId,
  onOpenTeam,
}) => {
  const { fetchManagerStatistics, simulationMatches, managerAppointments } = useMatchCentre();
  const [stats, setStats] = useState<ManagerStatisticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchManagerStatistics(managerId).then((res) => {
      if (!active) return;
      setStats(res);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [managerId, fetchManagerStatistics, simulationMatches.length, managerAppointments.length]);

  const totals = stats?.careerTotals || {
    matchesPlayed: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    winPercentage: 0,
    goalsScored: 0,
    goalsConceded: 0,
    trophiesWon: 0,
  };

  return (
    <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 landscape-mobile:p-4 space-y-5 landscape-mobile:space-y-3.5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
          <h2 className="font-bold text-base text-white light:text-slate-900">
            Manager Statistics
          </h2>
        </div>
        <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
          COMPUTED FROM RECORDED FIXTURES &amp; HONOURS
        </span>
      </div>

      {/* Career Totals Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 landscape-mobile:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {[
          ['MATCHES', totals.matchesPlayed],
          ['WINS', totals.wins],
          ['DRAWS', totals.draws],
          ['LOSSES', totals.losses],
          ['WIN %', `${totals.winPercentage.toFixed(1)}%`],
          ['GOALS FOR', totals.goalsScored],
          ['GOALS AG', totals.goalsConceded],
          ['TROPHIES', totals.trophiesWon],
        ].map(([label, val]) => (
          <div
            key={String(label)}
            className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 px-3 py-2.5 text-center"
          >
            <span className="block font-mono text-[9px] tracking-[0.16em] text-slate-400 light:text-slate-500 uppercase">
              {label}
            </span>
            <span className="font-display text-2xl text-white light:text-slate-900 tabular-nums mt-0.5 block leading-none">
              {val}
            </span>
          </div>
        ))}
      </div>

      {/* Per-Appointment Breakdown */}
      {loading && !stats ? (
        <p className="text-xs text-slate-400 light:text-slate-500">
          Loading verified appointment telemetry...
        </p>
      ) : !stats || stats.appointments.length === 0 ? (
        <p className="text-xs text-slate-400 light:text-slate-500">
          No appointments recorded for this manager yet. Assign them to a team to begin tracking per-appointment statistics.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-400 light:text-slate-600">
              BY APPOINTMENT ({stats.appointments.length})
            </h3>
            {totals.matchesPlayed === 0 && (
              <span className="text-[11px] text-slate-400 light:text-slate-500">
                Simulate matches with this team to populate win/goal telemetry.
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-3">
            {stats.appointments.map((item) => {
              const isCountry = item.teamType === 'country';
              return (
                <div
                  key={item.appointmentId}
                  className={`rounded-xl p-4 border space-y-3 ${
                    isCountry
                      ? 'bg-sky-500/[0.07] light:bg-sky-50/70 border-sky-400/30 light:border-sky-300'
                      : 'bg-[#080E18] light:bg-slate-50 border-white/[0.07] light:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.teamCrestUrl ? (
                        <img
                          src={item.teamCrestUrl}
                          alt={item.teamName}
                          referrerPolicy="no-referrer"
                          className="w-7 h-7 object-contain shrink-0"
                        />
                      ) : isCountry ? (
                        <Globe className="w-5 h-5 text-sky-400 shrink-0" />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-400 shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => onOpenTeam(item.teamId)}
                            className="font-bold text-sm text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 transition-colors cursor-pointer truncate text-left"
                          >
                            {item.teamName}
                          </button>
                          {isCountry && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 light:bg-sky-200 font-mono text-[8px] font-bold uppercase text-sky-300 light:text-sky-800 whitespace-nowrap">
                              NATIONAL TEAM
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 light:text-slate-600 block">
                          {formatManagerRoleLabel(item.role)} · {item.startDate} →{' '}
                          {item.isCurrent ? 'Present' : item.endDate || 'Ended'}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase whitespace-nowrap ${
                        item.isCurrent
                          ? 'bg-emerald-500/15 border border-emerald-400/35 text-emerald-300 light:bg-emerald-50 light:text-emerald-700'
                          : 'bg-white/[0.06] border border-white/10 text-slate-400 light:bg-slate-200 light:text-slate-700'
                      }`}
                    >
                      {item.isCurrent ? 'CURRENT' : 'FORMER'}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-2 pt-2 border-t border-white/[0.06] light:border-slate-200 text-center">
                    <div>
                      <span className="block font-mono text-[9px] text-slate-400 uppercase">P</span>
                      <span className="font-mono text-xs font-bold text-white light:text-slate-900 tabular-nums">
                        {item.matchesPlayed}
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] text-slate-400 uppercase">
                        W-D-L
                      </span>
                      <span className="font-mono text-xs font-bold text-white light:text-slate-900 tabular-nums">
                        {item.wins}-{item.draws}-{item.losses}
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] text-slate-400 uppercase">
                        WIN%
                      </span>
                      <span className="font-mono text-xs font-bold text-[#7ADBF0] light:text-cyan-700 tabular-nums">
                        {item.winPercentage.toFixed(0)}%
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] text-slate-400 uppercase">
                        GF:GA
                      </span>
                      <span className="font-mono text-xs font-bold text-white light:text-slate-900 tabular-nums">
                        {item.goalsScored}:{item.goalsConceded}
                      </span>
                    </div>
                    <div>
                      <span className="block font-mono text-[9px] text-slate-400 uppercase">
                        HON
                      </span>
                      <span className="font-mono text-xs font-bold text-amber-300 light:text-amber-700 tabular-nums inline-flex items-center justify-center gap-0.5">
                        <Trophy className="w-2.5 h-2.5" />
                        {item.trophiesWon}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
