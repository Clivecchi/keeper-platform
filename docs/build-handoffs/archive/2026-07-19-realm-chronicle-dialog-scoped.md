# Build Handoff — realm-chronicle-dialog-scoped

**Superseded by:** `realm-becoming-together-parity` — absorbed unchanged, plus cast-bar/lead-agent/Ceox work added alongside it, per Chuck's request for one consolidated Forward+gaps handoff.

**Goal:** Scope Realm's Chronicle Document to the selected Dialog instead of always flattening every Dialog into one feed, wire real Path grouping through from `Moment.pathId`, and fix the lede/body text duplication in Point rendering.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-19T00:00:00Z by cloud

## Done when

- Clicking any draft/moment/library-item row in Realm Nav (existing behavior — already sets `selectedDraftId`/`selectedMomentId`/`selectedLibraryItemId` in `UniversalBoardContext`) causes Chronicle to scope its Document to that item's owning Dialog — `DomainRealmStory` renders only that Dialog's group from `byDialog`, not the flattened combination of every dialog
- A new click handler on each Dialog group's header in `RealmStagedNav` lets the user jump directly to that Dialog's Document without selecting a specific item first — adds a new `selectedDialogId` selection kind to `UniversalBoardContext`, following the exact same state shape already used for `selectedDraftId`/`selectedMomentId`/`selectedLibraryItemId`
- Selecting an item and selecting a Dialog header are mutually exclusive — same "set mine, clear the others" pattern already used across the existing selection state, applied to the new `selectedDialogId` alongside it
- Before anything is selected, Chronicle shows an explicit prompt ("Select a Dialog to see its Document") instead of the current flattened all-dialogs feed or any auto-picked default
- `DocumentShell` receives a real `paths` prop for the active Dialog's Document, built from `Moment.pathId`/`Path.name` — requires adding `pathId` and the `Path` relation (`id`, `name`) to the Prisma select in `apps/api/src/routes/v0/moments.ts`, mapping them into the JSON response, extending `KeptMomentSummary` in `v0Moments.ts`, and threading them through `momentToKeptNavEntry` into a `DocumentPathGroup[]`. Points with no resolvable path fall into the existing ungrouped bucket `buildGroups` already handles — no new fallback logic needed
- `draftToRealmNavEntry` and `momentToKeptNavEntry` (`realmNavGrowth.ts`) no longer set `lede` and `body.text` to the identical string — lede stays a short teaser (or is omitted when there's nothing shorter than the body), body always carries the full text. No duplicated text renders under any Point in `PointView`
- `pnpm run quick:web` and `pnpm run quick:api` both pass for the touched files — `quick:web` currently fails repo-wide on pre-existing, unrelated errors; confirm no NEW errors appear in any touched file
- Manual check on `/d/ke3p?board=realm`: clicking a draft or moment scopes the right panel to just that Dialog's Points; clicking a Dialog's own Nav header does the same without picking an item first; with nothing selected, the explicit prompt shows instead of a flattened feed; Points belonging to a Path render grouped under that Path's header; no duplicated text appears under any Point

## Scope

**Touch:** `apps/api/src/routes/v0/moments.ts`, `apps/web/src/v0/api/v0Moments.ts`, `apps/web/src/v0/realm/realmNavGrowth.ts`, `apps/web/src/v0/realm/useRealmNavGrowth.ts`, `apps/web/src/v0/realm/DomainRealmStory.tsx`, `apps/web/src/v0/realm/RealmStagedNav.tsx`, `apps/web/src/v0/boards/UniversalBoardContext.tsx`, `apps/web/src/v0/boards/panels/UniversalNavPanel.tsx`

**Do not touch:** `packages/database/prisma/schema.prisma`; any `apps/api/` route other than `v0/moments.ts`; `DocumentShell.tsx`/`PointView.tsx` internals; the `libraryRows.slice(0, 8)` Presented heuristic; the full Layer 1 `ChronicleSubject` rewrite.

## Context

Chuck caught this by screenshot comparison: the real `/d/ke3p?board=realm` doesn't read with the same clarity of purpose as the reference mockup. Traced to real code: (1) `DomainRealmStory.tsx` flattens every Dialog's points into one feed regardless of Nav selection; (2) `DocumentShell`'s `paths` prop never fed real data — `Moment.pathId`/`Path.name` never selected by the `/api/v0/moments` route; (3) `draftToRealmNavEntry`/`momentToKeptNavEntry` set `lede` and `body.text` to the identical string, duplicating text under every Point with a summary.

Never picked up by Cursor before being superseded — folded whole into `realm-becoming-together-parity` alongside newly found cast-bar, lead-agent, and Ceox/Chuck-identity work.
