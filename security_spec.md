# Firestore Security Specification — DodaEona F.C.

## 1. Data Invariants
1. **Identity Binding**: A `/users/{userId}` document can only be created or read by the matching authenticated user (`request.auth.uid == userId`) or a verified administrator, and `incoming().uid == request.auth.uid`.
2. **Verified Email Gate**: All authenticated read/write operations on user, private PII, and admin collections require `request.auth.token.email_verified == true`.
3. **Self-Assigned Role Prevention**: Public user registration on `/users/{userId}` MUST enforce `incoming().role == 'member'`. A non-admin user cannot create a profile with `role: 'admin'` nor escalate `role` during an update.
4. **Master Gate & PII Split Isolation**: Subcollection `/users/{userId}/private/{docId}` and `/users/{userId}/library/{docId}` require the parent `/users/{userId}` document to exist via `exists()` (or `existsAfter()` on atomic batch writes), strictly restrict reads and writes to `isOwner(userId) || isAdmin()`, and prohibit blanket collection `list` queries.
5. **Immutable Audit & Ownership Fields**: `uid` and `createdAt` are immutable on user updates; `id` is immutable on catalog/entity updates; `createdAt`, `updatedAt`, and `grantedAt` must strictly equal `request.time`.
6. **Path ID & Volumetric Bounds**: All document IDs must match `^[a-zA-Z0-9_\-]+$` with length `1..128`. Strings and arrays are strictly size-bounded (`displayName <= 80`, `email <= 254`, `title <= 240`, `payload.keys().size() <= 80`, `pdf chunk <= 550000`).
7. **Admin Isolation & Draft Protection**: `/admins/{adminId}`, `/audit_logs/{logId}`, and `/newsletter_subscribers/{subId}` cannot be read or listed by non-admins. Unpublished `/reading_series/{seriesId}`, `/book_volumes/{bookId}`, `/announcements/{announcementId}`, draft `/site_config/{configId}`, and private `/pdf_files/{pdfId}` (plus `/pdf_files/{pdfId}/chunks/{chunkId}` via Master Gate `get()`) are strictly restricted to `isAdmin()`.
8. **Admin-Only Content Mutations**: All permanent website configuration, series, book volumes, PDFs, teams, team overrides, players, registrations, managers, appointments, competitions, leagues, announcements, media assets, quiz questions, and reader objectives can ONLY be created, updated, or deleted by `isAdmin()` (with scoped verified-member ownership allowed on unverified `/manager_records/{id}`, own `/simulation_matches/{id}` / `/scoreboard_matches/{id}`, and own `/competition_maker/{id}` where `createdBy == request.auth.uid` is immutable).

---

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Profile Creation**: Unauthenticated client attempts `setDoc(/users/attacker, ...)` -> **PERMISSION_DENIED**.
2. **Self-Assigned Admin Escalation on Signup**: Authenticated non-admin (`uid: 'u1'`) creates `/users/u1` with `{ role: 'admin', ... }` -> **PERMISSION_DENIED**.
3. **Cross-User Profile & Library Spoofing**: Authenticated user `u1` creates `/users/u2` or reads `/users/u2/library/personal` -> **PERMISSION_DENIED**.
4. **Shadow Field Injection ("Ghost Field")**: User `u1` or admin payload includes extra undeclared key `isVerifiedAdmin: true` -> **PERMISSION_DENIED** (`hasOnly` check).
5. **Unverified Email Spoof Attack**: User authenticates with admin email and `email_verified: false` and tries reading `/admins/any` or writing `/book_volumes/v1` -> **PERMISSION_DENIED**.
6. **Blanket PII Read by Non-Owner**: Authenticated user `u1` attempts `getDoc(/users/u2/private/info)` or `getDocs(/newsletter_subscribers)` -> **PERMISSION_DENIED**.
7. **Collection Scraping (`list`) on Protected Collections**: Authenticated user `u1` attempts `getDocs(/users)`, `getDocs(/admins)`, `getDocs(/audit_logs)`, or `getDocs(/newsletter_subscribers)` -> **PERMISSION_DENIED**.
8. **Non-Admin Publication & Team Tampering**: Regular member `u1` attempts to write `/site_config/branding`, `/book_volumes/vol-1`, `/custom_teams/team-1`, or `/manager_records/m1` with `verified: true` -> **PERMISSION_DENIED**.
9. **Draft & Private PDF Bypass**: Non-admin attempts `getDoc(/book_volumes/draft-1)` (`published: false`), `getDoc(/site_config/about_legal)` (`status: 'draft'`), or `getDoc(/pdf_files/priv-1/chunks/0)` (`accessStatus: 'private'`) -> **PERMISSION_DENIED**.
10. **Immutable Field & Client-Forged Timestamp Tampering**: Client sends `updatedAt: '2020-01-01'` or tries changing `id` / `createdAt` / `uid` on update -> **PERMISSION_DENIED**.
11. **Volumetric Denial-of-Wallet String Poisoning**: Client sends `title` > 240 chars, `displayName` > 80 chars, or oversized PDF chunk > 550000 chars -> **PERMISSION_DENIED**.
12. **Malformed Document ID / Orphaned Subcollection Write**: Client writes `/users/u1/private/invalid$id!`, `/users/u1/library/personal` without parent `/users/u1`, or `/pdf_files/missing/chunks/0` without parent PDF -> **PERMISSION_DENIED**.
