# Build Handoff — draft-renders-as-document

**Goal:** Unify Draft's Focus-mode rendering onto the shared DocumentShell/PointView shell, so a Draft looks structurally identical to any other Document — differing only by status — without losing any of its accept/discuss/rewrite/promote functionality.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-20T00:00:00Z by cloud (originally scoped 2026-07-16)

## Done when

- `DraftFocusPresence` renders through `DocumentShell` (cover = draft identity/title/status, Points = the draft's DraftPoints) instead of its own bespoke layout
- Each point renders via `PointView` (or `PointView` extended with an optional action-slot) for identity/title/body/status/gloss — same card shape as a kept Moment or Library item, viewed side by side
- Accept, discuss, rewrite, and promote remain fully functional per point — this is a restructure, not a functionality cut. If any of these can't fit cleanly into `PointView`'s existing read-only shape, extend `PointView` with an optional action-slot prop rather than forking a second component
- Path clustering (`DraftPathEmergence` / `clusterDraftPoints`) still visibly groups points when paths exist, using the same `DocumentPathGroup`/`buildGroups` presentation now shared with Realm's real Path grouping — not a separate clustering UI
- `DocumentShell`'s `forward`/`step` props (shipped since this handoff was first written — see `document-forward-step`) are handled sanely for a Draft: either omitted, or given Draft-appropriate content — Cursor's call, documented, since a Draft's own "authored destination" framing wasn't designed when Forward/Step shipped
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

**Do not touch:** `apps/api/`, `packages/database/prisma/schema.prisma`, the Realm/ke3p data consolidation work (`ke3p-becoming-together-consolidation`, shipped) — unrelated, don't touch dialogs/drafts data.

## Pattern

`DocumentShell`/`PointView` is already treatment-compliant and already reused by `DomainRealmStory` as a thin adapter, now including real `forward`/`step`/`paths` support (shipped since this handoff was first scoped) — extend that same pattern here, do not build a third rendering path. `DraftPointRow` already uses theme tokens correctly (`hsl(var(--theme-...))`) — carry the same tokens forward, do not replace with new hardcoded values.

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

Oldest still-open handoff in the sequence, originally scoped 2026-07-16 — deliberately sequenced to run *after* `document-forward-step` and the Realm/ke3p consolidation work, both now shipped, so this doesn't need to be redone once `DocumentShell`'s shape settled.

Chuck caught this directly back on 2026-07-16: after `document-point-moment-reconciliation` shipped, Draft still visually looked different from Document, which exposed that "Draft and Document becoming one thing" had only happened in the schema, not on screen. This handoff closes that gap.

Since it was first written, `DocumentShell` gained real `forward`/`step` props (`document-forward-step`) and ke3p's own data was consolidated into a real "Becoming Together" Dialog with archived drafts converted to Library items (`ke3p-becoming-together-consolidation`) — good context for what Realm's real data looks like now, though unrelated to this handoff's scope.

**Explicitly NOT in scope:** self-organizing behavior (Document actively shaping itself as a Dialog proceeds) — that remains a separate, parked, not-yet-designed thread. Do not attempt it here; this handoff is about one shell rendering both states of the same thing, not about the surface organizing itself.
