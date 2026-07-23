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
- `DialogCastBar.tsx` — `RealmCastAccessActions` (Invite / Get key / Manage trailing chrome); agent chips live on shared `BoardInstrumentsBar`
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
### 2026-07-22 — Header cast + multi-select
- Cast identity in `DirectorCastHeader` (Lead + available); Invite / Get key / Manage trail the header
- Composer `BoardInstrumentsBar` multi-selects Cloud + Rendr alongside always-on Kip (`instrumentMultiSelect`)
- Dialog replies stamp engaged collaborators (`With …`) — not multi sub-turn delegation

### 2026-07-20 — Director-mode unification
- Agent roster + invocation moved to shared `BoardInstrumentsBar` in the composer footer (same pattern as Domain / IDE / Designer)
- `DialogCastBar.tsx` now exports `RealmCastAccessActions` only — Invite / Get key / Manage as trailing actions when `castBar: true`
- Header `.dialog-header-cast` slot removed; `castBar` no longer means a separate invocation UI
- *(Header identity restored 2026-07-22 with manage chrome; invoke remains at composer.)*

### 2026-07-19 — Cast bar Ceox / personal-agent chip
- `DialogCastBar` resolves the signed-in member to their primary-domain lead display name (Chuck → Ceox) — one person chip, not raw `member.name`
- Personal-agent slug is excluded from support-agent chips so the human and their persona never double-render
- Investigated ke3p `settings.primaryAgentId`: already points at Kip (matches `frame_json.kip.agent_id`); no data overwrite
- *(Person-chip roster retired 2026-07-20 — domain lead still surfaces as an instrument chip via `domainDirectorBoardInstruments`.)*

### 2026-07-19 — Cast bar in Dialog header
- `DialogCastBar` mounts in `KeeperDialogFrame` header (`.dialog-header-cast`), not the composer footer
- *(Superseded 2026-07-20 — footer BoardInstrumentsBar.)*

### 2026-07-19 — Path grouping + Point lede/body split
- `momentToKeptNavEntry` carries `pathId` / `pathName` from kept Moments; `DomainRealmStory` builds `DocumentPathGroup[]` for `DocumentShell`
- `draftToRealmNavEntry` / `momentToKeptNavEntry` use `pointLedeFromBody` so lede is a short teaser (or omitted), body always holds full text

### 2026-07-19 — Chronicle Dialog-scoped Document
- `DomainRealmStory` no longer flattens every Dialog — scopes Points to `selectedDialogId` or the Dialog owning the selected draft/moment/library row
- Empty state prompt: "Select a Dialog to see its Document" until a scope is set
- `RealmStagedNav` Dialog headers are clickable (`onDialogSelect`); mutually exclusive with row selection
- Realm board Chronicle stays on `DomainRealmStory` for dialog/draft/moment/library subjects (not entity Focus presence)

### 2026-07-19 — Realm Nav request-storm fix
- `useRealmNavGrowth` no longer detail-fetches every draft — uses list `dialogId` + `pointIds`; only one-off GETs for Moments whose `sourceDraftId` is outside the list
- In-flight dedupe so Nav + Chronicle sharing the hook do not double-load the same domain

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
