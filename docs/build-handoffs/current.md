# Build Handoff — realm-becoming-together-parity

**Goal:** Bring Realm's real board into parity with the Becoming Together reference Document: Chronicle scoped per-Dialog with real Path grouping and no text duplication, the cast bar correctly placed and populated (Kip as lead, Ceox representing Chuck), on top of the already-shipped Document/Point/Forward/Step shell.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-19T00:00:00Z by cloud

---

## Forward — the end state, not built yet in full

Realm's real board (`/d/ke3p?board=realm`) should read the way the **Becoming Together** reference Document reads: one Dialog, one scoped Document, Points grouped by Path when more than one thread is active, a Forward/Step header stating the authored destination and the live tip, and a cast bar in the header showing exactly who is building this — **Kip as lead/director, Cloud and Rendr as instruments, Ceox representing Chuck by default.**

Beyond this handoff (not now, named so it isn't lost): Kip should direct the conversation the way `docs/universal-board-dialog-orchestration.md` already describes as **`director` mode** — composer always Kip, other instruments invoked *by* Kip as delegated sub-turns, not swapped into the composer one at a time the way it works today. That doc already calls today's one-at-a-time swap an anti-pattern to migrate away from, not the target.

## Current Step — verified against real code and git history, not assumed

- **Shipped:** Document/Point/Forward/Step shell (`document-point-moment-reconciliation`, `document-forward-step`). Nav is Dialog-scoped (`realm-nav-dialog-scoped`).
- **Not yet scoped:** Chronicle itself still flattens every Dialog into one feed, has no real Path data, and duplicates Point text. This is this handoff's core.
- **Cast bar — partially working, not broken the way it looks:** `DialogCastBar.tsx` correctly renders a lead chip whenever `leadAgentSlug` is set (lines 167–175, confirmed by reading the component directly) and correctly reads a real members list. Two real, separate problems, not one:
  1. It mounts in the composer footer (`KeeperDialogFrame.tsx`), not the header — there has never been a real header cast slot to begin with.
  2. `ke3p`'s own lead-agent binding (`Domain.settings.primaryAgentId`, resolved in `apps/api/src/services/domains/resolveDomainLeadAgent.ts`) currently points at the **Cloud** agent record, not Kip — that's why the lead chip has read "Cloud." Kip was never filtered out by a bug; this domain's own data just isn't pointing at Kip. Confirm this against ke3p's actual data before changing it.
  3. Human members render with raw `member.name` (line 191) — no persona resolution exists at all, which is why Chuck's real name shows instead of Ceox.

## Known gaps explicitly OUT of this handoff's scope

Named so they don't get silently guessed at later:

- **Full director-mode orchestration** — separate, larger initiative, the clear next horizon after this lands, not part of this handoff.
- **Agent-permission/escalation boundary for Ceox** — parked, not designed. Chuck's own framing: Ceox can represent him "unless or until Ceox or another agent requires my permission or own input," but no mechanism for that trigger exists anywhere in this codebase today (confirmed by search — nothing resembling agent-to-human escalation exists).
- **`draft-renders-as-document`** — older, separate, still queued to run *after* this lands (unifies Draft's own rendering onto `DocumentShell`).

## Done when

- Chronicle scopes to one Dialog's Points — derived from clicking any draft/moment/library-item row (existing selection state), or from a new direct click on a Dialog's own Nav header — instead of `DomainRealmStory` flattening every Dialog into one feed. The two selection paths are mutually exclusive, same "set mine, clear the others" pattern already used for `selectedDraftId`/`selectedMomentId`/`selectedLibraryItemId`
- Before any Dialog is selected, Chronicle shows an explicit "Select a Dialog to see its Document" prompt — not the current flattened all-dialogs feed, not an auto-picked default
- `DocumentShell` receives a real `paths` prop built from `Moment.pathId`/`Path.name` — Prisma select added in `apps/api/src/routes/v0/moments.ts`, mapped through `KeptMomentSummary` in `v0Moments.ts`, threaded through `momentToKeptNavEntry` into a `DocumentPathGroup[]`. Points with no resolvable path fall into the existing ungrouped bucket `buildGroups` already handles
- `draftToRealmNavEntry` and `momentToKeptNavEntry` (`realmNavGrowth.ts`) no longer set `lede` and `body.text` to the identical string — lede is a short teaser or omitted, body always carries the full text
- `DialogCastBar` renders inside Dialog's header, not the composer footer where it renders today — the header has never had a real cast slot; add one, don't repurpose the breadcrumb-only banner
- ke3p domain's lead-agent binding investigated and, if simply misconfigured, corrected: `Domain.settings.primaryAgentId` currently resolves to the Cloud `kip_agents` row for this domain. Chuck has been explicit Kip should direct this domain's Dialog. If the binding is just stale data, correct it; if it's intentional for some reason not visible in code, **stop and report back rather than overwrite silently**
- `DialogCastBar` resolves a human member to a linked personal-agent display name when one exists, instead of always rendering raw `member.name` — Chuck and Ceox appear as **one chip** ("Ceox"), on by default, not two. Chuck typing directly in the composer remains attributed to him as the human — no separate identity selector is introduced or required for that
- `pnpm run quick:web` and `pnpm run quick:api` pass for every file this handoff touches — `quick:web` currently fails repo-wide (~108 pre-existing errors across ~33 files, none in this handoff's scope); don't fix those, just don't add new ones
- Manual check on `/d/ke3p?board=realm`: Chronicle shows one Dialog's Document at a time with Path-grouped, non-duplicated Points; the cast bar renders in the header showing Kip (lead), Cloud, Rendr, and a single Ceox chip; Kip is visibly present, not missing

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md
- @docs/universal-board-dialog-orchestration.md

## Scope

**Touch:** `apps/api/src/routes/v0/moments.ts`, `apps/web/src/v0/api/v0Moments.ts`, `apps/web/src/v0/realm/realmNavGrowth.ts`, `apps/web/src/v0/realm/useRealmNavGrowth.ts`, `apps/web/src/v0/realm/DomainRealmStory.tsx`, `apps/web/src/v0/realm/RealmStagedNav.tsx`, `apps/web/src/v0/realm/DialogCastBar.tsx`, `apps/web/src/v0/boards/UniversalBoardContext.tsx`, `apps/web/src/v0/boards/panels/UniversalNavPanel.tsx`, `apps/web/src/v0/components/dialog/KeeperDialogFrame.tsx`, `apps/web/src/v0/boards/UniversalConversation.tsx`, and ke3p's `Domain.settings.primaryAgentId` data (investigate via `apps/api/src/services/domains/resolveDomainLeadAgent.ts`).

**Do not touch:** `packages/database/prisma/schema.prisma` (no schema change needed anywhere here); any `apps/api/` route other than `v0/moments.ts`; `DocumentShell.tsx`/`PointView.tsx` internals; the `libraryRows.slice(0, 8)` Presented heuristic; the full Layer 1 `ChronicleSubject` rewrite; full director-mode orchestration; any agent-permission/escalation model for Ceox.

## Pattern

`UniversalBoardContext.tsx` already has a "set mine, clear the others" shape for `selectedDraftId`/`selectedMomentId`/`selectedLibraryItemId` — add `selectedDialogId` following that identical shape. `DocumentPathGroup` and `buildGroups` already handle Path grouping plus an ungrouped fallback — just needs real `pathId`/`pathName` threaded in. `DialogCastBar.tsx` already pushes a lead chip when `leadAgentSlug` is set (lines 167–175) and already has a `kind: "person" | "agent"` chip shape — extend the person-chip path to check for a linked personal-agent identity before falling back to `member.name`, rather than building a new chip type. The existing `Journey: { select: { id: true, name: true } }` clause in `apps/api/src/routes/v0/moments.ts` is the direct precedent for the `Path` relation select.

## Rendr treatment

N/A — no new visual treatment prescribed. Cast bar header placement should match existing header conventions in `KeeperDialogFrame.tsx`; empty-state prompt matches existing quiet copy style already used in `DomainRealmStory`'s `emptyState`.

## Verification

**Commands:** `pnpm run quick:web`, `pnpm run quick:api`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.
- No new colors or hardcoded values — reuse existing theme tokens and copy style.
- If ke3p's lead-agent binding looks intentional rather than stale, stop and report back — do not overwrite domain data on a guess.
- Do not attempt director-mode orchestration or a Ceox permission-escalation model in this handoff — both are explicitly out of scope, named above so they aren't rebuilt on a guess later.

## Context

Consolidated handoff replacing `realm-chronicle-dialog-scoped` (archived, absorbed unchanged into this one). Chuck asked directly for one document describing current state, end-state goals, and known gaps, rather than another narrow slice — after comparing two real screenshots of `/d/ke3p?board=realm` against the Becoming Together reference Document and finding it didn't match either time.

Sequencing: `draft-renders-as-document` is older, separate, and still queued to run *after* this lands.
