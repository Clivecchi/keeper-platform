# Admin Frame

## 📌 Purpose
Bridge the v0 shell admin frame to the authenticated domain admin surface.

## 🧱 Key Files
- `AdminFrame.tsx`

## 🔄 Data & Behavior
Uses a lightweight `DesignFrame` while redirecting to `/d/:slug/admin` for full domain administration.

## ⚠️ Notes & ToDo
- [ ] Confirm whether the v0 shell should embed domain admin directly in-frame.

## 📆 Update Log
- 2026-01-19: Added board context display for domain home board admin entrypoint.
- 2026-01-18: Added admin frame placeholder for v0 shell routing.
- 2026-01-25: Redirected admin frame to the domain admin route.
