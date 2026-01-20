# V0 Shell

## 📌 Purpose
Centralize frame routing, theme application, and navigation helpers for domain board surfaces.

## 🧱 Key Files
- `V0Shell.tsx`
- `V0ShellContext.tsx`

## 🔄 Data & Behavior
The shell resolves the domain slug, applies the active theme/style, and routes frames by query param. It exposes navigation helpers so frames can build URLs and return to `/d/:slug/board` with theme preserved.

## ⚠️ Notes & ToDo
- [ ] Replace fallback domain data once domain home board wiring is live.

## 📆 Update Log
- 2026-01-19: Registered the Index frame in the v0 shell frame registry and frame key union.
- 2026-01-19: Added visible build stamp (commit + build time) for v0 shell frames.
- 2026-01-18: Added canonical v0 shell routing + navigation helpers.
