# Jev Codebase X-Ray

## 📌 Purpose
Smallest developer harness that lets Jev evaluate curated Keeper code units against bounded semantic questions and emit a Keeper Code Map. Experiment — not a product UI and not a Cursor audit.

## 🧱 Key Files
- `types.ts` — unit / answer / Code Map records
- `questions.ts` — 26 architecture questions + 4 discovery questions (Choice only)
- `architectureContext.ts` — compact Domain / Stage / Agency context for Jev state
- `selectUnits.ts` — curated catalog + file/export/marker extraction
- `runXray.ts` — batches one TypeSafe `systemone` call per unit
- `report.ts` — confidence-preserving aggregation + markdown Code Map
- `../run-jev-codebase-xray.ts` — CLI

## 🔄 Data & Behavior
Reuses `evaluateTypeSafe` (`POST https://api.typesafe.ai/v1/systemone`). Key path is env → platform (`TYPESAFE_API_KEY`). One request per unit carries all questions; Jev evaluates them in parallel. Does not write Keeper data. Writes `tmp/jev-xray/results.json` and `tmp/jev-xray/code-map.md`.

From `apps/api`:

```bash
pnpm exec tsx src/scripts/run-jev-codebase-xray.ts --dry-run
pnpm exec tsx src/scripts/run-jev-codebase-xray.ts
```

## ⚠️ Notes & ToDo
- [ ] First live run is a calibration experiment, not a governing map
- [ ] Do not treat `likely` duplication as proof
- [x] First live run 2026-09-20: 40 units, 1200 evaluations, 3.0s, ~$0.01. Artifacts in `tmp/jev-xray/`. Calibration in `experiment-report.md`.
- [ ] Behavior to confirm with Kip: whether this becomes a Cloud code-intelligence capability

## 📆 Update Log

### 2026-09-20 — First live run
- 40/40 units, 1,200 evaluations, 3.0s, ~$0.01. Code Map + experiment report in `tmp/jev-xray/`. Jev confidently mapped Stage/mutation; flagged optional `domainId` on mounted `/api/journeys` and the unmounted Journey twin. Weak on grant≠knowledge and starved wrapper extracts.

### 2026-09-19 — V1 harness
- Added curated X-ray: 30 Choice questions, ~40 Keeper units, Code Map views (Stage, Dialog, mutation, Agency, legacy, reliability, capability-literacy, ambiguity). Discovery questions added after reading Stage/Story/Document collapse, dual Journey routes, and grant-vs-knowledge seams.
