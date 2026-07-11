# Realm API

## 📌 Purpose
Person-scoped Realm endpoints — cross-domain feed powering arrival remarks and the visual User-Realm Graph.

## 🧱 Key Files
- `feed.ts` — `GET /api/realm/feed`, `PATCH /api/realm/anchor`

## 🔄 Data & Behavior
- Aggregates real data from `kip_drafts`, `kip_sessions`, `Moment` across user's accessible domains
- Returns graph-compatible `RealmFeedEvent[]`, bounded `remarks`, and `counts`
- Anchor agent name for remarks from `users.primaryDomainId` → `frame_json.kip.agent_id`

## ⚠️ Notes & ToDo
- [ ] Expand event types when graph formalizes
- [ ] Retention and edge-scope rules from design regroup

## 📆 Update Log
### 2026-07-10 — Realm experience completion
- Feed events carry `entityId` / `dialogId`; sessions attributed to dialog domain
- `PATCH /api/realm/anchor` persists `users.primaryDomainId`
- Invitation doors navigate to sessions, drafts, dialogs; Chronicle feed rows are clickable
- Mobile `/home` Dialog tab: remarks, invitations, realm feed chronicle

### 2026-07-09 — Realm feed v1
- Added `GET /api/realm/feed` with shared types in `@keeper/shared/realm/feed`
