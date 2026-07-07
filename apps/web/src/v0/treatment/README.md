# treatment

## 📌 Purpose
Minimal Treatment v0 — named presence configuration stored in `Domain.frame_json.treatment` and applied to Chronicle (right panel) at runtime.

## 🧱 Key Files
- `resolveDomainTreatment.ts` — reads `frame_json.treatment` with theme-derived fallback
- `treatmentCss.ts` — hex → Chronicle shell styles and `--treatment-color` CSS vars
- `ChronicleTreatmentShell.tsx` — wrapper applied in `ChroniclePresenceView`
- `resolveDomainTreatment.test.ts` — resolver unit tests

## 🔄 Data & Behavior
- **Storage:** `Domain.frame_json.treatment` — `{ name, palette: { background, accent }, font: { family } }`
- **Read path:** `V0Shell.domainFrame` → `resolveDomainTreatment()` → `UniversalViewPanel` → `ChroniclePresenceView` → `ChronicleTreatmentShell`
- **Write path:** Domain Chronicle Config → `splitDomainChroniclePatch` → `PATCH /api/domains/:slug/frame` → `reloadDomainFrame()`
- **Scope:** Chronicle-only for v0 — center dialog and nav remain on domain `theme`

## ⚠️ Notes & ToDo
- [ ] Spatial, motion, and density fields (full Treatment spec)
- [ ] Rendr output target + Design Board Treatment authoring UI
- [ ] Whole-board Treatment application

## 📆 Update Log

### 2026-07-06 — Treatment save + render fixes
- `normalizeTreatmentHexColor` accepts hex with or without `#` (e.g. `121410` → `#121410`)
- Save path normalizes colors before writing `frame_json.treatment`
- `reloadDomainFrame` uses `forceRefresh: true` so Chronicle picks up saved Treatment immediately

### 2026-07-06 — Treatment v0 (Chronicle-only)
- Added `DomainFrameTreatment` type on `DomainFrameJson`
- Default treatment in `DEFAULT_DOMAIN_FRAME`
- Chronicle shell applies background, font, accent border, and `--treatment-color` vars
- Domain Config Chronicle fields: treatment name, background, accent, font
