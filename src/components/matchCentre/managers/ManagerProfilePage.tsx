import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  Award,
  Calendar,
  Compass,
  Edit2,
  Globe,
  HelpCircle,
  History,
  Info,
  Plus,
  Shield,
  ShieldCheck,
  Trophy,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  calculateAgeFromDob,
  formatManagerRoleLabel,
  formatTenureDuration,
  parsePhilosophyJson,
} from '../../../types/manager';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { useAuth } from '../../../context/AuthContext';
import { hexToRgba, normalizeHex } from '../dossier/dossierUtils';
import { ManagerFormDialog } from './ManagerFormDialog';
import { CareerEntryDialog } from './CareerEntryDialog';
import { ManagerStatisticsSection } from './ManagerStatisticsSection';

interface ManagerProfilePageProps {
  managerId: string;
  onBackToManagers: () => void;
  onOpenMatchCentre: () => void;
  onOpenTeam: (teamId: string) => void;
}

export const ManagerProfilePage: React.FC<ManagerProfilePageProps> = ({
  managerId,
  onBackToManagers,
  onOpenMatchCentre,
  onOpenTeam,
}) => {
  const {
    getManagerById,
    getAppointmentsForManager,
    teams,
    updateManagerRecord,
    assignManagerAction,
    addCareerAppointmentAction,
    endAppointmentByIdAction,
  } = useMatchCentre();
  const { isAdmin } = useAuth();

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCareerDialogOpen, setIsCareerDialogOpen] = useState(false);
  const [endingApptId, setEndingApptId] = useState<string | null>(null);

  const manager = getManagerById(managerId);
  const appointments = useMemo(
    () => getAppointmentsForManager(managerId),
    [getAppointmentsForManager, managerId]
  );

  const teamMap = useMemo(() => new Map(teams.map((t) => [t.id, t])), [teams]);

  const currentAppointments = useMemo(
    () => appointments.filter((a) => a.is_current),
    [appointments]
  );

  const sortedCareerHistory = useMemo(() => {
    return [...appointments].sort((a, b) => {
      if (a.is_current !== b.is_current) return a.is_current ? -1 : 1;
      return b.start_date.localeCompare(a.start_date);
    });
  }, [appointments]);

  if (!manager) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <button
          type="button"
          onClick={onBackToManagers}
          className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-slate-400 hover:text-white light:text-slate-600 light:hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Managers</span>
        </button>

        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-200 p-8 text-center space-y-2">
          <h1 className="font-bold text-lg text-white light:text-slate-900">
            Manager record not found
          </h1>
          <p className="text-xs text-slate-400 light:text-slate-600">
            The requested manager ID does not exist or has not been created yet.
          </p>
        </div>
      </div>
    );
  }

  const primaryCurrentAppt =
    currentAppointments.find((a) => a.team_type === 'club') || currentAppointments[0] || null;
  const primaryTeam = primaryCurrentAppt ? teamMap.get(primaryCurrentAppt.team_id) || null : null;
  const primaryColorHex = normalizeHex(primaryTeam?.primaryColor || '#7ADBF0');
  const age = calculateAgeFromDob(manager.date_of_birth);
  const philosophy = parsePhilosophyJson(manager.philosophy_json);
  const isRetired = manager.status === 'retired';
  const isUnattached = currentAppointments.length === 0 && !isRetired;

  const initials = manager.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const handleEndAppointment = async (apptId: string) => {
    setEndingApptId(apptId);
    await endAppointmentByIdAction(apptId);
    setEndingApptId(null);
  };

  const appointmentHonours = appointments.flatMap((a) =>
    (a.honours || []).map((h) => ({
      honour: h,
      teamName: a.team_name,
      teamType: a.team_type,
    }))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 landscape-mobile:py-4 space-y-6 landscape-mobile:space-y-4 pb-16 landscape-mobile:pb-10">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-mono flex-wrap">
        <button
          type="button"
          onClick={onOpenMatchCentre}
          className="text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 cursor-pointer transition-colors"
        >
          MATCH CENTRE
        </button>
        <span className="text-slate-500">/</span>
        <button
          type="button"
          onClick={onBackToManagers}
          className="text-slate-400 light:text-slate-600 hover:text-white light:hover:text-slate-900 cursor-pointer transition-colors"
        >
          MANAGERS
        </button>
        <span className="text-slate-500">/</span>
        <span className="text-[#7ADBF0] light:text-cyan-700 font-bold uppercase truncate">
          {manager.name}
        </span>
      </nav>

      {/* Profile Header */}
      <section className="relative overflow-hidden rounded-3xl bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-200 p-6 sm:p-8 landscape-mobile:p-4 shadow-2xl">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-25 light:opacity-15"
          style={{
            background: `radial-gradient(ellipse 65% 85% at 15% 20%, ${hexToRgba(
              primaryColorHex,
              0.42
            )}, transparent)`,
          }}
        />
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[3px]"
          style={{ backgroundColor: primaryColorHex }}
        />

        <div className="relative z-10 flex flex-col landscape-mobile:flex-row lg:flex-row landscape-mobile:items-start lg:items-start justify-between gap-6 landscape-mobile:gap-4">
          <div className="flex flex-col sm:flex-row landscape-mobile:flex-row items-start gap-5 landscape-mobile:gap-4 min-w-0">
            {manager.photo ? (
              <img
                src={manager.photo}
                alt={manager.name}
                referrerPolicy="no-referrer"
                className="w-24 h-24 sm:w-28 sm:h-28 landscape-mobile:w-20 landscape-mobile:h-20 rounded-2xl object-cover bg-[#080E18] border border-white/15 light:border-slate-200 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-24 h-24 sm:w-28 sm:h-28 landscape-mobile:w-20 landscape-mobile:h-20 rounded-2xl bg-[#101A2C] light:bg-slate-100 border border-white/15 light:border-slate-200 flex items-center justify-center font-display text-3xl text-white light:text-slate-900 shadow-lg shrink-0">
                {initials || 'MG'}
              </div>
            )}

            <div className="min-w-0 space-y-2.5 landscape-mobile:space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="font-display text-3xl sm:text-4xl landscape-mobile:text-2xl tracking-wide text-white light:text-slate-950 uppercase leading-none">
                  {manager.name}
                </h1>

                {manager.verified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 light:bg-emerald-50 light:text-emerald-700 font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>VERIFIED</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-amber-500/12 border border-amber-400/35 text-amber-300 light:bg-amber-50 light:text-amber-700 font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>UNVERIFIED</span>
                  </span>
                )}

                {isUnattached && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-500/15 border border-slate-400/35 text-slate-300 light:bg-slate-100 light:text-slate-700 font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <UserCheck className="w-3 h-3" />
                    <span>UNATTACHED</span>
                  </span>
                )}

                {isRetired && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-400/35 text-rose-300 light:bg-rose-50 light:text-rose-700 font-mono text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    <span>RETIRED</span>
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs sm:text-sm text-slate-300 light:text-slate-700">
                <span>
                  <strong className="text-slate-400 light:text-slate-500 font-medium">
                    Nationality:
                  </strong>{' '}
                  {manager.nationality || 'Unrecorded'}
                </span>
                {age !== null ? (
                  <span className="tabular-nums">
                    <strong className="text-slate-400 light:text-slate-500 font-medium">
                      Age:
                    </strong>{' '}
                    {age} ({manager.date_of_birth})
                  </span>
                ) : manager.date_of_birth ? (
                  <span className="tabular-nums">
                    <strong className="text-slate-400 light:text-slate-500 font-medium">
                      DOB:
                    </strong>{' '}
                    {manager.date_of_birth}
                  </span>
                ) : null}
                {manager.playing_background && (
                  <span>
                    <strong className="text-slate-400 light:text-slate-500 font-medium">
                      Playing background:
                    </strong>{' '}
                    {manager.playing_background}
                  </span>
                )}
              </div>

              {/* Formation + Team-colored Tactical Style Chip */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {manager.preferred_formation && (
                  <span className="px-3 py-1 rounded-lg bg-[#080E18] light:bg-slate-100 border border-white/10 light:border-slate-300 font-mono text-xs font-bold text-white light:text-slate-900">
                    Shape: {manager.preferred_formation}
                  </span>
                )}

                {manager.tactical_style && (
                  <span
                    className="px-3 py-1 rounded-lg border font-semibold text-xs text-white light:text-slate-900"
                    style={{
                      backgroundColor: hexToRgba(primaryColorHex, 0.2),
                      borderColor: hexToRgba(primaryColorHex, 0.55),
                    }}
                  >
                    {manager.tactical_style}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Admin Controls */}
          {isAdmin && (
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsEditOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] light:bg-slate-100 light:hover:bg-slate-200 border border-white/15 light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
                <span>Edit Record</span>
              </button>
              <button
                type="button"
                onClick={() => setIsCareerDialogOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#95E4F5] text-[#050A12] font-bold text-xs inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Appointment</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Current Appointments Section */}
      <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
            <h2 className="font-bold text-base text-white light:text-slate-900">
              Current Appointments
            </h2>
          </div>
          <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-slate-400 light:text-slate-500">
            CLUB &amp; NATIONAL TEAM ROLES
          </span>
        </div>

        {currentAppointments.length === 0 ? (
          <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-dashed border-white/10 light:border-slate-300 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <p className="text-xs sm:text-sm text-slate-400 light:text-slate-600">
              {manager.name} holds no active club or national-team appointment at present.
            </p>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsCareerDialogOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-[#7ADBF0] text-[#050A12] font-bold text-xs inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Appoint to team</span>
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 gap-4 landscape-mobile:gap-3">
            {currentAppointments.map((appt) => {
              const team = teamMap.get(appt.team_id);
              const isCountry = appt.team_type === 'country';
              const competitionLine =
                appt.competitions?.length > 0
                  ? appt.competitions.join(' · ')
                  : isCountry
                  ? team?.confederation || 'International'
                  : team?.league || 'Club competition';

              return (
                <div
                  key={appt.id}
                  className={`rounded-2xl p-4 sm:p-5 border flex flex-col justify-between gap-4 ${
                    isCountry
                      ? 'bg-sky-500/[0.09] light:bg-sky-50 border-sky-400/40 light:border-sky-300'
                      : 'bg-[#080E18] light:bg-slate-50 border-white/[0.1] light:border-slate-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-xl p-2 flex items-center justify-center shrink-0 border ${
                          isCountry
                            ? 'bg-sky-950/50 light:bg-white border-sky-400/30'
                            : 'bg-[#0C131F] light:bg-white border-white/10 light:border-slate-200'
                        }`}
                      >
                        {team?.crestUrl ? (
                          <img
                            src={team.crestUrl}
                            alt={appt.team_name}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-contain"
                          />
                        ) : isCountry ? (
                          <Globe className="w-6 h-6 text-sky-400" />
                        ) : (
                          <Shield className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase tracking-wider whitespace-nowrap ${
                              isCountry
                                ? 'bg-sky-500/20 text-sky-200 light:bg-sky-200 light:text-sky-900'
                                : 'bg-white/10 text-slate-200 light:bg-slate-200 light:text-slate-800'
                            }`}
                          >
                            {isCountry ? 'NATIONAL TEAM' : 'CLUB'}
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-wider text-emerald-300 light:text-emerald-700 font-bold">
                            ACTIVE
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onOpenTeam(appt.team_id)}
                          className="mt-1 font-bold text-base sm:text-lg text-white light:text-slate-950 hover:text-[#7ADBF0] light:hover:text-cyan-700 transition-colors inline-flex items-center gap-1 cursor-pointer text-left"
                        >
                          <span className="truncate">{appt.team_name}</span>
                          <ArrowUpRight className="w-4 h-4 shrink-0" />
                        </button>

                        <p className="text-xs text-slate-300 light:text-slate-700 mt-0.5">
                          {formatManagerRoleLabel(appt.role)} · {competitionLine}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.08] light:border-slate-200 text-xs">
                    <div className="font-mono text-[11px] text-slate-300 light:text-slate-700 tabular-nums">
                      Since {appt.start_date} ·{' '}
                      <span className="text-[#7ADBF0] light:text-cyan-700 font-semibold">
                        {formatTenureDuration(appt.start_date)}
                      </span>
                    </div>

                    {isAdmin && (
                      <button
                        type="button"
                        disabled={endingApptId === appt.id}
                        onClick={() => handleEndAppointment(appt.id)}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/12 hover:bg-rose-500/22 border border-rose-500/35 text-rose-300 light:text-rose-700 font-semibold text-xs inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5" />
                        <span>
                          {endingApptId === appt.id ? 'Ending...' : 'End Appointment'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Manager Statistics Section */}
      <ManagerStatisticsSection managerId={manager.id} onOpenTeam={onOpenTeam} />

      {/* Managerial Career History */}
      <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
            <h2 className="font-bold text-base text-white light:text-slate-900">
              Managerial Career History
            </h2>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setIsCareerDialogOpen(true)}
              className="text-xs font-semibold text-[#7ADBF0] light:text-cyan-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add career entry</span>
            </button>
          )}
        </div>

        {sortedCareerHistory.length === 0 ? (
          <p className="text-xs text-slate-400 light:text-slate-600">
            No career appointments recorded yet.
          </p>
        ) : (
          <div className="divide-y divide-white/[0.07] light:divide-slate-200">
            {sortedCareerHistory.map((appt) => {
              const team = teamMap.get(appt.team_id);
              const isCountry = appt.team_type === 'country';
              return (
                <div
                  key={appt.id}
                  className="py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#080E18] light:bg-slate-100 border border-white/10 light:border-slate-200 p-1.5 flex items-center justify-center shrink-0">
                      {team?.crestUrl ? (
                        <img
                          src={team.crestUrl}
                          alt={appt.team_name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain"
                        />
                      ) : isCountry ? (
                        <Globe className="w-5 h-5 text-sky-400" />
                      ) : (
                        <Shield className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => onOpenTeam(appt.team_id)}
                          className="font-bold text-sm text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 transition-colors cursor-pointer text-left"
                        >
                          {appt.team_name}
                        </button>

                        {isCountry && (
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/20 light:bg-sky-100 font-mono text-[9px] font-bold uppercase text-sky-300 light:text-sky-800 whitespace-nowrap">
                            NATIONAL TEAM
                          </span>
                        )}

                        <span
                          className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold uppercase whitespace-nowrap ${
                            appt.is_current
                              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-400/35 light:bg-emerald-50 light:text-emerald-700'
                              : 'bg-white/[0.06] text-slate-400 border border-white/10 light:bg-slate-100 light:text-slate-600'
                          }`}
                        >
                          {appt.is_current ? 'CURRENT' : 'FORMER'}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 light:text-slate-700">
                        {formatManagerRoleLabel(appt.role)}
                        {appt.competitions?.length > 0
                          ? ` · ${appt.competitions.join(', ')}`
                          : ''}
                      </p>

                      {appt.honours?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {appt.honours.map((h, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/30 text-[11px] text-amber-200 light:bg-amber-50 light:text-amber-800"
                            >
                              <Trophy className="w-3 h-3 text-amber-400" />
                              <span>{h}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {appt.notes && (
                        <p className="text-xs text-slate-400 light:text-slate-600 leading-relaxed">
                          {appt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="font-mono text-xs text-slate-300 light:text-slate-700 tabular-nums block">
                      {appt.start_date} → {appt.is_current ? 'Present' : appt.end_date || 'Ended'}
                    </span>
                    <span className="font-mono text-[10px] text-slate-500 block mt-0.5">
                      {formatTenureDuration(appt.start_date, appt.end_date)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Tactical Philosophy (5 Structured Categories) */}
      <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
            <h2 className="font-bold text-base text-white light:text-slate-900">
              Tactical Philosophy
            </h2>
          </div>
          {manager.preferred_formation && (
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-500">
              BASE SHAPE: {manager.preferred_formation}
            </span>
          )}
        </div>

        <div className="rounded-xl bg-white/[0.03] light:bg-slate-50 border border-white/[0.08] light:border-slate-200 px-4 py-3 flex items-start gap-2.5 text-xs text-slate-300 light:text-slate-700">
          <Info className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700 shrink-0 mt-0.5" />
          <span>
            Preferred formation ({manager.preferred_formation || 'Unset'}) is used as a starting point rather than a rigid rule — tactical principles, phase transitions, and in-game flexibility shape how the team operates across 90 minutes.
          </span>
        </div>

        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3.5 landscape-mobile:gap-3">
          {[
            {
              title: 'Possession & Passing',
              text: philosophy.possession_passing,
              score: philosophy.possession_index,
            },
            {
              title: 'Pressing',
              text: philosophy.pressing,
              score: philosophy.pressing_index,
            },
            {
              title: 'Defensive Structure',
              text: philosophy.defensive_structure,
              score: philosophy.defensive_line_index,
            },
            {
              title: 'Attacking Approach',
              text: philosophy.attacking_approach,
              score: philosophy.attacking_boldness_index,
            },
            {
              title: 'Tactical Flexibility',
              text: philosophy.tactical_flexibility,
              score: philosophy.flexibility_index,
            },
          ].map((cat) => (
            <div
              key={cat.title}
              className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.07] light:border-slate-200 p-4 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-[#7ADBF0] light:text-cyan-700">
                  {cat.title}
                </h3>
                {typeof cat.score === 'number' && (
                  <span className="font-mono text-[11px] font-bold text-slate-300 light:text-slate-700 tabular-nums">
                    {cat.score}/100
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 light:text-slate-700 leading-relaxed">
                {cat.text?.trim()
                  ? cat.text
                  : 'No custom tactical notes added for this category yet.'}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Biography & Major Honours */}
      <section className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 landscape-mobile:p-4 space-y-5 landscape-mobile:space-y-3.5">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#D6B56E] light:text-amber-600" />
          <h2 className="font-bold text-base text-white light:text-slate-900">
            Biography &amp; Major Honours
          </h2>
        </div>

        <div className="grid grid-cols-1 landscape-mobile:grid-cols-12 lg:grid-cols-12 gap-5 landscape-mobile:gap-4">
          <div className="landscape-mobile:col-span-7 lg:col-span-7 space-y-3">
            <h3 className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-400 light:text-slate-500">
              BIOGRAPHY
            </h3>
            {manager.bio?.trim() ? (
              <p className="text-xs sm:text-sm text-slate-200 light:text-slate-700 leading-relaxed whitespace-pre-line">
                {manager.bio}
              </p>
            ) : (
              <p className="text-xs text-slate-400 light:text-slate-500">
                No biography recorded yet for {manager.name}.
              </p>
            )}

            <p className="text-[11px] text-slate-400 light:text-slate-500 pt-2 border-t border-white/[0.06] light:border-slate-200">
              {manager.verified
                ? 'Source status: Verified record curated by Match Centre administrators. Protected from automatic unverified overwrites.'
                : 'Source status: Community or provisional entry awaiting administrator verification.'}
            </p>
          </div>

          <div className="landscape-mobile:col-span-5 lg:col-span-5 space-y-3">
            <h3 className="font-mono text-[10px] tracking-[0.18em] uppercase text-slate-400 light:text-slate-500">
              HONOURS CABINET
            </h3>
            {manager.honours.length === 0 && appointmentHonours.length === 0 ? (
              <p className="text-xs text-slate-400 light:text-slate-500">
                No major honours recorded yet.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {manager.honours.map((h, i) => (
                  <span
                    key={`mgr-h-${i}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080E18] light:bg-slate-50 border border-amber-400/25 light:border-amber-200 text-xs text-slate-100 light:text-slate-900"
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{h}</span>
                  </span>
                ))}
                {appointmentHonours.map((item, i) => (
                  <span
                    key={`appt-h-${i}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-200 text-xs text-slate-200 light:text-slate-800"
                  >
                    <Trophy className="w-3.5 h-3.5 text-[#7ADBF0] shrink-0" />
                    <span>
                      {item.honour}{' '}
                      <span className="text-slate-400 light:text-slate-500">
                        ({item.teamName})
                      </span>
                    </span>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Dialogs */}
      {isAdmin && isEditOpen && (
        <ManagerFormDialog
          mode="edit"
          initialManager={manager}
          isAdmin={isAdmin}
          onSave={(payload) => updateManagerRecord(manager.id, payload)}
          onClose={() => setIsEditOpen(false)}
        />
      )}

      {isAdmin && isCareerDialogOpen && (
        <CareerEntryDialog
          manager={manager}
          existingAppointments={appointments}
          teams={teams}
          onAssignCurrent={(params) => assignManagerAction(params)}
          onAddHistorical={(id, payload) => addCareerAppointmentAction(id, payload)}
          onClose={() => setIsCareerDialogOpen(false)}
        />
      )}
    </div>
  );
};

export const ManagerProfile = ManagerProfilePage;
