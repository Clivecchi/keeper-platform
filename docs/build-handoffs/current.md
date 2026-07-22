# Build Handoff — realm-header-cast-and-multiselect

**Goal:** Rework director-mode agent presentation universally: cast/roster identity displayed in the header, invocation happens at the composer, the lead agent is invoked by default (always-on, not a click), and Domain/Realm specifically supports true multi-select of non-lead instruments for collaboration — unlike IDE/Designer's single-active-instrument swap.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-21T00:00:00Z by cloud

## Why this exists

`realm-director-mode-unification` shipped a genuinely shared `BoardInstrumentsBar` across Realm/Domain/IDE/Designer — real progress, verified. But reviewing the result, Chuck named three real requirements that unification never covered, in his own words:

> "I want the cast to be managed through the header. But invokeable at the composer."

> "Kip is the lead agent and should be invoked by default and shown as a chip. The other agents can be selected as needed. The minor difference than what exists on IDE is that multiple cast agents can be selected for collaboration versus just one."

Checked before scoping, not assumed: `BoardInstrumentsBar`'s entire architecture — `activeSlug: string | null`, `onInvoke(slug)`, `UniversalConversation`'s `activeBoardInstrument` state — is built around exactly one active instrument at a time, everywhere. There is no multi-select mechanism anywhere in the codebase today. This is real new work, not a config flip.

## Two clarifications from the same conversation, so they don't get relitigated

1. **Library items are intentionally domain-wide, not Dialog-scoped.** `Domain → LibraryItem` is the platform's real, documented architecture (not hierarchical, not per-Dialog). An earlier report wrongly framed the absence of a Library↔Dialog relationship as a gap — it isn't one. Corrected here.
2. **The 47 Kept + 8 Presented items in Realm's Nav are a separate, older population** — real, pre-existing `LibraryItem` rows and kept `Moment`s, unrelated to the 78 archived drafts from `ke3p-becoming-together-consolidation` (which are already correctly excluded from the default view, verified). The flat, undifferentiated feel of that list is the long-parked Curator/grouping work — not something this handoff or the consolidation was ever meant to solve. Explicitly out of scope here.

## Done when

- A header slot (**universal** — every board using `dialogOrchestration: 'director'`, not just Domain/Realm) displays the cast/roster: who is lead, which instruments are available. Identity display, not necessarily the click target itself.
- The actual invoke/select interaction for instruments lives at or near the composer, not only in the header — Cursor decides and documents the concrete split, as long as "cast managed in header, invoked at composer" is genuinely true afterward, not just relabeled
- The lead agent (`directorAgentSlug`) is invoked/active **by default on load** — no click required to engage Kip (or Rendr on Designer). Real behavior change from today, where `activeBoardInstrumentSlug` starts null/disengaged
- **On Domain/Realm specifically: true multi-select** — multiple non-lead instruments (e.g. Cloud *and* Rendr) can be simultaneously active for collaboration, not one-at-a-time swap. Requires changing the active-instrument model from a single `activeSlug` to a set, for this board only
- IDE and Designer explicitly **keep** today's single-active-instrument swap behavior — this handoff does not change their interaction model
- Whatever agent is actually invoked for a given message (lead alone, or lead + one or more collaborating instruments) is visually clear in the Dialog stream itself, not just in the header/composer control — Cursor's call on presentation, document it
- `pnpm run quick:web` passes
- Manual check on `/d/ke3p?board=realm`: Kip is active by default without clicking anything; Cloud and Rendr can both be turned on simultaneously alongside Kip; cast identity reads from the header; the invoke control is at the composer. Manual check on `/d/ke3p?board=ide`: unchanged single-swap behavior still works exactly as before.

## Canon (read first)

- @AGENTS.md
- @docs/universal-board-dialog-orchestration.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `apps/web/src/v0/boards/components/BoardInstrumentsBar.tsx`, `apps/web/src/v0/components/dialog/KeeperDialogFrame.tsx`, `apps/web/src/v0/boards/UniversalConversation.tsx`, `apps/web/src/v0/realm/DialogCastBar.tsx` (if a header identity component is still needed, or its trailing-actions role changes), `apps/web/src/v0/boards/UniversalBoardDefinition.ts` (only if a new board-def flag is needed to express multi-select vs single-select — Cursor's call, document it).

**Do not touch:** `packages/database/prisma/schema.prisma`; `apps/api/`; the full future "director" delegation model (Kip receiving a message and internally delegating to Cloud/Rendr as sub-turns with action cards) — this handoff is about invocation UI and simultaneous engagement, not that delegation pipeline; the Library/Kept-Presented curation question — already parked separately, unrelated here.

## Pattern

Chuck's own framing, verbatim, is the spec — quoted above, not inferred. Verify `BoardInstrumentsBar`'s `activeSlug`/`onInvoke` shape and `UniversalConversation`'s `activeBoardInstrument` state before assuming how much needs to change — confirmed single-slug throughout as of `realm-director-mode-unification` (archived).

## Rendr treatment

N/A on record — flag if the header/composer split needs a real visual design pass once the mechanism is working.

## Verification

**Commands:** `pnpm run quick:web`
**Browser:** `/d/ke3p?board=realm`, `/d/ke3p?board=ide`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Do not change IDE/Designer's single-select interaction model.
- Do not build the full director-delegation pipeline — invocation/engagement only.
- Do not touch the Library/Curator question — separate, already parked.

## Context

Direct follow-up to `realm-director-mode-unification` (archived, shipped). Two populations of "pre-existing items" exist in Realm's Nav and should not be conflated: the 78 archived drafts (resolved, excluded by the existing filter) and the 47+8 original Library/Moment items (real, separate, parked Curator work).
