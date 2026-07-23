# Build Handoff — kip-roster-dialog-cast-sync (queued)

**Goal:** Give `resolveAgentEnvironment` dialog awareness so Kip's own "who's on the team" prompt roster includes agents enabled via `DialogCastMember`, not just the domain-level baseline — closing the gap where Ceox shows as a real, enabled cast chip in the UI but Kip's own reply insists it "is not currently part of the active agent team."
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-22T00:00:00Z by cloud
**Status:** queued — becomes `current` after `realm-home-chronicle-routing` ships and is verified.

## Why this exists

Chuck enabled Ceox via the Cast Header (from `cross-domain-cast-membership`, already shipped) and it correctly appeared as a cast chip. But asking Kip "Ceox, you here?" got back: *"It looks like Ceox isn't listed as part of the current agent team"* with an "Agent Availability" card saying Ceox "is not currently part of the active agent team." Two code paths, out of sync — confirmed by direct code read:

- **Display path (correct):** `UniversalConversation.tsx:452-462` fetches `GET .../kip/dialogs/:dialogId/cast-members`, which reaches `listDialogCastMembers` (`apps/api/src/services/domains/dialogCastMembership.ts:157-201`) — the only place in the codebase that reads the `DialogCastMember` table.
- **Kip's own path (stale):** Kip's roster is injected at `apps/api/src/api/kip/agents.ts:3903-3922`, sourced from `environment.domainAgents`, populated at `resolveAgentEnvironment.ts:370` via `loadDomainScopedAgents(primaryDomainId)` — which only resolves the domain's `primaryAgentId`, `kip`, and the hardcoded `DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS` baseline. **It has no `dialogId` parameter at all** (confirmed: none of its 4 call sites in `agents.ts` — lines 823, 3850, 5924, 6215, including the main message-send handler — pass one).
- The literal phrases "Agent Availability" / "not part of the team" don't exist as hardcoded copy anywhere — Kip is an LLM free-forming that sentence because its own prompt (`agents.ts:3920`) is told *"Do not claim domain agents are absent when they appear in this list"* — and Ceox genuinely isn't on the list it's given. Kip is doing exactly what it's told; the list is just stale.
- `dialogId` is already resolvable today: `kip_agent_sessions.dialog_id` (`packages/database/prisma/schema.prisma:675`) links a running session back to its Dialog — it's just never fetched in this path.

## Done when

- Enabling Ceox via Cast Header and asking Kip about it no longer produces an "Agent Availability: not part of the team" reply
- `resolveAgentEnvironment` accepts `dialogId` and merges that dialog's enabled `DialogCastMember` rows into `environment.domainAgents` alongside the existing baseline
- Domain-baseline agents (cloud, rendr, primaryAgentId, kip) remain included — additive, not a replacement
- The roster block Kip's system prompt receives lists `DialogCastMember`-enabled agents by name
- `pnpm run quick:api` passes
- Manual check on `/d/ke3p?board=realm`: enable Ceox, ask Kip about it, confirm no "absent" claim (note: this doesn't mean Ceox actually speaks as a distinct voice — that's Phase 2 delegation, still separate; this only fixes Kip's awareness)

## Canon (read first)

- @AGENTS.md
- @docs/chronicle-document-architecture.md
- @docs/universal-board-dialog-orchestration.md

## Scope

**Touch:** `resolveAgentEnvironment.ts` (add `dialogId`, merge near line 370); `agents.ts` (thread `dialogId` into all 4 call sites, resolving from `sessionId → kip_agent_sessions.dialog_id` where needed); `dialogCastMembership.ts` (reuse `listDialogCastMembers` or add a lighter read helper).

**Do not touch:** real per-agent delegation (Phase 2 — this only fixes what Kip is told, not whether it can hand off a turn); the `DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS` baseline (additive only); the Cast Header/display path (already correct).

## Pattern

`resolveAgentEnvironment.ts:66`'s own comment self-documents the staleness: *"Domain lead + Kip — same roster as GET /api/domains/:domainId/kip/agents"* — built before per-Dialog cast membership existed. Thread `dialogId` through and merge at the same seam `loadDomainScopedAgents` already populates.

## Rendr treatment

N/A — not a presence job.

## Verification

**Commands:** `pnpm run quick:api`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Codebase wins over docs when they conflict.

## Context

Third and last of today's three follow-on handoffs. Sequenced last because it's the most surgical/isolated of the three and the least urgent (a wrong sentence from Kip, not data pollution or a missing panel) — but it's the one that would make `cross-domain-cast-membership` actually *feel* complete rather than half-working.
