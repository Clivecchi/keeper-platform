# Board Engagement

## 📌 Purpose
Wires KeeperType engagement templates into the Universal Board (Nav + Chronicle) — the singular member UI.

## 🔄 Data & Behavior
`useBoardEngagement` loads templates by slug or accepts an activated template from `EntityEngagementBar`, submits via `/api/engagement/execute`, then calls `onSuccess` to bump nav lists or refresh Chronicle presence.

**Nav triggers, Chronicle renders:** Nav `+` calls `requestChronicleEngagement` on board context. `ChronicleEngagementSurface` → `ChronicleActPresence` (declared shell — same as Config/Manage), never generic `EngagementForm` chrome or inline Nav forms.

Used by `KeeperPresence` moment focus (`PresenceEngagementActions`). Journey focus uses cover actions in `JourneyFocusPresence` → Act mode (`ChronicleActPresence`).

## 🧱 Key Files
- `useBoardEngagement.ts` — Intent state, template activation, execute + refresh callback
- `ChronicleEngagementSurface.tsx` — Board wrapper → `ChronicleActPresence`
- `ChronicleActPresence.tsx` (in `presence/chronicleConfig/`) — Declared Act surface: `ChronicleConfigShell` + template fields
- `BoardEngagementForm.tsx` — Inline engagement form for presence focus (chronicle variant)
- `PresenceEngagementActions.tsx` — Chronicle action bar + inline form wrapper

## ⚠️ Notes & ToDo
- [ ] Toast notifications instead of silent console errors on submit failure
- [ ] Public Present engagement after member board pass is complete

## 📆 Update Log
- **2026-06-19** — `useBoardEngagement` passes execute `data` to `onSuccess`; `ChronicleEngagementSurface` bumps draft nav + selects new draft on `draft.create`.
- **2026-06-19** — `ChronicleActPresence` uses declared `ChronicleConfigShell` (matches Agent Manage); removed bespoke Act header + `EngagementForm`.
- **2026-06-19** — Initial board-only engagement wiring for Universal Board singular UI.
