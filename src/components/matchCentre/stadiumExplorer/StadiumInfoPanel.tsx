import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Users,
  Compass,
  ExternalLink,
  Eye,
  Calendar,
  Layers,
  Shield,
  ChevronRight,
  Navigation,
  CheckCircle2,
} from 'lucide-react';
import { StadiumRecord } from '../../../data/stadiumsDatabase';
import { useMatchCentre } from '../../../context/MatchCentreContext';

const REAL_STADIUM_FALLBACK_IMG =
  'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ad/Camp_Nou_aerial.jpg/1280px-Camp_Nou_aerial.jpg';

interface StadiumInfoPanelProps {
  stadium: StadiumRecord | null;
  coLocatedClubs?: StadiumRecord[];
  onSelectClub?: (stadium: StadiumRecord) => void;
  onClose: () => void;
}

export const StadiumInfoPanel: React.FC<StadiumInfoPanelProps> = ({
  stadium,
  coLocatedClubs,
  onSelectClub,
  onClose,
}) => {
  const { openTeamById } = useMatchCentre();
  const [bannerSrc, setBannerSrc] = useState<string>(
    stadium?.imageUrl || REAL_STADIUM_FALLBACK_IMG
  );
  const [crestSrc, setCrestSrc] = useState<string>(
    stadium?.clubCrestUrl || stadium?.fallbackCrestUrl || ''
  );

  useEffect(() => {
    if (!stadium) return;
    let isActive = true;
    setBannerSrc(stadium.imageUrl || REAL_STADIUM_FALLBACK_IMG);
    setCrestSrc(stadium.clubCrestUrl || stadium.fallbackCrestUrl);

    const params = new URLSearchParams({
      stadium: stadium.name,
      club: stadium.clubName,
      city: stadium.city,
      country: stadium.country,
    });
    fetch(`/api/stadiums/photo?${params.toString()}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isActive) return;
        if (typeof data?.photoUrl === 'string' && data.photoUrl) {
          setBannerSrc(data.photoUrl);
        }
      })
      .catch(() => {
        // Keep existing real stadium photo fallback
      });

    return () => {
      isActive = false;
    };
  }, [stadium]);

  if (!stadium) return null;

  const handleOpenDossier = () => {
    openTeamById(stadium.clubId);
  };

  const coTenants =
    coLocatedClubs && coLocatedClubs.length > 1
      ? coLocatedClubs.filter((c) => c.id !== stadium.id)
      : [];

  return (
    <div className="rounded-2xl bg-[#070F1B]/95 light:bg-white backdrop-blur-xl border border-white/15 light:border-slate-300 shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
      {/* Stadium Photo Banner */}
      <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-900 shrink-0">
        <img
          src={bannerSrc}
          alt={stadium.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
          onError={() => {
            if (bannerSrc !== REAL_STADIUM_FALLBACK_IMG) {
              setBannerSrc(REAL_STADIUM_FALLBACK_IMG);
            }
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#070F1B] via-black/45 to-black/15 light:from-white light:via-black/20 light:to-black/10" />

        {/* Top Floating Bar */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/20 text-white text-[11px] font-mono">
            <span>{stadium.flagEmoji}</span>
            <span>{stadium.country}</span>
            <span className="text-white/40">·</span>
            <span>{stadium.city}</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-black/70 hover:bg-black/90 text-white/90 hover:text-white border border-white/20 backdrop-blur-md transition-colors cursor-pointer"
            aria-label="Close stadium details"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Club Crest Floating Emblem */}
        <div className="absolute bottom-3 left-5 flex items-end gap-3 z-10">
          <div
            className="w-14 h-14 rounded-xl p-2 bg-[#0B1525] light:bg-white border-2 border-white/25 light:border-slate-300 shadow-xl flex items-center justify-center shrink-0"
            style={{
              boxShadow: `0 8px 24px ${stadium.primaryColor}33`,
            }}
          >
            <img
              src={crestSrc}
              alt={stadium.clubName}
              referrerPolicy="no-referrer"
              onError={() => {
                if (crestSrc !== stadium.fallbackCrestUrl) {
                  setCrestSrc(stadium.fallbackCrestUrl);
                }
              }}
              className="w-full h-full object-contain"
            />
          </div>
          <div className="pb-1">
            <span
              className="inline-block px-2 py-0.5 rounded text-[10px] font-mono tracking-wider uppercase text-white shadow-sm"
              style={{ backgroundColor: stadium.primaryColor }}
            >
              {stadium.clubCode}
            </span>
          </div>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto">
        {/* Title & Clean Typographic Metadata Line */}
        <div>
          <div className="flex items-center gap-2 flex-wrap font-mono text-[11px] uppercase tracking-wider">
            <span className="text-[#7ADBF0] light:text-cyan-700">{stadium.league}</span>
            <span className="text-slate-500 light:text-slate-400">·</span>
            <span
              className={
                stadium.gender === 'women'
                  ? 'text-rose-300 light:text-rose-700'
                  : 'text-sky-300 light:text-sky-700'
              }
            >
              {stadium.gender === 'women' ? "Women's Football" : "Men's Football"}
            </span>
            <span className="text-slate-500 light:text-slate-400">·</span>
            {stadium.isVerifiedStadium ? (
              <span className="inline-flex items-center gap-1 text-emerald-300 light:text-emerald-700">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Ground</span>
              </span>
            ) : (
              <span className="text-slate-400 light:text-slate-600">City Hub Pin</span>
            )}
          </div>

          <h2 className="font-display text-2xl sm:text-3xl text-white light:text-slate-900 tracking-wide mt-1.5 leading-tight">
            {stadium.name}
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 light:text-slate-700 mt-1 flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700 shrink-0" />
            <span>
              Home of <span className="text-white light:text-slate-950">{stadium.clubName}</span>
            </span>
          </p>
        </div>

        {/* Co-located / Shared Ground Switcher */}
        {coTenants.length > 0 && onSelectClub && (
          <div className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-50 border border-white/10 light:border-slate-200 space-y-2">
            <div className="font-mono text-[10px] uppercase tracking-wider text-slate-400 light:text-slate-600 flex items-center justify-between">
              <span>
                {stadium.isVerifiedStadium ? 'Groundshare / Co-tenants' : 'Other Clubs in Region'}
              </span>
              <span className="tabular-nums">{coTenants.length} more</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
              {coTenants.map((tenant) => (
                <button
                  key={tenant.id}
                  type="button"
                  onClick={() => onSelectClub(tenant)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.06] light:bg-white hover:bg-white/15 light:hover:bg-cyan-50 border border-white/10 light:border-slate-300 text-[11px] text-slate-200 light:text-slate-800 transition-colors cursor-pointer"
                >
                  <img
                    src={tenant.clubCrestUrl}
                    alt={tenant.clubShortName}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      if (e.currentTarget.dataset.fallbackApplied === '1') return;
                      e.currentTarget.dataset.fallbackApplied = '1';
                      e.currentTarget.src = tenant.fallbackCrestUrl;
                    }}
                    className="w-4 h-4 object-contain shrink-0"
                  />
                  <span className="truncate max-w-[140px]">{tenant.clubShortName}</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      tenant.gender === 'women' ? 'bg-rose-500' : 'bg-sky-500'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Stadium Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-50 border border-white/10 light:border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/15 light:bg-cyan-100 text-[#7ADBF0] light:text-cyan-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase tracking-wider">
                Capacity
              </span>
              <span className="block font-display text-lg text-white light:text-slate-900 tabular-nums leading-none mt-0.5">
                {stadium.capacity.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-50 border border-white/10 light:border-slate-200 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 light:bg-amber-100 text-amber-400 light:text-amber-700 flex items-center justify-center shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="block font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase tracking-wider">
                Location
              </span>
              <span className="block text-xs text-white light:text-slate-900 truncate mt-0.5">
                {stadium.city}, {stadium.country}
              </span>
            </div>
          </div>

          {stadium.yearOpened && (
            <div className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-50 border border-white/10 light:border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/15 light:bg-emerald-100 text-emerald-400 light:text-emerald-700 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase tracking-wider">
                  Opened
                </span>
                <span className="block font-display text-lg text-white light:text-slate-900 tabular-nums leading-none mt-0.5">
                  {stadium.yearOpened}
                </span>
              </div>
            </div>
          )}

          {stadium.surface && (
            <div className="p-3 rounded-xl bg-white/[0.04] light:bg-slate-50 border border-white/10 light:border-slate-200 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-500/15 light:bg-purple-100 text-purple-400 light:text-purple-700 flex items-center justify-center shrink-0">
                <Layers className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="block font-mono text-[10px] text-slate-400 light:text-slate-600 uppercase tracking-wider">
                  Pitch Surface
                </span>
                <span className="block text-xs text-white light:text-slate-900 truncate mt-0.5">
                  {stadium.surface}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Stadium Story / Description */}
        <div className="p-3.5 rounded-xl bg-white/[0.03] light:bg-slate-50 border border-white/10 light:border-slate-200">
          <p className="text-xs text-slate-300 light:text-slate-700 leading-relaxed">
            {stadium.description}
          </p>
        </div>

        {/* Coordinates Telemetry Strip */}
        <div className="px-3.5 py-2 rounded-xl bg-black/40 light:bg-slate-100 border border-white/10 light:border-slate-200 flex items-center justify-between font-mono text-[11px] text-slate-400 light:text-slate-600">
          <span className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-[#7ADBF0] light:text-cyan-700" />
            <span>COORDINATES</span>
          </span>
          <span className="text-white light:text-slate-900 tabular-nums">
            {stadium.coordinates.lat.toFixed(6)}°, {stadium.coordinates.lng.toFixed(6)}°
          </span>
        </div>

        {/* Action Buttons Row */}
        <div className="space-y-2.5 pt-1">
          <a
            href={stadium.mapsSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-[#0891B2] hover:bg-[#06B6D4] text-white text-xs font-mono uppercase tracking-wider shadow-lg shadow-cyan-900/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Navigation className="w-4 h-4" />
            <span>Open in Google Maps (Directions)</span>
            <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-80" />
          </a>

          <a
            href={stadium.streetViewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-white/10 light:bg-slate-100 hover:bg-white/20 light:hover:bg-slate-200 text-white light:text-slate-900 border border-white/15 light:border-slate-300 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4 text-amber-400 light:text-amber-600" />
            <span>Explore Street View</span>
            <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-80" />
          </a>

          <button
            type="button"
            onClick={handleOpenDossier}
            className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] light:bg-slate-50 hover:bg-white/10 light:hover:bg-slate-100 text-slate-200 light:text-slate-800 border border-white/10 light:border-slate-300 text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Shield className="w-4 h-4 text-[#7ADBF0] light:text-cyan-700" />
            <span>View {stadium.clubShortName} Squad &amp; Tactics Dossier</span>
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-80" />
          </button>
        </div>
      </div>
    </div>
  );
};
