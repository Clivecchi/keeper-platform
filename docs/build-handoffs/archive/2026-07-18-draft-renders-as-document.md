# Build Handoff — draft-renders-as-document

**Goal:** Unify Draft's Focus-mode rendering onto the shared DocumentShell/PointView shell, so a Draft looks structurally identical to any other Document — differing only by status — without losing any of its accept/discuss/rewrite/promote functionality.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-16T00:00:00Z by cloud

## Done when

- `DraftFocusPresence` renders through `DocumentShell` (cover = draft identity/title/status, Points = the draft's DraftPoints) instead of its own bespoke layout
- Each point renders via `PointView` (or `PointView` extended with an optional action-slot) for identity/title/body/status/gloss — same card shape as a kept Moment or Library item, viewed side by side
- Accept, discuss, rewrite, and promote remain fully functional per point — this is a restructure, not a functionality cut. If any of these can't fit cleanly into `PointView`'s existing read-only shape, extend `PointView` with an optional action-slot prop rather than forking a second component
- Path clustering (`DraftPathEmergence` / `clusterDraftPoints`) still visibly groups points when paths exist, using the same Path-grouping presentation already established elsewhere in Chronicle rather than a separate clustering UI
- Status differences (proposed vs accepted vs promoted, and Drafts vs Kept vs Presented) show only through the existing status/tone mechanism already used elsewhere — no new bespoke styling introduced for this
- No new colors, fonts, or spacing values — `DraftPointRow.tsx` already uses theme tokens correctly (`hsl(var(--theme-ink-primary))` etc.); carry those same tokens through, do not hardcode anything new
- `DraftPointsSection.tsx`, `DraftPointRow.tsx`, and `DraftFilmStrip.tsx` are either retired (if fully superseded) or reduced to thin wrappers around `DocumentShell`/`PointView` — Cursor's call which, documented in commit messages
- `pnpm run quick:web` passes
- Manual check: opening a Draft and opening a kept Moment or Library item in Focus mode show the same card shape and layout, differing only by which status and which actions are present

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `apps/web/src/v0/presence/cover/DraftFocusPresence.tsx`, `apps/web/src/v0/presence/DraftPointsSection.tsx`, `apps/web/src/v0/presence/DraftPointRow.tsx`, `apps/web/src/v0/presence/integrationChronicle/DraftFilmStrip.tsx`, `apps/web/src/v0/presence/chronicleDocument/DocumentShell.tsx`, `apps/web/src/v0/presence/chronicleDocument/PointView.tsx`, `apps/web/src/v0/presence/integrationChronicle/draftManuscriptUtils.ts`

**Do not touch:** `apps/api/`, `packages/database/prisma/schema.prisma`

## Pattern

`DocumentShell`/`PointView` is already treatment-compliant and already reused by `DomainRealmStory` as a thin adapter (see prior handoff) — extend that same pattern here, do not build a third rendering path. `DraftPointRow` already uses theme tokens correctly (`hsl(var(--theme-...))`) — carry the same tokens forward, do not replace with new hardcoded values.

## Rendr treatment

N/A — no new visual treatment. This is structural reuse of an already treatment-compliant shell, not a redesign.

## Verification

**Commands:** `pnpm run quick:web`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.
- No functionality regression — accept/discuss/rewrite/promote must all still work.

## Context

Follow-up to `document-point-moment-reconciliation` (archived) — that handoff reconciled the data model (Document type, identity-preserving promotion) but left Draft's actual screen rendering through its own separate, untouched components.

Chuck caught this directly: after the prior handoff shipped, Draft still visually looked different from Document, which exposed that "Draft and Document becoming one thing" had only happened in the schema, not on screen. This handoff closes that gap.

**Explicitly NOT in scope:** self-organizing behavior (Document actively shaping itself as a Dialog proceeds) — that remains a separate, parked, not-yet-designed thread, same as Curator. Do not attempt it here; this handoff is about one shell rendering both states of the same thing, not about the surface organizing itself.
