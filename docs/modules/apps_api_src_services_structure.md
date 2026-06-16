# structure

## 📌 Purpose
Universal structured-output pipeline: parse, validate, prose fallback, and optional Together AI repair by structure contract id.

## 🧱 Key Files
- `contracts.ts` — `STRUCTURE_CONTRACTS` + `DOMAIN_FRAME_STRUCTURE_CONTRACTS` registry
- `parseKipAgentOutput.ts` — extract/parse agent_output from primary model text
- `generateDomainFrameSlice.ts` — Design Board frame JSON generation (Together → Anthropic)
- `togetherFrameSlice.ts` — Together schema-constrained frame generation
- `anthropicFrameSlice.ts` — Anthropic JSON fallback for frames
- `togetherStructureRepair.ts` — Together JSON repair for agent_output
- `togetherApiKey.ts` — shared Together key resolution
- `ensureStructuredOutput.ts` — public entry point for parse/repair contracts

## 🔄 Data & Behavior
1. **kip.agent_output** — parse primary chat output; prose-wrap; Together repair on failure.
2. **domain.frame.*** — generate governed frame slices for Design Board; JSON Schema from `frame-schemas.ts` registered per contract; Together first, Anthropic fallback.

Contract IDs and `FRAME_TO_JSON_KEY` live in `@keeper/shared/structure`. Frame JSON Schemas register in `contracts.ts` (Zod migration from `frame-schemas.ts` is incremental).

## ⚠️ Notes & ToDo
- [x] Register `domain.frame.*` contracts; wire Design Board (Phase 3 — 2026-06-15)
- [x] Move `FRAME_TO_JSON_KEY` to `@keeper/shared` (Phase 2 — 2026-06-15)
- [ ] Replace permissive `domainFrameSliceSchema` with per-frame Zod from `domain-frame.types.ts`

## 📆 Update Log
- 2026-06-15: **domain.frame.theme** — `themeFrameSchema` registered; 13 governed frame contracts including brand identity tokens.
- 2026-06-15: Phase 3 — `DOMAIN_FRAME_STRUCTURE_CONTRACTS` from `FRAME_SCHEMA_MAP`; `generateDomainFrameSlice`; kip-designer uses structure service; Together jsonMode enabled for Llama 3.1 8B.
- 2026-06-15: Phase 2 — frame slice map in `@keeper/shared/structure/frameJsonMap`.
- 2026-06-15: Phase 1 — `kip.agent_output` contract wired into `runAgent`.
