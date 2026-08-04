# treatment

## 📌 Purpose
Domain Treatment — named presence configuration stored in `Domain.frame_json.treatment`, applied in three tiers: full (Chronicle + Presents), accent-only (Nav + Dialog), none (Trail bar).

## 🧱 Key Files
- `resolveDomainTreatment.ts` — reads `frame_json.treatment` with theme-derived fallback
- `treatmentCss.ts` — `treatmentShellStyle` (full) and `treatmentAccentStyle` (accent-only)
- `ChronicleTreatmentShell.tsx` — full Treatment wrapper (Chronicle + Presents)
- `TreatmentAccentShell.tsx` — accent border/wash + color/font vars (Nav + Dialog)
- `resolveDomainTreatment.test.ts` / `treatmentCss.test.ts` — unit tests

## 🔄 Data & Behavior
- **Storage:** `Domain.frame_json.treatment` — `{ name, palette: { background, accent }, font: { family } }`
- **Full tier:** `ChronicleTreatmentShell` — background, accent border, body font, `--treatment-color`
- **Accent tier:** `TreatmentAccentShell` — accent border/wash, `--treatment-color`, `--treatment-font-family` for `.keeper-treatment-title` only
- **Read paths:**
  - Chronicle: `UniversalViewPanel` → `ChroniclePresenceView` → full shell
  - Presents: `PresentFrame` → full shell
  - Nav: `UniversalNavPanel` → accent shell (Realm Nav inherits)
  - Dialog: `UniversalConversation` → accent shell around `KeeperDialogFrame`
- **Write path:** Domain Configure → `splitDomainChroniclePatch` → `PATCH /api/domains/:slug/frame` → `reloadDomainFrame()`
- **Out of scope:** Trail bar stays Theme-only utility chrome

## ⚠️ Notes & ToDo
- [ ] Spatial, motion, and density fields (full Treatment spec)
- [ ] Rendr output target + Design Board Treatment authoring UI
- [x] Accent-only Nav + Dialog; full Presents wiring

## 📆 Update Log

### 2026-08-03 — Treatment scope expansion (three tiers)
- Added `TreatmentAccentShell` + `treatmentAccentStyle` for Nav and center Dialog
- `PresentFrame` wraps content in `ChronicleTreatmentShell` (full Treatment)
- Realm Nav no longer uses full shell — accent comes from `UniversalNavPanel`
- Domain Configure copy updated: Trail stays Theme; Nav/Dialog get accent; Chronicle/Presents get full look

### 2026-07-06 — Treatment save + render fixes
- `normalizeTreatmentHexColor` accepts hex with or without `#` (e.g. `121410` → `#121410`)
- Save path normalizes colors before writing `frame_json.treatment`
- `reloadDomainFrame` uses `forceRefresh: true` so Chronicle picks up saved Treatment immediately

### 2026-07-06 — Treatment v0 (Chronicle-only)
- Added `DomainFrameTreatment` type on `DomainFrameJson`
- Default treatment in `DEFAULT_DOMAIN_FRAME`
- Chronicle shell applies background, font, accent border, and `--treatment-color` vars
- Domain Config Chronicle fields: treatment name, background, accent, font
