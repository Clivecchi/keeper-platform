# structure

## 📌 Purpose
Shared structure contract IDs and metadata for the universal `ensureStructuredOutput` pipeline (API runtime). Zod schemas live in `apps/api` until domain-frame schemas move here in Phase 3.

## 🧱 Key Files
- `types.ts` — `StructureContractId`, `KIP_AGENT_OUTPUT_CONTRACT_ID`
- `index.ts` — public exports

## 🔄 Data & Behavior
- Contract IDs namespace: `kip.agent_output`, future `domain.frame.{frameKey}`.
- Same machinery in API validates/repairs by contract; this package holds stable keys only.

## ⚠️ Notes & ToDo
- [ ] Move `FRAME_TO_JSON_KEY` from web `frameRegistryMap.ts` here (Phase 2)
- [ ] Add Zod frame schemas beside domain types (Phase 3)

## 📆 Update Log
- 2026-06-15: Phase 1 — added `kip.agent_output` contract id and structure types for universal format pipeline.
