# Board Engagement

## 📌 Purpose
Wires KeeperType engagement templates into the Universal Board (Nav + Chronicle) — the singular member UI.

## 🔄 Data & Behavior
`useBoardEngagement` loads templates by slug or accepts an activated template from `EntityEngagementBar`, submits via `/api/engagement/execute`, then calls `onSuccess` to bump nav lists or refresh Chronicle presence.

**Nav triggers, Chronicle renders:** Nav `+` calls `requestChronicleEngagement` on board context. `ChronicleEngagementSurface` → `ChronicleActPresence` (declared shell — same as Config/Manage), never generic `EngagementForm` chrome or inline Nav forms.

Journey and Path cover actions also call `requestChronicleEngagement` (same pipeline). Mobile `KeepScreen` uses `useBoardEngagement` + `ChronicleActPresence` for `moment.create`.

## 🧱 Key Files
- `useBoardEngagement.ts` — Intent state, template activation, execute + refresh callback
- `parseEngagementTemplateResponse.ts` — Normalizes execute + legacy templates API payloads for Chronicle Acts
- `ChronicleEngagementSurface.tsx` — Board wrapper → `ChronicleActPresence`
- `engagementResultUtils.ts` — Resolve created entity ids from execute responses
- `ChronicleActPresence.tsx` (in `presence/chronicleConfig/`) — Declared Act surface: `ChronicleConfigShell` + template fields
- `BoardEngagementForm.tsx` — Inline engagement form for presence focus (chronicle variant)
- `PresenceEngagementActions.tsx` — Chronicle action bar + inline form wrapper
- `JourneyChronicleEngagement.tsx` — Legacy EntityEngagementBar wiring (standalone frames)

## Manual verify (Domain Board `?board=domain`)
1. Seed templates if needed: `journey-path-moment-engagement-templates.seed.ts`
2. **Journey:** Nav Journeys `+` → Chronicle Act → submit → new journey appears in Nav and Chronicle focus
3. **Path:** Select a journey in Nav → Path `+` (or Journey cover “New Path”) → submit → path focus opens
4. **Moment:** With journey selected (and optional path in Chronicle) → Moment `+` or cover “New Moment” → submit → moment focus opens
5. **Mobile:** Keep tab loads `moment.create` template; submit opens new moment or World tab

## ⚠️ Notes & ToDo
- [ ] Toast notifications instead of silent console errors on submit failure
- [ ] Public Present engagement after member board pass is complete

## 📆 Update Log
- **2026-07-08** — Nav create Acts for `keeper.create`, `dialog.create`, `agent.create`; post-submit nav bump + selection; Lead agent assigns domain `primaryAgentId`.
- **2026-07-07** — `parseEngagementTemplateResponse` accepts both `{ success, data }` (execute router) and legacy flat templates-router payloads so Nav `+` opens Chronicle Acts reliably.
- **2026-06-19** — `useBoardEngagement` passes execute `data` to `onSuccess`; `ChronicleEngagementSurface` bumps draft nav + selects new draft on `draft.create`.
- **2026-06-19** — `ChronicleActPresence` uses declared `ChronicleConfigShell` (matches Agent Manage); removed bespoke Act header + `EngagementForm`.
- **2026-06-19** — Initial board-only engagement wiring for Universal Board singular UI.
