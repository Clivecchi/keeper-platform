# structure

## 📌 Purpose
Universal structured-output pipeline: parse, validate, prose fallback, and optional Together AI repair by structure contract id.

## 🧱 Key Files
- `contracts.ts` — `STRUCTURE_CONTRACTS` registry (Phase 1: `kip.agent_output`)
- `parseKipAgentOutput.ts` — extract/parse agent_output from primary model text
- `togetherStructureRepair.ts` — Together JSON repair pass
- `ensureStructuredOutput.ts` — public entry point for all contracts

## 🔄 Data & Behavior
1. Primary model returns raw text.
2. `parseKipAgentOutput` tries JSON extraction + Zod/action validation.
3. On `invalid_json` with plain prose → `prose-wrap` (no API call).
4. On broken JSON → optional Together repair (`response_format: json_object`).
5. Final fallback returns raw text (not cryptic draft.update.propose error).

Contract IDs and `FRAME_TO_JSON_KEY` live in `@keeper/shared/structure`. Zod schemas register in `contracts.ts` until frame schemas migrate (Phase 3).

## ⚠️ Notes & ToDo
- [ ] Register `domain.frame.*` contracts; wire Design Board (Phase 3)
- [x] Move `FRAME_TO_JSON_KEY` to `@keeper/shared` (Phase 2 — 2026-06-15)

## 📆 Update Log
- 2026-06-15: Phase 2 — frame slice map lives in `@keeper/shared/structure/frameJsonMap`; `getDomainFrameStructureContractId` helper added for Phase 3.
- 2026-06-15: Phase 1 — `kip.agent_output` contract, prose-wrap, Together repair, wired into `runAgent` via `ensureKipAgentOutputEnvelope`.
