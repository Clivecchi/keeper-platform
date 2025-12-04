# SharedSrc

## 📌 Purpose
Core source files for the `@keeper/shared` workspace package. Provides shared logging utilities, role constants, and canonical board metadata consumed by both the API and web app.

## 🧱 Key Files
- `index.ts` – Barrel export for package consumers
- `logger.ts` – Minimal console logger
- `roles.ts` – Shared role identifiers
- `canonicalBoards.ts` – Canonical logged-in experience board slugs & helpers

## 🔄 Data & Behavior
- All exports are side-effect free utilities or type helpers.
- `canonicalBoards.ts` defines the `CanonicalBoardSlug` union plus helper guards. No runtime data is fetched here; it is pure metadata used to coordinate backend seeding and frontend routing.

## ⚠️ Notes & ToDo
- [ ] Backfill additional shared UI types as they stabilize
- [ ] Consider moving engagement template metadata here when API/web need the same constants

## 📆 Update Log
- 2025-11-22: Added canonical board slug helpers to coordinate logged-in experience rendering.




