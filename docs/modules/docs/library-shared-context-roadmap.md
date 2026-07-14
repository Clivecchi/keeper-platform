# Library — Shared Context Roadmap

**Status:** in progress — steps 1–9 implemented on feature branches; step 10 (AGENTS.md) landing with PR11.

---

## Why

No agent working on Keeper — Kip, Cloud, Cursor, Claude-in-chat — currently has reliable access to the same ground truth. What was assumed to be one thing ("Library") turned out to be five uncoordinated stores, each doing a slice of the job:

- **LibraryItem EntityKind** — domain-scoped uploads/links, real DB + API + Chronicle UI
- **`/library` (LibraryPage)** — retired; redirected to Universal Board
- **`kip_drafts`** — real, permissioned, versioned, but never scaled past one topic at a time
- **SOLE memory** — real save/read wiring, but "semantic" search is a substring match over mocked embeddings
- **`docs/` + `AGENTS.md` + `docs/modules`** — manual sync path for Cursor today

Library isn't Drafts and shouldn't try to be. Drafts turns dialog into documentation — authored, one topic at a time. Library holds material nobody authored through dialog — uploads, links, things pointed at rather than written.

---

## Steps — implementation status

| # | Step | Status | Branch / notes |
|---|------|--------|----------------|
| 1 | Close permission gap on `/api/library-items` | **Done** | `feat/library-permission-gap` |
| 2 | Retire `/library` legacy route | **Done** | `feat/library-retire-legacy-route` |
| 3 | Chronicle registry (Library pilot) | **Done** | `feat/chronicle-registry-library-pilot` |
| 4 | ChronicleSubject/Overlay compat shim (Layer 1) | **Done** | `feat/chronicle-subject-overlay-shim` |
| 5 | Library read/search API | **Done** | `feat/library-read-search-api` — cosine over existing `Float[]` embeddings |
| 6 | ChronicleDocument pilot + Gloss anchor decision | **Done** | stacked on read/search branch |
| 7 | `library.read` Kip action | **Done** | id or semantic query |
| 8 | MCP scoped auth (before external tools) | **Done** | see **MCP auth model** below |
| 9 | MCP library tools (`library_list` / `library_get` / `library_search`) | **Done** | read-only, `library.ro` capability |
| 10a | **Ownership decision** | **Decided** | see **What Library owns** below |
| 10b | Read-only pointers (index model) | **Done** | `keeper://draft/{id}`, `keeper://sole/{id}`, `doc://{path}` in `source_ref` |
| 11 | AGENTS.md Data Model + debt table | **Done** | this sequence |

---

## MCP auth model (step 8 — rationale)

**Problem:** `OPAI_AGENT_MCP_KEY` is one shared secret. Fine for in-platform agents (Kip on Railway); unsafe to hand to external tools (Cursor, Claude-in-chat) without domain boundaries.

**Decision:** KAM-scoped, domain-bound tokens alongside the platform key.

| Mode | Key source | Domain | Scopes |
|------|------------|--------|--------|
| **Platform** | `OPAI_AGENT_MCP_KEY` | optional `x-domain-id` | `*` (all tools) |
| **Scoped** | `KAM_LIBRARY_MCP_KEYS` JSON array (legacy env — migrate to Domain Access Keys) | **must** match entry `domainId` + header | explicit e.g. `library.ro` |
| **Domain** | `DomainAccessKey` rows — created in Domain Nav → External Access | **must** match key's domain + `x-domain-id` | per-key scopes |

**Preferred:** Domain Config → **External Access** (Nav on Domain / Realm / IDE boards). Keys are hashed at rest; secret shown once on create.

**Env shape (legacy only):**
```json
KAM_LIBRARY_MCP_KEYS=[{"key":"…","domainId":"…","scopes":["library.ro"]}]
```

**Why not JWT/KAM session tokens yet:** Library external access is read-only Pass 1; scoped static keys mirror KAM's domain-scoping intent without coupling MCP to the full auth cookie path. Upgrade path: replace scoped keys with short-lived KAM-issued MCP tokens using the same `{ domainId, scopes }` shape.

**Enforcement:** Library MCP tools declare `requiredCapability: 'library.ro'`. Scoped keys grant only declared scopes; platform key retains `*`. Auth middleware runs before `/call` and JSON-RPC tool dispatch.

Implementation: `DomainAccessKey` Prisma model, `DomainAccessKeyService`, `apps/api/src/api/domains/domain-access-key-routes.ts`, `apps/api/src/mcp/scopedAuth.ts` (DB lookup before legacy env).

---

## What Library owns (step 10a — decision)

**Decision: connective index** — not a sixth full store.

| Owns (primary) | Does not own (pointers only, Pass 1) |
|----------------|--------------------------------------|
| Uploads, URLs, files ingested into `LibraryItem` | Draft bodies (`kip_drafts`) |
| Domain-scoped `agent_perspective` + embeddings | SOLE card content |
| Display label, description, chronicle blocks | Git repo files (`docs/` stays git-first) |

**Rationale:**
- Uploads/URLs need ingestion, embeddings, and Chronicle presentation — that is real LibraryItem work already built.
- Drafts and SOLE have their own lifecycles, permissions, and write paths; duplicating them inside Library would recreate the five-store problem.
- External agents (Cursor, Claude) need **one query surface** (`library.read`, MCP search) that can **surface** pointers to drafts/SOLE/docs without write-back into those systems.
- Git-backed docs remain authoritative in the repo; Library can index `doc://` pointers for discovery, not replace `docs/modules` sync.

**Gloss anchor rule (locked):**
- **Persist across sessions** → promote to `LibraryItem`; gloss uses `{ entityKind: "library", entityId }`.
- **In-session diagnostics only** → ephemeral message-anchored gloss (`entityKind: "message"`, `nodeId: "synthetic-{stableKey}"`).

**Pass 2 (not now):** optional auto-index of high-value docs; SOLE/draft deep-link resolution in Chronicle; `library.rw` scoped keys.

---

## Related

- `docs/chronicle-document-architecture.md` — ChronicleDocument read shell + Layer 1–2 registry work
- `packages/shared/src/libraryPointer.ts` — pointer ref parser for connective index
- Prototype: "Library — Now Showing" artifact — interaction model reference

## 📆 Update Log

- **2026-07-14** — Domain-managed access keys (`DomainAccessKey` + External Access nav); MCP auth reads DB first, env fallback.
- **2026-07-13** — Steps 1–11 implemented; MCP auth rationale and ownership decision documented; gloss anchor rule locked.
