# Build Handoff Schema

> **Owner:** Cloud · **Consumers:** Cursor (via SDK/MCP), Chuck (review) · **Sync layer:** git repo  
> **Status:** Phase 0 — file-based handoffs; Phase 1 — `cursor.handoff.invoke` MCP tool reads this shape.

---

## Purpose

A **Build Handoff** is the structured contract Cloud uses to delegate work without Chuck routing context manually.

- **Cloud** composes, validates, and writes handoffs (to git and/or MCP).
- **Cursor** executes reasoning-heavy codebase work against the handoff + canon docs.
- **Rendr** supplies `rendr_treatment` when the job includes presence/layout intent.
- **Chuck** approves direction and outcomes — not copy-paste relay.

One handoff = one bounded task. Not a roadmap, not a product spec.

---

## File conventions

| File | Writer | Purpose |
|---|---|---|
| `docs/build-handoffs/schema.md` | Cloud / Cursor (this file) | Canonical field definitions |
| `docs/build-handoffs/current.json` | Cloud | Active handoff instance (overwritten each task) |
| `docs/build-handoffs/current.md` | Cloud (generated) | Human-readable render of `current.json` for Cursor `@` reference |
| `docs/build-handoffs/archive/` | Cloud | Optional dated snapshots after completion |

**Phase 0 (now):** Cloud writes `current.json` + `current.md` via GitHub MCP or manual commit. Chuck opens Cursor with `@AGENTS.md` and `@docs/build-handoffs/current.md`.

**Phase 1:** `cursor.handoff.invoke` accepts the same JSON object; Cloud no longer requires Chuck to open Cursor manually.

---

## JSON Schema

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://ke3p.com/schemas/build-handoff/v1",
  "title": "BuildHandoff",
  "type": "object",
  "required": ["version", "id", "goal", "done_when", "territory", "canon"],
  "additionalProperties": false,
  "properties": {
    "version": {
      "type": "string",
      "const": "1.0",
      "description": "Schema version. Increment on breaking changes."
    },
    "id": {
      "type": "string",
      "pattern": "^[a-z0-9][a-z0-9-]{2,63}$",
      "description": "Stable slug for this handoff, e.g. capability-entitykind-phase1"
    },
    "created_at": {
      "type": "string",
      "format": "date-time",
      "description": "ISO-8601 UTC when Cloud composed the handoff."
    },
    "created_by": {
      "type": "string",
      "enum": ["cloud"],
      "description": "Composer agent. Always cloud for v1."
    },
    "goal": {
      "type": "string",
      "minLength": 10,
      "maxLength": 500,
      "description": "One sentence — what to accomplish."
    },
    "done_when": {
      "type": "array",
      "minItems": 1,
      "maxItems": 12,
      "items": {
        "type": "string",
        "minLength": 5,
        "maxLength": 300
      },
      "description": "Observable acceptance criteria. Verifiable after the run."
    },
    "territory": {
      "type": "string",
      "enum": ["cursor", "cloud", "rendr-then-cursor", "rendr-only"],
      "description": "Routing hint. See Router rules below."
    },
    "canon": {
      "type": "array",
      "minItems": 1,
      "maxItems": 8,
      "items": {
        "type": "string",
        "pattern": "^(AGENTS\\.md|docs/|Keeper jsonframe spec\\.md|\\.[a-z]+/rules/)"
      },
      "description": "Repo paths Cursor must read first. AGENTS.md should always be included."
    },
    "scope": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "touch": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "description": "Folders or files expected to change."
        },
        "do_not_touch": {
          "type": "array",
          "items": { "type": "string", "minLength": 1 },
          "description": "Explicit exclusions — known debt paths, out-of-scope areas."
        }
      }
    },
    "pattern_ref": {
      "type": "string",
      "maxLength": 500,
      "description": "Proven pattern to follow, e.g. Key EntityKind recipe steps 4–7."
    },
    "rendr_treatment": {
      "type": ["string", "null"],
      "maxLength": 2000,
      "description": "Presence/layout intent from Rendr. Null when not a UI treatment job."
    },
    "git": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "branch": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9/_\\.-]+$",
          "description": "Working branch, e.g. cloud/handoff/capability-entitykind"
        },
        "base": {
          "type": "string",
          "default": "main",
          "description": "Base branch for PR."
        },
        "commit": {
          "type": "boolean",
          "default": false,
          "description": "If true, Cursor may commit. Default false — Chuck commits unless explicitly delegated."
        },
        "open_pr": {
          "type": "boolean",
          "default": false,
          "description": "If true, open PR when done (Phase 1+ via Cloud github.pr.create or Cursor)."
        },
        "pr_title": {
          "type": "string",
          "maxLength": 200
        }
      }
    },
    "verification": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "commands": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Shell commands that must pass, e.g. pnpm run smoke"
        },
        "browser": {
          "type": "array",
          "items": { "type": "string" },
          "description": "URLs or frame routes to visually confirm."
        }
      }
    },
    "context": {
      "type": "object",
      "additionalProperties": false,
      "properties": {
        "phase": {
          "type": "string",
          "description": "Platform phase reference, e.g. Phase 1 jsonframe complete"
        },
        "related_handoffs": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Prior handoff ids this builds on."
        },
        "library_refs": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Keeper Library item ids promoted into this task (audit trail)."
        },
        "notes": {
          "type": "string",
          "maxLength": 2000,
          "description": "Free-form context Cloud could not express elsewhere."
        }
      }
    },
    "execution": {
      "type": "object",
      "additionalProperties": false,
      "description": "Phase 1+ — populated by Cloud when invoking Cursor SDK.",
      "properties": {
        "runtime": {
          "type": "string",
          "enum": ["cursor-cloud", "cursor-local"],
          "default": "cursor-cloud"
        },
        "model": {
          "type": "string",
          "default": "composer-2.5"
        },
        "mode": {
          "type": "string",
          "enum": ["agent", "plan"],
          "default": "agent"
        },
        "requires_approval": {
          "type": "boolean",
          "default": true,
          "description": "Chuck must approve before Cursor run starts."
        },
        "cursor_run_id": {
          "type": ["string", "null"],
          "description": "Filled after cursor.handoff.invoke returns."
        },
        "cursor_agent_id": {
          "type": ["string", "null"],
          "description": "Filled for durable/resumable runs."
        },
        "status": {
          "type": "string",
          "enum": ["draft", "pending_approval", "running", "completed", "failed", "cancelled"]
        }
      }
    }
  }
}
```

---

## Router rules (Cloud)

Cloud sets `territory` before writing the handoff:

| `territory` | When | Executor |
|---|---|---|
| `cloud` | Pattern proven; mechanical only (PATCH route, wire defaults, file write, PR) | Cloud via `github.*` MCP — **do not** invoke Cursor |
| `cursor` | Schema design, new EntityKind steps, architectural reasoning, first-pass components | Cursor |
| `rendr-then-cursor` | UI/presence job — treatment must be decided before code | Rendr → embed `rendr_treatment` → Cursor |
| `rendr-only` | Treatment copy/spec update with no code change | Rendr; no Cursor handoff |

**Decision question:** *Is the pattern already proven in the codebase?*

- **No** → `cursor` or `rendr-then-cursor`
- **Yes, mechanical** → `cloud`
- **Yes, treatment only** → `rendr-only`

---

## Markdown render template

Cloud generates `current.md` from `current.json` using this template:

```markdown
# Build Handoff — {id}

**Goal:** {goal}  
**Territory:** {territory}  
**Branch:** {git.branch or "none"}  
**Created:** {created_at} by {created_by}

## Done when

{done_when as bullet list}

## Canon (read first)

{canon as bullet list with @ prefix for Cursor}

## Scope

**Touch:** {scope.touch or "—"}  
**Do not touch:** {scope.do_not_touch or "—"}

## Pattern

{pattern_ref or "—"}

## Rendr treatment

{rendr_treatment or "N/A — not a presence job"}

## Verification

**Commands:** {verification.commands or "pnpm run smoke"}  
**Browser:** {verification.browser or "—"}

## Constraints

- Match conventions in touched folders.
- Small focused diff.
- {git.commit ? "May commit on branch." : "Do not commit unless Chuck asks."}
- Codebase wins over docs when they conflict.

## Context

{context.notes or "—"}
```

---

## Field reference (quick)

| Field | Required | Notes |
|---|---|---|
| `version` | yes | Always `"1.0"` until schema bump |
| `id` | yes | kebab-case slug |
| `goal` | yes | One sentence |
| `done_when` | yes | Testable bullets |
| `territory` | yes | Routes Cloud vs Cursor vs Rendr |
| `canon` | yes | Include `AGENTS.md` always |
| `scope` | no | Strongly recommended for Cursor jobs |
| `pattern_ref` | no | Required when following EntityKind recipe |
| `rendr_treatment` | no | Required when `territory` is `rendr-then-cursor` |
| `git` | no | Required when Cursor should use a branch |
| `verification` | no | Default command: `pnpm run smoke` |
| `context` | no | Audit trail, Library refs |
| `execution` | no | Phase 1+ runtime metadata |

---

## Validation rules (Cloud)

1. **`canon` must include `AGENTS.md`.**
2. **`rendr-then-cursor` requires non-null `rendr_treatment`.**
3. **`territory: cloud` handoffs must not set `execution.cursor_run_id`** — Cloud executes via GitHub MCP directly.
4. **`do_not_touch` should list known sacred/debt paths** when relevant (e.g. `apps/api/src/api/journey/domain-integrated-routes.ts`).
5. **`done_when` must be observable** — avoid “make it better”; prefer “Cover renders five slots after reload”.
6. **One bounded goal** — if `goal` needs “and also”, split into a second handoff.

---

## Examples

### Example A — Cursor reasoning (EntityKind)

See `current.example.json` in this folder.

### Example B — Cloud mechanical (no Cursor)

```json
{
  "version": "1.0",
  "id": "library-patch-route",
  "created_at": "2026-06-17T12:00:00Z",
  "created_by": "cloud",
  "goal": "Add PATCH route for LibraryItem following Key entity-routes pattern.",
  "done_when": [
    "PATCH /api/library/:id accepts display_label and description",
    "Route follows existing chroniclePatch pattern",
    "Types exported from route module"
  ],
  "territory": "cloud",
  "canon": ["AGENTS.md", "docs/entitykind-implementation-recipe.md"],
  "pattern_ref": "Key PATCH in apps/api/src/api/keys/ — copy structure",
  "scope": {
    "touch": ["apps/api/src/api/library/"],
    "do_not_touch": ["packages/database/prisma/schema.prisma"]
  },
  "git": {
    "branch": "cloud/handoff/library-patch-route",
    "commit": true,
    "open_pr": true,
    "pr_title": "feat(api): LibraryItem PATCH route"
  },
  "verification": {
    "commands": ["pnpm run quick:api"]
  }
}
```

### Example C — Rendr then Cursor (treatment + implementation)

```json
{
  "version": "1.0",
  "id": "dialog-composer-atmosphere",
  "created_at": "2026-06-17T12:00:00Z",
  "created_by": "cloud",
  "goal": "Apply warm-dark dialog composer treatment per Rendr spec.",
  "done_when": [
    "Composer opacity matches treatment table",
    "Scroll mask gradient matches spec",
    "No regression on guest companion path"
  ],
  "territory": "rendr-then-cursor",
  "canon": ["AGENTS.md", "docs/keeper-ui-experience.md"],
  "rendr_treatment": "Warm dark register. Composer 0.82 opacity, banner 0.55. Chat zone open atmosphere — bottom scroll mask 70% to transparent. Soft gradient dissolve on message stack.",
  "scope": {
    "touch": ["apps/web/src/v0/components/dialog/"],
    "do_not_touch": ["apps/web/src/v0/boards/UniversalBoardDefinition.ts"]
  },
  "git": {
    "branch": "cloud/handoff/dialog-composer-atmosphere"
  },
  "verification": {
    "browser": ["/d/default?board=ide"]
  }
}
```

---

## Agent responsibilities (reminder)

| Agent | Role in handoff flow |
|---|---|
| **Cloud** | Compose, validate, write files, route territory, invoke MCP/SDK, update canon |
| **Rendr** | Supply `rendr_treatment` for presence jobs |
| **Cursor** | Execute `territory: cursor` and `rendr-then-cursor` handoffs |
| **Chuck** | Approve `requires_approval`, review PRs, product direction |

Cursor is **not** a Keeper `kip_agents` record. It is external execution reached via SDK/MCP.

---

## Changelog

| Date | Change |
|---|---|
| 2026-06-17 | v1.0 initial schema — Phase 0 file handoffs + Phase 1 MCP shape |
