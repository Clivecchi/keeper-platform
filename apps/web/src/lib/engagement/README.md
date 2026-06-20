# Engagement Client Lib

## 📌 Purpose
Client-side helpers for loading KeeperType engagement templates and submitting template executions on story surfaces.

## 🧱 Key Files
- `types.ts` — Shared engagement prop/template types
- `templates.client.ts` — Single-template fetch + cache
- `submit.ts` — Template execution submit helper
- `useKeeperTypeTemplates.ts` — Hook + filter utilities for KeeperType template lists

## 🔄 Data & Behavior
`useKeeperTypeTemplates` loads templates from `GET /api/engagement/templates/type/:keeperTypeName` and caches results per hook instance. `filterEngagementTemplates` narrows templates by `targetType`, slug allow/deny lists, and visibility (`member` requires authentication).

Story surfaces (`JourneysFrame`, `MomentBody`) consume these helpers through `EntityEngagementBar`.

## ⚠️ Notes & ToDo
- [ ] Add shared toast handling for engagement success/error across story surfaces
- [ ] Consider public-template visibility for guest surfaces

## 📆 Update Log
- **2026-06-19** — Added `useKeeperTypeTemplates` and `filterEngagementTemplates` to support uniform Engagement Template wiring on Journey/Moment story surfaces.
