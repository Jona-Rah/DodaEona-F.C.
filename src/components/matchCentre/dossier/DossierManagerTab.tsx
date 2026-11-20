import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Check,
  Edit2,
  Globe,
  HelpCircle,
  Search,
  Shield,
  ShieldCheck,
  UserPlus,
  UserX,
  X,
} from 'lucide-react';
import { Team, getTeamType } from '../../../types/matchCentre';
import {
  calculateAgeFromDob,
  formatManagerRoleLabel,
  formatTenureDuration,
  ManagerAppointmentRole,
  ManagerAppointmentStatistics,
} from '../../../types/manager';
import { useMatchCentre } from '../../../context/MatchCentreContext';
import { ManagerFormDialog } from '../managers/ManagerFormDialog';
import { normalizeDatabaseSearchText } from '../../../utils/globalDatabaseSearch';

interface DossierManagerTabProps {
  team: Team;
}

export const DossierManagerTab: React.FC<DossierManagerTabProps> = ({ team }) => {
  const {
    managers,
    managerAppointments,
    simulationMatches,
    getManagerById,
    getAppointmentsForTeam,
    getAppointmentsForManager,
    openManagerProfile,
    openTeamById,
    assignManagerAction,
    createManagerRecord,
    updateManagerRecord,
    endAppointmentByIdAction,
    endManagerAppointment,
    fetchManagerStatistics,
    canManageTeam,
  } = useMatchCentre();
  const canManage = canManageTeam(team);
  const teamType = getTeamType(team);

  const teamAppointments = useMemo(
    () => getAppointmentsForTeam(team.id),
    [getAppointmentsForTeam, team.id]
  );

  const currentAppointment = useMemo(
    () => teamAppointments.find((a) => a.is_current) || null,
    [teamAppointments]
  );

  const activeManager = useMemo(() => {
    const id = currentAppointment?.manager_id || team.manager_id;
    return id ? getManagerById(id) : null;
  }, [currentAppointment?.manager_id, team.manager_id, getManagerById]);

  const activeName =
    activeManager?.name ||
    currentAppointment?.manager_name ||
    team.manager_name ||
    team.manager ||
    '';
  const hasManager = Boolean(activeName && activeName.trim() && activeName !== 'Vacant');
  const legacyProfile = team.managerProfile;

  const [isReplaceOpen, setIsReplaceOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<'existing' | 'new'>('existing');
  const [existingSearch, setExistingSearch] = useState('');
  const deferredExistingSearch = useDeferredValue(existingSearch);
  const [selectedExistingId, setSelectedExistingId] = useState('');
  const [assignRole, setAssignRole] = useState<ManagerAppointmentRole>('head-coach');
  const [assignStartDate, setAssignStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [newMgrName, setNewMgrName] = useState('');
  const [newMgrNat, setNewMgrNat] = useState(team.country);
  const [newMgrDob, setNewMgrDob] = useState('');
  const [newMgrBio, setNewMgrBio] = useState('');
  const [submittingAssign, setSubmittingAssign] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [teamStats, setTeamStats] = useState<ManagerAppointmentStatistics | null>(null);

  useEffect(() => {
    if (!activeManager?.id) {
      setTeamStats(null);
      return;
    }
    let active = true;
    fetchManagerStatistics(activeManager.id).then((res) => {
      if (!active || !res) return;
      const matched =
        res.appointments.find((a) => a.teamId === team.id && a.isCurrent) ||
        res.appointments.find((a) => a.teamId === team.id) ||
        null;
      setTeamStats(matched);
    });
    return () => {
      active = false;
    };
  }, [activeManager?.id, team.id, fetchManagerStatistics, simulationMatches.length, managerAppointments.length]);

  const managerCareerAppointments = useMemo(() => {
    if (!activeManager) return [];
    return getAppointmentsForManager(activeManager.id);
  }, [activeManager, getAppointmentsForManager]);

  const filteredExistingManagers = useMemo(() => {
    const q = normalizeDatabaseSearchText(deferredExistingSearch);
    return managers
      .filter((m) => {
        if (!q) return true;
        return (
          normalizeDatabaseSearchText(m.name).includes(q) ||
          normalizeDatabaseSearchText(m.nationality).includes(q) ||
          normalizeDatabaseSearchText(m.tactical_style).includes(q)
        );
      })
      .slice(0, 40);
  }, [managers, deferredExistingSearch]);

  const initials = (activeName || 'NA')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const roleLabel = formatManagerRoleLabel(
    currentAppointment?.role || team.manager_role || legacyProfile?.role
  );
  const appointedSince =
    currentAppointment?.start_date ||
    team.manager_since ||
    legacyProfile?.appointedSince ||
    (legacyProfile?.appointedYear ? String(legacyProfile.appointedYear) : '');

  const isVerified = activeManager
    ? activeManager.verified
    : Boolean(currentAppointment?.verified ?? legacyProfile?.verified);

  const bioText = activeManager?.bio || legacyProfile?.bio || '';

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssignError(null);

    if (assignMode === 'existing') {
      if (!selectedExistingId) {
        setAssignError('Select a manager from the directory or switch to "New manager".');
        return;
      }
      setSubmittingAssign(true);
      const res = await assignManagerAction({
        manager_id: selectedExistingId,
        team_id: team.id,
        role: assignRole,
        start_date: assignStartDate,
        competitions:
          teamType === 'country'
            ? [team.confederation || 'International']
            : team.league
            ? [team.league]
            : [],
      });
      setSubmittingAssign(false);
      if (!res.ok) {
        setAssignError(res.error || 'Unable to assign manager.');
        return;
      }
      setIsReplaceOpen(false);
      setSelectedExistingId('');
      return;
    }

    if (!newMgrName.trim()) {
      setAssignError('Manager name is required.');
      return;
    }
    setSubmittingAssign(true);
    const created = await createManagerRecord({
      name: newMgrName.trim(),
      nationality: newMgrNat.trim(),
      date_of_birth: newMgrDob.trim(),
      bio: newMgrBio.trim(),
      preferred_formation: team.defaultFormation || '4-3-3',
      tactical_style: team.playingStyle || '',
      status: 'active',
      verified: false,
    });
    if (!created.ok || !created.data) {
      setSubmittingAssign(false);
      setAssignError(created.error || 'Failed to create manager entity.');
      return;
    }

    const assigned = await assignManagerAction({
      manager_id: created.data.id,
      team_id: team.id,
      role: assignRole,
      start_date: assignStartDate,
      competitions:
        teamType === 'country'
          ? [team.confederation || 'International']
          : team.league
          ? [team.league]
          : [],
    });
    setSubmittingAssign(false);
    if (!assigned.ok) {
      setAssignError(assigned.error || 'Created manager, but appointment failed.');
      return;
    }
    setNewMgrName('');
    setNewMgrDob('');
    setNewMgrBio('');
    setIsReplaceOpen(false);
  };

  const handleEndCurrent = async () => {
    if (currentAppointment) {
      await endAppointmentByIdAction(currentAppointment.id);
    } else {
      endManagerAppointment(team.id);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* 1. Current Appointment Card (or Vacant Empty State) */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-white light:text-slate-900">
              Current appointment
            </h3>
            <span className="font-mono text-[9px] tracking-[0.18em] uppercase text-slate-400 light:text-slate-500">
              {teamType === 'country' ? 'NATIONAL TEAM DUGOUT' : 'CLUB DUGOUT'}
            </span>
          </div>

          {canManage && hasManager && (
            <button
              type="button"
              onClick={() => {
                setIsReplaceOpen(!isReplaceOpen);
                if (managers.length === 0) setAssignMode('new');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#080E18] light:bg-slate-100 hover:bg-[#141E30] light:hover:bg-slate-200 border border-white/[0.1] light:border-slate-300 text-xs font-semibold text-white light:text-slate-900 inline-flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
              <span>Replace manager</span>
            </button>
          )}
        </div>

        {/* Inline Appoint / Replace Form */}
        {canManage && isReplaceOpen && (
          <form
            onSubmit={handleAssignSubmit}
            className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-[#7ADBF0]/35 p-4 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAssignMode('existing')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    assignMode === 'existing'
                      ? 'bg-[#7ADBF0] text-[#050A12]'
                      : 'bg-white/[0.05] text-slate-300 light:bg-slate-200 light:text-slate-700'
                  }`}
                >
                  Select Existing ({managers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAssignMode('new')}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
                    assignMode === 'new'
                      ? 'bg-[#7ADBF0] text-[#050A12]'
                      : 'bg-white/[0.05] text-slate-300 light:bg-slate-200 light:text-slate-700'
                  }`}
                >
                  Create &amp; Appoint New
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsReplaceOpen(false)}
                className="text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {assignError && (
              <div className="px-3 py-2 rounded-lg bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200 light:text-rose-800">
                {assignError}
              </div>
            )}

            {assignMode === 'existing' ? (
              <div className="space-y-2.5">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={existingSearch}
                    onChange={(e) => setExistingSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && existingSearch.trim() && filteredExistingManagers.length > 0) {
                        e.preventDefault();
                        setSelectedExistingId(filteredExistingManagers[0].id);
                      }
                    }}
                    placeholder="Search permanent managers directory..."
                    className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
                  />
                  {existingSearch && (
                    <button
                      type="button"
                      onClick={() => setExistingSearch('')}
                      className="p-0.5 text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer"
                      aria-label="Clear manager search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="max-h-36 overflow-y-auto rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-200 divide-y divide-white/[0.06] light:divide-slate-200">
                  {filteredExistingManagers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-400 text-center">
                      No managers in directory match &mdash; use &ldquo;Create &amp; Appoint New&rdquo;.
                    </div>
                  ) : (
                    filteredExistingManagers.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedExistingId(m.id)}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between text-xs cursor-pointer ${
                          selectedExistingId === m.id
                            ? 'bg-[#7ADBF0]/15 text-white light:bg-cyan-50 light:text-slate-950'
                            : 'text-slate-200 light:text-slate-800 hover:bg-white/[0.04] light:hover:bg-slate-100'
                        }`}
                      >
                        <span className="font-semibold truncate">{m.name}</span>
                        <span className="text-[11px] text-slate-400 light:text-slate-600 shrink-0 ml-2">
                          {m.nationality || 'Unrecorded'}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <input
                    type="text"
                    required={assignMode === 'new'}
                    value={newMgrName}
                    onChange={(e) => setNewMgrName(e.target.value)}
                    placeholder="Manager full name *"
                    className="px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  />
                  <input
                    type="text"
                    value={newMgrNat}
                    onChange={(e) => setNewMgrNat(e.target.value)}
                    placeholder="Nationality"
                    className="px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                  />
                  <div className="flex items-center gap-2">
                    <input
                      type="date"
                      value={newMgrDob}
                      onChange={(e) => setNewMgrDob(e.target.value)}
                      title="Date of birth"
                      className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                    />
                    {calculateAgeFromDob(newMgrDob) !== null && (
                      <span className="font-mono text-[10px] font-bold text-[#7ADBF0] light:text-cyan-700 shrink-0">
                        Age {calculateAgeFromDob(newMgrDob)}
                      </span>
                    )}
                  </div>
                </div>
                <textarea
                  rows={2}
                  value={newMgrBio}
                  onChange={(e) => setNewMgrBio(e.target.value)}
                  placeholder="Verified coaching biography (optional)..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value as ManagerAppointmentRole)}
                className="px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              >
                <option value="head-coach">Head Coach</option>
                <option value="interim">Interim</option>
                <option value="caretaker">Caretaker</option>
                <option value="assistant">Assistant</option>
              </select>
              <input
                type="date"
                value={assignStartDate}
                onChange={(e) => setAssignStartDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submittingAssign}
                className="px-4 py-2 rounded-lg bg-[#7ADBF0] hover:bg-[#95E4F5] text-[#050A12] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{submittingAssign ? 'Assigning...' : 'Confirm appointment'}</span>
              </button>
            </div>
          </form>
        )}

        {hasManager ? (
          <div className="flex flex-col sm:flex-row items-start gap-5">
            {/* Photo / Avatar */}
            {activeManager?.photo ? (
              <img
                src={activeManager.photo}
                alt={activeName}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl object-cover bg-[#121A2A] border border-white/10 light:border-slate-200 shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-[#121A2A] light:bg-slate-100 border border-white/10 light:border-slate-200 flex items-center justify-center font-display text-xl text-slate-200 light:text-slate-900 shrink-0">
                {initials}
              </div>
            )}

            <div className="flex-1 min-w-0 space-y-2.5">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  {activeManager ? (
                    <button
                      type="button"
                      onClick={() => openManagerProfile(activeManager.id)}
                      className="font-bold text-lg text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 transition-colors cursor-pointer text-left"
                    >
                      {activeName}
                    </button>
                  ) : (
                    <span className="font-bold text-lg text-white light:text-slate-900">
                      {activeName}
                    </span>
                  )}

                  {isVerified ? (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/12 border border-emerald-400/40 text-emerald-300 light:bg-emerald-50 light:text-emerald-700 font-mono text-[9px] font-bold tracking-wider uppercase inline-flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      <span>VERIFIED</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-400/35 text-amber-300 light:bg-amber-50 light:text-amber-700 font-mono text-[9px] font-bold tracking-wider uppercase inline-flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" />
                      <span>UNVERIFIED</span>
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-400 light:text-slate-500 mt-0.5">
                  {roleLabel} · {activeManager?.nationality || legacyProfile?.nationality || team.country}
                  {activeManager?.date_of_birth
                    ? ` · Born ${activeManager.date_of_birth}${
                        calculateAgeFromDob(activeManager.date_of_birth) !== null
                          ? ` (Age ${calculateAgeFromDob(activeManager.date_of_birth)})`
                          : ''
                      }`
                    : ''}
                  {appointedSince
                    ? ` · since ${appointedSince} (${formatTenureDuration(appointedSince)})`
                    : ''}
                </p>
              </div>

              {bioText ? (
                <p className="text-xs sm:text-sm text-slate-300 light:text-slate-700 leading-relaxed line-clamp-3">
                  {bioText}
                </p>
              ) : (
                <p className="text-xs text-slate-400 light:text-slate-500 italic">
                  No biography recorded yet for this manager.
                </p>
              )}

              <div className="flex items-center gap-4 pt-1 flex-wrap text-xs font-semibold">
                {activeManager && (
                  <button
                    type="button"
                    onClick={() => openManagerProfile(activeManager.id)}
                    className="text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 inline-flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Full profile</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </button>
                )}

                {canManage && activeManager && (
                  <button
                    type="button"
                    onClick={() => setIsEditDialogOpen(true)}
                    className="text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit record</span>
                  </button>
                )}

                {canManage && (
                  <button
                    type="button"
                    onClick={handleEndCurrent}
                    className="text-slate-300 light:text-slate-700 hover:text-rose-400 light:hover:text-rose-600 inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>End appointment</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-dashed border-white/10 light:border-slate-300 p-6 text-center space-y-3">
            <p className="text-sm font-semibold text-white light:text-slate-900">
              No manager recorded
            </p>
            <p className="text-xs text-slate-400 light:text-slate-600">
              The dugout seat at {team.name} is currently vacant.
            </p>
            {canManage && (
              <button
                type="button"
                onClick={() => {
                  if (managers.length === 0) setAssignMode('new');
                  setIsReplaceOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#95E4F5] text-[#050A12] text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Appoint a manager</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. Manager Records at [team] (Real telemetry only — no fabricated win rates) */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-sm text-white light:text-slate-900">
            Manager records at {team.name}
          </h3>
          <span className="font-mono text-[10px] tracking-[0.22em] text-slate-400 light:text-slate-500 uppercase">
            MATCHES · W-D-L · WIN % · TROPHIES
          </span>
        </div>

        {teamStats ? (
          <div className="grid grid-cols-2 landscape-mobile:grid-cols-6 sm:grid-cols-6 gap-3">
            {[
              ['MATCHES', teamStats.matchesPlayed],
              ['WINS', teamStats.wins],
              ['DRAWS', teamStats.draws],
              ['LOSSES', teamStats.losses],
              ['WIN %', `${teamStats.winPercentage.toFixed(1)}%`],
              ['TROPHIES', teamStats.trophiesWon],
            ].map(([lbl, num]) => (
              <div
                key={String(lbl)}
                className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/[0.06] light:border-slate-200 p-3 text-center"
              >
                <span className="block font-mono text-[9px] tracking-[0.18em] text-slate-400 uppercase">
                  {lbl}
                </span>
                <span className="font-display text-2xl text-white light:text-slate-900 tabular-nums mt-1 block">
                  {num}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 light:text-slate-500">
            {hasManager
              ? `No matches simulated under ${activeName} at ${team.name} yet.`
              : 'No match statistics recorded for the current dugout vacancy.'}
          </p>
        )}
      </div>

      {/* 3. Team Managerial History (Linked ManagerAppointments + Legacy Records) */}
      <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3">
        <h3 className="font-bold text-sm text-white light:text-slate-900">
          Managerial history at {team.name}
        </h3>

        {teamAppointments.length > 0 ? (
          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            {teamAppointments.map((appt) => (
              <div
                key={appt.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <button
                    type="button"
                    onClick={() => openManagerProfile(appt.manager_id)}
                    className="font-semibold text-white light:text-slate-900 hover:text-[#7ADBF0] light:hover:text-cyan-700 cursor-pointer"
                  >
                    {appt.manager_name}
                  </button>
                  <span className="text-slate-400 light:text-slate-500">
                    {formatManagerRoleLabel(appt.role)}
                  </span>
                  {appt.is_current && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 light:bg-emerald-50 light:text-emerald-700 font-mono text-[9px] font-bold uppercase">
                      CURRENT
                    </span>
                  )}
                </div>
                <span className="font-mono text-[11px] text-slate-400 light:text-slate-600 tabular-nums shrink-0">
                  {appt.start_date} → {appt.is_current ? 'Present' : appt.end_date || 'Ended'}
                </span>
              </div>
            ))}
          </div>
        ) : team.managerHistory && team.managerHistory.length > 0 ? (
          <div className="divide-y divide-white/[0.06] light:divide-slate-200">
            {team.managerHistory.map((h) => (
              <div
                key={h.id}
                className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs"
              >
                <div>
                  <span className="font-semibold text-white light:text-slate-900">{h.name}</span>
                  <span className="text-slate-400 light:text-slate-500 ml-2">{h.role}</span>
                </div>
                <span className="font-mono text-[11px] text-slate-400 light:text-slate-600 tabular-nums">
                  {h.startDate} → {h.endDate}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400 light:text-slate-500">
            No previous managerial departures recorded yet.
          </p>
        )}
      </div>

      {/* 4. Manager's Full Club & National Team Career Overview */}
      {activeManager && (
        <div className="rounded-2xl bg-[#0C131F] light:bg-white border border-white/[0.08] light:border-slate-200 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-white light:text-slate-900">
              {activeManager.name}&apos;s appointments across teams
            </h3>
            <span className="font-mono text-[10px] tracking-[0.18em] text-slate-400 uppercase">
              {managerCareerAppointments.length} POSTS
            </span>
          </div>

          <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {managerCareerAppointments.map((appt) => {
              const isCountry = appt.team_type === 'country';
              return (
                <button
                  key={appt.id}
                  type="button"
                  onClick={() => openTeamById(appt.team_id, 1)}
                  className={`text-left rounded-xl px-3.5 py-2.5 border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                    isCountry
                      ? 'bg-sky-500/[0.08] light:bg-sky-50 border-sky-400/30 light:border-sky-300'
                      : 'bg-[#080E18] light:bg-slate-50 border-white/[0.06] light:border-slate-200 hover:border-[#7ADBF0]/40'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {isCountry ? (
                      <Globe className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    ) : (
                      <Shield className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    )}
                    <div className="min-w-0">
                      <span className="font-semibold text-xs text-white light:text-slate-900 block truncate">
                        {appt.team_name}
                      </span>
                      <span className="text-[10px] text-slate-400 light:text-slate-500 block truncate">
                        {isCountry ? 'National team · ' : ''}
                        {formatManagerRoleLabel(appt.role)}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400 light:text-slate-600 tabular-nums shrink-0">
                    {appt.start_date.slice(0, 4)}–{appt.is_current ? 'Now' : appt.end_date?.slice(0, 4) || ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {isEditDialogOpen && activeManager && (
        <ManagerFormDialog
          mode="edit"
          initialManager={activeManager}
          isAdmin={canManage}
          onSave={(payload) => updateManagerRecord(activeManager.id, payload)}
          onClose={() => setIsEditDialogOpen(false)}
        />
      )}
    </div>
  );
};
