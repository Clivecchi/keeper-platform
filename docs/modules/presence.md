# presence

## 📌 Purpose
Schema-driven Chronicle rendering layer. Resolves and applies per-domain, per-object field schemas that control which fields render, how they're styled, and whether they're editable in Chronicle.

## 🧱 Key Files
- `KeeperPresenceDefaults.ts` — platform default schemas for all 8 object types (journey, moment, keeper, agent, draft, dialog, service, domain)
- `usePresenceSchema.ts` — React hook with 3-level resolution: object override → domain DB → platform default; module-level cache
- `KeeperPresence.tsx` — schema-driven Chronicle surface component; replaces hardcoded JourneyView/MomentView/etc.

## 🔄 Data & Behavior
Resolution order (highest precedence first):
1. `record.presenceSchema` (JSON field on the record itself)
2. `PresenceSchema` table row for `domainId + objectType` — fetched via `GET /api/domains/:domainId/presence-schema/:objectType`
3. `PRESENCE_SCHEMA_DEFAULTS[objectType]` from `KeeperPresenceDefaults.ts`

`KeeperPresence` renders fields filtered by `density` prop (default: `standard`). Editable fields debounce at 1000ms and PATCH to the correct object endpoint. The primary field always renders in the header; body fields follow below.

## ⚠️ Notes & ToDo
- [ ] Dialog is not yet a `TrailKind` in Chronicle — its KeeperPresence rendering awaits dialog trail support
- [ ] `PUT /api/domains/:domainId/presence-schema/:objectType` is the Design Board write path — Design Board integration pending
- [ ] `density` prop can be driven by a board-level setting in future

## 📆 Update Log
### 2026-05-10
- Created `KeeperPresenceDefaults.ts` with 8 object type schemas
- Created `usePresenceSchema.ts` with 3-level resolution and module-level cache
- Created `KeeperPresence.tsx` component replacing hardcoded Chronicle view renderers
- `PresenceSchema` Prisma model added; `presenceSchema Json?` field added to Journey, Moment, Keeper, kip_agents, kip_drafts, Dialog
- `GET` + `PUT /api/domains/:domainId/presence-schema/:objectType` routes added in `presence-schema-routes.ts`
- `UniversalViewPanel.tsx` wired to use `KeeperPresence` for journey, moment, keeper, draft, agent cases
