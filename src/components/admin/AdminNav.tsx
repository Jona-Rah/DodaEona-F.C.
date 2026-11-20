import React from 'react';
import {
  LayoutGrid,
  Users,
  Activity,
  ShieldCheck,
  Database,
  Hash,
  Crosshair,
  HeartPulse,
  BarChart3,
  Megaphone,
  Music,
  Layers,
  BookOpen,
  FileText,
  Palette,
  Home,
  BookMarked,
  Mail,
  RotateCcw,
  ExternalLink,
  Volume2,
  VolumeX,
  ListMusic,
  LogOut,
  Sun,
  Moon,
  Award,
} from 'lucide-react';
import { ADMIN_GROUPS, ADMIN_SECTIONS, AdminSectionId } from './adminRoutes';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const SECTION_ICONS: Record<AdminSectionId, React.ComponentType<{ className?: string }>> = {
  overview: LayoutGrid,
  'signed-in-accounts': Users,
  'accounts-activity': Activity,
  'account-security': ShieldCheck,
  'simulation-database': Database,
  'squad-numbers': Hash,
  'penalty-order': Crosshair,
  'injuries-availability': HeartPulse,
  'publication-analytics': BarChart3,
  'whats-new-updates': Megaphone,
  'background-music': Music,
  'manage-book-series': Layers,
  'upload-manage-books': BookOpen,
  'manage-pdf-files': FileText,
  'website-branding': Palette,
  'homepage-content': Home,
  'about-legal': BookMarked,
  'contact-info': Mail,
  'data-reset': RotateCcw,
  quiz: Award,
};

interface AdminNavProps {
  activeSection: AdminSectionId;
  onSelectSection: (section: AdminSectionId) => void;
  onReturnToPublic: () => void;
}

export const AdminNav: React.FC<AdminNavProps> = ({
  activeSection,
  onSelectSection,
  onReturnToPublic,
}) => {
  const {
    theme,
    toggleTheme,
    isAudioPlaying,
    toggleAudio,
    musicVolume,
    setMusicVolume,
    activeTrack,
    branding,
  } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="flex flex-col h-full">
      {/* Top Brand Block matching screenshot */}
      <div className="px-5 pt-5 pb-4 shrink-0">
        <div className="font-display text-lg sm:text-xl text-[var(--text-primary)] tracking-wide leading-tight">
          {branding?.siteName || 'OFFICIAL DODAEONA F.C. WEBSITE'}
        </div>
        <div className="eyebrow-mono text-[var(--accent-cyan)] mt-1">
          {branding?.controlRoomLabel || 'PUBLISHING CONTROL ROOM'}
        </div>
      </div>

      {/* Scrollable Middle Navigation (23 Sections + View Public Site bordered link) */}
      <nav aria-label="Admin sections" className="flex-1 overflow-y-auto px-3 pb-4 space-y-5">
        {ADMIN_GROUPS.map((group) => {
          const items = ADMIN_SECTIONS.filter((s) => s.group === group);
          return (
            <div key={group} className="space-y-1">
              <div className="px-3 pb-1 eyebrow-mono text-[var(--text-muted)] text-[9px] opacity-80">
                {group}
              </div>
              {items.map((item) => {
                const Icon = SECTION_ICONS[item.id];
                const isActive = activeSection === item.id;
                return (
                  <a
                    key={item.id}
                    href={`/admin/${item.slug === 'overview' ? '' : item.slug}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectSection(item.id);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all ${
                      isActive
                        ? 'bg-white/[0.08] light:bg-cyan-50 text-[var(--text-primary)] light:text-cyan-900 font-semibold border border-white/[0.08] light:border-cyan-200'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-white/[0.04] light:hover:bg-slate-100 font-medium border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-[var(--accent-cyan)]' : 'text-[var(--text-muted)]'
                      }`}
                    />
                    <span className="truncate">{item.label}</span>
                  </a>
                );
              })}
            </div>
          );
        })}

        {/* Bordered "View the public site" link matching screenshot */}
        <div className="pt-2 px-1">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onReturnToPublic();
            }}
            className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl border border-white/[0.12] light:border-slate-300 bg-white/[0.02] light:bg-slate-50 hover:border-[var(--accent-cyan)]/60 text-[13px] font-medium text-[var(--text-primary)] transition-all"
          >
            <span className="flex items-center gap-2.5">
              <BookMarked className="w-4 h-4 text-[var(--text-muted)]" />
              <span>View the public site</span>
            </span>
            <ExternalLink className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          </a>
        </div>
      </nav>

      {/* Bottom Dock: Site Music + Admin Email + Sign out (matching screenshots) */}
      <div className="shrink-0 border-t border-white/[0.08] light:border-slate-200 p-4 space-y-3.5 bg-[var(--bg-surface)]">
        {/* Site Music Control Pill + Label */}
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex-1 flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-[var(--bg-primary)] border border-white/[0.1] light:border-slate-300">
            <button
              type="button"
              onClick={toggleAudio}
              aria-label={isAudioPlaying ? 'Mute site music' : 'Play site music'}
              title={activeTrack ? `${activeTrack.title}` : 'Site Music'}
              className="p-1 text-[var(--accent-cyan)] hover:brightness-110"
            >
              {isAudioPlaying ? (
                <Volume2 className="w-3.5 h-3.5" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              )}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={musicVolume}
              onChange={(e) => setMusicVolume(Number(e.target.value))}
              aria-label="Site music volume"
              className="w-full h-1 accent-[var(--accent-cyan)] cursor-pointer"
            />
            <button
              type="button"
              onClick={() => onSelectSection('background-music')}
              title="Open Background Music manager"
              className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-cyan)]"
            >
              <ListMusic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              className="p-1 text-[var(--text-muted)] hover:text-[var(--accent-cyan)]"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
          <span className="eyebrow-mono text-[9px] text-[var(--text-muted)] leading-tight text-right shrink-0">
            SITE
            <br />
            MUSIC
          </span>
        </div>

        {/* Admin Identity + Sign Out */}
        <div className="space-y-2 px-1">
          <div className="text-xs text-[var(--text-muted)] truncate font-medium" title={user?.email}>
            {user?.email}
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="inline-flex items-center gap-2 text-xs font-medium text-[var(--text-secondary)] hover:text-rose-400 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </div>
  );
};
