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
- `KeeperPresence.tsx` — schema-driven Chronicle surface; journey focus layout, breadcrumb, related sections, relative timestamps; agent explicit Save + structured prompts
- `AgentPromptsSection.tsx` — point-based lens/composed prompt editor (agents)
- `promptPoints.ts` — parse/serialize prompt strings ↔ editable points
- `presenceEnrichment.ts` — fetches records and resolves journey context, paths, sessions per object type
- `ChroniclePresenceView.tsx` — thin Chronicle wrapper (`layout="focus"`, density `standard`)
- `chronicleConfig/` — universal Config Mode save infrastructure (`useChronicleConfig`, save bar, config shell)
- `cover/DomainFocusPresence.tsx` — Domain Cover + Config orchestration
- `cover/schemas/domainCoverSchema.ts` — Domain cover slot fill

## 🔄 Data & Behavior
Resolution order (highest precedence first):
1. `record.presenceSchema` (JSON field on the record itself)
2. `PresenceSchema` table row for `domainId + objectType` — fetched via `GET /api/domains/:domainId/presence-schema/:objectType`
3. `PRESENCE_SCHEMA_DEFAULTS[objectType]` from `KeeperPresenceDefaults.ts`

`KeeperPresence` renders fields filtered by `layout` and `density`. The `layout` prop drives real behavior:
- **focus** — story mode (default Chronicle). Journey uses dedicated header, paths with prelude, tappable moments, Set as Active.
- **config** — shaping mode with elevated surface tint, comfortable field density, and a "Configuring" whisper.

Editable fields debounce at 1000ms and PATCH to the correct object endpoint for journey, moment, keeper, draft, and dialog. **Agent and domain** use explicit **Save** via `useChronicleConfig` (no autosave).

Enrichment (Domain Board instincts):
- **Moment** — journey → path breadcrumb in header; narrative + relative timestamp in body
- **Journey** — paths (prelude + moment count) then moments (narrative preview, relative kept dates); structured header meta for focus layout
- **Keeper** — recent sessions (journeys) as tappable related threads
- **Agent** — recent sessions list; tools formatted; Lead agents (Kip) fetch composed prompt + active lens prompt via API; tagline from `config.tagline`
- **Dialog** — scope context + session count via kip/dialogs API
- **Draft** — summary preview via kip/drafts API

- **Domain** — moving/present journeys + recent kept moments (domain idle)
- **Frame** — domain board-data fetch, props via unified catalog + PUT persistence, live preview, quiet JSON (`layout="config"`)
- **BoardDef** — human-readable nav/conversation/chronicle structure; full spec JSON quiet (`layout="config"`)

Props: one catalog (`propsCatalog.ts`), one persistence path (`frameProps.ts` → `PUT /api/domains/:domainId/board-data`), `normalizeProps()` at every boundary. Legacy Studio sidebar and `DesignBoardFrameDetail` Props tab are orphaned — not deleted.

Chronicle routes exclusively through `ChroniclePresenceView` → `KeeperPresence`. No board-specific panel renderers.

Presents (Theatre.js): when `layout="focus"`, KeeperPresence plays a Present sequence via `PresentMotionProvider`. `present` defaults from object type (`domain→cover`, `journey→journey`, `moment→moment`, else `slide`). See `../presents/README.md`.

## ⚠️ Notes & ToDo
- [ ] Prop edit/reorder/delete in FrameConfigPresence (PropManager-grade CRUD)
- [ ] `density` prop can be driven by Treatment JSON at board level
- [ ] `PUT /api/domains/:domainId/presence-schema/:objectType` Design Board write path integration pending

## 📆 Update Log

### 2026-05-29 — Step 2: Universal Chronicle CRUD
- Added `chronicleConfig/` — `useChronicleConfig`, `ChronicleSaveBar`, `ChronicleConfigShell`, `handleChronicleSave`
- Agent Board refactored to use shared hook (same PATCH path, same Save bar behavior)
- Domain Board: `DomainFocusPresence` + `DomainConfigPresence` + `domainCoverSchema` (Cover/Config modes)
- IDE Board: build context fields on domain Chronicle (`settings.ideBuildContext` via domain PATCH)
- Design Board: domain idle uses same domain Chronicle config path; BoardDef remains read-only
- `ChroniclePresenceView` + `UniversalViewPanel` pass `boardId` for board-specific config fields
