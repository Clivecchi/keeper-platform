# shared

## 📌 Purpose
Shared utilities, TypeScript types, and lightweight helpers reused across the Keeper Platform's frontend and backend.

## 🧱 Key Files
- `package.json` – workspace package manifest
- `tsconfig.json` – compilation settings extending the root config
- `src/index.ts` – public exports
- `src/logger.ts` – simple console logger

## 🔄 Data & Behavior
This package exposes pure functions and type definitions; it holds no runtime state. The logger writes to stdout in all environments, ensuring messages surface in Railway / Vercel logs.

## ⚠️ Notes & ToDo
- [ ] Migrate common KAM (auth) types here
- [ ] Consider adding a shared UI primitives package later

## 📆 Update Log
- 2025-06-18 – Initial package scaffold created. 
- 2025-06-25 – Verified build script and dependency order for monorepo builds. 
- 2025-09-03 – Confirmed consumers import compiled output only; no cross-package TS path aliases.