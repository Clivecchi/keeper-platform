# Gloss

## 📌 Purpose
Cursor session findings written to ke3p · Becoming Together as message-anchored Gloss. These files are the source passed to `gloss-cursor-to-dialog.ts`. They do not create Points or mutate the Document.

## 🧱 Key Files
- `2026-08-05-keeper-brand-and-products.md`
- `2026-08-06-cast-cueing-dialog-style.md`
- `2026-08-22-cast-honesty-kip-question.md`
- `2026-08-22-agency-ui-trace-behavior.md`
- `2026-08-22-composer-stage-vertical-slice.md`
- `2026-08-22-review-reorganize.md`
- `2026-09-01-keep-it-right-agency.md`
- `2026-09-01-cloud-advise-only-card-drop.md`
- `2026-09-02-keeping-choices-dynamic-kinds.md`
- `2026-09-02-keeping-choice-contract.md`
- `2026-09-07-stage-casting-code-truth.md`
- `2026-09-07-keeping-choice-card-won.md`

## 🔄 Data & Behavior
From `apps/api`: `pnpm exec tsx src/scripts/gloss-cursor-to-dialog.ts --file <path>`. Default Dialog is Becoming Together.

## ⚠️ Notes & ToDo
- [ ] Gloss is voice, not a build lock, unless Chuck locks it on the Document

## 📆 Update Log
### 2026-09-07 — Keeping Choice card won
- Added `2026-09-07-keeping-choice-card-won.md` — first live test: raw envelope had Lock/Open/Next Step card, no keepingChoices; parser did not drop; decision-card example won. Gloss-only.

### 2026-09-07 — Stage / Casting code-truth
- Added `2026-09-07-stage-casting-code-truth.md` — live-DB diagnostic: Agent / Casting / Loop / Stage / Frame already exist as parallel primitives; smallest slice is a Stage-cast bridge into existing consult + Treatment Apply. Gloss-only.

### 2026-09-02 — Keeping Choice contract
- Added `2026-09-02-keeping-choice-contract.md` — design-only envelope sibling `keepingChoices`; click reuses Composer send; no kind field; learn from selections not offers. Gloss-only.

### 2026-09-02 — Keeping Choices + Dynamic Kinds
- Added `2026-09-02-keeping-choices-dynamic-kinds.md` — code-truth investigation: no Keeping Choice type; proposal is a state diff; Kind is several discriminators; Business Plan can be Document/`draft.kind` but not a typed Kind; SOLE is the lightest emerging-form memory. Gloss-only.

### 2026-09-01 — Cloud advise-only card drop
- Added `2026-09-01-cloud-advise-only-card-drop.md` — Cloud wrote the Keeping Judgment report into `card`; consult dropped it; Stage command caused skipped layout; same Ceox root.

### 2026-09-01 — Keep It Right Agency
- Added `2026-09-01-keep-it-right-agency.md` — Ceox Stage layout vs Kip Document Point; understanding→action seam; reuse Story-builder + obligation, do not add phrase rules.

### 2026-08-22 — Review & Reorganize
- Added `2026-08-22-review-reorganize.md` — Lead proposes a better Document; Chronicle shows Current vs Proposed; human Applies.

### 2026-08-22 — Composer + Stage slice
- Added `2026-08-22-composer-stage-vertical-slice.md` — reach Composer vs Dialog Composer; Keeper Stage as workspace surface; Stage references + contextual Agency.

### 2026-08-22 — Cast honesty + Agency UI
- Added `2026-08-22-cast-honesty-kip-question.md` — Kip never asked; puppet ### Cloud / ### Rendr; document not in focus.
- Added `2026-08-22-agency-ui-trace-behavior.md` — Cloud JSON leak; Cast cards discarded; Agency Trace + behavior knobs; do not rebuild Agent Board.
