import React, { useState } from 'react';
import { Check, ShieldCheck, Upload, X } from 'lucide-react';
import {
  calculateAgeFromDob,
  createEmptyPhilosophy,
  Manager,
  ManagerPhilosophy,
  ManagerStatus,
  parsePhilosophyJson,
  serializePhilosophyJson,
} from '../../../types/manager';
import { FORMATION_TEMPLATES } from '../dossier/dossierUtils';

interface ManagerFormDialogProps {
  mode: 'create' | 'edit';
  initialManager?: Manager | null;
  isAdmin: boolean;
  onSave: (payload: Record<string, any>) => Promise<{ ok: boolean; error?: string }>;
  onClose: () => void;
}

const FORMATION_OPTIONS = Object.keys(FORMATION_TEMPLATES);

export const ManagerFormDialog: React.FC<ManagerFormDialogProps> = ({
  mode,
  initialManager,
  isAdmin,
  onSave,
  onClose,
}) => {
  const [name, setName] = useState(initialManager?.name || '');
  const [nationality, setNationality] = useState(initialManager?.nationality || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialManager?.date_of_birth || '');
  const [photo, setPhoto] = useState(initialManager?.photo || '');
  const [preferredFormation, setPreferredFormation] = useState(
    initialManager?.preferred_formation || '4-3-3'
  );
  const [tacticalStyle, setTacticalStyle] = useState(initialManager?.tactical_style || '');
  const [playingBackground, setPlayingBackground] = useState(
    initialManager?.playing_background || ''
  );
  const [status, setStatus] = useState<ManagerStatus>(initialManager?.status || 'unattached');
  const [bio, setBio] = useState(initialManager?.bio || '');
  const [honoursText, setHonoursText] = useState((initialManager?.honours || []).join('\n'));
  const [verified, setVerified] = useState<boolean>(
    isAdmin ? Boolean(initialManager?.verified ?? true) : false
  );

  const [philosophy, setPhilosophy] = useState<ManagerPhilosophy>(() =>
    initialManager?.philosophy_json
      ? parsePhilosophyJson(initialManager.philosophy_json)
      : createEmptyPhilosophy()
  );

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const derivedAge = calculateAgeFromDob(dateOfBirth);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result;
      if (typeof result === 'string') setPhoto(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Manager name is required.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const honours = honoursText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      nationality: nationality.trim(),
      date_of_birth: dateOfBirth.trim(),
      photo: photo.trim(),
      preferred_formation: preferredFormation.trim(),
      tactical_style: tacticalStyle.trim(),
      philosophy_json: serializePhilosophyJson(philosophy),
      playing_background: playingBackground.trim(),
      bio: bio.trim(),
      honours,
      status,
      verified: isAdmin ? verified : false,
    };

    const res = await onSave(payload);
    setSubmitting(false);
    if (!res.ok) {
      setErrorMsg(res.error || 'Failed to save manager record.');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 landscape-mobile:p-2">
      <div className="w-full max-w-3xl rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 shadow-2xl my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 landscape-mobile:px-4 landscape-mobile:py-2.5 border-b border-white/10 light:border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <div>
            <span className="block font-mono text-[10px] tracking-[0.2em] uppercase text-[#7ADBF0] light:text-cyan-700 font-bold">
              {mode === 'create' ? 'NEW PERMANENT RECORD' : 'EDIT PERMANENT RECORD'}
            </span>
            <h2 className="font-bold text-lg landscape-mobile:text-base text-white light:text-slate-900">
              {mode === 'create' ? 'Add manager to directory' : `Edit ${initialManager?.name}`}
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

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 landscape-mobile:p-4 space-y-5 landscape-mobile:space-y-3.5">
          {errorMsg && (
            <div className="px-4 py-2.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 light:text-rose-800">
              {errorMsg}
            </div>
          )}

          {/* Core Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Full name *
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pep Guardiola"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Nationality
              </span>
              <input
                type="text"
                value={nationality}
                onChange={(e) => setNationality(e.target.value)}
                placeholder="e.g. Spain"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 flex items-center justify-between gap-2">
                <span>Date of birth</span>
                <span className="text-[#7ADBF0] light:text-cyan-700 font-bold">
                  {derivedAge !== null ? `Age ${derivedAge}` : 'Age unrecorded'}
                </span>
              </span>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Status
              </span>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ManagerStatus)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900"
              >
                <option value="active">Active</option>
                <option value="unattached">Unattached</option>
                <option value="retired">Retired</option>
              </select>
            </label>
          </div>

          {/* Photo + Playing Background */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Portrait photo URL or upload
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={photo}
                  onChange={(e) => setPhoto(e.target.value)}
                  placeholder="https://..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
                <label className="px-3 py-2 rounded-xl bg-white/[0.06] light:bg-slate-100 hover:bg-white/[0.1] border border-white/10 light:border-slate-300 text-xs font-semibold text-slate-200 light:text-slate-800 cursor-pointer inline-flex items-center gap-1.5 shrink-0">
                  <Upload className="w-3.5 h-3.5" />
                  <span>File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Playing background
              </span>
              <input
                type="text"
                value={playingBackground}
                onChange={(e) => setPlayingBackground(e.target.value)}
                placeholder="e.g. Former defensive midfielder (Barcelona, Brescia)"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900"
              />
            </label>
          </div>

          {/* Tactical Identity */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Preferred starting formation
              </span>
              <select
                value={preferredFormation}
                onChange={(e) => setPreferredFormation(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900"
              >
                {FORMATION_OPTIONS.map((fmt) => (
                  <option key={fmt} value={fmt}>
                    {fmt}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Tactical style summary
              </span>
              <input
                type="text"
                value={tacticalStyle}
                onChange={(e) => setTacticalStyle(e.target.value)}
                placeholder="e.g. Juego de Posición · High-press possession"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs sm:text-sm text-white light:text-slate-900"
              />
            </label>
          </div>

          {/* Structured 5-Category Tactical Philosophy */}
          <div className="rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-200 p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-[#7ADBF0] light:text-cyan-700 font-bold">
                TACTICAL PHILOSOPHY (5 CATEGORIES)
              </span>
              <span className="text-[11px] text-slate-400 light:text-slate-600">
                Drives match simulation engine modifiers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <label className="space-y-1 block">
                <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                  1. Possession &amp; Passing
                </span>
                <textarea
                  rows={2}
                  value={philosophy.possession_passing}
                  onChange={(e) =>
                    setPhilosophy((p) => ({ ...p, possession_passing: e.target.value }))
                  }
                  placeholder="Build-up principles, third-man runs, passing tempo..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                  2. Pressing
                </span>
                <textarea
                  rows={2}
                  value={philosophy.pressing}
                  onChange={(e) => setPhilosophy((p) => ({ ...p, pressing: e.target.value }))}
                  placeholder="Counter-pressing triggers, press traps, intensity..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                  3. Defensive Structure
                </span>
                <textarea
                  rows={2}
                  value={philosophy.defensive_structure}
                  onChange={(e) =>
                    setPhilosophy((p) => ({ ...p, defensive_structure: e.target.value }))
                  }
                  placeholder="Rest-defence shape, line height, compactness..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </label>

              <label className="space-y-1 block">
                <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                  4. Attacking Approach
                </span>
                <textarea
                  rows={2}
                  value={philosophy.attacking_approach}
                  onChange={(e) =>
                    setPhilosophy((p) => ({ ...p, attacking_approach: e.target.value }))
                  }
                  placeholder="Half-space overloads, box occupation, transition speed..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </label>

              <label className="space-y-1 block sm:col-span-2">
                <span className="text-xs font-semibold text-slate-200 light:text-slate-800 block">
                  5. Tactical Flexibility
                </span>
                <textarea
                  rows={2}
                  value={philosophy.tactical_flexibility}
                  onChange={(e) =>
                    setPhilosophy((p) => ({ ...p, tactical_flexibility: e.target.value }))
                  }
                  placeholder="In-game shape shifts, late chasing adjustments, opposition adaptation..."
                  className="w-full px-3 py-2 rounded-lg bg-[#0C131F] light:bg-white border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
                />
              </label>
            </div>

            {/* Numeric Sliders */}
            <div className="grid grid-cols-1 sm:grid-cols-5 landscape-mobile:grid-cols-5 gap-3 pt-2 border-t border-white/[0.08] light:border-slate-200">
              {(
                [
                  ['possession_index', 'Possession'],
                  ['pressing_index', 'Pressing'],
                  ['defensive_line_index', 'Def. Line'],
                  ['attacking_boldness_index', 'Boldness'],
                  ['flexibility_index', 'Flexibility'],
                ] as Array<[keyof ManagerPhilosophy, string]>
              ).map(([field, label]) => {
                const val = Number(philosophy[field] ?? 55);
                return (
                  <label key={field} className="space-y-1 block">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-slate-400 light:text-slate-600 uppercase">{label}</span>
                      <span className="text-[#7ADBF0] light:text-cyan-700 font-bold tabular-nums">
                        {val}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={15}
                      max={95}
                      value={val}
                      onChange={(e) =>
                        setPhilosophy((p) => ({ ...p, [field]: Number(e.target.value) }))
                      }
                      className="w-full accent-[#7ADBF0]"
                    />
                  </label>
                );
              })}
            </div>
          </div>

          {/* Biography & Honours */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Biography
              </span>
              <textarea
                rows={4}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Verified career summary, coaching credentials, milestones..."
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </label>

            <label className="space-y-1.5 block">
              <span className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 block">
                Major honours (one per line or comma-separated)
              </span>
              <textarea
                rows={4}
                value={honoursText}
                onChange={(e) => setHonoursText(e.target.value)}
                placeholder="UEFA Champions League (2011, 2023)&#10;Premier League (6x)"
                className="w-full px-3.5 py-2 rounded-xl bg-[#080E18] light:bg-slate-50 border border-white/10 light:border-slate-300 text-xs text-white light:text-slate-900"
              />
            </label>
          </div>

          {/* Admin-only Verification Toggle */}
          {isAdmin ? (
            <label className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/25 cursor-pointer">
              <input
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
                className="accent-emerald-400 w-4 h-4"
              />
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="text-xs">
                <span className="font-semibold text-white light:text-slate-900 block">
                  Mark manager record as verified
                </span>
                <span className="text-slate-400 light:text-slate-600">
                  Verified fields cannot be overwritten by automatic enrichment runs.
                </span>
              </div>
            </label>
          ) : (
            <p className="text-[11px] text-slate-400 light:text-slate-600">
              Community-submitted managers are saved as unverified until reviewed by an administrator.
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10 light:border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 hover:text-white light:hover:text-slate-950 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-[#7ADBF0] hover:bg-[#95E4F5] text-[#050A12] font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {submitting
                  ? 'Saving...'
                  : mode === 'create'
                  ? 'Create Manager'
                  : 'Save Changes'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
