# Drafts Implementation Plan

**Date:** 2026-02-12  
**Purpose:** Plan to implement draft enhancements discussed in conversation.

> **Superseded for EntityKind / Domain board work:** see [`draft-entitykind-implementation-plan.md`](./draft-entitykind-implementation-plan.md) (2026-06-19). Keeper scoping, versioning, propose/accept, and points canonical shape are largely **done in code**; this file remains historical reference for earlier API/schema notes.

---

## Conversation Summary

1. **Keeper scope for drafts** — Drafts should be scoped by keeper (primary), domain as secondary. A draft is more likely contextual for update with common keepers. Domain drafts = secondary view.

2. **Confirmation before update** — "I'd like to update X with Y. Should I?" — summarize change, ask for permission, offer expandable "see all changes" (down arrow).

3. **Versioning** — Draft history for rollback and audit.

4. **SOLE vs hardcoded rules** — Prefer SOLE learning over static prompt instructions where possible.

5. **Draft behavior** — When to create vs update, avoid duplicates (already addressed with prompt instructions).

---

## Phase 1: Keeper-Scoped Drafts

### 1.1 Schema Change

**Add `keeper_id` to `kip_drafts`:**

```prisma
model kip_drafts {
  id               String         @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  domain_id        String
  owner_id         String
  keeper_id        String?        // NEW: optional; when set, draft is keeper-contextual
  agent_id         String?
  kind             String
  key              String
  title            String
  summary          String?
  status           String         @default("draft")
  spec_json        Json           @default("{}")
  created_at       DateTime       @default(now())
  updated_at       DateTime       @default(now())
  domain           Domain         @relation(...)
  owner            users          @relation(...)
  keeper           Keeper?        @relation(fields: [keeper_id], references: [id], onDelete: SetNull)  // NEW
  agent            kip_agents?    @relation(...)
  active_sessions  kip_sessions[] @relation(...)

  @@unique([domain_id, keeper_id, owner_id, kind, key])  // CHANGED: include keeper_id (NULL = domain-level)
  @@index([keeper_id, owner_id])   // NEW: for "drafts for this keeper" queries
}
```

**Migration:**
- Add `keeper_id` column (nullable, FK to Keeper)
- Drop existing unique `(domain_id, owner_id, kind, key)`
- Add new unique `(domain_id, keeper_id, owner_id, kind, key)` — PostgreSQL treats NULL as distinct, so domain-level drafts (keeper_id NULL) remain unique per domain+owner+kind+key; keeper drafts unique per keeper+owner+kind+key
- Add index on `(keeper_id, owner_id)` for keeper-scoped listing

**Keeper model:** Add `kip_drafts kip_drafts[]` relation.

### 1.2 API Changes

**Draft create/update payloads:**
- `draft.create`: Add optional `keeperId` to payload schema
- `draft.update`: Add optional `keeperId` (for reassignment; rare)

**Draft list/filter:**
- `GET /api/domains/:domainId/kip/drafts?keeperId=...` — when `keeperId` provided, return keeper-scoped drafts first, then domain drafts (or filter to keeper only — TBD)
- Default: return all drafts for domain+owner, ordered by keeper drafts first when user has keeper context

**Environment / draftsDirectory:**
- Include `keeperId` in draft summary when present
- When `activeKeeperId` in session/context, prioritize drafts with matching `keeper_id` in draftsDirectory order

### 1.3 Agent Prompt

- When `activeKeeperId` is set, instruct agent: "Drafts are primarily contextual to the active keeper. Prefer creating/updating drafts scoped to this keeper. Use keeperId in draft.create payload when the draft is relevant to the active keeper."
- draftsDirectory should indicate which drafts are keeper-scoped vs domain-scoped

### 1.4 UI

- Draft list: Group or sort by keeper (keeper drafts first when keeper selected)
- Draft card: Show keeper name when `keeper_id` is set
- Create draft: When keeper is selected, new drafts default to that keeper

---

## Phase 2: Confirmation Before Update

### 2.1 New Action: `draft.update.propose`

**Purpose:** Propose a draft update without persisting. Returns a preview for user confirmation.

**Payload:** Same as `draft.update` (id, title?, summary?, status?, spec?)

**Behavior:**
- Server computes the diff (current vs proposed)
- Returns `{ proposedChanges: { summary, fullDiff? }, draftId }` — does NOT persist
- Agent includes this in response; UI renders confirmation card

**Alternative (simpler):** No new action. Agent returns a special structure in `response` + a `draft.update.propose` metadata that the UI recognizes. When user confirms, the agent sends the actual `draft.update` in the next message. But that requires the agent to "remember" the proposed change — complex.

**Preferred:** New action `draft.update.propose`:
- Server computes diff, returns it
- UI shows: "Kip would like to update [Draft X] with: [summary]. [▼ See all changes]"
- User clicks Confirm → client sends a follow-up message or a dedicated "confirm" API that applies the proposed change

**Flow:**
1. Agent wants to update draft → emits `draft.update.propose` with proposed payload
2. Server validates, computes diff, returns `{ status: 'proposed', draftId, summary, changes }` — does NOT persist
3. UI renders confirmation card: summary + expandable full diff
4. User confirms → need a way to apply. Options:
   - **A:** Client stores proposed payload, user clicks "Confirm" → client sends `draft.update` with that payload (agent not involved)
   - **B:** Client sends a new user message "yes, apply the update" → agent re-emits `draft.update` (agent must have context)
   - **C:** New endpoint `POST /drafts/:id/apply-proposed` that accepts the proposed payload and applies it (client has it from step 2)

**Recommended: A or C.** A: client holds proposed payload, on confirm calls existing `draft.update` API. C: server holds proposed in memory/session — harder. So **A**: `draft.update.propose` returns the full proposed payload to the client. Client shows confirmation UI. On confirm, client calls `PATCH /api/domains/:domainId/kip/drafts/:draftId` with that payload. No new server endpoint for "apply" — we use existing update.

So `draft.update.propose` is an action that:
- Input: draft id + proposed changes (same shape as draft.update)
- Output: `{ proposed: { ... }, summary: "...", diff?: ... }` — echoed back to client
- Client stores `proposed` in state
- UI shows confirmation card with summary + expandable diff
- On Confirm: client calls PATCH with `proposed`
- On Reject: client discards

### 2.2 Agent Behavior

- When agent wants to update a draft, it MUST use `draft.update.propose` first (not `draft.update` directly)
- Prompt: "When updating a draft, use draft.update.propose. Summarize the change in one sentence. Do not use draft.update directly — wait for user confirmation."
- After user confirms, the CLIENT applies the update (agent doesn't need to do anything in that turn — or we could have the agent emit `draft.update` in the next turn when user says "yes" — but then we need the agent to have the proposed payload in context. Simpler: client applies.)

### 2.3 UI: Confirmation Card

- When action result is `draft.update.propose`:
  - Show card: "Kip would like to update [Draft Title]"
  - Summary: one sentence (from server or agent)
  - [▼ See all changes] — expandable section showing diff (e.g. spec_json before/after, or field-level diff)
  - [Confirm] [Reject] buttons
- On Confirm: call PATCH with proposed payload, show success
- On Reject: dismiss card

### 2.4 Schema for Action Result

- `draft.update.propose` returns a result that includes `proposedPayload` (the full update payload) and `summary`. Client needs this to call PATCH on confirm.

---

## Phase 3: Versioning

### 3.1 Schema: `kip_draft_versions`

```prisma
model kip_draft_versions {
  id           String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  draft_id     String     @db.Uuid
  version      Int        // 1, 2, 3...
  spec_json    Json       // Snapshot of spec at this version
  title        String?    // Snapshot of title
  summary      String?    // Snapshot of summary
  status       String?    // Snapshot of status
  created_at   DateTime   @default(now())
  created_by_session_id String?    @db.Uuid  // Optional: which session made this change
  kip_drafts   kip_drafts @relation(fields: [draft_id], references: [id], onDelete: Cascade)

  @@unique([draft_id, version])
  @@index([draft_id])
}
```

**kip_drafts:** Add `kip_draft_versions kip_draft_versions[]` relation.

### 3.2 Logic

- On every `draft.update` (and on create, version 1): before applying, insert a row into `kip_draft_versions` with current state (spec_json, title, summary, status), increment version.
- `draft.update` and `draft.create` executor: add versioning step.

### 3.3 API

- `GET /api/domains/:domainId/kip/drafts/:draftId/versions` — list versions
- `GET /api/domains/:domainId/kip/drafts/:draftId/versions/:version` — get specific version (for rollback preview)
- Optional: `POST .../drafts/:id/rollback?version=3` — restore draft to version 3 (creates new version with that content)

### 3.4 UI

- Draft detail: "Version history" section, list versions with timestamps
- Click version: preview that version
- Rollback button (if we implement rollback endpoint)

---

## Phase 4: Prompt & SOLE Integration

### 4.1 Confirmation Instruction

- Add to agent prompt: "When you want to update a draft, use draft.update.propose with a brief summary of the change. Do not use draft.update directly. Wait for user confirmation before the update is applied."

### 4.2 Keeper-Scoped Instruction

- "Drafts are scoped by keeper (primary) or domain (secondary). When the user has a keeper selected, prefer keeper-scoped drafts. Include keeperId in draft.create when the draft is relevant to the active keeper."

### 4.3 SOLE + Drafts (Future)

- Rely on SOLE memories for learned draft behavior (when to create vs update, etc.) as SOLE matures.
- Reduce hardcoded draft rules in favor of "use your SOLE memories to guide draft behavior."

---

## Implementation Order

| Phase | Scope | Effort | Dependencies |
|-------|-------|--------|--------------|
| **1. Keeper scope** | Schema, API, env, prompt, UI | Medium | None |
| **2. Confirmation** | New action, UI card, client flow | Medium | Phase 1 optional |
| **3. Versioning** | Schema, executor, API, UI | Medium | None |
| **4. Prompt updates** | Prompt text | Low | Phases 1–2 |

**Recommended order:** 1 → 3 → 2 → 4

- Phase 1 (keeper scope) and Phase 3 (versioning) are independent and foundational.
- Phase 2 (confirmation) builds on the draft update flow; versioning gives a safety net for updates.
- Phase 4 is prompt tweaks that can be done alongside 1–3.

---

## Files to Modify

### Phase 1
- `packages/database/prisma/schema.prisma` — add keeper_id, update unique, add Keeper relation
- `packages/database/prisma/migrations/` — new migration
- `apps/api/src/api/domains/kip-drafts.ts` — list filter by keeperId, create/update accept keeperId
- `apps/api/src/api/kip/agents.ts` — draft.create/update executor pass keeperId; normalizer
- `apps/api/src/api/kip/actions/schema.ts` — draftCreatePayload add keeperId
- `apps/api/src/services/kip/resolveAgentEnvironment.ts` — draftsDirectory include keeperId, order by keeper
- `apps/web/` — draft list UI, draft card, create flow (keeper context)

### Phase 2
- `apps/api/src/api/kip/actions/schema.ts` — add draft.update.propose payload schema
- `apps/api/src/api/kip/agents.ts` — handle draft.update.propose (compute diff, return proposed, no persist)
- `apps/web/src/components/kip/ActionReceiptCard.tsx` or new `DraftUpdateProposeCard.tsx` — confirmation UI
- `apps/web/` — DialogueMessageList or similar to render propose card, handle Confirm/Reject

### Phase 3
- `packages/database/prisma/schema.prisma` — add kip_draft_versions
- `packages/database/prisma/migrations/` — new migration
- `apps/api/src/api/kip/agents.ts` — on draft.update, insert version before apply
- `apps/api/src/api/domains/kip-drafts.ts` — versions endpoints
- `apps/web/` — draft detail version history UI

---

## Open Questions

1. **Keeper draft uniqueness:** Same `key` in domain vs keeper — allowed? (e.g. "my-draft" for keeper A and "my-draft" for domain X) — Plan assumes yes via `(domain_id, keeper_id, owner_id, kind, key)`.
2. **Propose flow:** Should the agent ever bypass propose and do direct update? (e.g. user says "yes update it" and agent has full context — could emit draft.update directly. But then we lose the "summarize + expand" UX. Prefer: always propose for updates.)
3. **Version retention:** How many versions to keep? (e.g. last 20) — TBD.

---

## 📆 Update Log

- **2026-02-09:** Wired `onConfirmDraftUpdate` in `AgentBoardFrame` — callback calls `KipApi.updateDraft(domainId, draftId, payload)` and `refreshDrafts()` on confirm. Regenerated Prisma client after schema changes.
- **2026-02-09:** Keeper scope UI: `KipDraftSummary` + `keeperId`; `listDrafts(domainId, keeperId?)`; draft list/cards show keeper name; create flow defaults to active keeper; draft detail header shows keeper. Tests: `describe.skipIf(!hasDatabase)` when DATABASE_URL unset.
