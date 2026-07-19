# Build Handoff — realm-nav-dialog-scoped

**Goal:** Group Realm's Draft/Kept/Presented Nav entries by their owning Dialog instead of flattening every draft, library row, and moment in the domain into one undifferentiated pool.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-18T00:00:00Z by cloud

## Done when

- `useRealmNavGrowth` groups entries by `dialog_id` instead of returning one flat domain-wide list — drafts via `kip_drafts.dialog_id` directly, kept Moments via `sourceDraftId` → `kip_drafts.dialog_id` where that lineage exists
- Each Dialog's group is labeled with that Dialog's real title, not a generic placeholder
- Anything with no resolvable `dialog_id` (older Moments predating the lineage fields, drafts that were never attached to a Dialog) is grouped under an explicit visible **"Unassigned"** group — not hidden, not deleted, not silently auto-attached anywhere
- The "Presented" bucket and its `slice(0, 8)` heuristic are left exactly as they are today — explicitly out of scope for this handoff, not touched, not "improved" as a side effect
- No backend or schema changes — `dialog_id` and the `sourceDraftId`/`sourcePointId` lineage fields already exist and are already populated going forward; this is a frontend query/grouping change only
- `pnpm run quick:web` passes
- Manual check on `/d/ke3p?board=realm`: Nav no longer reads as one flat 40-item Drafts list and one flat 47-item Kept list — it reads as multiple Dialog-scoped groups plus one Unassigned group

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `apps/web/src/v0/realm/useRealmNavGrowth.ts`, `apps/web/src/v0/realm/realmNavGrowth.ts`, `apps/web/src/v0/realm/RealmStagedNav.tsx`, `apps/web/src/v0/realm/DomainRealmStory.tsx`

**Do not touch:** `apps/api/`, `packages/database/prisma/schema.prisma`, the `libraryRows.slice(0, 8)` heuristic in `useRealmNavGrowth.ts` — leave it exactly as-is, do not fix, do not remove, do not comment further on it

## Pattern

`groupRealmNavEntries` in `realmNavGrowth.ts` already groups by stage (drafts/kept/presented) — extend that same shape to group by `dialogId` first, stage second, rather than inventing a new grouping mechanism. `RealmStagedNav.tsx` and `DomainRealmStory.tsx` already consume `byStage` — follow the same consumption pattern for `byDialog`.

## Rendr treatment

N/A — no new visual treatment prescribed. Group presentation (accordion, list, etc.) is Cursor's structural call, following existing Nav conventions.

## Verification

**Commands:** `pnpm run quick:web`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.
- Do not touch the Presented heuristic or backend/schema.

## Context

Follow-up to `document-point-moment-reconciliation` — that handoff added `Dialog.document_status` and the Moment lineage fields; this handoff is the first thing that actually uses them to fix Realm's Nav.

Chuck caught this directly: `useRealmNavGrowth` fetches drafts/library rows/moments domain-wide with zero `dialog_id` filtering — confirmed in code, not theorized. That's why Realm shows one flat 40-item Drafts list and one flat 47-item Kept list with no relationship to any specific Dialog, even though the schema now supports exactly that relationship.

Two real decisions remain deliberately unresolved and explicitly out of scope here: (1) what "Presented" status actually means — per-Document or per-item — and (2) what to actually do with the orphaned/Unassigned backlog once it's visible (Curator's job, not this handoff's). This handoff only makes the real structure visible; it does not resolve either open decision.

`draft-renders-as-document` is still open and unstarted — unrelated to this handoff, not attempted here.
