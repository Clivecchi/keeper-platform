# scripts

## 📌 Purpose
Web-app build helpers that run before Vite (PWA icons, Object Glossary sync).

## 🧱 Key Files
- `generate-pwa-icons.mjs`
- `sync-object-glossary.mjs`

## 🔄 Data & Behavior
`sync-object-glossary.mjs` copies `docs/keeper-object-glossary.md` into `src/v0/glossary/` when the docs file exists. On Vercel, `docs/` is ignored, so the committed bundle copy is used.

## ⚠️ Notes & ToDo
- [ ] In-product save of glossary text is not wired.

## 📆 Update Log

### 2026-08-17 — Object Glossary Vercel path
- Added `sync-object-glossary.mjs` so the Vite `?raw` import does not depend on repo-root `docs/` at Vercel build time.
