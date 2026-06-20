# Board Engagement

## 📌 Purpose
Wires KeeperType engagement templates into the Universal Board (Nav + Chronicle) — the singular member UI.

## 🧱 Key Files
- `useBoardEngagement.ts` — Intent state, template activation, execute + refresh callback
- `BoardEngagementForm.tsx` — Inline engagement form for board panels
- `PresenceEngagementActions.tsx` — Chronicle action bar + inline form wrapper

## 🔄 Data & Behavior
`useBoardEngagement` loads templates by slug or accepts an activated template from `EntityEngagementBar`, submits via `/api/engagement/execute`, then calls `onSuccess` to bump nav lists or refresh Chronicle presence.

Used by `UniversalNavPanel` (journey.create) and `KeeperPresence` journey/moment focus (add moment, path, moment create, moment update).

## ⚠️ Notes & ToDo
- [ ] Toast notifications instead of silent console errors on submit failure
- [ ] Public Present engagement after member board pass is complete

## 📆 Update Log
- **2026-06-19** — Initial board-only engagement wiring for Universal Board singular UI.
