# shared

## 📌 Purpose
Shared utilities, TypeScript types, and lightweight helpers reused across the Keeper Platform's frontend and backend.

## 🧱 Key Files
- `package.json` – workspace package manifest
- `tsconfig.json` – compilation settings extending the root config
- `src/index.ts` – public exports
- `src/logger.ts` – simple console logger
- `src/draftPoints.ts` – Draft Point types and `spec_json.points` helpers
- `src/draftPointStructure.ts` – journey_spec PATH/Moments parsing and promotion mapping
- `src/glossAnchor.ts` – `GlossAnchor` type + DOM attribute helpers (Gloss-readiness)
- `src/integrationChronicleDeclarations.ts` – Integration/Key Chronicle declaration defaults and backfill helpers
- `src/domainTier.ts` – domain pricing tier flags (`free` / `keeper` / `studio`) and key access policy

## 🔄 Data & Behavior
This package exposes pure functions and type definitions; it holds no runtime state. The logger writes to stdout in all environments, ensuring messages surface in Railway / Vercel logs.

Draft Points live in `kip_drafts.spec_json.points` (not a separate table). Use `canonicalizeDraftSpecJson` on writes, `normalizeDraftSpecJson` on reads (legacy `sections` read compat), `createDraftPoint`, and `appendDraftPointToSpec` from `draftPoints.ts`.

Integration, Key, Capability, Library, and Keeper Chronicle declaration defaults live in `integrationChronicleDeclarations.ts`.

## ⚠️ Notes & ToDo
- [ ] Migrate common KAM (auth) types here
- [ ] Consider adding a shared UI primitives package later

## 📆 Update Log

### 2026-06-29 — Draft point structure + film strip
- Added `draftPointStructure.ts` — journey_spec PATH/Moments parsing; promotion mapping (point→Path, moments→Moment)
- `buildDraftSummaryFromAcceptedPoints` builds beat arc, not content concatenation
- DraftPoint gains optional `moments[]`; propose/rewrite actions accept prelude/closer/moments

### 2026-06-28 — Draft point rewrite + anchor guard
- Added `isDraftPointRewritable`, `rewriteDraftPointInSpec`, `summarizeDraftPointsForAgent`.
- `mergeDraftPointsById` ignores content overwrites for accepted (kept) anchor points.
