export type AdminSectionId =
  | 'overview'
  | 'signed-in-accounts'
  | 'accounts-activity'
  | 'account-security'
  | 'simulation-database'
  | 'squad-numbers'
  | 'penalty-order'
  | 'injuries-availability'
  | 'publication-analytics'
  | 'whats-new-updates'
  | 'background-music'
  | 'manage-book-series'
  | 'upload-manage-books'
  | 'manage-pdf-files'
  | 'website-branding'
  | 'homepage-content'
  | 'about-legal'
  | 'contact-info'
  | 'data-reset'
  | 'quiz';

export interface AdminNavItemMeta {
  id: AdminSectionId;
  slug: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  group:
    | 'Dashboard & People'
    | 'Match Centre & Teams'
    | 'Content & Engagement'
    | 'Library & Publishing'
    | 'Data';
}

export const ADMIN_SECTIONS: AdminNavItemMeta[] = [
  // Group 1 — Dashboard & People
  {
    id: 'overview',
    slug: 'overview',
    label: 'Overview',
    eyebrow: 'OVERVIEW',
    title: 'THE CONTROL ROOM',
    description:
      'Everything the club publishes passes through here. Series, volumes, PDF editions and the wording of the public site all live in this dashboard.',
    group: 'Dashboard & People',
  },
  {
    id: 'signed-in-accounts',
    slug: 'signed-in-accounts',
    label: 'Signed-in Accounts',
    eyebrow: 'ACCOUNTS',
    title: 'SIGNED-IN ACCOUNTS',
    description: 'Search, inspect, and manage registered accounts, active sessions, and access blocks.',
    group: 'Dashboard & People',
  },
  {
    id: 'accounts-activity',
    slug: 'accounts-activity',
    label: 'Accounts & Activity',
    eyebrow: 'TELEMETRY',
    title: 'ACCOUNTS & ACTIVITY',
    description: 'Track reading progress, simulation actions, and sign-in events across member accounts.',
    group: 'Dashboard & People',
  },
  {
    id: 'account-security',
    slug: 'account-security',
    label: 'Account & Security',
    eyebrow: 'SECURITY',
    title: 'ACCOUNT & SECURITY',
    description: 'Manage your owner password, verify trusted role sessions, and review security events.',
    group: 'Dashboard & People',
  },

  // Group 2 — Match Centre & Teams
  {
    id: 'simulation-database',
    slug: 'simulation-database',
    label: 'Simulation Database',
    eyebrow: 'MATCH ENGINE',
    title: 'SIMULATION DATABASE',
    description: 'Inspect recorded match simulations and the registered club & national team database.',
    group: 'Match Centre & Teams',
  },
  {
    id: 'squad-numbers',
    slug: 'squad-numbers',
    label: 'Squad Numbers',
    eyebrow: 'ROSTER INTEGRITY',
    title: 'SQUAD NUMBERS',
    description: 'Assign and validate unique 1–99 shirt numbers synced with Team Profile squads.',
    group: 'Match Centre & Teams',
  },
  {
    id: 'penalty-order',
    slug: 'penalty-order',
    label: 'Penalty Kick Order',
    eyebrow: 'SPOT-KICK HIERARCHY',
    title: 'PENALTY KICK ORDER',
    description: 'Verify and reorder club penalty-taking hierarchies for in-match penalties and shootouts.',
    group: 'Match Centre & Teams',
  },
  {
    id: 'injuries-availability',
    slug: 'injuries-availability',
    label: 'Injuries & Availability',
    eyebrow: 'MEDICAL ROOM',
    title: 'INJURIES & AVAILABILITY',
    description: 'Maintain squad injury records, doubtful flags, and return dates displayed in Team Profiles.',
    group: 'Match Centre & Teams',
  },

  // Group 3 — Content & Engagement
  {
    id: 'publication-analytics',
    slug: 'publication-analytics',
    label: 'Publication Analytics',
    eyebrow: 'ENGAGEMENT',
    title: 'PUBLICATION ANALYTICS',
    description: 'View, reading session, bookmark, and PDF download metrics across the Reads press.',
    group: 'Content & Engagement',
  },
  {
    id: 'whats-new-updates',
    slug: 'announcements',
    label: "Announcements & What's New",
    eyebrow: 'BROADCASTS',
    title: 'ANNOUNCEMENTS & EMAIL UPDATES',
    description: 'Create, edit, publish, hide, and delete announcements and manage Email Updates subscribers.',
    group: 'Content & Engagement',
  },
  {
    id: 'background-music',
    slug: 'background-music',
    label: 'Background Music',
    eyebrow: 'ATMOSPHERE',
    title: 'BACKGROUND MUSIC',
    description: 'Control site-wide ambient tracks, preview playback, upload audio, and assign default loops.',
    group: 'Content & Engagement',
  },
  {
    id: 'quiz',
    slug: 'quiz',
    label: 'Quiz Management',
    eyebrow: 'TRIVIA & GAMING',
    title: 'FOOTBALL QUIZ MANAGEMENT',
    description: 'Manage the trivia question bank, schedule daily challenges, and review reported question errors.',
    group: 'Content & Engagement',
  },

  // Group 4 — Library & Publishing
  {
    id: 'manage-book-series',
    slug: 'manage-book-series',
    label: 'Manage Book Series',
    eyebrow: 'READS PRESS',
    title: 'MANAGE BOOK SERIES',
    description: 'Create, organize, feature, and publish numbered reading series collections.',
    group: 'Library & Publishing',
  },
  {
    id: 'upload-manage-books',
    slug: 'upload-manage-books',
    label: 'Upload & Manage Books',
    eyebrow: 'CATALOGUE',
    title: 'UPLOAD & MANAGE BOOKS',
    description: 'Publish volumes, manage covers, edit chapters, and control download permissions.',
    group: 'Library & Publishing',
  },
  {
    id: 'manage-pdf-files',
    slug: 'manage-pdf-files',
    label: 'Manage PDF Files',
    eyebrow: 'EDITIONS & STORAGE',
    title: 'MANAGE PDF FILES',
    description: 'Audit PDF assets, enforce public/private access gates, and replace source editions.',
    group: 'Library & Publishing',
  },
  {
    id: 'website-branding',
    slug: 'website-branding',
    label: 'Website Branding',
    eyebrow: 'WEBSITE BRANDING',
    title: 'BRANDING',
    description: 'Configure your colour palette, accent highlights, dark and light canvas presets, and crest.',
    group: 'Library & Publishing',
  },
  {
    id: 'homepage-content',
    slug: 'homepage-content',
    label: 'Homepage Content',
    eyebrow: 'PUBLIC FRONT DOOR',
    title: 'HOMEPAGE CONTENT',
    description: 'Edit hero wording, welcome note, and active homepage section visibility.',
    group: 'Library & Publishing',
  },
  {
    id: 'about-legal',
    slug: 'about-legal',
    label: 'About & Legal',
    eyebrow: 'GOVERNANCE',
    title: 'ABOUT & LEGAL',
    description: 'Author and publish About DodaEona F.C., Privacy Policy, and Terms of Use pages.',
    group: 'Library & Publishing',
  },
  {
    id: 'contact-info',
    slug: 'contact-info',
    label: 'Contact Information',
    eyebrow: 'DIRECTORY',
    title: 'CONTACT INFORMATION',
    description: 'Manage club support emails, press channels, YouTube channel destination, and office hours.',
    group: 'Library & Publishing',
  },

  // Group 5 — Data
  {
    id: 'data-reset',
    slug: 'data-reset',
    label: 'Data & Reset',
    eyebrow: 'OWNER SAFEGUARDS',
    title: 'DATA & RESET',
    description: 'Export platform archives (JSON/CSV) or execute guarded resets with multi-step verification.',
    group: 'Data',
  },
];

export const ADMIN_GROUPS: Array<AdminNavItemMeta['group']> = [
  'Dashboard & People',
  'Match Centre & Teams',
  'Content & Engagement',
  'Library & Publishing',
  'Data',
];

export interface ParsedAdminPath {
  section: AdminSectionId;
  matchDetailId?: string;
}

export function parseAdminPathname(pathname: string): ParsedAdminPath {
  const clean = pathname.replace(/\/+$/, '');
  const matchDetail = clean.match(/^\/admin\/simulation-database\/matches\/([^/]+)$/);
  if (matchDetail) {
    return { section: 'simulation-database', matchDetailId: decodeURIComponent(matchDetail[1]) };
  }

  if (clean === '/admin' || clean === '/admin/overview') {
    return { section: 'overview' };
  }
  const slug = clean.replace(/^\/admin\//, '');
  if (slug === 'announcements' || slug === 'whats-new-updates' || slug === 'whats-new') {
    return { section: 'whats-new-updates' };
  }
  const found = ADMIN_SECTIONS.find((s) => s.slug === slug || s.id === slug);
  return { section: found ? found.id : 'overview' };
}

export function getAdminPath(
  section: AdminSectionId,
  sub?: { matchId?: string }
): string {
  if (section === 'simulation-database' && sub?.matchId) {
    return `/admin/simulation-database/matches/${encodeURIComponent(sub.matchId)}`;
  }
  if (section === 'overview') return '/admin';
  if (section === 'whats-new-updates') return '/admin/announcements';
  return `/admin/${section}`;
}
