# Realm Arrival Module

## 📌 Purpose
Person-scoped arrival at `/home` (your personal domain as Realm) — opening remarks, invitation doors, composer lead position, and Chronicle feed. **The Playbill** lives in the top bar, not Chronicle.

## 🧱 Key Files
- `RealmArrivalRemarks.tsx` — agent opening remarks with presence mark
- `RealmInvitationBar.tsx` — conditional invitation buttons (max four)
- `RealmPlaybillRail.tsx` — legacy rail (superseded by top-bar Playbill)
- `RealmFeedPanel.tsx` — Realm feed in Chronicle
- `RealmHomeChronicle.tsx` — Chronicle feed on realm idle
- `PresenceField.tsx` — named Treatment pattern for presence imagery
- `useRealmFeed.ts` — client feed loader
- `RealmArrivalSurface.tsx` — shared remarks + invitations (desktop + mobile)
- `realmInvitationActions.ts` — invitation + feed click handlers
- `persistRealmAnchor.ts` — client anchor persistence

## 🔄 Data & Behavior
- Anchor domain from `users.primaryDomainId` → `frame_json.kip.agent_id` → lead agent voice
- `GET /api/realm/feed` returns graph-compatible events + bounded `remarks` + `counts`
- Home shell (`shellMode === "home"`) + `REALM_BOARD_DEF` renders Universal shape with realm-specific Dialog/Chronicle content
- Scene-change travel via `../sceneChange/SceneChangeProvider` + `SceneChangeCurtain`

## ⚠️ Notes & ToDo
- [ ] Invitation button rules — finalize set with regroup session
- [ ] Feed event types — expand when User-Realm Graph formalizes

## 📆 Update Log
### 2026-07-10 — Realm experience completion
- Invitation doors open sessions, drafts, dialogs; Chronicle feed navigates in-realm or travels cross-domain
- Anchor persistence via `PATCH /api/realm/anchor`; domain switcher uses scene-change curtain
- Mobile Dialog tab mirrors desktop arrival (remarks, doors, realm feed chronicle)
- Presence Field in opening remarks

### 2026-07-10 — Playbill moves to top bar
- Chronicle shows Realm feed only; Playbill header card + travel list in `KeeperTopBar` / `PlaybillHeaderCard`
- User name/avatar returns to realm from domain boards; avatar shows `user.avatar_url` when set

### 2026-07-09 — Realm Arrival build (Phases 2–5)
- Wired `primaryDomainId` anchor; added realm feed API and arrival UI on `/home`
- Playbill vocabulary: uncast domains show "Agent" not "Casting"
- Added Presence Field pattern, splash curtain scene-change, Playbill rail in Chronicle
