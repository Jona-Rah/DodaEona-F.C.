import React from 'react';
import {
  ArrowUpRight,
  Flag,
  HelpCircle,
  Shield,
  Shirt,
  Trophy,
  User,
  Users,
} from 'lucide-react';
import { Team } from '../../../types/matchCentre';
import { formatManagerRoleLabel } from '../../../types/manager';
import {
  getFormationBlueprint,
  getStartingXiPlayers,
  getTacticalIdentityData,
  hexToRgba,
  normalizeHex,
  resolveLeadership,
} from './dossierUtils';

interface DossierOverviewTabProps {
  team: Team;
  onSelectTab: (tab: number) => void;
  onSelectPlayerName?: (playerName: string) => void;
  onOpenPlayerProfile?: (playerId: string) => void;
  onOpenManagerProfile?: (managerId: string) => void;
}

export const DossierOverviewTab: React.FC<DossierOverviewTabProps> = ({
  team,
  onSelectTab,
  onSelectPlayerName,
  onOpenPlayerProfile,
  onOpenManagerProfile,
}) => {
  const { styleLabel, dataStatus, summary } = getTacticalIdentityData(team);
  const xiPlayers = getStartingXiPlayers(team);
  const { captain, viceCaptain } = resolveLeadership(team);
  const primaryHex = normalizeHex(team.primaryColor);
  const secondaryHex = normalizeHex(team.secondaryColor || primaryHex);
  const altFormations = getTacticalIdentityData(team).alternativeFormations
    .map((f) => f.formation)
    .slice(0, 3);
  const liveTrophiesCount = (team.trophies || []).filter((t) => !t.isDeletedCompetition).length;
  const recentMatches = (team.recentMatches || []).slice(0, 5);
  const xiSourceLabel =
    team.preferredXiSource === 'verified'
      ? 'Verified starting XI'
      : team.preferredXiSource === 'user-set'
      ? 'Saved by an administrator'
      : 'Auto-selected from squad';

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Four Fact Tiles */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Country & Competition */}
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-4">
          <span className="block font-mono text-[9px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase mb-2">
            COUNTRY &amp; COMPETITION
          </span>
          <div className="flex items-center gap-2 text-sm font-semibold text-white light:text-slate-900 truncate">
            {team.flag ? (
              <span className="shrink-0 leading-none">{team.flag}</span>
            ) : (
              <Flag className="w-3.5 h-3.5 text-[#38BDF8] light:text-sky-600 shrink-0" />
            )}
            <span className="truncate">
              {team.country} · {team.league || team.confederation}
            </span>
          </div>
        </div>

        {/* Current Manager (Links to ManagerProfilePage when linked, else Manager tab) */}
        <button
          type="button"
          onClick={() => {
            if (team.manager_id && onOpenManagerProfile) {
              onOpenManagerProfile(team.manager_id);
            } else {
              onSelectTab(5);
            }
          }}
          className="text-left rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 hover:border-[#38BDF8]/50 p-4 transition-all cursor-pointer group"
        >
          <span className="block font-mono text-[9px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase mb-2">
            CURRENT MANAGER
          </span>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-white light:text-slate-900 group-hover:text-[#38BDF8] light:group-hover:text-sky-700 transition-colors truncate">
            <User className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#38BDF8] shrink-0" />
            <span className="truncate">{team.manager_name || team.manager || 'Vacant'}</span>
            <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform shrink-0" />
          </div>
          {(team.manager_role || team.manager_since) && (
            <span className="text-[11px] text-slate-400 light:text-slate-500 block mt-1 truncate">
              {team.manager_role ? formatManagerRoleLabel(team.manager_role) : 'Head Coach'}
              {team.manager_since ? ` · since ${team.manager_since}` : ''}
            </span>
          )}
        </button>

        {/* Preferred Formation (Click -> Tactics) */}
        <button
          type="button"
          onClick={() => onSelectTab(2)}
          className="text-left rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 hover:border-[#38BDF8]/50 p-4 transition-all cursor-pointer group"
        >
          <span className="block font-mono text-[9px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase mb-2">
            PREFERRED FORMATION
          </span>
          <div className="font-mono font-bold text-base text-[#38BDF8] light:text-sky-700 leading-tight">
            {team.defaultFormation}
          </div>
          <span className="text-[11px] text-slate-400 light:text-slate-500 block mt-1 truncate">
            Also uses {altFormations.join(', ') || getFormationBlueprint(team.defaultFormation).family}
          </span>
        </button>

        {/* Tactical Identity */}
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-4">
          <span className="block font-mono text-[9px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase mb-2">
            TACTICAL IDENTITY
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-[#38BDF8] light:text-sky-700 truncate max-w-[140px]">
              {styleLabel}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-amber-500/12 border border-amber-400/40 text-amber-300 light:bg-amber-50 light:text-amber-700 font-mono text-[9px] font-bold uppercase inline-flex items-center gap-1 shrink-0">
              <HelpCircle className="w-2.5 h-2.5" />
              <span>{dataStatus.toUpperCase()}</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400 light:text-slate-500 block mt-1">
            {xiPlayers.length} players in the preferred XI
          </span>
        </div>
      </div>

      {/* 2. Brand-Tinted Leadership Section (Captaincy Office) */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0C131F] light:bg-sky-50/70 border border-white/[0.08] light:border-slate-200 p-5 space-y-4">
        <div
          className="absolute inset-0 pointer-events-none opacity-30 light:opacity-20"
          style={{
            background: `linear-gradient(125deg, ${hexToRgba(primaryHex, 0.7)} 0%, transparent 48%, ${hexToRgba(secondaryHex, 0.7)} 100%)`,
          }}
        />
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#38BDF8] light:text-sky-700" />
            <h3 className="font-bold text-sm text-white light:text-slate-900">Leadership</h3>
          </div>
          <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
            CAPTAINCY OFFICE
          </span>
        </div>

        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-3.5">
          {/* Captain Card */}
          <div className="rounded-xl bg-[#0A111C]/85 light:bg-white/95 border border-white/[0.08] light:border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-4 h-4 rounded bg-amber-400 text-slate-950 font-mono text-[9px] font-black flex items-center justify-center shrink-0">
                C
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
                CAPTAIN
              </span>
            </div>
            {captain ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (captain.player && onOpenPlayerProfile) {
                      onOpenPlayerProfile(captain.player.id);
                    } else if (onSelectPlayerName) {
                      onSelectPlayerName(captain.name);
                    } else {
                      onSelectTab(4);
                    }
                  }}
                  className="font-bold text-base text-white light:text-slate-900 hover:text-[#38BDF8] light:hover:text-sky-700 transition-colors cursor-pointer text-left block"
                >
                  {captain.name}
                </button>
                <span className="text-[11px] text-slate-400 light:text-slate-500 font-mono block mt-0.5">
                  since {captain.since}
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-400 light:text-slate-500 italic">
                Not appointed
              </span>
            )}
          </div>

          {/* Vice-Captain Card */}
          <div className="rounded-xl bg-[#0A111C]/85 light:bg-white/95 border border-white/[0.08] light:border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-1 h-4 rounded bg-slate-600/60 light:bg-slate-200 text-slate-200 light:text-slate-700 font-mono text-[9px] font-bold flex items-center justify-center shrink-0">
                VC
              </span>
              <span className="font-mono text-[10px] tracking-[0.2em] text-slate-400 light:text-slate-500 uppercase">
                VICE-CAPTAIN
              </span>
            </div>
            {viceCaptain ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    if (viceCaptain.player && onOpenPlayerProfile) {
                      onOpenPlayerProfile(viceCaptain.player.id);
                    } else if (onSelectPlayerName) {
                      onSelectPlayerName(viceCaptain.name);
                    } else {
                      onSelectTab(4);
                    }
                  }}
                  className="font-bold text-base text-white light:text-slate-900 hover:text-[#38BDF8] light:hover:text-sky-700 transition-colors cursor-pointer text-left block"
                >
                  {viceCaptain.name}
                </button>
                <span className="text-[11px] text-slate-400 light:text-slate-500 font-mono block mt-0.5">
                  since {viceCaptain.since}
                </span>
              </>
            ) : (
              <span className="text-sm text-slate-400 light:text-slate-500 italic">
                Not appointed
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. How this team plays */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-white light:text-slate-900">
            How this team plays
          </h3>
          <button
            type="button"
            onClick={() => onSelectTab(2)}
            className="font-mono text-[10px] tracking-[0.2em] text-slate-400 hover:text-[#38BDF8] light:text-slate-500 light:hover:text-sky-700 uppercase cursor-pointer transition-colors"
          >
            FULL TACTICAL PROFILE
          </button>
        </div>

        <p className="text-xs sm:text-sm text-slate-200 light:text-slate-700 leading-relaxed">
          {summary}
        </p>

        {dataStatus === 'estimated' && (
          <p className="text-[11px] text-slate-400 light:text-slate-500 leading-relaxed pt-1">
            This identity is estimated from the team&apos;s own record — league, country, squad strength and shape. It is not a verified claim about the club. An administrator can replace it with a verified profile.
          </p>
        )}
      </div>

      {/* 4. Recent form */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-white light:text-slate-900">Recent form</h3>
          {recentMatches.length > 0 && (
            <div className="flex items-center gap-1.5">
              {recentMatches.map((m) => (
                <span
                  key={m.id}
                  className={`w-6 h-6 rounded-md font-mono text-[11px] font-bold flex items-center justify-center border ${
                    m.result === 'W'
                      ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-400 light:bg-emerald-50 light:text-emerald-700'
                      : m.result === 'D'
                      ? 'bg-amber-500/15 border-amber-500/50 text-amber-400 light:bg-amber-50 light:text-amber-700'
                      : 'bg-rose-500/15 border-rose-500/50 text-rose-400 light:bg-rose-50 light:text-rose-700'
                  }`}
                >
                  {m.result}
                </span>
              ))}
            </div>
          )}
        </div>

        {recentMatches.length > 0 ? (
          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            {recentMatches.map((m) => (
              <div
                key={m.id}
                className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
                  <span className="font-semibold text-slate-200 light:text-slate-900">
                    {m.venue === 'home' ? `vs ${m.opponent}` : `at ${m.opponent}`}
                  </span>
                  <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400 light:text-slate-500 uppercase">
                    {m.competition}
                  </span>
                </div>
                <span className="font-mono font-bold text-sm text-white light:text-slate-900 tabular-nums shrink-0">
                  {m.score}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 light:text-slate-500 py-2">
            No fixtures recorded yet. Play a match to establish recent form for this side.
          </p>
        )}
      </div>

      {/* 5. Three Action Cards Linking Deeper */}
      <div className="grid grid-cols-1 landscape-mobile:grid-cols-3 md:grid-cols-3 gap-3.5">
        <button
          type="button"
          onClick={() => onSelectTab(6)}
          className="text-left rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 hover:border-amber-400/50 p-4 flex items-center justify-between gap-3 transition-all cursor-pointer group hover:-translate-y-0.5"
        >
          <div className="min-w-0">
            <span className="font-bold text-sm text-white light:text-slate-900 block">
              Trophy Cabinet
            </span>
            <span className="text-xs text-slate-400 light:text-slate-500 block mt-0.5 truncate">
              {liveTrophiesCount > 0 ? `${liveTrophiesCount} honours won` : 'No trophies won yet'}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-amber-500/15 text-amber-400 light:bg-amber-100 light:text-amber-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Trophy className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab(3)}
          className="text-left rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 hover:border-emerald-400/50 p-4 flex items-center justify-between gap-3 transition-all cursor-pointer group hover:-translate-y-0.5"
        >
          <div className="min-w-0">
            <span className="font-bold text-sm text-white light:text-slate-900 block">
              Preferred XI
            </span>
            <span className="text-xs text-slate-400 light:text-slate-500 block mt-0.5 truncate">
              {xiSourceLabel}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-500/15 text-emerald-400 light:bg-emerald-100 light:text-emerald-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Shirt className="w-4 h-4" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab(4)}
          className="text-left rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 hover:border-violet-400/50 p-4 flex items-center justify-between gap-3 transition-all cursor-pointer group hover:-translate-y-0.5"
        >
          <div className="min-w-0">
            <span className="font-bold text-sm text-white light:text-slate-900 block">
              Registered squad
            </span>
            <span className="text-xs text-slate-400 light:text-slate-500 block mt-0.5 truncate">
              {team.squad.length} registered players · open the full list
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-violet-500/15 text-violet-400 light:bg-violet-100 light:text-violet-700 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
            <Users className="w-4 h-4" />
          </div>
        </button>
      </div>
    </div>
  );
};
