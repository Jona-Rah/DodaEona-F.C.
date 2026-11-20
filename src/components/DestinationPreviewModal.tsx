import React, { useEffect, useState } from 'react';
import { X, ArrowLeft, BookOpen, Trophy, Users, Award, FileText, Activity } from 'lucide-react';
import { NavigationDestination } from '../types/homepage';
import type { AboutLegalConfig, ContactInfoConfig, ManagedAnnouncement } from '../../server/types';
import { fetchBootstrapLite } from '../utils/bootstrapCache';

interface DestinationPreviewModalProps {
  destination: NavigationDestination | null;
  payload?: any;
  onClose: () => void;
}

export const DestinationPreviewModal: React.FC<DestinationPreviewModalProps> = ({
  destination,
  payload,
  onClose,
}) => {
  const [aboutLegal, setAboutLegal] = useState<AboutLegalConfig | null>(null);
  const [contactInfo, setContactInfo] = useState<ContactInfoConfig | null>(null);
  const [announcements, setAnnouncements] = useState<ManagedAnnouncement[]>([]);

  useEffect(() => {
    if (!destination || destination === 'home') return;
    let active = true;
    fetchBootstrapLite(false)
      .then((data) => {
        if (!active || !data) return;
        if (data.aboutLegal) setAboutLegal(data.aboutLegal);
        if (data.contactInfo) setContactInfo(data.contactInfo);
        if (Array.isArray(data.announcements)) setAnnouncements(data.announcements);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [destination]);

  if (!destination || destination === 'home') return null;

  const getContent = () => {
    switch (destination) {
      case 'reads':
        return {
          eyebrow: 'LITERATURE & TACTICS',
          title: 'READS PUBLISHING HUB',
          subtitle: 'The football reading library, series, and in-app reader.',
          icon: <BookOpen className="w-8 h-8 text-[#C5A059]" />,
          topEdge: 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#9A7836]',
          badge: 'LITERATURE HUB',
          details: [
            'Football Educational Series & Volumes Library',
            'Full-Screen In-App Reader & PDF Downloads',
            'Personal Reading Library, Bookmarks, and Reading Progress',
          ],
          note: 'Explore the complete library from the Reads section.',
          specialPreview: 'reads',
        };
      case 'simulation-guide':
        return {
          eyebrow: 'PLATFORM GUIDE',
          title: 'MATCH CENTRE & ARENA GUIDE',
          subtitle: 'Interactive tools across simulation, 3D exploration, tournaments, and AI broadcasting.',
          icon: <Trophy className="w-8 h-8 text-[#38BDF8]" />,
          topEdge: 'bg-gradient-to-r from-[#38BDF8] via-[#60A5FA] to-[#0284C7]',
          badge: 'SIMULATION GUIDE',
          details: [
            'Simulate a Match: Full 90-minute, Extra-Time, and Penalty Shootout engine with live tactical adjustments, substitutions, formations, and Two-Commentator TV Broadcasting (Charon & Orus studio duo, plus Fenrir & Puck solo options).',
            'AI Live Commentary & Studio: Synchronized in-match event commentary alongside match-aware Half-Time, 90\', Extra-Time, Penalty Shootout, and Full-Time dialogue.',
            'Football World 3D: Realistic Earth globe with oceans, terrain contrast, day/night stars, Sun, solar system planets, and clickable clubs and stadiums.',
            'Interactive ScoreBoard & Tournament Maker: Run custom matchdays with AI commentary or build full multi-stage leagues and knockout brackets.',
            'Database & Archives: Teams Database, Stadium Explorer, Team Statistics, Ballon d’Or Archive, Managers Directory, and Quiz Centre.',
          ],
          note: 'Select any feature directly from the Match Centre navigation rail or the site footer.',
          specialPreview: 'pitch',
        };
      case 'match-centre':
        return {
          eyebrow: 'INTERACTIVE ARENA',
          title: 'MATCH CENTRE SIMULATION',
          subtitle: 'Teams directory, club dossiers, and match simulation.',
          icon: <Trophy className="w-8 h-8 text-[#38BDF8]" />,
          topEdge: 'bg-gradient-to-r from-[#38BDF8] via-[#60A5FA] to-[#0284C7]',
          badge: 'SIMULATION ARENA',
          details: [
            'Real-Time Match Simulation Engine with event commentary',
            'Clubs, National Teams, Squads, Tactics & Preferred XI',
          ],
          note: 'Explore teams and launch a match directly from Match Centre.',
          specialPreview: 'pitch',
        };
      case 'series-detail':
        return {
          eyebrow: `SERIES #${payload?.seriesNumber || 1}`,
          title: payload?.title || 'READING SERIES SPOTLIGHT',
          subtitle: payload?.description || 'Deep-dive educational series from the Reads library.',
          icon: <BookOpen className="w-8 h-8 text-[#C5A059]" />,
          topEdge: 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#9A7836]',
          badge: `SERIES #${payload?.seriesNumber || 1}`,
          details: [
            `Series #${payload?.seriesNumber || 1} in the Official Collection`,
            `${payload?.volumeCount || 0} Published Volumes Available`,
            'Interactive In-App Reader & Offline PDF Access',
          ],
          note: 'Explore each volume individually in the Reads section.',
          specialPreview: 'none',
        };
      case 'volume-reader':
        return {
          eyebrow: 'IN-APP READER',
          title: payload?.title || 'VOLUME IN-APP READER',
          subtitle: `From Series: ${payload?.seriesTitle || 'DodaEona Collection'}`,
          icon: <FileText className="w-8 h-8 text-[#38BDF8]" />,
          topEdge: 'bg-gradient-to-r from-[#38BDF8] via-[#60A5FA] to-[#0284C7]',
          badge: 'IN-APP READER',
          details: [
            'High-definition typography and tactical chapters',
            'Bookmark progress saved to My Library',
            'Companion PDF edition download',
          ],
          note: 'Open the full reader inside the Book Library.',
          specialPreview: 'none',
        };
      case 'about':
        return {
          eyebrow: 'THE CLUB',
          title: aboutLegal?.aboutTitle || 'ABOUT DODAEONA F.C.',
          subtitle: '"Dare to Dream" · Official Press & Match Centre',
          icon: <Award className="w-8 h-8 text-[#C5A059]" />,
          topEdge: 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#9A7836]',
          badge: 'CLUB LORE',
          details: [
            aboutLegal?.aboutBody ||
              'DodaEona F.C. unites football literature, tactical archives, and match simulation.',
            ...(contactInfo
              ? [
                  `Official Email: ${contactInfo.officialEmail}`,
                  `Library Support: ${contactInfo.supportEmail}`,
                  `Office Hours: ${contactInfo.officeHours}`,
                ]
              : []),
          ],
          note: contactInfo?.pressNote || 'Welcome to DodaEona F.C.',
          specialPreview: 'none',
        };
      case 'contact':
        return {
          eyebrow: 'COMMUNICATION DESK',
          title: 'CONTACT DODAEONA F.C.',
          subtitle: 'Get in touch with the DodaEona F.C. team and administrators.',
          icon: <Users className="w-8 h-8 text-[#38BDF8]" />,
          topEdge: 'bg-gradient-to-r from-[#38BDF8] via-[#60A5FA] to-[#0284C7]',
          badge: 'DIRECT DESK',
          details: [
            `Official Email: ${contactInfo?.officialEmail || 'david.emanoueel.gr7@gmail.com'}`,
            `Support Email: ${contactInfo?.supportEmail || 'support@dodaeona.fc'}`,
            `Office Hours: ${contactInfo?.officeHours || 'Mon–Fri · 09:00–18:00 GMT'}`,
          ],
          note: contactInfo?.pressNote || 'Response time is typically within 24–48 hours.',
          specialPreview: 'none',
        };
      case 'announcements':
        return {
          eyebrow: "WHAT'S NEW",
          title: "WHAT'S NEW & UPDATES",
          subtitle: 'Official DodaEona F.C. broadcasts and release notes',
          icon: <FileText className="w-8 h-8 text-[var(--accent-gold)]" />,
          topEdge: 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#9A7836]',
          badge: 'OFFICIAL UPDATES',
          details:
            announcements.length > 0
              ? announcements.map((a) => `${a.title}: ${a.message}`)
              : ['No published announcements at this time.'],
          note: 'Published directly from the Control Room.',
          specialPreview: 'none',
        };
      case 'privacy':
        return {
          eyebrow: 'GOVERNANCE & RECORDS',
          title: 'PRIVACY POLICY',
          subtitle: 'DodaEona F.C. Official Platform Governance',
          icon: <FileText className="w-8 h-8 text-[var(--accent-gold)]" />,
          topEdge: 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#9A7836]',
          badge: 'GOVERNANCE',
          details: [
            aboutLegal?.privacyBody ||
              'Reader progress and signed-in session cookies are used strictly for library delivery and account authentication.',
          ],
          note: `Status: ${aboutLegal?.status || 'published'}`,
          specialPreview: 'none',
        };
      case 'terms':
        return {
          eyebrow: 'GOVERNANCE & RECORDS',
          title: 'TERMS OF USE',
          subtitle: 'DodaEona F.C. Official Platform Governance',
          icon: <FileText className="w-8 h-8 text-[var(--accent-gold)]" />,
          topEdge: 'bg-gradient-to-r from-[#C5A059] via-[#E5C384] to-[#9A7836]',
          badge: 'GOVERNANCE',
          details: [
            aboutLegal?.termsBody ||
              'All publications, PDF editions, and tactical notes remain the intellectual property of DodaEona F.C.',
          ],
          note: `Status: ${aboutLegal?.status || 'published'}`,
          specialPreview: 'none',
        };
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 landscape-mobile:p-3 bg-slate-950/85 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-2xl max-h-[calc(100dvh-1.5rem)] overflow-y-auto shadow-2xl relative text-left transition-colors duration-200">
        {/* 3px Top Colored Edge */}
        <div className={`h-[3px] w-full ${content.topEdge}`} />

        <div className="p-6 sm:p-8 landscape-mobile:p-4">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 landscape-mobile:top-3 landscape-mobile:right-3 p-2 rounded-xl bg-[var(--bg-elevated)] hover:bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content Header */}
          <div className="flex items-start gap-4 landscape-mobile:gap-3 pr-8">
            <div className="p-3.5 landscape-mobile:p-2.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] shrink-0 shadow-md">
              {content.icon}
            </div>
            <div>
              <span className="eyebrow-mono px-2.5 py-0.5 rounded text-[10px] bg-[var(--bg-elevated)] border border-[var(--border-color)] text-[var(--accent-gold)]">
                {content.badge}
              </span>
              <h3 className="font-display font-black text-2xl sm:text-3xl landscape-mobile:text-xl text-[var(--text-primary)] uppercase tracking-tight mt-1 leading-tight">
                {content.title}
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-secondary)]">
                {content.subtitle}
              </p>
            </div>
          </div>

          {content.specialPreview === 'pitch' && (
            <div className="mt-6 landscape-mobile:mt-3 p-4 landscape-mobile:p-3 rounded-2xl bg-[#042014] dark:bg-[#03150d] border border-emerald-500/40 relative overflow-hidden text-emerald-100">
              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="eyebrow-mono text-xs font-bold text-emerald-300">
                    MATCH ENGINE: READY
                  </span>
                </div>
                <span className="font-mono text-xs text-emerald-400 font-bold">TEAMS &amp; DOSSIERS</span>
              </div>
            </div>
          )}

          {/* Details */}
          <div className="mt-6 landscape-mobile:mt-3 p-5 landscape-mobile:p-3.5 rounded-2xl bg-[var(--bg-elevated)] border border-[var(--border-color)] space-y-2.5 landscape-mobile:space-y-1.5">
            <span className="eyebrow-mono text-[10px] text-[var(--accent-gold)] uppercase block mb-1">
              OFFICIAL INFORMATION:
            </span>
            {content.details.map((item, idx) => (
              <div key={idx} className="flex items-start gap-3 text-xs sm:text-sm text-[var(--text-secondary)]">
                <span className="w-2 h-2 rounded-full bg-[var(--accent-gold)] shrink-0 mt-1.5" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          {/* Note */}
          <p className="mt-4 landscape-mobile:mt-2.5 text-xs text-[var(--text-muted)] italic">{content.note}</p>

          {/* Return Button */}
          <div className="mt-6 landscape-mobile:mt-3 pt-5 landscape-mobile:pt-3 border-t border-[var(--border-color)] flex justify-end">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-2 px-6 py-3 landscape-mobile:py-2 rounded-xl text-xs font-black uppercase tracking-widest text-slate-950 bg-gradient-to-r from-[#C5A059] to-[#E5C384] hover:from-[#D4B26F] hover:to-[#B69147] transition-all shadow-[0_0_20px_rgba(197,160,89,0.35)]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Platform</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
