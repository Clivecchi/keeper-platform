# Realm Arrival Module

## 📌 Purpose
Person-scoped arrival at `/home` — opening remarks, invitation doors, composer lead position, and Chronicle Playbill rail. Powers the visual User-Realm Graph via graph-compatible feed events.

## 🧱 Key Files
- `RealmArrivalRemarks.tsx` — agent opening remarks with presence mark
- `RealmInvitationBar.tsx` — conditional invitation buttons (max four)
- `RealmPlaybillRail.tsx` — Chronicle Playbill rail on Home idle
- `RealmFeedPanel.tsx` — full Realm feed view
- `RealmHomeChronicle.tsx` — Chronicle switcher (playbill vs feed)
- `PresenceField.tsx` — named Treatment pattern for presence imagery
- `useRealmFeed.ts` — client feed loader
- `RealmArrivalContext.tsx` — chronicle view state for invitation wiring

## 🔄 Data & Behavior
- Anchor domain from `users.primaryDomainId` → `frame_json.kip.agent_id` → lead agent voice
- `GET /api/realm/feed` returns graph-compatible events + bounded `remarks` + `counts`
- Home shell (`shellMode === "home"`) + `REALM_BOARD_DEF` renders Universal shape with realm-specific Dialog/Chronicle content
- Scene-change travel via `../sceneChange/SceneChangeProvider` + `SceneChangeCurtain`

## ⚠️ Notes & ToDo
- [ ] Invitation button rules — finalize set with regroup session
- [ ] Mobile arrival layout — align `RealmScreen` with desktop hierarchy
- [ ] Feed event types — expand when User-Realm Graph formalizes

## 📆 Update Log
### 2026-07-09 — Realm Arrival build (Phases 2–5)
- Wired `primaryDomainId` anchor; added realm feed API and arrival UI on `/home`
- Playbill vocabulary: uncast domains show "Agent" not "Casting"
- Added Presence Field pattern, splash curtain scene-change, Playbill rail in Chronicle
