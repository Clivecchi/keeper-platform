# Board Engagement

## 📌 Purpose
Wires KeeperType engagement templates into the Universal Board (Nav + Chronicle) — the singular member UI.

## 🔄 Data & Behavior
`useBoardEngagement` loads templates by slug or accepts an activated template from `EntityEngagementBar`, submits via `/api/engagement/execute`, then calls `onSuccess` to bump nav lists or refresh Chronicle presence.

**Nav triggers, Chronicle renders:** Nav `+` calls `requestChronicleEngagement` on board context. `ChronicleEngagementSurface` in `UniversalViewPanel` hosts the Act form — never inline in Nav.

Used by `KeeperPresence` journey/moment focus (add moment, path, moment create, moment update) for inline Chronicle forms with `variant="chronicle"`.

## 🧱 Key Files
- `useBoardEngagement.ts` — Intent state, template activation, execute + refresh callback
- `ChronicleEngagementSurface.tsx` — Full Chronicle Act surface (header + themed form)
- `BoardEngagementForm.tsx` — Inline engagement form for presence focus (chronicle variant)
- `PresenceEngagementActions.tsx` — Chronicle action bar + inline form wrapper

## ⚠️ Notes & ToDo
- [ ] Toast notifications instead of silent console errors on submit failure
- [ ] Public Present engagement after member board pass is complete

## 📆 Update Log
- **2026-06-19** — Nav `+` triggers `requestChronicleEngagement`; forms render in Chronicle via `ChronicleEngagementSurface`, not inline in Nav.
- **2026-06-19** — Initial board-only engagement wiring for Universal Board singular UI.
