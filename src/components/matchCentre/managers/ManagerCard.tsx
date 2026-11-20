import React from 'react';
import {
  ArrowUpRight,
  Globe,
  HelpCircle,
  Shield,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  calculateAgeFromDob,
  formatManagerRoleLabel,
  formatTenureDuration,
  Manager,
  ManagerAppointment,
} from '../../../types/manager';
import { Team, getTeamType } from '../../../types/matchCentre';
import { normalizeHex, hexToRgba } from '../dossier/dossierUtils';

interface ManagerCardProps {
  manager: Manager;
  appointments: ManagerAppointment[];
  teams: Team[];
  onSelectManager: (managerId: string) => void;
}

export const ManagerCard: React.FC<ManagerCardProps> = ({
  manager,
  appointments,
  teams,
  onSelectManager,
}) => {
  const currentAppts = appointments.filter((a) => a.is_current);
  const clubAppt = currentAppts.find((a) => a.team_type === 'club') || null;
  const nationalAppt = currentAppts.find((a) => a.team_type === 'country') || null;

  const clubTeam = clubAppt ? teams.find((t) => t.id === clubAppt.team_id) || null : null;
  const nationalTeam = nationalAppt
    ? teams.find((t) => t.id === nationalAppt.team_id) || null
    : null;

  const primaryBadgeTeam = clubTeam || nationalTeam;
  const primaryHex = normalizeHex(
    clubTeam?.primaryColor || nationalTeam?.primaryColor || '#7ADBF0'
  );

  const initials = manager.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

  const tacticalChips = [
    manager.preferred_formation?.trim(),
    ...(manager.tactical_style || '')
      .split(/[·,/|]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  ]
    .filter((v, idx, arr): v is string => Boolean(v) && arr.indexOf(v) === idx)
    .slice(0, 3);

  const age = calculateAgeFromDob(manager.date_of_birth) ?? manager.age ?? null;
  const isRetired = manager.status === 'retired';
  const isUnattached = currentAppts.length === 0 && !isRetired;

  return (
    <button
      type="button"
      onClick={() => onSelectManager(manager.id)}
      className="group relative w-full text-left rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 hover:border-[#7ADBF0]/55 light:hover:border-cyan-500/60 p-4 sm:p-5 transition-all duration-200 hover:-translate-y-0.5 shadow-lg hover:shadow-[0_12px_32px_rgba(122,219,240,0.12)] cursor-pointer flex flex-col justify-between gap-4"
    >
      {/* Subtle top accent bar matching current club/country colour */}
      <div
        aria-hidden="true"
        className="absolute inset-x-4 top-0 h-[2px] rounded-full opacity-75 group-hover:opacity-100 transition-opacity"
        style={{ backgroundColor: primaryApptColor(clubTeam, nationalTeam, primaryHex) }}
      />

      <div className="space-y-4">
        {/* Top Row: Avatar + Crest + Name + Verification */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="relative shrink-0">
              {manager.photo ? (
                <img
                  src={manager.photo}
                  alt={manager.name}
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover bg-[#080E18] border border-white/10 light:border-slate-200"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-[#111B2D] light:bg-slate-100 border border-white/10 light:border-slate-200 flex items-center justify-center font-display text-xl text-white light:text-slate-900">
                  {initials || 'MG'}
                </div>
              )}

              {primaryBadgeTeam && (
                <div
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-lg bg-[#070D17] light:bg-white border border-white/15 light:border-slate-300 p-1 flex items-center justify-center shadow-md"
                  title={primaryBadgeTeam.name}
                >
                  {primaryBadgeTeam.crestUrl ? (
                    <img
                      src={primaryBadgeTeam.crestUrl}
                      alt={primaryBadgeTeam.shortName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />
                  ) : getTeamType(primaryBadgeTeam) === 'country' ? (
                    <Globe className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <Shield className="w-3.5 h-3.5 text-slate-300" />
                  )}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-bold text-base text-white light:text-slate-900 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 transition-colors truncate">
                  {manager.name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 light:text-slate-600 truncate mt-0.5">
                {manager.nationality || 'Nationality unrecorded'}
                {age !== null ? ` · Age ${age}` : ''}
              </p>
              <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                {manager.verified ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/12 border border-emerald-400/35 text-emerald-300 light:bg-emerald-50 light:text-emerald-700 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span>VERIFIED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/30 text-amber-300 light:bg-amber-50 light:text-amber-700 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <HelpCircle className="w-2.5 h-2.5" />
                    <span>UNVERIFIED</span>
                  </span>
                )}

                {isRetired && (
                  <span className="px-2 py-0.5 rounded bg-slate-500/15 border border-slate-400/30 text-slate-300 light:bg-slate-100 light:text-slate-700 font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                    RETIRED
                  </span>
                )}
              </div>
            </div>
          </div>

          <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-[#7ADBF0] light:group-hover:text-cyan-700 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </div>

        {/* Current Appointments — Strictly Distinguishing Club vs National Team */}
        <div className="space-y-2">
          {clubAppt && (
            <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 px-3 py-2 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                {clubTeam?.crestUrl ? (
                  <img
                    src={clubTeam.crestUrl}
                    alt={clubAppt.team_name}
                    referrerPolicy="no-referrer"
                    className="w-5 h-5 object-contain shrink-0"
                  />
                ) : (
                  <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white light:text-slate-900 truncate">
                      {clubAppt.team_name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-white/[0.06] light:bg-slate-200 font-mono text-[8px] font-bold tracking-wider uppercase text-slate-300 light:text-slate-700 shrink-0">
                      CLUB
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 light:text-slate-600 block truncate">
                    {formatManagerRoleLabel(clubAppt.role)} ·{' '}
                    {formatTenureDuration(clubAppt.start_date)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {nationalAppt && (
            <div className="rounded-xl bg-sky-500/[0.09] light:bg-sky-50 border border-sky-400/35 light:border-sky-300 px-3 py-2 flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 min-w-0">
                {nationalTeam?.crestUrl ? (
                  <img
                    src={nationalTeam.crestUrl}
                    alt={nationalAppt.team_name}
                    referrerPolicy="no-referrer"
                    className="w-5 h-4 object-cover rounded-sm shrink-0"
                  />
                ) : (
                  <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-sky-100 light:text-sky-950 truncate">
                      {nationalAppt.team_name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-sky-500/20 light:bg-sky-200 font-mono text-[8px] font-bold tracking-wider uppercase text-sky-300 light:text-sky-800 shrink-0 whitespace-nowrap">
                      NATIONAL TEAM
                    </span>
                  </div>
                  <span className="text-[11px] text-sky-300/80 light:text-sky-800 block truncate">
                    {formatManagerRoleLabel(nationalAppt.role)} ·{' '}
                    {formatTenureDuration(nationalAppt.start_date)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {isUnattached && (
            <div className="rounded-xl bg-white/[0.025] light:bg-slate-50 border border-dashed border-white/10 light:border-slate-300 px-3 py-2 flex items-center gap-2 text-xs text-slate-400 light:text-slate-600">
              <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span>Currently unattached</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Tactical Chips */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/[0.06] light:border-slate-200">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          {tacticalChips.length > 0 ? (
            tacticalChips.map((chip, idx) => (
              <span
                key={`${chip}-${idx}`}
                className="px-2 py-0.5 rounded-md font-mono text-[10px] font-semibold truncate max-w-[140px] border"
                style={{
                  backgroundColor:
                    idx === 0 && primaryBadgeTeam
                      ? hexToRgba(primaryHex, 0.14)
                      : 'rgba(255,255,255,0.04)',
                  borderColor:
                    idx === 0 && primaryBadgeTeam
                      ? hexToRgba(primaryHex, 0.38)
                      : 'rgba(148,163,184,0.22)',
                  color: idx === 0 && primaryBadgeTeam ? '#E2E8F0' : undefined,
                }}
              >
                <span className="light:text-slate-800">{chip}</span>
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-500 italic">No tactical tags recorded</span>
          )}
        </div>

        <span className="font-mono text-[10px] text-slate-400 light:text-slate-500 tabular-nums shrink-0">
          {appointments.length} {appointments.length === 1 ? 'post' : 'posts'}
        </span>
      </div>
    </button>
  );
};

function primaryApptColor(
  clubTeam: Team | null,
  nationalTeam: Team | null,
  fallback: string
): string {
  if (clubTeam?.primaryColor) return normalizeHex(clubTeam.primaryColor);
  if (nationalTeam?.primaryColor) return normalizeHex(nationalTeam.primaryColor);
  return fallback;
}
