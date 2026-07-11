# Realm Arrival Module

## 📌 Purpose
Person-scoped arrival at `/home` (your personal domain as Realm) — opening remarks as Dialog Response, invitation doors inside the agent bubble, composer lead position, and Playbill rail in Chronicle.

## 🧱 Key Files
- `realmArrivalMessage.ts` — builds welcome-back Dialog Response with invitation metadata
- `RealmInvitationButtons.tsx` — invitation doors inside agent message body
- `realmInvitations.ts` — shared invitation candidate logic (max four)
- `RealmPlaybillRail.tsx` — Chronicle Playbill travel rail (full-width cards)
- `RealmFeedPanel.tsx` — Realm feed in Chronicle (via invitation)
- `RealmHomeChronicle.tsx` — Chronicle: Playbill rail + optional feed
- `PresenceField.tsx` — named Treatment pattern for presence imagery
- `useRealmFeed.ts` — client feed loader
- `realmInvitationActions.ts` — invitation + feed click handlers
- `persistRealmAnchor.ts` — client anchor persistence
- `../components/LocationStrip.tsx` — read-only top-bar location (domain presents agent)

## 🔄 Data & Behavior
- Anchor domain from `users.primaryDomainId` → `frame_json.kip.agent_id` → lead agent voice
- Opening remarks render as the agent's first Dialog message; invitations live inside the bubble
- Playbill rail in Chronicle lists travel targets only — anchor realm domain excluded
- Top bar on `/home` shows read-only `LocationStrip`; no Playbill popover
- Realm home uses solid `theme-surface-page` background (no full-bleed cover wallpaper)

## ⚠️ Notes & ToDo
- [ ] Remarks content polish (story vs stats) — Section 3 of design capture
- [ ] Feed event types — expand when User-Realm Graph formalizes

## 📆 Update Log
### 2026-07-10 — Arrival presentation corrections
- Remarks moved into Dialog Response; `RealmInvitationButtons` inside agent bubble
- Playbill restored to Chronicle rail; top bar uses read-only `LocationStrip`
- Anchor domain removed from Playbill travel list; realm home suppresses cover wallpaper
- `filterPlaybillTravelDomains` in `domainSwitcherData.ts`

### 2026-07-10 — Realm experience completion
- Invitation doors open sessions, drafts, dialogs; Chronicle feed navigates in-realm or travels cross-domain
- Anchor persistence via `PATCH /api/realm/anchor`; domain switcher uses scene-change curtain
- Mobile Dialog tab mirrors desktop arrival (remarks in dialog, playbill in chronicle)

### 2026-07-09 — Realm Arrival build (Phases 2–5)
- Wired `primaryDomainId` anchor; added realm feed API and arrival UI on `/home`
- Playbill vocabulary: uncast domains show "Agent" not "Casting"
- Added Presence Field pattern, splash curtain scene-change
