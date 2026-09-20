# Jev Probe

## 📌 Purpose
Reusable evaluation core: ask typed Jev questions over supplied evidence and return answers with confidence. The Code X-ray CLI and the Kip `jev.probe` action are consumers. Not a Probe product, scheduler, or Evaluation object store.

## 🧱 Key Files
- `types.ts` — Probe request / parsed answer / outcome
- `runJevProbe.ts` — evidence + questions → TypeSafe `systemone` → evaluations
- `JevProbeService.ts` — Kip `jev.probe` wrapper + agent prompt
- `runJevProbe.test.ts` / `JevProbeService.test.ts`

## 🔄 Data & Behavior
`runJevProbe` wraps `evaluateTypeSafe`. Optional `context` becomes `{ context, evidence }` in the TypeSafe state. Parsed evaluations preserve Choice/Noul/Score plus confidence and probabilities. Key path is unchanged (`TYPESAFE_API_KEY` → platform/user keys). Does not persist.

Agent payload: `{ evidence, questions, context?, model? }`. `state` is accepted as an alias for evidence.

## ⚠️ Notes & ToDo
- [ ] Cloud runtime seed (`ensureCastMemberAgent`) merges `jev.probe` onto the Cloud record
- [ ] Do not add ACME, Probe management, scheduling, or generalized workflow here
- [ ] Behavior to confirm with Kip: whether Lead should prefer `jev.probe` over `typesafe.evaluate` for evidence-in-hand turns

## 📆 Update Log
### 2026-09-19 — Extracted from Code X-ray
- Pulled the X-ray evaluation loop into `runJevProbe`. CLI remains a consumer. `jev.probe` is the smallest Agent capability/action for Cloud.
