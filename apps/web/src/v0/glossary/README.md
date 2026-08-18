# glossary

## 📌 Purpose
Bundles the governing Object Glossary markdown for in-product Chronicle read (Domain) and definition ownership (Design). Not a Dialog Document.

## 🧱 Key Files
- `objectGlossaryMarkdown.ts` — raw import of `docs/keeper-object-glossary.md`

## 🔄 Data & Behavior
Vite `?raw` import so Domain/Design Chronicle can render the same file that lives in the repo. Nav selection is `objectType: "glossary"` via `GlossaryPresence`.

## ⚠️ Notes & ToDo
- [ ] In-product save of glossary text is not wired — Design is the definition-ownership surface; source of truth remains the repo file.

## 📆 Update Log

### 2026-08-17 — Object Glossary bundle
- Added bundled markdown module for Chronicle `GlossaryPresence`.
