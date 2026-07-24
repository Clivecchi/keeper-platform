# Build Handoff — chronicle-shows-document-universally (queued)

**Goal:** Generalize the "when a Dialog is focused, Chronicle shows the real Document" behavior beyond the Realm board to every board preset (Domain, IDE, Designer, Agent) — Chuck's own confirmed expectation: Chronicle is one universal concept, not something Realm alone gets.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-23T00:00:00Z by cloud
**Status:** shipped 2026-07-23 — `showRealmDocument` routes focused `dialog` on every board; Realm keeps domain/draft/moment/library Document routing.

## Why this exists

`UniversalViewPanel.tsx:316-322`:

```ts
const showRealmDocument =
  boardId === "realm" &&
  (subject.kind === "domain" || subject.kind === "dialog" || subject.kind === "draft" ||
   subject.kind === "moment" || subject.kind === "library")
```

This gate is hard-restricted to `boardId === "realm"`. On every other board, focusing a Dialog falls through to `ChronicleRecordView` → `KeeperPresence` → `DialogFocusPresence`/`AgentFocusPresence` (whichever `subject.kind` actually is) — the generic per-object presence view, not the Document. That's exactly why viewing "Becoming Together" on the **Domain** board showed Kip's agent-presence view (with a cross-domain session list, see `stop-orphan-echo-sessions` and `scope-agent-recent-sessions-by-domain`) instead of the real Document — the Realm-only fix never got generalized.

Asked directly, Chuck confirmed: Chronicle should show the Document whenever a Dialog is focused, on every board, not just Realm.

## Done when

- On Domain (and IDE, Designer, Agent), focusing a real Dialog renders that Dialog's actual Document via `DomainRealmStory` — the same component already correct on Realm
- Existing per-object presence views (agent/journey/draft/etc.) still render correctly when the focused subject isn't a dialog — additive, not a removal
- Realm's existing behavior is unchanged
- `pnpm run quick:web` passes
- Manual check: `/d/ke3p?board=domain` with "Becoming Together" focused shows the real Document

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md
- @docs/universal-board-dialog-orchestration.md
- @docs/becoming-together-cast-strip-proposal.md

## Scope

**Touch:** `UniversalViewPanel.tsx`'s `showRealmDocument` gate — generalize past `boardId === "realm"`.

**Do not touch:** `DomainRealmStory.tsx` (already correct); the per-object presence views for non-dialog subjects; which visual treatment (Strip/Cast Reel/Original) the Document uses — separate Rendr decision.

## Pattern

Drop the `boardId === "realm"` restriction (or narrow the whole condition to just `subject.kind === "dialog"`, since that's the specific case confirmed) so every board routes a focused Dialog to `RealmHomeChronicle`/`DomainRealmStory` the same way Realm already does. Verify this doesn't regress the `isUserHome` handling from `realm-home-chronicle-routing`.

## Rendr treatment

N/A for this handoff's mechanical scope — but flag to Rendr once shipped: `docs/becoming-together-cast-strip-proposal.md` has three candidate treatments ready for review.

## Verification

**Commands:** `pnpm run quick:web`
**Browser:** `/d/ke3p?board=domain`, `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.

## Context

Fifth in today's sequence, and the biggest lever of the three — this is what makes "the Document" a real, consistent platform concept instead of a Realm-only special case. Ships after `stop-orphan-echo-sessions`; `scope-agent-recent-sessions-by-domain` follows after this.
