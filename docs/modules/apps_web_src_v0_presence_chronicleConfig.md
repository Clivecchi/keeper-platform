# chronicleConfig

## 📌 Purpose
Universal Chronicle Config Mode infrastructure — one explicit save pattern for every board. Provides `useChronicleConfig`, targeted PATCH routing, the persistent save bar, and the Config Mode shell (compressed identity header + editable body + save bar).

## 🧱 Key Files
- `types.ts` — `ChronicleSaveStatus`, `ChronicleEntityKind`
- `chroniclePatch.ts` — `handleChronicleSave`, `parseChroniclePatchFieldErrors`, domain/agent patch builders
- `useChronicleConfig.ts` — hook: dirty state, validate, build payload, save handler
- `ChronicleSaveBar.tsx` — green/red confirmed save indicator
- `ChronicleConfigShell.tsx` — universal Config Mode layout shell

## 🔄 Data & Behavior
- Agent saves → `PATCH /api/agents/:id` with `domainId` (explicit Save, no autosave)
- Domain saves → `PATCH /api/domains/:id` plus optional partial `PATCH /api/domains/:slug/frame` for tagline/theme/kip visibility
- IDE build context fields persist under `domain.settings.ideBuildContext` via domain PATCH
- Known gaps flagged in code: unchanged save no-op, static model list, capability textarea, domain assignment read-only, recent sessions not tappable

## ⚠️ Notes & ToDo
- [ ] Wire FrameConfigPresence prop edits through explicit save bar (Design Board — props still save on add)
- [ ] BoardDefConfigPresence remains read-only — no targeted save route for board defs

## 📆 Update Log

### 2026-05-29 — Step 2: Universal Chronicle CRUD
- Extracted universal save pattern from Agent Board into `useChronicleConfig`
- Added `ChronicleSaveBar` and `ChronicleConfigShell` shared components
- Wired Agent, Domain, IDE (build context), and Design (domain idle) boards through the same hook
