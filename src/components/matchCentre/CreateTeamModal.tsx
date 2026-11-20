import React, { useState, useEffect } from 'react';
import { useMatchCentre } from '../../context/MatchCentreContext';
import { Team, TeamType, ConfederationType, GenderType, Player, getPlayerDisplayName } from '../../types/matchCentre';
import { calculateDetailedRatings } from '../../data/teamsDatabase';
import { getCountryFlag } from '../../data/countryMetadata';
import { generateStrictStartingXi } from './dossier/dossierUtils';
import { X, Plus, Shield, Sparkles, Check, Building, User, Calendar, Compass } from 'lucide-react';

export const CreateTeamModal: React.FC = () => {
  const { isCreateModalOpen, editingTeam, closeCreateModal, saveTeam, openDossier } = useMatchCentre();

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<TeamType>('club');
  const [country, setCountry] = useState('England');
  const [league, setLeague] = useState('Premier League');
  const [confederation, setConfederation] = useState<ConfederationType>('UEFA');
  const [gender, setGender] = useState<GenderType>('men');
  const [stadium, setStadium] = useState('');
  const [stadiumCapacity, setStadiumCapacity] = useState(55000);
  const [foundedYear, setFoundedYear] = useState(1900);
  const [manager, setManager] = useState('');
  const [playingStyle, setPlayingStyle] = useState('Positional Possession');
  const [defaultFormation, setDefaultFormation] = useState('4-3-3');
  const [primaryColor, setPrimaryColor] = useState('#C5A059');
  const [secondaryColor, setSecondaryColor] = useState('#0B1528');
  const [crestUrl, setCrestUrl] = useState('');
  const [description, setDescription] = useState('');
  const [overallRating, setOverallRating] = useState(84);

  // Pre-fill if editing
  useEffect(() => {
    if (editingTeam) {
      setName(editingTeam.name);
      setShortName(editingTeam.shortName);
      setCode(editingTeam.code || editingTeam.shortName.slice(0, 3).toUpperCase());
      setType(editingTeam.type);
      setCountry(editingTeam.country);
      setLeague(editingTeam.league || 'Premier League');
      setConfederation(editingTeam.confederation || 'UEFA');
      setGender(editingTeam.gender);
      setStadium(editingTeam.stadium);
      setStadiumCapacity(editingTeam.stadiumCapacity || 55000);
      setFoundedYear(editingTeam.foundedYear);
      setManager(editingTeam.manager);
      setPlayingStyle(editingTeam.playingStyle);
      setDefaultFormation(editingTeam.defaultFormation);
      setPrimaryColor(editingTeam.primaryColor);
      setSecondaryColor(editingTeam.secondaryColor);
      setCrestUrl(editingTeam.crestUrl);
      setDescription(editingTeam.description || '');
      setOverallRating(editingTeam.overallRating);
    } else {
      setName('');
      setShortName('');
      setCode('');
      setType('club');
      setCountry('England');
      setLeague('Premier League');
      setConfederation('UEFA');
      setGender('men');
      setStadium('Metropolitan Park Arena');
      setStadiumCapacity(58000);
      setFoundedYear(1905);
      setManager('Julian Sterling');
      setPlayingStyle('High-Pressing Fluid Attack');
      setDefaultFormation('4-3-3');
      setPrimaryColor('#C5A059');
      setSecondaryColor('#0B1528');
      setCrestUrl('');
      setDescription('');
      setOverallRating(84);
    }
  }, [editingTeam, isCreateModalOpen]);

  if (!isCreateModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Do not invent fictional starter players: new clubs and national teams start empty
    // so verified players can be signed or called up without duplicating identities.
    const finalSquad: Player[] = editingTeam?.squad || [];
    const detailed = calculateDetailedRatings(finalSquad, overallRating);

    const teamPayload: Partial<Team> = {
      name: name.trim(),
      shortName: shortName.trim() || name.trim(),
      code: (code || name.slice(0, 3)).toUpperCase(),
      type,
      team_type: type === 'national' ? 'country' : 'club',
      country,
      flag: getCountryFlag(country),
      league: type === 'club' ? league : undefined,
      confederation: type === 'national' ? confederation : undefined,
      gender,
      overallRating: detailed.overallRating,
      attackRating: detailed.attackRating,
      midfieldRating: detailed.midfieldRating,
      defenceRating: detailed.defenceRating,
      stadium: stadium.trim() || 'Grand Arena',
      stadiumCapacity: Number(stadiumCapacity) || 50000,
      foundedYear: Number(foundedYear) || 1900,
      manager: manager.trim() || 'Head Coach',
      playingStyle,
      defaultFormation,
      primaryColor,
      secondaryColor,
      crestUrl: crestUrl.trim() || undefined,
      description: description.trim(),
      captainName: editingTeam?.captainName || getPlayerDisplayName(finalSquad.find((p) => p.isCaptain)) || undefined,
      preferredXiIds:
        editingTeam?.preferredXiSource === 'user-set' && editingTeam?.preferredXiIds
          ? editingTeam.preferredXiIds
          : generateStrictStartingXi(finalSquad, defaultFormation).map((p) => p.id),
      preferredXiSource: editingTeam?.preferredXiSource || 'estimated',
      squad: finalSquad,
    };

    const saved = saveTeam(teamPayload);
    if (saved) {
      openDossier(saved, 1);
    }
  };

  // Color preset swatches
  const colorPresets = [
    '#C5A059', '#38BDF8', '#10B981', '#A855F7', '#F43F5E',
    '#00529F', '#DC052D', '#034694', '#DA291C', '#1B5E20'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 landscape-mobile:p-3 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl relative my-auto max-h-[calc(100dvh-1.5rem)] flex flex-col text-left transition-colors">
        
        {/* Top Accent Strip */}
        <div className="h-[3px] w-full bg-gradient-to-r from-[#C5A059] via-[#38BDF8] to-[#10B981]" />

        {/* Header */}
        <div className="p-6 sm:p-8 landscape-mobile:p-4 bg-gradient-to-b from-[var(--bg-elevated)] to-[var(--bg-surface)] border-b border-[var(--border-color)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 landscape-mobile:w-10 landscape-mobile:h-10 rounded-2xl bg-[#C5A059]/15 border border-[#C5A059]/30 flex items-center justify-center text-[var(--accent-gold)] shrink-0">
              <Shield className="w-6 h-6 landscape-mobile:w-5 landscape-mobile:h-5" />
            </div>
            <div>
              <span className="eyebrow-mono text-[9px] font-bold text-[var(--accent-gold)] uppercase tracking-widest">
                DODAEONA F.C. TEAM ARCHITECT
              </span>
              <h2 className="font-display font-black text-2xl sm:text-3xl landscape-mobile:text-xl text-[var(--text-primary)] uppercase tracking-tight">
                {editingTeam
                  ? `EDIT ${editingTeam.shortName}`
                  : type === 'national'
                  ? 'REGISTER NATIONAL TEAM'
                  : 'CREATE NEW FOOTBALL CLUB'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={closeCreateModal}
            className="p-2 rounded-xl bg-[var(--bg-surface)] hover:bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 landscape-mobile:p-4 overflow-y-auto space-y-6 landscape-mobile:space-y-4 flex-1 text-xs">
          
          {/* Section 1: Basic Identity */}
          <div className="space-y-4 landscape-mobile:space-y-3">
            <span className="eyebrow-mono text-[10px] text-[var(--accent-gold)] uppercase font-black block border-b border-[var(--border-color)] pb-1.5">
              01. OFFICIAL IDENTITY &amp; CLASSIFICATION
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 landscape-mobile:grid-cols-3 gap-4 landscape-mobile:gap-3">
              <div className="sm:col-span-2 landscape-mobile:col-span-2">
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  {type === 'national' ? 'Full National Team Name *' : 'Full Club Name *'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={type === 'national' ? 'e.g. England' : 'e.g. Royal London Athletic'}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  3-Letter Code *
                </label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="RLA"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-gold)] font-mono font-bold uppercase"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 landscape-mobile:grid-cols-4 gap-4 landscape-mobile:gap-3">
              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Classification
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as TeamType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold cursor-pointer"
                >
                  <option value="club">Club</option>
                  <option value="national">National Team</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as GenderType)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold cursor-pointer"
                >
                  <option value="men">Men's</option>
                  <option value="women">Women's</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Country
                </label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium"
                />
              </div>

              {type === 'club' ? (
                <div>
                  <label className="font-bold text-[var(--text-primary)] block mb-1">
                    League
                  </label>
                  <input
                    type="text"
                    value={league}
                    onChange={(e) => setLeague(e.target.value)}
                    placeholder="Premier League"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium"
                  />
                </div>
              ) : (
                <div>
                  <label className="font-bold text-[var(--text-primary)] block mb-1">
                    Confederation
                  </label>
                  <select
                    value={confederation}
                    onChange={(e) => setConfederation(e.target.value as ConfederationType)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold cursor-pointer"
                  >
                    <option value="UEFA">UEFA</option>
                    <option value="CONMEBOL">CONMEBOL</option>
                    <option value="CONCACAF">CONCACAF</option>
                    <option value="CAF">CAF</option>
                    <option value="AFC">AFC</option>
                    <option value="OFC">OFC</option>
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  World-Calibrated Overall Rating (1-99)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={50}
                    max={99}
                    value={overallRating}
                    onChange={(e) => setOverallRating(Math.max(50, Math.min(99, Number(e.target.value) || 50)))}
                    className="w-24 px-3.5 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] font-mono font-bold text-base text-[var(--accent-cyan)] tabular-nums"
                  />
                  <span className="text-[11px] text-[var(--text-muted)]">
                    Attack, midfield, and defence calibrate proportionally around this rating.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Colors & Crest */}
          <div className="space-y-4">
            <span className="eyebrow-mono text-[10px] text-[var(--accent-gold)] uppercase font-black block border-b border-[var(--border-color)] pb-1.5">
              02. CLUB CREST &amp; KIT COLORS
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 landscape-mobile:grid-cols-2 gap-4 landscape-mobile:gap-3">
              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Primary Crest / Kit Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] font-mono uppercase text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {colorPresets.slice(0, 5).map((c) => (
                    <button
                      key={`p-${c}`}
                      type="button"
                      onClick={() => setPrimaryColor(c)}
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Secondary Crest / Kit Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded-xl bg-transparent border-0 cursor-pointer shrink-0"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] font-mono uppercase text-xs"
                  />
                </div>
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {colorPresets.slice(5, 10).map((c) => (
                    <button
                      key={`s-${c}`}
                      type="button"
                      onClick={() => setSecondaryColor(c)}
                      className="w-5 h-5 rounded-full border border-white/20 shadow-sm transition-transform hover:scale-110 cursor-pointer"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Crest URL + Live Two-Color Background Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 landscape-mobile:grid-cols-3 gap-4 landscape-mobile:gap-3 items-end">
              <div className="sm:col-span-2 landscape-mobile:col-span-2 space-y-2">
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Crest Image URL or Device File
                </label>
                <input
                  type="url"
                  value={crestUrl}
                  onChange={(e) => setCrestUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono text-[11px]"
                />
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (event) => {
                      const result = event.target?.result as string;
                      if (result) setCrestUrl(result);
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="block w-full text-xs text-[var(--text-secondary)] file:mr-3 file:py-1 file:px-2.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--accent-cyan)]/20 file:text-[var(--accent-cyan)] hover:file:bg-[var(--accent-cyan)]/30 cursor-pointer"
                />
              </div>

              <div
                className="h-11 rounded-xl border border-white/15 flex items-center justify-center px-3 font-mono text-[10px] font-bold uppercase tracking-widest text-white shadow-inner"
                style={{
                  backgroundImage: `linear-gradient(125deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                  textShadow: '0 1px 4px rgba(0,0,0,0.75)',
                }}
              >
                Crest Duo Preview
              </div>
            </div>
          </div>

          {/* Section 3: Football Configuration */}
          <div className="space-y-4">
            <span className="eyebrow-mono text-[10px] text-[var(--accent-gold)] uppercase font-black block border-b border-[var(--border-color)] pb-1.5">
              03. TACTICS, MANAGER & HOME GROUND
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-3 landscape-mobile:grid-cols-3 gap-4 landscape-mobile:gap-3">
              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Manager / Head Coach
                </label>
                <input
                  type="text"
                  value={manager}
                  onChange={(e) => setManager(e.target.value)}
                  placeholder="Julian Sterling"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Default Formation
                </label>
                <select
                  value={defaultFormation}
                  onChange={(e) => setDefaultFormation(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono font-bold cursor-pointer"
                >
                  <option value="4-3-3">4-3-3 (Possession Triangle)</option>
                  <option value="4-2-3-1">4-2-3-1 (Double Pivot)</option>
                  <option value="4-4-2">4-4-2 (Classic Two Banks)</option>
                  <option value="4-1-4-1">4-1-4-1 (Single Pivot Block)</option>
                  <option value="4-3-2-1">4-3-2-1 (Christmas Tree)</option>
                  <option value="3-4-3">3-4-3 (Wide Overload)</option>
                  <option value="3-5-2">3-5-2 (Wingback Control)</option>
                  <option value="3-4-2-1">3-4-2-1 (Three CB Attack)</option>
                  <option value="5-3-2">5-3-2 (Compact Back Five)</option>
                  <option value="5-4-1">5-4-1 (Low Block Defensive)</option>
                  <option value="4-2-2-2">4-2-2-2 (Vertical Box)</option>
                  <option value="4-3-1-2">4-3-1-2 (Diamond Midfield)</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Playing Philosophy
                </label>
                <select
                  value={playingStyle}
                  onChange={(e) => setPlayingStyle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold cursor-pointer"
                >
                  <option value="Positional Possession">Positional Possession</option>
                  <option value="High-Pressing Fluid Attack">High-Pressing Fluid Attack</option>
                  <option value="Counter-Attacking Direct">Counter-Attacking Direct</option>
                  <option value="Low Block & Counter">Low Block & Counter</option>
                  <option value="Wing Play & Crosses">Wing Play & Crosses</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 landscape-mobile:grid-cols-3 gap-4 landscape-mobile:gap-3">
              <div className="sm:col-span-2 landscape-mobile:col-span-2">
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Home Stadium
                </label>
                <input
                  type="text"
                  value={stadium}
                  onChange={(e) => setStadium(e.target.value)}
                  placeholder="Metropolitan Arena"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-[var(--text-primary)] block mb-1">
                  Capacity
                </label>
                <input
                  type="number"
                  value={stadiumCapacity}
                  onChange={(e) => setStadiumCapacity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--text-primary)] font-mono font-medium"
                />
              </div>
            </div>
          </div>

          {/* Submit Footer */}
          <div className="pt-4 border-t border-[var(--border-color)] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={closeCreateModal}
              className="px-5 py-2.5 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] text-xs font-bold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#C5A059] to-[#E5C384] text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(197,160,89,0.4)] hover:scale-[1.02] cursor-pointer"
            >
              {editingTeam ? 'SAVE CHANGES' : 'CREATE & REGISTER TEAM'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
