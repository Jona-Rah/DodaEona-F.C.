import React, { useState } from 'react';
import { Check, Edit2, ExternalLink, X } from 'lucide-react';
import { NavigationDestination } from '../types/homepage';
import { useAdmin } from '../context/AdminContext';
import { getStoredSessionToken, useAuth } from '../context/AuthContext';
import { buildAuthorizedHeaders } from '../services/firestorePersistence';
import { fetchBootstrapLite } from '../utils/bootstrapCache';

interface FooterProps {
  onNavigate: (destination: NavigationDestination, payload?: any) => void;
}

const DEFAULT_FOOTER_DESCRIPTION =
  "The club's official press and football arena: numbered books & PDF editions, 3D Football World globe, AI-voiced match simulations, live ScoreBoard, Tournament Maker, and club archives.";
const DEFAULT_FOOTER_SUBTITLE = 'Books · Match Centre · 3D Football World · AI Broadcasts';

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { homepageConfig, updateFooterYoutubeUrl } = useAdmin();
  const { isAdmin, isAuthenticated } = useAuth();
  const isOwner = isAdmin;

  const [isEditingYoutube, setIsEditingYoutube] = useState(false);
  const [serverYoutubeUrl, setServerYoutubeUrl] = useState<string | null>(null);
  const [youtubeInput, setYoutubeInput] = useState(
    homepageConfig.footer.socialYoutube || 'https://www.youtube.com'
  );
  const [savedNotice, setSavedNotice] = useState(false);

  React.useEffect(() => {
    let active = true;
    const loadContact = (force = false) => {
      fetchBootstrapLite(force)
        .then((data) => {
          if (!active || !data?.contactInfo?.socialYoutube) return;
          setServerYoutubeUrl(data.contactInfo.socialYoutube);
        })
        .catch(() => {});
    };
    loadContact(false);
    const onReconciled = () => loadContact(true);
    window.addEventListener('dodaeona:cloud-reconciled', onReconciled);
    return () => {
      active = false;
      window.removeEventListener('dodaeona:cloud-reconciled', onReconciled);
    };
  }, []);

  const rawYoutubeUrl =
    serverYoutubeUrl?.trim() ||
    homepageConfig.footer.socialYoutube?.trim() ||
    'https://www.youtube.com';
  const youtubeHref = /^https?:\/\//i.test(rawYoutubeUrl)
    ? rawYoutubeUrl
    : `https://${rawYoutubeUrl}`;

  // Upgrade earlier cached copy defaults seamlessly while honoring explicit admin edits
  const legacyDescs = new Set([
    'Uniting comprehensive football literature, real-time match simulation, database intelligence, and an engaged global football community.',
    "The club's own press: numbered series and complete PDF editions, published to read and keep.",
  ]);
  const legacyTaglines = new Set([
    'One Passion. Countless Stories. One Football World.',
    'Books · Match Centre · The Beautiful Game Unfolds',
  ]);

  const footerDescription =
    !homepageConfig.footer.description || legacyDescs.has(homepageConfig.footer.description)
      ? DEFAULT_FOOTER_DESCRIPTION
      : homepageConfig.footer.description;

  const footerSubtitle =
    !homepageConfig.footer.tagline || legacyTaglines.has(homepageConfig.footer.tagline)
      ? DEFAULT_FOOTER_SUBTITLE
      : homepageConfig.footer.tagline;

  const handleSaveYoutubeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    updateFooterYoutubeUrl(youtubeInput);
    setServerYoutubeUrl(youtubeInput.trim());
    try {
      const headers = await buildAuthorizedHeaders(getStoredSessionToken(), {
        'Content-Type': 'application/json',
      });
      await fetch('/api/admin/contact-info', {
        method: 'PUT',
        credentials: 'include',
        headers,
        body: JSON.stringify({ socialYoutube: youtubeInput.trim() }),
      });
    } catch {
      // fallback already saved in homepageConfig
    }
    setIsEditingYoutube(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2400);
  };

  return (
    <footer
      aria-label="Platform Footer"
      className="relative bg-[#0B111A] light:bg-slate-50 text-slate-300 light:text-slate-700 border-t border-white/[0.08] light:border-slate-200 pt-14 pb-16 landscape-mobile:pt-8 landscape-mobile:pb-10 px-6 sm:px-10 lg:px-14 transition-colors duration-200"
    >
      <div className="max-w-7xl mx-auto space-y-12 landscape-mobile:space-y-8">
        {/* Top Brand Block + Interactive YouTube Channel Logo */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-2.5 max-w-2xl">
            <h2 className="font-display text-3xl sm:text-4xl text-white light:text-slate-900 tracking-wide uppercase leading-none">
              OFFICIAL DODAEONA F.C. WEBSITE
            </h2>

            <p className="text-sm sm:text-base font-normal text-[#4B8FD9] light:text-sky-600 tracking-normal">
              {footerSubtitle}
            </p>

            <p className="text-xs sm:text-sm text-slate-400 light:text-slate-600 leading-relaxed pt-1">
              {footerDescription}
            </p>
          </div>

          {/* YouTube Channel Logo Button + Owner Link Control */}
          <div className="flex flex-col items-start md:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2">
              <a
                href={youtubeHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Official YouTube Channel"
                title={`Open YouTube link (${youtubeHref})`}
                className="group inline-flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/[0.04] light:bg-white border border-white/[0.1] light:border-slate-200 hover:border-red-500/60 hover:bg-red-500/10 light:hover:bg-red-50 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_24px_rgba(239,68,68,0.22)] cursor-pointer"
              >
                <span className="w-8 h-6 rounded-md bg-[#FF0000] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-200">
                  <svg
                    className="w-3.5 h-3.5 text-white fill-current ml-0.5"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </span>
                <span className="text-xs font-semibold text-slate-200 light:text-slate-800 group-hover:text-white light:group-hover:text-red-700 transition-colors">
                  YouTube
                </span>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-red-400 light:group-hover:text-red-600 transition-colors" />
              </a>

              {isOwner && (
                <button
                  type="button"
                  onClick={() => {
                    setYoutubeInput(rawYoutubeUrl);
                    setIsEditingYoutube(true);
                  }}
                  className="p-2.5 rounded-xl bg-white/[0.04] light:bg-white border border-white/[0.1] light:border-slate-200 text-slate-400 hover:text-amber-400 light:hover:text-amber-600 hover:border-amber-400/50 transition-all cursor-pointer hover:scale-105"
                  title="Owner: Change YouTube destination link"
                  aria-label="Edit YouTube destination link"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {savedNotice && (
              <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 light:text-emerald-700">
                <Check className="w-3 h-3" />
                <span>YouTube link saved</span>
              </span>
            )}
          </div>
        </div>

        {/* Categorized Navigation Columns covering every active feature & tab */}
        <div className="grid grid-cols-1 landscape-mobile:grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-10 landscape-mobile:gap-6 lg:gap-8">
          {/* Column 1 — LIBRARY */}
          <div>
            <h3 className="font-mono text-[11px] font-semibold text-[#C89D54] light:text-amber-700 uppercase tracking-[0.22em] mb-4">
              LIBRARY
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-[13px] font-normal text-slate-300 light:text-slate-700">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('home')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Home
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('reads')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Book Library (Series &amp; Volumes)
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('my-library')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  My Library
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('announcements')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  What&apos;s New
                </button>
              </li>
            </ul>
          </div>

          {/* Column 2 — MATCH CENTRE */}
          <div>
            <h3 className="font-mono text-[11px] font-semibold text-[#5BA4E5] light:text-sky-700 uppercase tracking-[0.22em] mb-4">
              MATCH CENTRE
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-[13px] font-normal text-slate-300 light:text-slate-700">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('match-centre', { matchCentreTab: 'dashboard' })}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Dashboard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('match-centre', {
                      matchCentreTab: 'teams',
                      teamsSectionTab: 'database',
                    })
                  }
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Teams Database
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('match-centre', {
                      matchCentreTab: 'teams',
                      teamsSectionTab: 'stadium-explorer',
                    })
                  }
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Stadium Explorer
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('match-centre', {
                      matchCentreTab: 'teams',
                      teamsSectionTab: 'ballon-dor',
                    })
                  }
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Ballon d&apos;Or Archive
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate('match-centre', {
                      matchCentreTab: 'teams',
                      teamsSectionTab: 'team-statistics',
                    })
                  }
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Team Statistics
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('match-centre', { matchCentreTab: 'managers' })}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Managers Directory
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('match-centre', { matchCentreTab: 'world' })}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Football World 3D
                </button>
              </li>
            </ul>
          </div>

          {/* Column 3 — SIMULATE & ARENA */}
          <div>
            <h3 className="font-mono text-[11px] font-semibold text-[#7ADBF0] light:text-cyan-700 uppercase tracking-[0.22em] mb-4">
              SIMULATE &amp; ARENA
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-[13px] font-normal text-slate-300 light:text-slate-700">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('match-centre', { matchCentreTab: 'scoreboard' })}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Interactive ScoreBoard
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('match-centre', { matchCentreTab: 'simulate' })}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Simulate a Match
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('match-centre', { matchCentreTab: 'simulate' })}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  AI Broadcast &amp; Pundit Studio
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('match-centre', { matchCentreTab: 'competitions' })}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Tournament Maker
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('match-centre', { matchCentreTab: 'quiz' })}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Quiz Centre
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('simulation-guide')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Simulation Guide
                </button>
              </li>

            </ul>
          </div>

          {/* Column 4 — THE CLUB */}
          <div>
            <h3 className="font-mono text-[11px] font-semibold text-[#42B883] light:text-emerald-700 uppercase tracking-[0.22em] mb-4">
              THE CLUB
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-[13px] font-normal text-slate-300 light:text-slate-700">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('about')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  About us &amp; Contact Us
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('contact')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Communication Desk
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() =>
                    onNavigate(isAdmin ? 'admin' : isAuthenticated ? 'my-library' : 'login')
                  }
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  {isAdmin ? 'Control Room' : isAuthenticated ? 'Member Library' : 'Sign In'}
                </button>
              </li>
            </ul>
          </div>

          {/* Column 5 — LEGAL */}
          <div>
            <h3 className="font-mono text-[11px] font-semibold text-[#C06AE8] light:text-fuchsia-700 uppercase tracking-[0.22em] mb-4">
              LEGAL
            </h3>
            <ul className="space-y-2.5 text-xs sm:text-[13px] font-normal text-slate-300 light:text-slate-700">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('privacy')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate('terms')}
                  className="hover:text-white light:hover:text-slate-950 hover:translate-x-1 transition-all cursor-pointer text-left"
                >
                  Terms of Use
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Owner Modal to Edit Footer YouTube Destination URL */}
      {isEditingYoutube && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <form
            onSubmit={handleSaveYoutubeUrl}
            className="w-full max-w-md rounded-2xl bg-[#0C131F] light:bg-white border border-white/15 light:border-slate-200 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white light:text-slate-900">
                Set Footer YouTube Link
              </h3>
              <button
                type="button"
                onClick={() => setIsEditingYoutube(false)}
                className="p-1 text-slate-400 hover:text-white light:hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400 light:text-slate-600">
              Enter the URL that visitors will be sent to when pressing the YouTube logo in the footer.
            </p>

            <input
              type="text"
              required
              value={youtubeInput}
              onChange={(e) => setYoutubeInput(e.target.value)}
              placeholder="https://www.youtube.com/@DodaEonaFC"
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#070B12] light:bg-slate-50 border border-white/15 light:border-slate-300 text-xs font-mono text-white light:text-slate-900 focus:outline-none focus:border-[#7ADBF0]"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditingYoutube(false)}
                className="px-3.5 py-2 rounded-xl border border-white/10 light:border-slate-300 text-xs font-semibold text-slate-300 light:text-slate-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer transition-all"
              >
                Save YouTube link
              </button>
            </div>
          </form>
        </div>
      )}
    </footer>
  );
};
