# shared

## 📌 Purpose
Shared utilities, TypeScript types, and lightweight helpers reused across the Keeper Platform's frontend and backend.

## 🧱 Key Files
- `package.json` – workspace package manifest
- `tsconfig.json` – compilation settings extending the root config
- `src/index.ts` – public exports
- `src/logger.ts` – simple console logger
- `src/draftPoints.ts` – Draft Point types and `spec_json.points` helpers

## 🔄 Data & Behavior
This package exposes pure functions and type definitions; it holds no runtime state. The logger writes to stdout in all environments, ensuring messages surface in Railway / Vercel logs.

Draft Points live in `kip_drafts.spec_json.points` (not a separate table). Use `normalizeDraftSpecJson`, `createDraftPoint`, and `appendDraftPointToSpec` from `draftPoints.ts`.

## ⚠️ Notes & ToDo
- [ ] Migrate common KAM (auth) types here
- [ ] Consider adding a shared UI primitives package later

## 📆 Update Log
- 2026-05-27 – Added `draftPoints.ts`: Draft Point model (`proposed | accepted | pending`, types `moment | decision | context | general`) stored in `spec_json.points`.
