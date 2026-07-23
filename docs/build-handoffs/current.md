# Build Handoff — cross-domain-cast-membership

**Goal:** Replace the hardcoded domain-agent roster with a real permission-driven mechanism: a user participating in a Dialog can enable the lead agent of any *other* domain where they hold real Admin-level `DomainPermission` — starting with Ceox, Chuck's own agent, becoming addable to ke3p's cast through the Cast Header. This is infrastructure — real per-agent delegation is deliberately a separate, later phase.
**Territory:** cursor
**Branch:** cloud (direct — no feature branch, no PR)
**Created:** 2026-07-22T00:00:00Z by cloud

## Why this exists

Chuck tested the shipped multi-select live and found two real gaps underneath it, not one:

1. **No real delegation** — multi-select only stamps "engaged" in the UI. Kip's own session is the only thing that actually runs; it tried to fake reaching Cloud with an `mcp.call` action that isn't even in its allowed pack.
2. **Cast membership is entirely hardcoded** — verified directly in code:
   ```ts
   // loadDomainScopedAgents.ts
   export const DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS = ['cloud', 'rendr'] as const;
   ```
   Every domain's roster resolves to exactly its own `primaryAgentId` (if set — which *replaces* Kip as lead, doesn't add a member), Kip, Cloud, Rendr. That's it. No database relationship, no way for a domain to gain a new cast member without a code change. Ceox can't appear because the roster has no room for it — this is the real reason, not a bug in the multi-select work.

Chuck's own framing, verbatim, is the actual spec for the fix:

> "A User that is involved in a dialog is able to enable lead agents from any domain they themselves have Admin privilege over."

Ceox is *his* agent — tied to him as a user, not hardcoded to any one domain. Kip/Cloud/Rendr are ke3p's own domain agents. The permission model should follow the user, not the domain.

## Done when

- A real backend capability resolves, for the current authenticated user, every domain where they hold Admin-level `DomainPermission` (or are `Domain.ownerId`) — and for each, resolves that domain's real lead agent (reuse `resolveDomainLeadContext` / `loadDomainScopedAgents`, don't reinvent lead resolution)
- Those agents are surfaced as addable candidates via a real **"Add" action in `DirectorCastHeader`** — clicking it shows the candidate list (e.g. "Ceox — from [Chuck's domain]"), selecting one enables that agent for the current dialog
- The enablement **persists for that Dialog** (survives reload) — Cursor decides and documents the storage shape (new field/array on `Dialog`, or a join table; check whether `CrossDomainShare`'s `contentType`/`contentId` pattern fits before inventing something new — it may not, since it's approval-gated domain-to-domain sharing and this is user-permission-driven; document the reasoning either way)
- Once enabled, the agent renders through the **exact same** `BoardInstrumentsBar`/`DirectorCastHeader` machinery already shipped — no new chip component, no new invocation UI
- **Strict security boundary**: an agent is only addable if the current user genuinely holds Admin-level `DomainPermission` (or ownership) on that agent's home domain, checked at request time, never trusted from the frontend — the one hard non-negotiable here
- The existing hardcoded `DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS = ['cloud','rendr']` stays as the platform baseline every domain still gets automatically — this is additive, not a replacement
- `pnpm run quick:web` and `pnpm run quick:api` pass
- Manual check: on ke3p (Chuck as Admin), the Cast Header's Add action surfaces Ceox as a real candidate, enabling it makes Ceox appear and persist as a cast member on reload

## Canon (read first)

- @AGENTS.md
- @docs/universal-board-dialog-orchestration.md
- @docs/chronicle-document-architecture.md

## Scope

**Touch:** `apps/api/src/services/domains/loadDomainScopedAgents.ts` (extend, don't replace the hardcoded baseline); a new backend endpoint for resolving a user's cross-domain-admin addable agents and enabling/persisting one onto a Dialog; `apps/web/src/v0/boards/components/DirectorCastHeader.tsx` (Add action + candidate picker); `apps/web/src/v0/boards/UniversalConversation.tsx` (wire enabled agents alongside the hardcoded baseline); `packages/database/prisma/schema.prisma` (new field/table — Cursor's call on shape, documented).

**Do not touch:** real per-agent delegation/execution — explicitly the next, separate phase; the `DOMAIN_ACCESSIBLE_PLATFORM_AGENT_SLUGS` baseline — additive only; IDE/Designer's single-select behavior — unrelated.

## Pattern

`DomainPermission.role` already carries admin/user roles per domain — use it directly, don't build a parallel permission system. `resolveDomainLeadContext` and `loadDomainScopedAgents.ts` already resolve "this domain's lead agent" correctly — reuse that resolution for the *other* domain, don't reimplement it.

## Rendr treatment

N/A on record — flag if the Add/candidate-picker UI needs a real design pass.

## Verification

**Commands:** `pnpm run quick:web`, `pnpm run quick:api`
**Browser:** `/d/ke3p?board=realm`

## Constraints

- Match conventions in touched folders.
- **Commit directly to `cloud` — no feature branch, no PR.**
- Security check must happen server-side, at request time — never trust a client-supplied "I'm admin" claim.
- Additive only — do not remove or gate the existing Cloud/Rendr baseline.
- Do not start real delegation (Phase 2) as part of this handoff.

## Context

**Two-phase plan, both scoped now so nothing shows up as a surprise later — but deliberately sequenced.** Chuck's own explicit direction: get this infrastructure right first; treat real delegation as a separate, later, more careful piece of work because of token-cost implications.

**Phase 2 (`director-lead-initiated-delegation`, not yet a handoff file, described here for continuity):** the *lead* agent — not the user directly, and not an automatic call-everyone-every-turn model — decides whether and which enabled cast agents to consult for a given reply. When consulted, their contribution should be deliberately minimal/collapsed feedback, not a full independent completion — matching the already-designed "chorus" shape in `docs/universal-board-dialog-orchestration.md` (collapsed beats under the Lead's reply, not full agent swaps). Explicit constraint from Chuck: do not build something that multiplies LLM calls linearly with cast size by default — "minimal feedback" exists to bound token cost, not maximize participation. **Do not start Phase 2 until Phase 1 (this handoff) ships and is verified.**
