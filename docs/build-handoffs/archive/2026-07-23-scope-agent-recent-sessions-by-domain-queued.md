# Build Handoff — scope-agent-recent-sessions-by-domain (queued)

**Goal:** Fix `GET /api/agents/:id` so its `recent_sessions` data is scoped to the domain currently being viewed, instead of returning an agent's most-recent sessions globally across every domain and every user.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-23T00:00:00Z by cloud
**Status:** shipped 2026-07-23 — `GET /api/agents/:id?domainId=` scopes via `dialog.domain_id`; `presenceEnrichment` passes domainId.

## Why this exists

Traced Chuck's screenshot all the way to the database. `apps/api/src/api/agents.ts:449-461`:

```js
const agent = await prisma.kip_agents.findUnique({
  where: { id },
  include: {
    kip_sessions: { take: 5, orderBy: { created_at: 'desc' } },
  },
});
```

No `domain_id` filter. No `user_id` filter. Just the 5 most-recently-created sessions for that agent row, period. Kip is a single shared agent used as the default lead on both ke3p and Chuck's own "Chuck Livecchi" domain — so its "recent sessions" are inherently cross-domain by construction of this query, with zero awareness of which domain the viewer is actually looking from.

`kip_sessions` has no `domain_id` column at all (confirmed: `schema.prisma:765-793` — only `agent_id`, `user_id`, `active_draft_id`, `dialog_id`). The only honest way to attribute a session to a domain is through its `dialog` relation's `domain_id`. Sessions with `dialog_id: null` (see `stop-orphan-echo-sessions`) can't be attributed to any domain at all — which is exactly why they were showing up unfiltered here.

## Done when

- `GET /api/agents/:id` accepts a `domainId` query param and, when present, only includes sessions whose Dialog belongs to that domain
- Orphaned (dialog-less) sessions are correctly excluded, not surfaced as unattributed noise
- The frontend call site (`presenceEnrichment.ts`'s `fetchPresenceRecord`, agent case) passes the `domainId` it already has in scope
- `pnpm run quick:api` and `pnpm run quick:web` pass
- Manual check: viewing Kip's agent card from ke3p shows only ke3p sessions

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `agents.ts`'s `GET /:id` route; `presenceEnrichment.ts`'s agent fetch call.

**Do not touch:** `kip_sessions` schema (no `domain_id` column should be added — scope via the existing `dialog` relation); the orphan-creation bug itself (separate handoff, this one is read-side only).

## Pattern

Scope via `kip_sessions: { where: { dialog: { domain_id: domainId } }, take: 5, orderBy: { created_at: 'desc' } }` when `domainId` is provided — this naturally excludes dialog-less orphans too, which is correct: an orphan can't be honestly attributed to any domain.

## Rendr treatment

N/A — not a presence job.

## Verification

**Commands:** `pnpm run quick:api`, `pnpm run quick:web`
**Browser:** `/d/ke3p?board=domain`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.

## Context

Sixth and last in today's sequence. Even after `chronicle-shows-document-universally` ships (so a focused Dialog shows the Document instead of this view), this bug is still real and reachable whenever a user views an agent card directly — worth fixing on its own merits, not just papered over by the display fix.
