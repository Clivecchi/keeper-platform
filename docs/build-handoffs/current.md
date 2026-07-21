# Build Handoff — realm-director-mode-unification

**Goal:** Unify agent-invocation across boards that declare `dialogOrchestration: 'director'` — Domain/Realm uses `DialogCastBar`, IDE and Designer use a different component, `BoardInstrumentsBar`. Same declared orchestration mode, two different implementations. Replace with one shared mechanism.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-21T00:00:00Z by cloud

## Why this exists

Chuck flagged this directly: *"why is Realm starting to look different than the rest of the universal boards... not following the universal pattern."* Confirmed real, not paranoia, by reading `UniversalBoardDefinition.ts` directly: IDE declares `boardInstruments: ['cloud','rendr']`, Designer declares `boardInstruments: ['kip']`, Domain/Realm declares `castBar: true` with no `boardInstruments` at all. All three declare `dialogOrchestration: 'director'` — but two genuinely different components implement it.

## Two smaller things from the same round, already fixed directly (not part of this handoff)

1. **Nav noise** — `GET /api/library-items` had no category filter, so the 78 archive-tagged `LibraryItem`s from the ke3p consolidation were flooding Realm's Kept nav bucket unfiltered. Fixed: excludes `category: archive` by default now (commit `6afa46b7`), matching the `includeArchived` pattern already used for dialogs.
2. **Dialog auto-creation drift** — ke3p kept spawning new dialogs on every board visit because `findOrCreateKipDialog`'s reuse lookup (`domain + scope + user_id + board + frame`) never matched how "Becoming Together" was originally created (`user_id: null`, `available_to: ['admin']`, `context.board: 'realm'`). Real sessions use `user_id: Chuck's id`, `available_to: ['keeper']`, `context.board: 'domain'`, `context.frame: 'conversation'`. Fixed directly — updated Becoming Together's binding to match real usage, archived the one duplicate that had already spawned (verified empty first, 0 messages). Both fixes verified by direct query, not assumed: ke3p is back to exactly 1 active dialog, 17 clean Kept library items.

## Done when (this handoff — the one that's real design work, not a patch)

- One shared component/pattern renders agent roster + invocation for every board declaring `dialogOrchestration: 'director'` — do not keep two parallel implementations of the same concept
- Cursor decides and documents which existing component wins (`DialogCastBar` extended to cover `BoardInstrumentsBar`'s job, or vice versa, or a new shared component both delegate to) — real design decision, not a mechanical merge; document the reasoning in the commit message
- The lead agent (`directorAgentSlug`) always renders distinctly from invocable instruments in the unified component, on every board — matching the distinction `DialogCastBar` already draws (lead chip vs. support-agent chips)
- Clicking an instrument still invokes it the same way it does today on each board (`onInvokeAgent` / `activeBoardInstrumentSlug` wiring preserved) — presentation unification, not a behavior change to which boards can invoke which agents
- IDE, Designer, and Domain/Realm boards all visually read as the same underlying pattern afterward — verified by comparing screenshots, not just by reading the code
- No change to which boards declare which instruments (IDE's `['cloud','rendr']`, Designer's `['kip']`, Domain's cast roster) — unifies the rendering, not the assignments
- `pnpm run quick:web` passes
- Manual check: `/d/ke3p?board=realm`, `?board=ide`, and Designer board all show agent invocation through the same visual/interaction pattern

## Canon (read first)

- @AGENTS.md
- @docs/universal-board-dialog-orchestration.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `apps/web/src/v0/realm/DialogCastBar.tsx`, `apps/web/src/v0/boards/components/BoardInstrumentsBar.tsx`, `apps/web/src/v0/components/dialog/KeeperDialogFrame.tsx`, `apps/web/src/v0/boards/UniversalBoardDefinition.ts` (only if the `castBar`/`boardInstruments` board-def fields themselves need to become one field — Cursor's call, document it).

**Do not touch:** `packages/database/prisma/schema.prisma`; `apps/api/`; the actual full "director" mode target behavior (Kip-only composer, Cloud/Rendr invoked as delegated sub-turns with action cards) — this handoff unifies today's two partial implementations, it does not build the real director-mode delegation model described in the orchestration doc. That remains future work, named so it isn't conflated with this handoff; ke3p's real dialog/library data — already fixed this session, unrelated here.

## Pattern

`docs/universal-board-dialog-orchestration.md` already names this exact gap: *"Board preset today: ide — partially wired (Cloud/Rendr tool chips swap the dialog agent; not true director)."* `DialogCastBar.tsx` already distinguishes lead vs. support chips and wires `onInvokeAgent` — `BoardInstrumentsBar` likely does something structurally similar; compare both before deciding which one generalizes.

## Rendr treatment

N/A on record — flag if a real visual unification decision needs Rendr's input once the two components are compared side by side.

## Verification

**Commands:** `pnpm run quick:web`
**Browser:** `/d/ke3p?board=realm`, `/d/ke3p?board=ide`, Designer board

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Do not build full director-mode delegation in this handoff — that's separate, larger, future work.
- Do not change which agents are instruments on which board — only how invocation renders.

## Context

`draft-renders-as-document` is re-parked, sequenced to run *after* this one — see `archive/2026-07-20-draft-renders-as-document-requeued.json`. Not dropped, just resequenced behind this more urgent finding.
