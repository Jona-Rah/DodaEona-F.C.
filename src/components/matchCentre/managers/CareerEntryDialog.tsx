import React, { useDeferredValue, useMemo, useState } from 'react';
import { Check, Globe, Info, Search, Shield, X } from 'lucide-react';
import {
  Manager,
  ManagerAppointment,
  ManagerAppointmentRole,
} from '../../../types/manager';
import { Team, getTeamType } from '../../../types/matchCentre';
import { filterTeamsFast } from '../../../utils/globalDatabaseSearch';

interface CareerEntryDialogProps {
  manager: Manager;
  existingAppointments: ManagerAppointment[];
  teams: Team[];
  onAssignCurrent: (params: {
    manager_id: string;
    team_id: string;
    role: ManagerAppointmentRole;
    start_date: string;
    competitions: string[];
    honours: string[];
    notes: string;
    verified: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onAddHistorical: (
    managerId: string,
    payload: {
      team_id: string;
      role: ManagerAppointmentRole;
      start_date: string;
      end_date: string | null;
      is_current: false;
      competitions: string[];
      honours: string[];
      notes: string;
      verified: boolean;
    }
  ) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

export const CareerEntryDialog: React.FC<CareerEntryDialogProps> = ({
  manager,
  existingAppointments,
  teams,
  onAssignCurrent,
  onAddHistorical,
  onClose,
}) => {
  const [teamSearch, setTeamSearch] = useState('');
  const deferredTeamSearch = useDeferredValue(teamSearch);
  const [teamFilter, setTeamFilter] = useState<'all' | 'club' | 'country'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [role, setRole] = useState<ManagerAppointmentRole>('head-coach');
  const [startDate, setStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState<string>('');
  const [isCurrent, setIsCurrent] = useState<boolean>(true);
  const [competitionsText, setCompetitionsText] = useState<string>('');
  const [honoursText, setHonoursText] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [verified, setVerified] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const selectedTeam = useMemo(
    () => teams.find((t) => t.id === selectedTeamId) || null,
    [teams, selectedTeamId]
  );

  const filteredTeams = useMemo(() => {
    return filterTeamsFast(
      teams,
      deferredTeamSearch,
      (t) => teamFilter === 'all' || getTeamType(t) === teamFilter,
      60
    );
  }, [teams, deferredTeamSearch, teamFilter]);

  const conflictingCurrentAppt = useMemo(() => {
    if (!isCurrent || !selectedTeam) return null;
    const selectedType = getTeamType(selectedTeam);
    return (
      existingAppointments.find(
        (a) => a.is_current && a.team_type === selectedType && a.team_id !== selectedTeam.id
      ) || null
    );
  }, [isCurrent, selectedTeam, existingAppointments]);

  const handleSelectTeam = (team: Team) => {
    setSelectedTeamId(team.id);
    if (!competitionsText.trim()) {
      const defaultComp =
        getTeamType(team) === 'country'
          ? team.confederation || 'International'
          : team.league || '';
      if (defaultComp) setCompetitionsText(defaultComp);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setErrorMsg('Please select a club or national team.');
      return;
    }
    if (!startDate.trim()) {
      setErrorMsg('Start date is required.');
      return;
    }
    if (!isCurrent && !endDate.trim()) {
      setErrorMsg('End date is required for former appointments.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const competitions = competitionsText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    const honours = honoursText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const res = isCurrent
      ? await onAssignCurrent({
          manager_id: manager.id,
          team_id: selectedTeamId,
          role,
          start_date: startDate.trim(),
          competitions,
          honours,
          notes: notes.trim(),
          verified,
        })
      : await onAddHistorical(manager.id, {
          team_id: selectedTeamId,
          role,
          start_date: startDate.trim(),
          end_date: endDate.trim() || null,
          is_current: false,
          competitions,
          honours,
          notes: notes.trim(),
          verified,
        });

    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Failed to record appointment.');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 landscape-mobile:p-2">
      <div className="w-full max-w-2xl rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 shadow-2xl my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden">
        <div className="px-6 py-4 landscape-mobile:px-4 landscape-mobile:py-2.5 border-b border-white/10 light:border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#7ADBF0] light:text-cyan-700 font-bold">
              MANAGER APPOINTMENT LEDGER
            </span>
            <h2 className="font-bold text-lg landscape-mobile:text-base text-white light:text-slate-900">
              Add appointment for {manager.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 landscape-mobile:p-4 space-y-4 landscape-mobile:space-y-3">
          {errorMsg && (
            <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 light:text-rose-800">
              {errorMsg}
            </div>
          )}

          {/* Team Selector */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600">
                Select team ({teams.length} clubs &amp; national teams) *
              </span>
              <div className="flex items-center gap-1">
                {(['all', 'club', 'country'] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setTeamFilter(f)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold uppercase cursor-pointer border ${
                      teamFilter === f
                        ? 'bg-[#7ADBF0]/20 border-[#7ADBF0]/60 text-[#7ADBF0] light:bg-cyan-50 light:border-cyan-500 light:text-cyan-800'
                        : 'bg-[#080E18] light:bg-slate-100 border-white/10 light:border-slate-200 text-slate-400 light:text-slate-600'
                    }`}
                  >
                    {f === 'all' ? 'All' : f === 'club' ? 'Clubs' : 'National'}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && teamSearch.trim() && filteredTeams.length > 0) {
                    e.preventDefault();
                    handleSelectTeam(filteredTeams[0]);
                  }
                }}
                placeholder="Search club or national team..."
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
              />
              {teamSearch && (
                <button
                  type="button"
                  onClick={() => setTeamSearch('')}
                  className="p-0.5 text-slate-400 hover:text-white light:hover:text-slate-900 absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label="Clear team search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="max-h-44 landscape-mobile:max-h-32 overflow-y-auto rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-200 divide-y divide-white/[0.06] light:divide-slate-200">
              {filteredTeams.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">
                  No teams match your search.
                </div>
              ) : (
                filteredTeams.map((team) => {
                  const isCountry = getTeamType(team) === 'country';
                  const isSelected = team.id === selectedTeamId;
                  return (
                    <button
                      key={team.id}
                      type="button"
                      onClick={() => handleSelectTeam(team)}
                      className={`w-full text-left px-3 py-2 flex items-center justify-between gap-2 text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[#7ADBF0]/15 light:bg-cyan-50'
                          : 'hover:bg-white/[0.04] light:hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {team.crestUrl ? (
                          <img
                            src={team.crestUrl}
                            alt={team.shortName}
                            referrerPolicy="no-referrer"
                            className="w-5 h-5 object-contain shrink-0"
                          />
                        ) : isCountry ? (
                          <Globe className="w-4 h-4 text-sky-400 shrink-0" />
                        ) : (
                          <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <span className="font-semibold text-white light:text-slate-900 block truncate">
                            {team.name}
                          </span>
                          <span className="text-[10px] text-slate-400 light:text-slate-600 block truncate">
                            {team.country} · {isCountry ? team.confederation : team.league || 'Club'}
                          </span>
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase shrink-0 ${
                          isCountry
                            ? 'bg-sky-500/20 text-sky-300 light:bg-sky-100 light:text-sky-800'
                            : 'bg-white/10 text-slate-300 light:bg-slate-200 light:text-slate-700'
                        }`}
                      >
                        {isCountry ? 'NATIONAL' : 'CLUB'}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Current checkbox & simultaneous job safeguard notice */}
          <div className="space-y-2">
            <label className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={isCurrent}
                onChange={(e) => setIsCurrent(e.target.checked)}
                className="accent-[#7ADBF0] w-4 h-4"
              />
              <div className="text-xs">
                <span className="font-semibold text-white light:text-slate-900 block">
                  Current active appointment
                </span>
                <span className="text-slate-400 light:text-slate-600">
                  Syncs {manager.name} onto the team&apos;s dossier and match simulator via assignManager.
                </span>
              </div>
            </label>

            {conflictingCurrentAppt && (
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-500/12 border border-amber-400/35 text-xs text-amber-200 light:text-amber-800 flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  Assigning as current {conflictingCurrentAppt.team_type === 'country' ? 'national team' : 'club'} manager will automatically close their previous active{' '}
                  {conflictingCurrentAppt.team_type === 'country' ? 'national team' : 'club'} post at{' '}
                  <strong>{conflictingCurrentAppt.team_name}</strong> while preserving any simultaneous{' '}
                  {conflictingCurrentAppt.team_type === 'country' ? 'club' : 'national team'} appointment.
                </span>
              </div>
            )}
          </div>

          {/* Role & Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 landscape-mobile:grid-cols-3 gap-3">
            <label className="space-y-1 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Role
              </span>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as ManagerAppointmentRole)}
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              >
                <option value="head-coach">Head Coach</option>
                <option value="interim">Interim</option>
                <option value="caretaker">Caretaker</option>
                <option value="assistant">Assistant</option>
              </select>
            </label>

            <label className="space-y-1 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Start date *
              </span>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </label>

            {!isCurrent && (
              <label className="space-y-1 block">
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                  End date *
                </span>
                <input
                  type="date"
                  required={!isCurrent}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </label>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 landscape-mobile:grid-cols-2 gap-3">
            <label className="space-y-1 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Competitions (comma-separated)
              </span>
              <input
                type="text"
                value={competitionsText}
                onChange={(e) => setCompetitionsText(e.target.value)}
                placeholder="Premier League, UEFA Champions League"
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </label>

            <label className="space-y-1 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Honours won during tenure
              </span>
              <input
                type="text"
                value={honoursText}
                onChange={(e) => setHonoursText(e.target.value)}
                placeholder="League Title (2024), Domestic Cup (2025)"
                className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
              Notes
            </span>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contract details, departure context, tactical milestone..."
              className="w-full px-3 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
            />
          </label>

          <label className="flex items-center gap-2 text-xs text-slate-300 light:text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={verified}
              onChange={(e) => setVerified(e.target.checked)}
              className="accent-emerald-400 w-4 h-4"
            />
            <span>Verified appointment record</span>
          </label>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10 light:border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedTeamId}
              className="px-5 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#95E4F5] text-[#050A12] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving...' : 'Confirm Appointment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
