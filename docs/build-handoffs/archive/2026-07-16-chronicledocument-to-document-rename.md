# Build Handoff — chronicledocument-to-document-rename

**Goal:** Rename the ChronicleDocument interface/component to Document and its atomic-card type to Point across the codebase, with zero behavior or visual change.
**Territory:** cursor
**Branch:** cloud/handoff/chronicledocument-to-document-rename
**Created:** 2026-07-16T00:00:00Z by cloud

## Done when

- The interface in `packages/shared/src/chronicleDocument.ts` is renamed `Document` (file may be renamed `chronicleDocument.ts` → `document.ts`, or kept — Cursor's call, note the rename in the PR description either way)
- `ChronicleDocumentView` component is renamed `PointView` (a container/shell split isn't in scope here — straight rename is enough for this handoff)
- All real references found in the July 2026 diagnostic are updated: `packages/shared/src/chronicleDocument.ts`, `apps/web/src/v0/presence/chronicleDocument/ChronicleDocumentView.tsx`, `.../libraryItemDocumentAdapter.ts`, `.../libraryRoadmapDocument.ts`, `.../LibrarySharedContextRoadmapPanel.tsx`, `apps/web/src/v0/presence/cover/LibraryItemFocusPresence.tsx`, `apps/web/src/v0/realm/DomainRealmStory.tsx`, `apps/web/src/v0/realm/realmNavGrowth.ts`, `apps/web/src/v0/boards/UniversalBoardDefinition.ts`
- `docs/chronicle-document-architecture.md` status line updated to note the rename has landed (do not rewrite the doc's history — just flip the status line at the top)
- `pnpm run quick:web` passes with no new type errors
- `pnpm run smoke` passes
- Visual output in Realm (`/d/:slug?board=realm`) and Library focus presence is pixel-identical before and after — this is a naming pass, not a redesign

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `packages/shared/src/chronicleDocument.ts`, `apps/web/src/v0/presence/chronicleDocument/`, `apps/web/src/v0/presence/cover/LibraryItemFocusPresence.tsx`, `apps/web/src/v0/realm/DomainRealmStory.tsx`, `apps/web/src/v0/realm/realmNavGrowth.ts`, `apps/web/src/v0/boards/UniversalBoardDefinition.ts`, `docs/chronicle-document-architecture.md`

**Do not touch:** `packages/database/prisma/schema.prisma`, `apps/api/src/services/kip/promoteDraftPoint.ts`, `apps/api/src/api/domains/kip-drafts.ts`, `apps/api/src/api/domains/kip-dialogs.ts`

## Pattern

None — naming-only rename, not introducing a new pattern. Do not change any field shapes, only identifiers.

## Rendr treatment

N/A — not a presence job. No visual change of any kind. If a diff changes a color, font, spacing, or layout value, that's out of scope for this handoff — revert it.

## Verification

**Commands:** `pnpm run quick:web`, `pnpm run smoke`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- Small focused diff — this is a rename, the diff should read like one.
- Do not commit unless Chuck asks.
- Codebase wins over docs when they conflict.

## Context

First of a five-handoff sequence — see `docs/chronicle-document-architecture.md`, section "Decided (2026-07-15): Draft and Document reconcile into one thing," for full context.

This handoff is deliberately narrow: **naming only**. Do NOT attempt the Draft/Document reconciliation, the Point-becomes-Moment promotion fix, or the universal container-shell extraction in this PR — those are separate, later handoffs, in that order, and two of them (Draft reconciliation, promotion fix) need a design review before any code gets written, because they touch how Points become Moments in the real Domain→Keeper→Journey→Path→Moment hierarchy. This handoff exists only to unblock those without forcing them to land on the old `ChronicleDocument` name.
