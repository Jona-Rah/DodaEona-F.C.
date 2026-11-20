/**
 * Verification suite for the 12 "Dirty Dozen" adversarial payloads defined in security_spec.md.
 * Intended for execution with @firebase/rules-unit-testing against Firestore Emulator.
 */
import { readFileSync } from 'node:fs';

export const DIRTY_DOZEN_CASES = [
  {
    id: 1,
    name: 'Unauthenticated read on private PII',
    path: 'users/userA/private/info',
    operation: 'get',
    auth: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Cross-user PII or library read',
    path: 'users/userA/library/personal',
    operation: 'get',
    auth: { uid: 'userB', email: 'b@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Collection scraping via list on newsletter_subscribers & admins',
    path: 'newsletter_subscribers',
    operation: 'list',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified email spoofing bootstrapped admin',
    path: 'site_config/branding',
    operation: 'update',
    auth: { uid: 'attacker', email: 'malak.marian1984@gmail.com', email_verified: false },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Self-assigned admin role on profile create',
    path: 'users/userA',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { uid: 'userA', displayName: 'Attacker', role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Non-admin write to book_volumes or custom_teams',
    path: 'book_volumes/vol-99',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { id: 'vol-99', seriesId: 's1', title: 'Hijack', published: true, downloadEnabled: true, payload: {} },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Ghost field injection on site_config',
    path: 'site_config/branding',
    operation: 'create',
    auth: { uid: 'admin1', email: 'malak.marian1984@gmail.com', email_verified: true },
    payload: { id: 'branding', status: 'published', payload: {}, updatedBy: 'admin1', ghost: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Unauthorized draft book or private PDF chunk read',
    path: 'pdf_files/priv1/chunks/0',
    operation: 'get',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Client-forged updatedAt timestamp on reading_series',
    path: 'reading_series/ser-1',
    operation: 'create',
    auth: { uid: 'admin1', email: 'malak.marian1984@gmail.com', email_verified: true },
    payload: { id: 'ser-1', title: 'Series', published: true, featured: false, payload: {}, updatedBy: 'admin1', updatedAt: new Date(0) },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Privilege escalation on profile update',
    path: 'users/userA',
    operation: 'update',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { role: 'admin' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Invalid document ID / oversized title',
    path: 'reading_series/invalid!id',
    operation: 'create',
    auth: { uid: 'admin1', email: 'malak.marian1984@gmail.com', email_verified: true },
    payload: { id: 'invalid!id', title: 'x'.repeat(500), published: true, featured: false, payload: {}, updatedBy: 'admin1' },
    expected: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Orphaned user library write without parent user doc',
    path: 'users/userA/library/personal',
    operation: 'create',
    auth: { uid: 'userA', email: 'a@example.com', email_verified: true },
    payload: { uid: 'userA', savedBookIds: [], bookmarks: [], progress: {}, recentBookIds: [] },
    expected: 'PERMISSION_DENIED',
  },
] as const;

export function verifyRulesStructure(rulesPath = 'firestore.rules') {
  const rulesText = readFileSync(rulesPath, 'utf8');
  const requiredClauses = [
    "rules_version = '2';",
    'allow read, write: if false;',
    'request.auth.token.email_verified == true',
    'isValidUserProfile(',
    'isValidUserPrivateInfo(',
    'isValidSiteConfig(',
    'isValidBookVolume(',
    'isValidTeamDoc(',
    'isValidCompetitionMakerDoc(',
    'affectedKeys().hasOnly',
  ];
  for (const clause of requiredClauses) {
    if (!rulesText.includes(clause)) {
      throw new Error(`Missing required security clause in ${rulesPath}: ${clause}`);
    }
  }
  return true;
}
