# V0 Surface

## 📌 Purpose
V0 is Keeper’s Design Build Language: a shared grammar for frames, navigation, and theming that anchors domain board experiences in a single shell.

## 🧱 Key Files
- `pages/V0Page.tsx` – Switches between cover frame (default) and moment diary via `frame` query param.
- `components/cover-frame.tsx` – Album/storybook-inspired cover surface with setlist-style routes.
- `components/moment-frame.tsx` – Moment diary preview frame with close affordance back to cover.

## 🔄 Data & Behavior
- The v0 shell owns routing, theme application, and navigation helpers for `/d/:slug/board`.
- Frames render through `DesignFrame` and resolve navigation through the shell.
- `/v0` remains a lightweight playground for cover/moment previews when no domain slug is present.

## ⚠️ Notes & ToDo
- [ ] Wire real record/route data when backend is available.
- [ ] Add visual regression snapshot for cover typography and setlist.
- [ ] Align moment textarea texture with cover palette once shared tokens exist.

## 📆 Update Log
- 2026-01-18: Defined v0 as the Design Build Language and anchored domain board routing in the v0 shell.
- 2026-01-01: Reintroduced V0 cover/moment surface and documented scope.

