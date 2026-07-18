# Build Handoff — document-point-moment-reconciliation

**Goal:** Reconcile Draft and ChronicleDocument into one Document per Dialog, where Points become Moments with identity preserved when kept, Paths get assigned at keep-time, and a reusable Document container shell replaces the one-off Realm implementation.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-16T00:00:00Z by cloud

## Done when

- `ChronicleDocument` interface/component renamed `Document`/`PointView` across the codebase (`packages/shared/src/chronicleDocument.ts` and all real references found in the July 2026 diagnostic), zero visual change from this part alone
- Each Dialog resolves to exactly one Document — Cursor designs the concrete schema/relationship and documents the approach in the PR description
- Drafts/Kept/Presented is represented as a status on that one Document, not a separate model requiring a conversion step — Cursor's call whether `kip_drafts` is repurposed or migrated, documented in the PR
- An accepted Point becomes a Moment with identity carried through — no delete-and-recreate of a disconnected row. `promoteDraftPoint.ts` is the concrete file this replaces; some real, traceable link (same id or explicit lineage reference) must connect the originating Point to the resulting Moment
- After a Moment is kept, new Points can still be proposed against it as candidate evolutions; keeping one of those evolves the existing Moment rather than creating an unrelated new one
- Path assignment happens in the same action as keeping when a Path is already known; a Moment can be kept without a Path when none exists yet, assigned later once one forms — extends the existing `DraftPathEmergence` clustering behavior, does not replace it
- A universal Document container shell (cover + Points in, rendered sequence out) exists and is used by Realm's `DomainRealmStory` — no board-specific duplicate of that render loop remains
- Dialog gains a DELETE route in `kip-dialogs.ts`, mirroring the existing create/rename/archive pattern in the same file
- The Domain → Keeper → Journey → Path → Moment Prisma model definitions themselves are not restructured or flattened — this changes how Document/Point relate to and populate that hierarchy, not the hierarchy's own shape
- `pnpm run quick:web`, `pnpm run quick:api`, and `pnpm run smoke` all pass
- Realm (`/d/:slug?board=realm`) and Library focus presence show no visual regression from the rename portion of this work

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `packages/shared/src/chronicleDocument.ts`, `packages/shared/src/draftPoints.ts`, `apps/web/src/v0/presence/chronicleDocument/`, `apps/web/src/v0/presence/cover/`, `apps/web/src/v0/presence/DraftPointsSection.tsx`, `apps/web/src/v0/presence/DraftPointRow.tsx`, `apps/web/src/v0/presence/integrationChronicle/draftManuscriptUtils.ts`, `apps/web/src/v0/realm/`, `apps/web/src/v0/boards/UniversalBoardDefinition.ts`, `apps/api/src/services/kip/promoteDraftPoint.ts`, `apps/api/src/api/domains/kip-drafts.ts`, `apps/api/src/api/domains/kip-dialogs.ts`, `packages/database/prisma/schema.prisma`, `docs/chronicle-document-architecture.md`

**Do not touch:** `apps/api/src/api/journey/domain-integrated-routes.ts`

## Pattern

Dialog already has create (POST) and rename/archive (PATCH) in `kip-dialogs.ts` — mirror that pattern for the new DELETE route. `DraftPathEmergence` clustering in `draftManuscriptUtils.ts` is the existing precedent for Path-forms-from-Points — extend it, do not reinvent it.

## Rendr treatment

N/A — not a presence job. Any color/font/spacing/layout change in the diff beyond what's needed to keep existing rendering working is out of scope — revert it. Structural/behavioral change only.

## Verification

**Commands:** `pnpm run quick:web`, `pnpm run quick:api`, `pnpm run smoke`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.** Chuck explicitly chose this.
- Codebase wins over docs when they conflict.
- The Domain → Keeper → Journey → Path → Moment Prisma models stay structurally intact — additive/relational changes only, no restructuring.
- Commit in logical, reviewable chunks (rename → schema → promotion logic → container shell → Dialog delete) so `cloud`'s history stays legible without a PR diff to review it through. All verification commands must pass before each commit.

## Context

This is intentionally one large handoff, not a slice of one — Chuck's explicit direction, overriding the schema's default small-bounded-task guidance for this task. Schema design and migration mechanics are Cursor's call to make and document in commit messages, per the router table (schema design and architectural reasoning is `cursor` territory, not something Cloud pre-solves).

The one hard constraint: the Domain → Keeper → Journey → Path → Moment Prisma models stay structurally intact — additive/relational changes only, no restructuring.

Explicitly out of scope for this handoff: Library-to-Document rendering, and any recently-modified-Nav or Document↔Library link work — that's a presence job blocked on a real Rendr treatment, not included here.

**No PR review gate on this handoff** — Chuck chose `commit: true, open_pr: false`. Commit discipline (small, logical, verified commits) is the only safety net now, since there's no diff review before it's live on `cloud`.

Supersedes `chronicledocument-to-document-rename` (archived in `archive/2026-07-16-chronicledocument-to-document-rename.*`) — that was the narrow first slice; this replaces it with the full scope.
