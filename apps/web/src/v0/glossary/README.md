# glossary

## 📌 Purpose
Bundles the governing Object Glossary markdown for in-product Chronicle read (Domain) and definition ownership (Design). Not a Dialog Document.

## 🧱 Key Files
- `objectGlossaryMarkdown.ts` — raw import of the bundled glossary markdown
- `keeper-object-glossary.md` — copy shipped with the web app (Vercel ignores `docs/` and `*.md`)
- `../../scripts/sync-object-glossary.mjs` — copies `docs/keeper-object-glossary.md` into this folder when the docs file is present

## 🔄 Data & Behavior
Vite `?raw` import so Domain/Design Chronicle can render the Object Glossary. Nav selection is `objectType: "glossary"` via `GlossaryPresence`. Governing source remains `docs/keeper-object-glossary.md`; the in-app copy exists because Vercel does not upload `docs/`.

## ⚠️ Notes & ToDo
- [ ] In-product save of glossary text is not wired — Design is the definition-ownership surface; source of truth remains the repo file.

## 📆 Update Log

### 2026-08-17 — Vercel bundle path
- Vite no longer imports `docs/keeper-object-glossary.md` (Vercel `.vercelignore` drops `docs/` and `*.md`). The web app now ships `keeper-object-glossary.md` and syncs it from `docs/` when that file is present.

### 2026-08-17 — Object Glossary bundle
- Added bundled markdown module for Chronicle `GlossaryPresence`.
