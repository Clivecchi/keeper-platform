# V0 Frames

## 📌 Purpose
Defines shared frame scaffolding and base layout behavior for v0 domain surfaces.

## 🧱 Key Files
- `DesignFrame.tsx` – Shared frame chrome, header layout, and padding contract.
- `ThemeSwitcher.tsx` – Theme selector surfaced in frame headers.

## 🔄 Data & Behavior
Frames rely on `DesignFrame` to apply theme styles, enforce layout padding, and host persistent UI elements like the margin zone.

## ⚠️ Notes & ToDo
- [ ] Confirm margin height across mobile breakpoints.

## 📆 Update Log
- 2026-02-01: Added header footer and frame padding overrides.
- 2026-02-01: Added header background override for sticky frames.
- 2026-02-01: Added header options for sticky offset and hiding admin gear.
- 2026-01-31: Added the Present frame surface to the v0 frames set.
- 2026-01-19: Added top gear navigation to domain home board admin.
- 2026-01-19: Added persistent bottom margin support to the shared frame layout.
- 2026-01-25: Made the v0 header stack sticky with safe-area padding and media-style styling.
- 2026-01-25: Added the Commons frame as the default authenticated board surface.
