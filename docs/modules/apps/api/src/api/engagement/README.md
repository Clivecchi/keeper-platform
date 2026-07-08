# Engagement API

## 📌 Purpose
Exposes endpoints to fetch engagement templates and execute engagement actions.

## 🧱 Key Files
- `execute.ts`
- `templates.ts`

## 🔄 Data & Behavior
Provides execution and template retrieval for engagement workflows, with validation and permission checks handled by the engagement executor.

## ⚠️ Notes & ToDo
- [ ] Expand role checks for template visibility beyond basic admin gating.

## 📆 Update Log
- 2026-07-07: `templates.ts` GET `/:key` now returns `{ success, data }` in the same shape as `execute.ts` GET `/templates/:slug` so Chronicle Nav `+` can parse either route.
- 2026-01-31: Extended engagement execution to accept path and moment entity types.
