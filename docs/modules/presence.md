# presence

## 📌 Purpose
Schema-driven Chronicle rendering layer. Resolves and applies per-domain, per-object field schemas that control which fields render, how they're styled, and whether they're editable in Chronicle. Gate 3 standard: one `KeeperPresence` component renders every record type with equivalent depth.

## 🧱 Key Files
- `types.ts` — `PresenceLayout` (`focus` | `config`)
- `propsCatalog.ts` — unified Props Library catalog (single source of truth)
- `frameProps.ts` — normalize, fetch, persist frame props via domain board-data API
- `FrameConfigPresence.tsx` — config layout for frame objects (preview, props, quiet JSON)
- `BoardDefConfigPresence.tsx` — config layout for board definitions (human-readable structure)
- `KeeperPresenceDefaults.ts` — platform default schemas (journey, moment, keeper, agent, draft, dialog, service, domain, frame, boardDef)
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

- **Domain** — moving/present journeys + recent kept moments (domain idle)
- **Frame** — domain board-data fetch, props via unified catalog + PUT persistence, live preview, quiet JSON (`layout="config"`)
- **BoardDef** — human-readable nav/conversation/chronicle structure; full spec JSON quiet (`layout="config"`)

Props: one catalog (`propsCatalog.ts`), one persistence path (`frameProps.ts` → `PUT /api/domains/:domainId/board-data`), `normalizeProps()` at every boundary. Legacy Studio sidebar and `DesignBoardFrameDetail` Props tab are orphaned — not deleted.

Chronicle routes exclusively through `ChroniclePresenceView` → `KeeperPresence`. No board-specific panel renderers.

## ⚠️ Notes & ToDo
- [ ] Prop edit/reorder/delete in FrameConfigPresence (PropManager-grade CRUD)
- [ ] `density` prop can be driven by Treatment JSON at board level
- [ ] `PUT /api/domains/:domainId/presence-schema/:objectType` Design Board write path integration pending

## 📆 Update Log

### 2026-05-24 — Step 2: Frame and BoardDef as first-class presence types
- Added `propsCatalog.ts`, `frameProps.ts`, `FrameConfigPresence`, `BoardDefConfigPresence`
- Frame config: preview, unified props catalog, domain board-data persistence, quiet JSON
- BoardDef config: human-readable structure (nav, conversation, chronicle subjects), quiet JSON
- `DesignBoardFrameDetail` superseded — not mounted; retained in codebase

### 2026-05-24 — Universal Chronicle path (Steps 1 + 4)
- Added `frame`, `boardDef` schemas; domain/service/frame/boardDef enrichment in `presenceEnrichment.ts`
- Chronicle collapsed to single KeeperPresence path; per-board viewState gates removed
- `domainDisplayName` prop for domain idle; `PresenceEnrichmentContext` for frame board context

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
