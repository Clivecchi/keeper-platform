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
- 2026-01-19: Added top gear navigation to domain home board admin.
- 2026-01-19: Added persistent bottom margin support to the shared frame layout.
- 2026-01-25: Made the v0 header stack sticky with safe-area padding and media-style styling.
