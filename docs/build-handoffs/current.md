# Build Handoff — document-forward-step

**Goal:** Add Forward and Step to DocumentShell — a collapsible authored-destination card with a distinct, always-visible Step beneath it, and a disabled Back/Forward nav row — replacing the current plain title/subtitle header.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-19T00:00:00Z by cloud

## Done when

- `DocumentShell` gains a new optional prop shape, e.g. `forward?: { title: string; description: string }`, rendered where the current plain title/subtitle header block is — this replaces that block, it does not sit alongside it
- Forward's description is collapsible, defaulting collapsed when a step is present, expanded when no step is present (mirrors the mockup's `objectiveOpen = steps.length === 0` logic)
- A new optional `step?: { title: string; body: string }` prop renders a distinct block: always visible regardless of Forward's collapsed state, positioned directly after Forward's description in DOM order (so collapsing/expanding the description visually moves the Step's position, no separate logic needed for that)
- Step is visually distinct from Forward — a translucent/backdrop-blur surface, not the same flat card treatment as everything else in the shell, using whatever accent theme token most closely matches an affirmative/progress signal (do not hardcode a hex color — if no suitable existing theme token is found, stop and flag it rather than invent one)
- A Back/Forward nav row renders beneath the Step, both buttons disabled for now, with tooltips explaining why precisely (no prior step exists yet / this is the current tip, Forward will advance once a next step exists) — do not wire real navigation logic, that depends on undesigned self-organizing behavior
- Brightness hierarchy: Forward's title dims when a Step is present (secondary to the Step), Step's title is a distinct accent tone, Step's body text is the brightest text in the shell — express this as relative theme-token usage, not literal color values
- No changes to `buildGroups`, `PathHeader`, or `PointFrame` — this handoff only touches the shell's own header area, not the Path/Point rendering beneath it
- `pnpm run quick:web` passes
- Manual check on `/d/ke3p?board=realm`: Forward/Step render above the Path groups, collapse/expand works, Back/Forward render disabled with correct tooltips

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `apps/web/src/v0/presence/chronicleDocument/DocumentShell.tsx`, `packages/shared/src/document.ts`

**Do not touch:** `apps/api/`, `packages/database/prisma/schema.prisma`, `buildGroups`/`PathHeader`/`PointFrame` functions — structural additions only, do not refactor existing Path/Point rendering

## Pattern

Mockup reference (scratchpad artifact, not in repo) demonstrates the exact shape: `objectiveOpen` defaults to `steps.length === 0`; Step renders in DOM after the collapsible description, not before; Step uses backdrop-filter blur + translucent background + accent-tinted border; Back/Forward are plain disabled buttons with explanatory titles. Translate the intent, not literal CSS values — this file already uses `hsl(var(--theme-...))` tokens throughout via `PathHeader` and `PointFrame`, follow that convention exactly.

## Rendr treatment

N/A on the record, but treat this cautiously: express the brightness hierarchy and the "distinct, glassy" Step surface through existing theme tokens only. If no accent/progress-adjacent token exists in the real theme system, stop and flag it — do not invent a hardcoded color to fill the gap.

## Verification

**Commands:** `pnpm run quick:web`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.
- No hardcoded colors — theme tokens only.
- Back/Forward stay disabled. Do not fabricate navigation logic.

## Context

Sequencing: `draft-renders-as-document` is older and still unstarted, but it should run **after** this handoff, not before — it unifies Draft's rendering onto `DocumentShell`, and `DocumentShell`'s own shape is changing here. Doing it first would mean redoing part of that work once this lands.

Explicitly out of scope for this handoff: Layer 3 self-organizing behavior (what actually decides the current Step, and how it updates) — that is genuinely undesigned, not just deferred, and Back/Forward stay disabled because of it, honestly, not as a placeholder to be quietly filled in later. Also out of scope: the Path-accordion visual treatment (per-path color, collapse, dismissible New tags) discussed earlier in the same design conversation — that is separate, larger scope, not part of what was just confirmed.
