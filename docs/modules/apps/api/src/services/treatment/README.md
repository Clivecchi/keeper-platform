# Treatment Service (API)

## 📌 Purpose
Normalize and validate Chronicle Treatment v0 proposals for the `treatment.propose` agent action.

## 🧱 Key Files
- `normalizeTreatmentProposal.ts` — merge partial proposals onto existing Treatment; hex + font normalization
- `normalizeTreatmentProposal.test.ts` — unit tests

## 🔄 Data & Behavior
- `normalizeTreatmentProposal(existing, proposal)` merges onto `frame_json.treatment` (or defaults) and returns a full v0 shape: `name`, `palette.background`, `palette.accent`, `font.family`.
- Used by `executeAgentActions` for `treatment.propose` — propose only; persistence happens when the user taps Apply in Design Board dialog.

## ⚠️ Notes & ToDo
- [ ] Share normalization with web `resolveDomainTreatment` if drift appears

## 📆 Update Log
- 2026-07-06: Initial module for Rendr Design Board `treatment.propose` handler.
