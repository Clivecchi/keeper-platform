# structure

## 📌 Purpose
Shared structure contract IDs and metadata for the universal `ensureStructuredOutput` pipeline (API runtime). Zod schemas live in `apps/api` until domain-frame schemas migrate incrementally.

## 🧱 Key Files
- `types.ts` — `StructureContractId`, `KIP_AGENT_OUTPUT_CONTRACT_ID`
- `index.ts` — public exports

## 🔄 Data & Behavior
- Contract IDs namespace: `kip.agent_output`, `domain.frame.{frameKey}` (13 governed frames including `theme`).
- `frameJsonMap.ts` — canonical `FRAME_TO_JSON_KEY` and slice helpers (`getJsonSlicePath`, `getFrameSliceFromDomainFrame`).
- Same machinery in API validates/repairs by contract; this package holds stable keys and frame routing.

## ⚠️ Notes & ToDo
- [x] Move `FRAME_TO_JSON_KEY` from web `frameRegistryMap.ts` here (Phase 2 — 2026-06-15)
- [ ] Add per-frame Zod schemas beside domain types (incremental migration from `frame-schemas.ts`)

## 📆 Update Log
- 2026-06-15: **domain.frame.theme** — brand identity slice (`frame_json.theme`) now has a structure contract via API `themeFrameSchema`.
- 2026-06-15: Phase 3 — `domain.frame.*` contract IDs align with API `DOMAIN_FRAME_STRUCTURE_CONTRACTS` registry.
- 2026-06-15: Phase 2 — moved `FRAME_TO_JSON_KEY` + slice helpers to `frameJsonMap.ts`; web re-exports from `@keeper/shared`; kip-designer reads slices via `getFrameSliceFromDomainFrame`.
- 2026-06-15: Phase 1 — added `kip.agent_output` contract id and structure types for universal format pipeline.
