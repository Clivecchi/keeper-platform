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
- 2026-08-17: `markdownToDraftPoints.ts` — heading/section split for Dialog ingest (truncates at `INGEST_MAX_POINTS`). `dialog.rw` added to `DOMAIN_ACCESS_KEY_SCOPES`.
- 2026-07-25: `dialogParticipation` default is `voice` for every agent (including Cloud). `support_only` / `silent` only via Agent Config.
- 2026-07-24: `dialogParticipation.ts` — `voice` | `support_only` | `silent` on agent config. `redactForLog.ts` — JWT/token redaction for console/debug capture.
- 2026-07-19: `document.ts` — added `DocumentForward` / `DocumentStep` on the Document container (authored destination vs live tip).
- 2026-07-16: Renamed `chronicleDocument.ts` → `document.ts`; exported type `Document` (+ `Point` alias) replaces `ChronicleDocument`.
- 2026-07-13: Added `chronicleSubject.ts` — Layer-1 ChronicleSubject/ChronicleOverlay types, `resolveChronicleView`, and legacy ID compat helpers (see `docs/chronicle-document-architecture.md`).
- 2025-11-22: Added canonical board slug helpers to coordinate logged-in experience rendering.














