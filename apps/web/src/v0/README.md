# V0 Surface

## 📌 Purpose
Lightweight V0 surface for the cover frame and moment diary preview; used as a design playground without backend wiring.

## 🧱 Key Files
- `pages/V0Page.tsx` – Switches between cover frame (default) and moment diary via `frame` query param.
- `components/cover-frame.tsx` – Album/storybook-inspired cover surface with setlist-style routes.
- `components/moment-frame.tsx` – Moment diary preview frame with close affordance back to cover.

## 🔄 Data & Behavior
- Cover frame is mock-only, rendering imprint/title/liner notes plus a setlist of routes; mobile-first with a two-column desktop spread.
- Moment frame is a local textarea surface with existing close loop to `?frame=cover`; no persistence or API calls.
- No backend dependencies; routes remain `/v0` (cover) and `/v0?frame=moment`.

## ⚠️ Notes & ToDo
- [ ] Wire real record/route data when backend is available.
- [ ] Add visual regression snapshot for cover typography and setlist.
- [ ] Align moment textarea texture with cover palette once shared tokens exist.

## 📆 Update Log
- 2026-01-01: Reintroduced V0 cover/moment surface and documented scope.

