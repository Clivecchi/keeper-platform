# Realm Arrival Module

## 📌 Purpose
Person-scoped arrival at `/home` (your personal domain as Realm) — opening remarks as Dialog Response, invitation doors inside the agent bubble, composer lead position, and Playbill in the top-left DomainSwitcher slot.

## 🧱 Key Files
- `realmArrivalMessage.ts` — builds welcome-back Dialog Response with invitation metadata
- `RealmInvitationButtons.tsx` — invitation doors inside agent message body
- `realmInvitations.ts` — shared invitation candidate logic (max four)
- `RealmFeedPanel.tsx` — Realm feed in Chronicle (via invitation; no empty stub)
- `RealmHomeChronicle.tsx` — Chronicle: user feed at `/home`; domain story at `?board=realm`
- `DomainRealmStory.tsx` — domain-scoped Document (Point) story frames via `PointView`
- `RealmStagedNav.tsx` — Dialog-scoped nav (Dialog → Drafts / Kept / Presented)
- `realmNavGrowth.ts` / `useRealmNavGrowth.ts` — Document-shaped nav data; `byDialog` + `byStage`
- `DialogCastBar.tsx` — Dialog cast bar (members, agents, access keys)
- `PresenceField.tsx` — named Treatment pattern for presence imagery
- `useRealmFeed.ts` — client feed loader
- `realmInvitationActions.ts` — invitation + feed click handlers
- `persistRealmAnchor.ts` — client anchor persistence
- `../components/PlaybillHeaderCard.tsx` — top-left anchor card; opens DomainSwitcher

## 🔄 Data & Behavior
- Anchor domain from `users.primaryDomainId` → `frame_json.kip.agent_id` → lead agent voice
- Opening remarks render as the agent's first Dialog message; invitations live inside the bubble
- Playbill lives in the top-left `PlaybillHeaderCard` + `DomainSwitcher` overlay (same slot as domain boards)
- Chronicle at arrival is quiet — no Playbill rail, no placeholder feed
- Realm home uses solid `theme-surface-page` background (no full-bleed cover wallpaper)
- Realm Nav growth groups entries by Dialog (`dialog_id` / Moment lineage), then by stage; unresolved → **Unassigned**

## ⚠️ Notes & ToDo
- [ ] Remarks content polish (story vs stats) — Section 3 of design capture
- [ ] Feed event types — expand when User-Realm Graph formalizes

## 📆 Update Log
### 2026-07-19 — DocumentShell Forward/Step on Realm
- `DomainRealmStory` passes authored `forward` + current `step` into `DocumentShell` so Realm Chronicle shows the new header (Back/Forward disabled until Layer 3)

### 2026-07-18 — Dialog-scoped Realm Nav
- `groupRealmNavEntries` groups by Dialog first, stage second; unresolved lineage → visible **Unassigned**
- `useRealmNavGrowth` resolves draft `dialog_id` (detail when list omits it) and kept Moments via `sourceDraftId` / Point-id identity keep; labels groups with real Dialog titles
- `RealmStagedNav` / `DomainRealmStory` consume `byDialog` (Presented `slice(0, 8)` heuristic untouched)

### 2026-07-17 — DocumentShell adapter
- `DomainRealmStory` fetches Realm nav-growth and hands Points to shared `DocumentShell` (no board-specific render loop)

### 2026-07-16 — Document/Point rename
- Story frames use `PointView` + shared `Document` type (was `ChronicleDocument` / `ChronicleDocumentView`)

### 2026-07-15 — Domain-scoped Realm surface
- Generalized `?board=realm` on any domain; default landing board is Realm
- Staged nav (Drafts / Kept / Presented), Dialog cast bar, go-home via Playbill header `clearSelection`
- Domain Chronicle story via `DomainRealmStory`; treatment via `ChronicleTreatmentShell`

### 2026-07-11 — v2 Section 2 arrival placement correction
- Playbill restored to top-left DomainSwitcher slot on `/home` (`PlaybillHeaderCard` + overlay)
- Removed `RealmPlaybillRail` from Chronicle; arrival Chronicle quiet unless feed has events
- Desktop Dialog merges `buildRealmArrivalMessage` into displayed messages (parity with mobile)

### 2026-07-10 — Arrival presentation corrections
- Remarks moved into Dialog Response; `RealmInvitationButtons` inside agent bubble
- Playbill restored to Chronicle rail; top bar uses read-only `LocationStrip`
- Anchor domain removed from Playbill travel list; realm home suppresses cover wallpaper
- `filterPlaybillTravelDomains` in `domainSwitcherData.ts`

### 2026-07-10 — Realm experience completion
- Invitation doors open sessions, drafts, dialogs; Chronicle feed navigates in-realm or travels cross-domain
- Anchor persistence via `PATCH /api/realm/anchor`; domain switcher uses scene-change curtain
- Mobile Dialog tab mirrors desktop arrival (remarks in dialog, playbill in chronicle)

### 2026-07-09 — Realm Arrival build (Phases 2–5)
- Wired `primaryDomainId` anchor; added realm feed API and arrival UI on `/home`
- Playbill vocabulary: uncast domains show "Agent" not "Casting"
- Added Presence Field pattern, splash curtain scene-change
