# build-handoffs

## 📌 Purpose
Structured handoff contract between Cloud (curator/orchestrator), Rendr (presence), and Cursor (external codebase execution). Cloud writes instances; Cursor consumes them via `@docs/build-handoffs/current.md` (Phase 0) or MCP SDK (Phase 1).

## 🧱 Key Files
- `schema.md` — canonical JSON schema, router rules, markdown template, examples
- `current.example.json` — reference instance (EntityKind design job)
- `current.example.md` — rendered markdown from the example (Phase 0 Cursor `@` reference)
- `current.json` — active handoff (written by Cloud; not committed until a task starts)
- `current.md` — human-readable render of `current.json` for Cursor `@` reference

## 🔄 Data & Behavior
1. Cloud composes a handoff from Chuck's direction + canon + optional Rendr treatment.
2. Cloud validates against `schema.md` and sets `territory` (`cursor` | `cloud` | `rendr-then-cursor` | `rendr-only`).
3. **Phase 0:** Cloud writes `current.json` + `current.md` to git; Chuck or Cursor executes from `@AGENTS.md` + `@docs/build-handoffs/current.md`.
4. **Phase 1:** Cloud calls `cursor.handoff.invoke` with the same JSON; Cursor Cloud Agent runs against the repo.

Cursor is external infrastructure — not a `kip_agents` record.

## ⚠️ Notes & ToDo
- [ ] Phase 1 — `CursorBridgeService` + `cursor.handoff.invoke` MCP tool on `apps/api`
- [ ] Phase 1 — `cursor.invoke` capability seeded on Cloud only
- [ ] Optional — TypeScript types in `@keeper/shared` mirroring schema v1.0

## 📆 Update Log
- 2026-06-17: Initial schema v1.0 — `schema.md`, `current.example.json`, router rules, markdown template.
