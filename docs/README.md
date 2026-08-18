# Docs

## 📌 Purpose
Primary documentation hub for Keeper architecture, deployment notes, and operational guides.

## 🧱 Key Files
- `keeper-heart-mind.md`
- `keeper-ui-experience.md`
- `entitykind-implementation-recipe.md`
- `keeper-object-glossary.md` — governing platform object vocabulary (working v1); includes board-emphasis invariant
- `build-handoffs/schema.md` — Cloud → Cursor handoff contract
- `universal-board-dialog-cueing.md` — Dialog Cueing (Director · Cast · Cue); modes monologue / directed / …
- `universal-board-dialog-orchestration.md` — legacy stub → see dialog-cueing doc
- `dialog-cueing-plan.md` — Rename + behavior plan (2026-08-03)
- `DOMAIN_DEVELOPMENT_PLAN.md`
- `AUTHENTICATION_HARDENING.md`

## 🔄 Data & Behavior
Docs are maintained as canonical references for architecture, flows, and playbooks. Updates should align with code sources of truth and track changes over time.

## ⚠️ Notes & ToDo
- [ ] TODO: Verify and describe assumptions.

## 📆 Update Log
- **2026-08-17**: Object Glossary — board-emphasis invariant (governing); IDE display rename to Build; in-product Glossary nav (Domain read / Design definition).
- **2026-08-02**: Landed governing `keeper-object-glossary.md` (working v1) — same tier as EntityKind Recipe; agent read access via Library Item + Training Governance inject.
- **2026-06-19**: Updated `keeper-ui-experience.md` — Declared Chronicle UI (Focus · Config · Act), `ChronicleActPresence`, no `EngagementForm` on board Acts.
- 2026-06-17: Added `build-handoffs/` — v1.0 schema for Cloud → Cursor handoffs (Phase 0 file-based; Phase 1 MCP).
- 2026-06-13: Added governing EntityKind Implementation Recipe (`entitykind-implementation-recipe.md`) — Key as reference, 12-step checklist, Cloud handoff map.
- 2026-02-01: Added canonical UI experience doc `keeper-ui-experience.md`.
- 2026-01-31: Added canonical architecture doc `keeper-heart-mind.md`.
- 2026-01-31: Revised `keeper-heart-mind.md` with narrative journeys and mapping.
- 2026-01-31: Clarified conceptual vs v0 experience terminology in `keeper-heart-mind.md`.
- 2026-01-31: Mapped Present to Presentation world and added path forward in `keeper-heart-mind.md`.
- 2026-01-31: Added `docs/modules` index README for module snapshots.
