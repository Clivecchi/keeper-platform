# Realm Arrival Module

## 📌 Purpose
Person-scoped arrival at `/home` (your personal domain as Realm) — opening remarks as Dialog Response, invitation doors inside the agent bubble, composer lead position, and Playbill in the top-left DomainSwitcher slot.

## 🧱 Key Files
- `realmArrivalMessage.ts` — builds welcome-back Dialog Response with invitation metadata
- `RealmInvitationButtons.tsx` — invitation doors inside agent message body
- `realmInvitations.ts` — shared invitation candidate logic (max four)
- `RealmFeedPanel.tsx` — Realm feed in Chronicle (via invitation; no empty stub)
- `RealmHomeChronicle.tsx` — Chronicle: user feed at `/home`; domain story at `?board=realm`
- `DomainRealmStory.tsx` — domain-scoped Document: identity header + Point story via `DocumentShell`
- `dialogDocumentCache.ts` — short TTL + in-flight dedupe for Chronicle Document fetches
- `RealmStagedNav.tsx` — Dialog-scoped nav (Dialog → Drafts / Kept / Presented)
- `realmNavGrowth.ts` / `useRealmNavGrowth.ts` — Document-shaped nav data; `byDialog` + `byStage`
- `DialogCastBar.tsx` — `RealmCastAccessActions` (Invite / Get key / Manage trailing chrome); agent chips live on shared `CastCueBar`
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
### 2026-08-22 — Literally inline Document
- Title save is explicit (`onTitleSave`). Forward and Points edit in place in `DocumentShell`.

### 2026-08-22 — Inline Document authoring
- `DomainRealmStory` no longer opens Dialog Config for Manage. Pencil + `useDocumentAuthoring` writes title, Forward, stage, Sections, and Points on the Document page.

### 2026-08-22 — Every Document resolves Forward
- `DomainRealmStory` always resolves a Forward for the focused Dialog Document (authored fields, else Dialog title). Manage writes Forward title + description. Finding the Plot and Becoming Together share the same shell.

### 2026-08-22 — Linked Drafts as Document Sections
- `DomainRealmStory` lists working drafts linked to the Dialog (`dialog_id`) with registered `document_components`. Opening a Section is Draft select — Talking in stays on the Dialog.

### 2026-08-20 — Document refresh after Point writes
- `DomainRealmStory` invalidates `dialogDocumentCache` and reloads when `draftPresenceRevision` bumps (Dialog `draft.update.propose` already called `bumpDraftPresence`; Chronicle stayed stale for the 45s TTL).

### 2026-08-19 — Document identity header
- `DomainRealmStory` mounts `DocumentHeader` for every named Dialog Document (same header job as Draft). Empty Documents no longer use Realm idle copy.

### 2026-08-17 — External writing ingest
- `DomainRealmStory` empty Document + `DocumentShell` "Add writing from outside Keeper" open the Chronicle ingest Act (attach to the focused Dialog).

### 2026-08-11 — Document / History tab cleanup
- `DomainRealmStory` Chronicle tabs are underline text (not pill chips).

### 2026-08-11 — Document Point Accept (Phase 3)
- `DomainRealmStory` wires `useDraftPointAccept` into `DocumentShell` — Accept proposed manuscript Points in place; reloads Document after success; does not select the manuscript draft in Nav.

### 2026-08-11 — Drafts never render as Document Points
- `DomainRealmStory` filters all `kind: draft` nav entries out of the Point sequence. Registered drafts stay in DocumentShell’s component strip only.

### 2026-08-11 — Document components display only
- `DomainRealmStory` still hydrates/opens `document_components` in DocumentShell. Registration is draft-first on draft Chronicle (selection cannot hold Dialog + Draft at once).

### 2026-08-06 — Document UX ship wiring
- `manuscriptPointsToRealmNavEntries` attaches `gloss.snapshot` + `revisedAt`.
- `DomainRealmStory` prefetches gloss-carrier threads for **Glossed** badges; reloads Document after Point rewrite; Search / Style:Vibe / capture live in sibling board+shell modules.

### 2026-08-06 — Document Point Gloss snapshot
- `manuscriptPointsToRealmNavEntries` attaches `gloss.snapshot` (title + body) so Chronicle Document Gloss can send Point content to Kip without Dialog sprawl.

### 2026-08-03 — Realm Nav uses shared accent Treatment (not full shell)
- `RealmStagedNav` no longer wraps with `ChronicleTreatmentShell`; accent presence comes from `UniversalNavPanel`'s `TreatmentAccentShell`.
- Dialog-group selected state uses `--treatment-color` wash/border; stage/Dialog titles use `.keeper-treatment-title`.

### 2026-08-03 — dialogCueing rename (Pass 1, comments only)
- `DialogCastBar.tsx`: comment references to `BoardInstrumentsBar` updated to `CastCueBar` (see `docs/dialog-cueing-plan.md`). No behavior change.

### 2026-08-02 — Nav: stop Untitled flood + surface Dialog load failure
- Realm Nav no longer seeds blank-titled Dialogs as "Untitled dialog"; uses `forward_title` when `title` is empty.
- Draft rows use `draftNavLabel` (kind · status) for generic/repeated titles — same as Universal Nav.
- If Dialogs request fails and every content source is empty, Nav shows an error instead of a silent empty panel.

### 2026-08-01 — Document/History tabs no longer shadowed by Realm feed
- On `/home` with a Dialog selected, `userFeedContent` previously short-circuited both Chronicle tabs into the same flat Realm feed. Dialog scope now mounts `DocumentShell` / `ChronicleHistoryPanel` via `resolveChroniclePanelBody`; arrival feed stays idle-only.

### 2026-07-28 — Chronicle Document one-round-trip
- `DomainRealmStory` uses `GET …/kip/dialogs/:id/document` via `KipApi.getDialogDocument` + `dialogDocumentCache` (no domain-wide drafts list, no sequential manuscript GETs).

### 2026-07-26 — Cast Notes on Document Points
- `manuscriptPointsToRealmNavEntries` attaches `Point.cast.notes` from `DraftPoint.castNotes` + sibling Points with `referencesPointId` (those siblings are not Path cards). Gloss anchors wired for manuscript Points.
- Chronicle `PointView` **Cast · N** opens the same voice-card chrome as Dialog.

### 2026-07-25 — Nav: hide manuscript peer row
- `useRealmNavGrowth` filters `document_manuscript` drafts out of Nav Drafts — Dialog appears once under Dialogs; Points still expand in Chronicle via `DomainRealmStory`.

### 2026-07-23 — becoming-together-complete (real Document content)
- `DomainRealmStory` loads Forward/Step/document_paths from the Dialog — hardcoded placeholders removed.
- Manuscript drafts (`document_manuscript`) expand `spec_json.points` into Document Points with cast voice + Path grouping via `buildDocumentPaths` / `manuscriptPointsToRealmNavEntries`.

### 2026-07-22 — realm-home-chronicle-routing
- `RealmHomeChronicle` — when a Dialog (or Document-scoped draft/moment/library) is selected on `/home`, render `DomainRealmStory` instead of short-circuiting on `isUserHome`.
- Idle `/home` Chronicle shows a visible "Select a Dialog…" empty state (or feed when events exist), not an `aria-hidden` empty node.

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
