# Drafts Vision — Exploration

**Date:** 2026-02-12  
**Purpose:** Map your brain dump about drafts to current state and gaps.

---

## Your Vision (Summary)

1. **Draft = flexible vessel** — Can be many things:
   - Place where the agent saves specific information when the user explicitly tells it to
   - Tool the agent uses when it determines it's useful for the current dialog (proactive)

2. **Drafts for building** — When a user is "building" something:
   - Draft should outline the solution using keeper architecture, engagement templates, etc.

3. **Drafts not session-bound** — Multiple sessions should be able to update relevant drafts

4. **Confirmation before update** — When a draft is to be updated, the agent should confirm with the user

5. **Versioning** — Drafts should have versioning (within the draft or in the database)

---

## Current State

### Schema: `kip_drafts`

| Field      | Type   | Notes                                      |
|-----------|--------|--------------------------------------------|
| id        | UUID   | Primary key                                |
| domain_id | String | Domain-scoped                               |
| owner_id  | String | Owner-scoped                                |
| agent_id  | String?| Optional agent that created/updated        |
| kind      | String | e.g. journey_spec, conversation_review     |
| key       | String | URL-safe slug (unique per domain+owner+kind)|
| title     | String | Human-readable title                       |
| summary   | String?| Brief description                          |
| status    | String | draft, reviewed, approved, promoted, archived |
| spec_json | Json   | Flexible content (sections, etc.)           |
| created_at| DateTime |                                          |
| updated_at| DateTime |                                          |

**Unique constraint:** `(domain_id, owner_id, kind, key)` — one draft per kind+key per owner per domain.

### Session ↔ Draft Relationship

- **`kip_sessions.active_draft_id`** — A session can have one "active" draft it's working on
- **`kip_drafts.active_sessions`** — A draft can be the active draft for multiple sessions (one-to-many)

So: **drafts are already not tied to a single session**. Multiple sessions (same domain + owner) can point to the same draft as their active draft, and any session can update any draft via `draft.update` (domain/owner scoped).

**Scoping (to add):** Drafts will be scoped by **keeper** (primary) and **domain** (secondary). A draft is more likely contextual for update with common keepers. Domain drafts = secondary view when no keeper or for domain-wide artifacts.

### Draft Kinds (Today)

- `journey_spec`
- `keeper_type_proposal`
- `vehicle_template`
- `checklist_spec`
- `development_journey`
- `conversation_review`

These are structural kinds. The `spec_json` holds the actual content (e.g. `sections: [{title, content}]`).

### What's Missing vs Your Vision

| Your Vision                    | Current State                                      | Gap |
|--------------------------------|-----------------------------------------------------|-----|
| Save info when user tells agent| Agent can `draft.create` / `draft.update` on request| ✅ Supported |
| Agent uses draft when useful   | No explicit "proactive" flow; agent decides via prompt| ⚠️ Prompt-only, no structured guidance |
| Building with keeper arch     | `spec_json` is generic; no link to keeper types, engagement templates | ❌ Not wired |
| Multiple sessions update      | Drafts are domain+owner scoped; any session can update | ✅ Supported |
| Confirm before update         | Agent executes `draft.update` directly              | ❌ No confirmation flow |
| Versioning                    | No history; `spec_json` overwritten on update       | ❌ No versioning |

---

## Gap Analysis

### 1. Draft as Flexible Vessel — Partially There

- **Explicit save:** User says "save that to a draft" → agent can `draft.create` or `draft.update`. ✅
- **Proactive use:** Agent decides "this would be useful to capture" → same actions, but behavior is prompt-driven. No structured "when to capture" logic beyond SOLE and prompt instructions.

### 2. Drafts for Building — Not Wired

- **Keeper architecture:** Keepers, keeper types, journeys, paths, moments exist. Drafts don't reference them.
- **Engagement templates:** Exist (`engagement_templates`, `engagement_fields`), linked to keeper types. Used for domain actions (Verify Domain, etc.). Not used when creating or structuring drafts.
- **Building flow:** When user says "I'm building X," the agent would need:
  - Access to keeper types, engagement templates, domain structure
  - A way to structure `spec_json` around those (e.g. sections that map to templates, keeper types)
  - Today: `spec_json` is freeform; no schema ties it to keeper architecture.

### 3. Multiple Sessions — Already Supported

- Drafts are scoped by `domain_id` + `owner_id`, not `session_id`.
- Any session in that domain for that owner can update any draft.
- `active_draft_id` is a session-level pointer ("I'm working on this one"), not ownership.

### 4. Confirmation Before Update — Not Built

- Today: Agent returns `draft.update` action → server executes immediately.
- No "proposed change" → user confirms → then apply.
- Would need:
  - A `draft.update.propose` or similar that returns a preview
  - UI to show "Kip wants to update draft X with: …" + Confirm / Reject
  - Or: agent asks in natural language, user says "yes," then agent emits `draft.update`

### 5. Versioning — Not Built

- **Legacy `Draft` model** (different from `kip_drafts`) has a `history` Json field — versioning was considered elsewhere.
- **`kip_drafts`** has no history. Each update overwrites `spec_json`.
- Options:
  - **In-draft:** Add `history` or `versions` array to `spec_json` (or a new column) — append snapshots on update.
  - **Separate table:** `kip_draft_versions` with `draft_id`, `version`, `spec_json`, `updated_at`, `updated_by_session_id`, etc.

---

## Possible Directions

### A. Minimal — Document and Prompt

- Capture this vision in a spec/README.
- Add prompt instructions: "When updating a draft, confirm with the user first" (conversational confirmation).
- No schema or flow changes.

### B. Versioning

- Add `kip_draft_versions` (or `history` column) to track changes.
- On each update, append a version before applying.
- Expose version history in UI and optionally in `draftsDirectory` / environment.

### C. Confirmation Flow

- Introduce `draft.update.propose` that returns a preview without persisting.
- Agent: "I'd like to update X with Y. Should I?" — summarize change, ask for permission.
- UI: Show summary + expandable "▼ See all changes" for full diff.
- Confirm/Reject buttons. On confirm, client applies via existing PATCH.

### D. Building Mode — Keeper Architecture Integration

- Extend environment to include: keeper types, engagement templates, domain structure.
- Add draft kinds or `spec_json` schema for "building" drafts that reference keeper architecture.
- Prompt: "When user is building, use keeper types and engagement templates to structure the draft."

### E. SOLE + Drafts

- Use SOLE to learn when to create vs update vs just respond (as discussed earlier).
- Draft behavior becomes learned, not only rule-based.

---

## Recommendation for Next Step

1. **Versioning** — High value, moderate effort. Enables rollback and audit.
2. **Confirmation** — Start with conversational ("I'd like to update the draft with X. Should I?") before adding a formal propose/confirm flow.
3. **Building integration** — Larger; needs design of how `spec_json` maps to keeper types and engagement templates.
4. **Document** — Add this exploration to `/docs` and keep it as the draft spec.

---

## Appendix: Related Code Paths

- **Draft CRUD:** `apps/api/src/api/domains/kip-drafts.ts`
- **Agent draft actions:** `apps/api/src/api/kip/agents.ts` — `executeAgentActions`, `draft.create` / `draft.update`
- **Environment (draftsDirectory):** `apps/api/src/services/kip/resolveAgentEnvironment.ts`
- **Engagement templates:** `engagement_templates`, `EngagementTemplateExecutor`
- **Legacy Draft (has history):** `packages/database/prisma/schema.prisma` — `model Draft`
