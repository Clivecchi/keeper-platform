# presence

## 📌 Purpose
Schema-driven Chronicle rendering layer. Resolves and applies per-domain, per-object field schemas that control which fields render, how they're styled, and whether they're editable in Chronicle. Gate 3 standard: one `KeeperPresence` component renders every record type with equivalent depth.

## 🧱 Key Files
- `types.ts` — `PresenceLayout` (`focus` | `config`)
- `KeeperPresenceDefaults.ts` — platform default schemas for all 8 object types (journey, moment, keeper, agent, draft, dialog, service, domain)
- `usePresenceSchema.ts` — React hook with 3-level resolution: object override → domain DB → platform default; module-level cache
- `KeeperPresence.tsx` — schema-driven Chronicle surface; journey focus layout, breadcrumb, related sections, relative timestamps
- `presenceEnrichment.ts` — fetches records and resolves journey context, paths, sessions per object type
- `ChroniclePresenceView.tsx` — thin Chronicle wrapper (`layout="focus"`, density `standard`)

## 🔄 Data & Behavior
Resolution order (highest precedence first):
1. `record.presenceSchema` (JSON field on the record itself)
2. `PresenceSchema` table row for `domainId + objectType` — fetched via `GET /api/domains/:domainId/presence-schema/:objectType`
3. `PRESENCE_SCHEMA_DEFAULTS[objectType]` from `KeeperPresenceDefaults.ts`

`KeeperPresence` renders fields filtered by `layout` and `density`. The `layout` prop drives real behavior:
- **focus** — story mode (default Chronicle). Journey uses dedicated header, paths with prelude, tappable moments, Set as Active.
- **config** — shaping mode with elevated surface tint, comfortable field density, and a "Configuring" whisper.

Editable fields debounce at 1000ms and PATCH to the correct object endpoint.

Enrichment (Domain Board instincts):
- **Moment** — journey → path breadcrumb in header; narrative + relative timestamp in body
- **Journey** — paths (prelude + moment count) then moments (narrative preview, relative kept dates); structured header meta for focus layout
- **Keeper** — recent sessions (journeys) as tappable related threads
- **Agent** — recent sessions list; tools formatted
- **Dialog** — scope context + session count via kip/dialogs API
- **Draft** — summary preview via kip/drafts API

Chronicle views in `UniversalViewPanel` call `ChroniclePresenceView` — they do not assemble their own field lists.

## ⚠️ Notes & ToDo
- [ ] `density` prop can be driven by Treatment JSON at board level
- [ ] `PUT /api/domains/:domainId/presence-schema/:objectType` Design Board write path integration pending
- [ ] Service type uses `ServicesFrame` in Chronicle — not yet on KeeperPresence

## 📆 Update Log
### 2026-05-24 — KeeperPresence Phase 1: Journey focus parity in Chronicle
- Replaced dead `context` prop with `layout: PresenceLayout` (`focus` | `config`) on `KeeperPresence`
- Added `types.ts` exporting `PresenceLayout`
- Journey focus layout: title + inline forward narrative, meta row (keeper, created, moment count), paths with prelude, tappable moments, Set as Active via `UniversalBoardContext`
- Config layout: surface tint, comfortable density, "Configuring" whisper
- Enrichment: path prelude, relative kept dates, paths-before-moments section order, structured journey meta

### 2026-05-23 — Gate 3: Chronicle renders every record with equivalent depth
- Updated schemas aligned with Domain Board Chronicle field hierarchy (moment journeyName at standard, dialog sessionCount at standard)
- Added `presenceEnrichment.ts` — record fetch, journey/path breadcrumb, related sections
- Enhanced `KeeperPresence.tsx` — breadcrumb bar, PresenceThread related sections, relative quiet timestamps, fixed draft/dialog endpoints
- Added `ChroniclePresenceView.tsx` — thin Chronicle wrapper used by all record types in PanelBody
- Removed bespoke JourneyView/MomentView/KeeperView/DraftView/AgentView/DialogIdleView from UniversalViewPanel

### 2026-05-10
- Created `KeeperPresenceDefaults.ts` with 8 object type schemas
- Created `usePresenceSchema.ts` with 3-level resolution and module-level cache
- Created `KeeperPresence.tsx` component replacing hardcoded Chronicle view renderers
- `PresenceSchema` Prisma model added; `presenceSchema Json?` field added to Journey, Moment, Keeper, kip_agents, kip_drafts, Dialog
- `GET` + `PUT /api/domains/:domainId/presence-schema/:objectType` routes added in `presence-schema-routes.ts`
