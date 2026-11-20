import React, { useState } from 'react';
import {
  BookOpen,
  Trophy,
  ArrowRight,
  Camera,
  Upload,
  RotateCcw,
  Check,
  X,
  Loader2,
  Link2,
} from 'lucide-react';
import { OFFICIAL_ASSETS, resolveAccessCardDesc, resolveAccessCardImageUrl } from '../data/mockData';
import { NavigationDestination } from '../types/homepage';
import { useAdmin } from '../context/AdminContext';
import { useAuth } from '../context/AuthContext';
import { optimizeImageFileToDataUrl } from '../utils/imageUpload';

interface ExperienceAccessPointsProps {
  onNavigate: (destination: NavigationDestination) => void;
}

type CardKey = 'readsImage' | 'matchImage';

interface AdminCardImageControlProps {
  cardKey: CardKey;
  currentUrl: string;
  defaultUrl: string;
  label: string;
  onSaveUrl: (card: CardKey, url: string) => Promise<void>;
}

const AdminCardImageControl: React.FC<AdminCardImageControlProps> = ({
  cardKey,
  currentUrl,
  defaultUrl,
  label,
  onSaveUrl,
}) => {
  const [open, setOpen] = useState(false);
  const [urlInput, setUrlInput] = useState(currentUrl);
  const [saving, setSaving] = useState(false);
  const [savedFlag, setSavedFlag] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCustom = currentUrl !== defaultUrl;

  const commitImage = async (nextUrl: string) => {
    setSaving(true);
    setErrorMsg(null);
    try {
      await onSaveUrl(cardKey, nextUrl);
      setUrlInput(nextUrl);
      setSavedFlag(true);
      setTimeout(() => {
        setSavedFlag(false);
        setOpen(false);
      }, 1100);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to update card image.');
    } finally {
      setSaving(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setSaving(true);
    setErrorMsg(null);
    try {
      const optimizedUrl = await optimizeImageFileToDataUrl(file);
      await commitImage(optimizedUrl);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not process image file.');
      setSaving(false);
    }
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className="absolute top-3.5 right-3.5 z-30 flex flex-col items-end gap-2"
    >
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setUrlInput(currentUrl);
          setErrorMsg(null);
          setOpen((prev) => !prev);
        }}
        title={`Admin: Change ${label} image`}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950/85 hover:bg-slate-900 border border-[#7ADBF0]/45 text-[#E8EEF5] text-[11px] font-semibold tracking-wide backdrop-blur-md shadow-lg transition-all"
      >
        <Camera className="w-3.5 h-3.5 text-[#7ADBF0]" />
        <span>{open ? 'Close' : 'Change Image'}</span>
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="w-72 sm:w-80 rounded-xl bg-slate-950/95 border border-[#7ADBF0]/35 p-3.5 shadow-2xl backdrop-blur-xl text-left space-y-3"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#7ADBF0]">
              Admin · {label} Visual
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Close image editor"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#7ADBF0] hover:bg-[#99E4F5] text-[#050A12] text-xs font-bold cursor-pointer transition-colors">
              {saving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : savedFlag ? (
                <Check className="w-3.5 h-3.5" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              <span>{saving ? 'Saving...' : savedFlag ? 'Saved Live' : 'Upload Image'}</span>
              <input
                type="file"
                accept="image/*"
                disabled={saving}
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {isCustom && (
              <button
                type="button"
                disabled={saving}
                onClick={() => void commitImage(defaultUrl)}
                title="Reset to default artwork"
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-white/10 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void commitImage(urlInput.trim() || defaultUrl);
            }}
            className="space-y-1.5"
          >
            <label className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <Link2 className="w-3 h-3" />
              <span>Or paste image URL</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://... or /assets/..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-[#7ADBF0]"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Apply
              </button>
            </div>
          </form>

          {errorMsg && (
            <p className="text-[11px] font-medium text-rose-400">{errorMsg}</p>
          )}
        </div>
      )}
    </div>
  );
};

export const ExperienceAccessPoints: React.FC<ExperienceAccessPointsProps> = ({ onNavigate }) => {
  const { homepageConfig, updateAccessCardImage } = useAdmin();
  const { isAdmin } = useAuth();

  const readsImg = resolveAccessCardImageUrl(homepageConfig.accessCards?.readsImage, 'reads');
  const matchImg = resolveAccessCardImageUrl(homepageConfig.accessCards?.matchImage, 'match');

  const readsHeading = homepageConfig.accessCards?.readsHeading || 'EXPLORE READS';
  const readsDesc = resolveAccessCardDesc(homepageConfig.accessCards?.readsDesc, 'reads');
  const readsBtnText = homepageConfig.accessCards?.readsBtnText || 'EXPLORE READS';

  const matchHeading = homepageConfig.accessCards?.matchHeading || 'ENTER MATCH CENTRE';
  const matchDesc = resolveAccessCardDesc(homepageConfig.accessCards?.matchDesc, 'match');
  const matchBtnText = homepageConfig.accessCards?.matchBtnText || 'ENTER MATCH CENTRE';

  return (
    <section
      aria-label="Core Football Experiences"
      className="py-14 sm:py-20 landscape-mobile:py-8 bg-[var(--bg-primary)] px-4 sm:px-6 lg:px-8 border-b border-[var(--border-color)] relative overflow-hidden transition-colors duration-200"
    >
      {/* Subtle icy cyan radial accents */}
      <div className="absolute top-1/2 left-10 w-80 h-80 bg-[#7ADBF0]/[0.06] rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-[#38BDF8]/[0.05] rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">

        {/* Section Header */}
        <div className="text-center max-w-xl mx-auto mb-10 sm:mb-12 landscape-mobile:mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[var(--bg-surface)] border border-[#7ADBF0]/30 text-[var(--accent-cyan)] eyebrow-mono mb-4 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-[#7ADBF0] light:bg-cyan-600" />
            <span>DUAL PLATFORM PILLARS</span>
          </div>
          <h2 className="font-display text-3xl sm:text-4xl landscape-mobile:text-2xl lg:text-4xl text-[var(--text-primary)] tracking-[0.015em] uppercase leading-none">
            CHOOSE YOUR FOOTBALL JOURNEY
          </h2>
          <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-[#7ADBF0] to-transparent mx-auto my-4" />
          <p className="text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed text-balance">
            Immerse yourself in numbered football book series, or step into interactive match simulation, Football World 3D, and competitions.
          </p>
        </div>

        {/* Two Equal-Prominence Side-by-Side Architectural Cards */}
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 lg:grid-cols-2 gap-6 landscape-mobile:gap-4 lg:gap-7 items-stretch">

          {/* Card 1: READS */}
          <div
            onClick={() => onNavigate('reads')}
            className="group relative rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#7ADBF0]/60 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer shadow-xl"
          >
            <div>
              {/* Media Container */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950 light:bg-slate-100 border-b border-[var(--border-color)]">
                <img
                  src={readsImg}
                  alt="Football editorial library and open tactical manuscript under warm brass lamp light"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-[var(--bg-surface)]/30 to-transparent" />

                {isAdmin && (
                  <AdminCardImageControl
                    cardKey="readsImage"
                    currentUrl={readsImg}
                    defaultUrl={OFFICIAL_ASSETS.readsCardCover}
                    label="Explore Reads"
                    onSaveUrl={updateAccessCardImage}
                  />
                )}

                {/* Clean unboxed top kicker overlay */}
                <div className="absolute bottom-3 left-5 sm:left-6 flex items-center gap-2 eyebrow-mono text-[10px] text-[var(--accent-cyan)]">
                  <span>01 · THE LITERARY EXPERIENCE</span>
                </div>
              </div>

              {/* Card Content Body */}
              <div className="p-5 sm:p-6">
                <h3 className="font-display text-xl sm:text-2xl tracking-[0.015em] text-[var(--text-primary)] uppercase group-hover:text-[var(--accent-cyan)] transition-colors leading-none">
                  {readsHeading}
                </h3>

                <p className="mt-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                  {readsDesc}
                </p>

                {/* Clean Unboxed Feature Metadata */}
                <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                  <span>Book Series</span>
                  <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
                  <span>Interactive Reader</span>
                  <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
                  <span>PDF Editions</span>
                  <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
                  <span>My Library</span>
                </div>
              </div>
            </div>

            {/* Bottom Action Tray */}
            <div className="p-5 sm:p-6 pt-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('reads');
                }}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#050A12] bg-[#7ADBF0] group-hover:bg-[#99E4F5] light:bg-cyan-600 light:group-hover:bg-cyan-700 light:text-white rounded-xl shadow-[0_0_24px_rgba(122,219,240,0.22)] transition-all duration-200"
              >
                <BookOpen className="w-4 h-4 text-[#050A12] light:text-white" />
                <span>{readsBtnText}</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

          {/* Card 2: MATCH CENTRE */}
          <div
            onClick={() => onNavigate('match-centre')}
            className="group relative rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-[#7ADBF0]/60 transition-all duration-200 flex flex-col justify-between overflow-hidden cursor-pointer shadow-xl"
          >
            <div>
              {/* Media Container */}
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950 light:bg-slate-100 border-b border-[var(--border-color)]">
                <img
                  src={matchImg}
                  alt="Night football stadium pitch illuminated by blazing white and cyan LED floodlights"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center transition-transform duration-700 ease-out group-hover:scale-105 opacity-95"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg-surface)] via-[var(--bg-surface)]/30 to-transparent" />

                {isAdmin && (
                  <AdminCardImageControl
                    cardKey="matchImage"
                    currentUrl={matchImg}
                    defaultUrl={OFFICIAL_ASSETS.matchCentreCardVisual}
                    label="Match Centre"
                    onSaveUrl={updateAccessCardImage}
                  />
                )}

                <div className="absolute bottom-3 left-5 sm:left-6 flex items-center gap-2 eyebrow-mono text-[10px] text-[var(--accent-cyan)]">
                  <span>02 · THE SIMULATION ARENA</span>
                </div>
              </div>

              {/* Card Content Body */}
              <div className="p-5 sm:p-6">
                <h3 className="font-display text-xl sm:text-2xl tracking-[0.015em] text-[var(--text-primary)] uppercase group-hover:text-[var(--accent-cyan)] transition-colors leading-none">
                  {matchHeading}
                </h3>

                <p className="mt-2.5 text-xs sm:text-sm text-[var(--text-secondary)] leading-relaxed font-normal">
                  {matchDesc}
                </p>

                {/* Clean Unboxed Feature Metadata */}
                <div className="mt-4 pt-3.5 border-t border-[var(--border-color)] flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-[var(--text-muted)]">
                  <span>1,021+ Teams &amp; Managers</span>
                  <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
                  <span>AI Broadcast Studio</span>
                  <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
                  <span>World 3D &amp; ScoreBoard</span>
                  <span aria-hidden="true" className="text-[var(--accent-cyan)]">·</span>
                  <span>Tournaments &amp; Quiz</span>
                </div>
              </div>
            </div>

            {/* Bottom Action Tray */}
            <div className="p-5 sm:p-6 pt-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onNavigate('match-centre');
                }}
                className="w-full inline-flex items-center justify-center gap-2.5 px-5 py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--text-primary)] bg-[var(--bg-elevated)] hover:bg-[#7ADBF0]/15 light:bg-white light:hover:bg-cyan-50 border border-white/[0.15] light:border-slate-300 group-hover:border-[#7ADBF0]/60 light:group-hover:border-cyan-600 rounded-xl transition-all duration-200"
              >
                <Trophy className="w-4 h-4 text-[var(--accent-cyan)]" />
                <span>{matchBtnText}</span>
                <ArrowRight className="w-4 h-4 text-[var(--accent-cyan)] transition-transform group-hover:translate-x-1" />
              </button>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};

