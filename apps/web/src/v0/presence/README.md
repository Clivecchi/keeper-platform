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
- `ChroniclePresenceView.tsx` — thin Chronicle wrapper; `soleMemory` only special case; `service` and `key` flow through `KeeperPresence`
- `integrationChronicle/` — Hero, Status Strip, Primary Feed, Actions; unconnected Connect via Nango
- `chronicleConfig/` — universal Config Mode save infrastructure (`useChronicleConfig`, save bar, config shell)
- `cover/DomainFocusPresence.tsx` — Domain Cover + Config orchestration
- `cover/IntegrationFocusPresence.tsx` — Integration Cover + Config orchestration
- `cover/schemas/integrationCoverSchema.ts` — Integration cover slot fill

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

### 2026-06-19 — Draft Phase 1b (PointRow + Discuss)
- `DraftPointRow.tsx` — shared point row with Accept, Discuss, `data-gloss-anchor`
- `DraftPointsSection.tsx` — delegates to `DraftPointRow`

### 2026-06-14 — Library EntityKind presence (Pass 1)
- `LibraryItemFocusPresence` — Cover ↔ Config orchestration; feed via `GET /api/library-items/:id`
- `LibraryItemConfigPresence` — editable metadata + assignment selects; `onSaved` → `bumpLibraryNav`
- `declarationChronicle.tsx`: `variant="library"` with `definition` + `agent_perspective` blocks
- `libraryItemCoverSchema.ts` + `libraryNavUtils.ts`: shared `libraryItemChronicleTitle()` for Cover and Nav
- `KeeperPresence`: `library` focus branch + `skipPresenceSchemaFetch`
- `presenceEnrichment.ts`: `fetchPresenceRecord` case for `library`
- `chroniclePatch.ts`: `library` → `PATCH /api/library-items/:id`

### 2026-06-13 — Phase 6 cleanup
- Removed `FeedComponent` from `serviceConfig.tsx`; legacy cover feed UI deleted; feed hooks credential-only on cover
- READMEs updated for unified Cover (declaration blocks) + Config (metadata PATCH) pattern

### 2026-06-13 — Cover body unification (Phase 4)
- `IntegrationFocusPresence`: removed `FeedComponent` fork; always `DeclarationChronicleBlocks` with client-side declaration defaults
- `KeyFocusPresence`: always renders key declaration blocks (no empty-body when DB blocks missing)

### 2026-06-13 — Integration/Key Chronicle config save (Phase 3)
- `chroniclePatch.ts`: `service`/`integration` → `PATCH /api/integrations/:entityId`; `key` → `PATCH /api/keys/:entityId`
- `IntegrationConfigPresence` / `KeyConfigPresence`: `useChronicleConfig` with real `isDirty`; Save bar for metadata (`display_label`, `description`, `connect_copy` / key fields)
- Credential actions (verify, rotate, revoke) remain inline block operations, not routed through `handleChronicleSave`
- Browser verified: display_label save on Anthropic integration and key via IDE board Manage → Config

### 2026-06-13 — Orphan cleanup + Key declaration blocks
- Deleted unused `AgentIdentityCard.tsx`, `integrationChronicle/IntegrationChronicle.tsx`, `integrationChronicle/blocks/BlockPrimitivesPreview.tsx` (no imports)
- `declarationChronicle.tsx`: `DeclarationChronicleBlocks` supports `variant="key"` with `connection_status`, `key_health`, `linked_agents` from Key feed
- `KeyFocusPresence` wired to declaration blocks (same pattern as `IntegrationFocusPresence`)

### 2026-06-12 — Delete retired Key/Integration presence wrappers
- Removed dead code: `KeyPresence.tsx`, `integrationChronicle/KeyChronicle.tsx`, `integrationChronicle/index.tsx`, `IntegrationPresence.tsx`
- Render path unchanged: `ChroniclePresenceView` → `KeeperPresence` → `KeyFocusPresence` / `IntegrationFocusPresence`

### 2026-06-10 — Key/Integration manage mode CRUD after verify
- `KeyHealthBlock`: `allowValidRotate` enables Update key in config/manage surfaces when status is valid; ENV keys show Railway guidance
- `KeyConfigPresence`: uses `saveCredential`, revoke action, reload after save/verify; back to cover refreshes feed
- `keyCoverSchema`: Add Key / Manage cover actions; integration cover adds Manage for AI models
- Integration cover `key_health` block read-only when valid — full CRUD in Manage/config mode

### 2026-06-10 — Integration Cover Pattern Correction
- Removed `ChroniclePresenceView` early exit for `service`; integrations route through `KeeperPresence` → `IntegrationFocusPresence`
- Added `onKeySelect` to `KeeperPresence` props; forwarded `boardId` to integration focus
- Retired `IntegrationPresence` wrapper files (marked, not deleted)

### 2026-06-10 — Key Pattern Correction
- Removed `ChroniclePresenceView` early exit for `key`; keys now route through `KeeperPresence` → `KeyFocusPresence`
- Added `fetchPresenceRecord` case for `key` (`GET /api/keys/:id`)
- Retired `KeyPresence.tsx` and `KeyChronicle.tsx` (marked, not deleted)

### 2026-06-02 — Integration Connect errors visible in Chronicle
- **apiFetch.ts**: Fixed error re-throw so `POST /api/integrations/session` JSON (`message`, `hint`) reaches UI.
- **integrationChronicle/shared.tsx**: `formatIntegrationConnectError`, alert panel below Connect button on unconnected state.

### 2026-05-31 — Focus Color System + Integration Chronicle surfaces
- Focus colors: `--treatment-color` alpha variants in `styleRegistry.ts`; composer glow, nav selection, Chronicle inner glow in `index.css`
- `integrationChronicle/` — Railway, Vercel, GitHub slot schemas (Hero, Status Strip, Feed, Actions); unconnected Connect via Nango
- Fixed `AgentPromptsSection` import to `./ComposedPromptPreview.tsx` (Windows case-collision with `composedPromptPreview.ts`)

### 2026-05-29 — Step 2: Universal Chronicle CRUD
- Added `chronicleConfig/` — `useChronicleConfig`, `ChronicleSaveBar`, `ChronicleConfigShell`, `handleChronicleSave`
- Agent Board refactored to use shared hook (same PATCH path, same Save bar behavior)
- Domain Board: `DomainFocusPresence` + `DomainConfigPresence` + `domainCoverSchema` (Cover/Config modes)
- IDE Board: build context fields on domain Chronicle (`settings.ideBuildContext` via domain PATCH)
- Design Board: domain idle uses same domain Chronicle config path; BoardDef remains read-only
- `ChroniclePresenceView` + `UniversalViewPanel` pass `boardId` for board-specific config fields

### 2026-05-28 — Step 1: Agent Cover Card (universal cover pattern)
- Added `cover/` — Layer 1 `EntityCoverPresence` (five fixed slots) + Layer 2 `agentCoverSchema`
- Agent Chronicle: Cover Mode (cinematic) + Config Mode (Configure tap / back arrow); Framer Motion with Theatre handoff names
- `AgentFocusPresence` replaces inline `AgentIdentityCard` for `objectType="agent"` + `layout="focus"`
- Config save reuses existing explicit agent PATCH — no new save path

### 2026-05-27 — Agent Save button + structured Prompts surface
- Replaced agent debounced autosave with explicit **Save** control above tagline; dirty-state hint (`Unsaved changes` / `All changes saved`)
- Added `AgentPromptsSection` — lens prompt as editable numbered points; composed prompt read-only for Lead agents
- Added `promptPoints.ts` for prompt string ↔ point list conversion (storage remains plain text)

### 2026-05-27 — Agent Chronicle CRUD Steps 1–5
- Added `body` FieldRole; extended agent schema (removed `context_scope`); config field enrichment
- PATCH `/api/agents/:id` accepts personality, avatar, theme_color, model_provider, memory_enabled, visibility, model_settings, lensSystemPrompt (all agents)
- Unified debounced autosave through single agent PATCH; save indicator; advanced temperature/max_tokens section
- Lens prompt enrichment + editing enabled for all agents; composed prompt remains Lead-only

### 2026-05-27 — Agent Chronicle CRUD: body role + extended agent schema (Step 1)
- Added `body` to `FieldRole` for multiline prompt surfaces (`lensSystemPrompt`, `composedSystemPrompt`)
- Extended agent presence schema: personality, avatar, theme_color, model_provider, memory_enabled, visibility, capability tags; removed `context_scope`
- `hiddenByDefault` on `model_settings` (advanced section — Step 4)
- `KeeperPresence` renders body fields, agent quiet/ambient editable controls, and shows empty editable agent fields
- `enrichAgent()` lifts personality, avatar, theme_color from config; normalizes memory_enabled for toggles

### 2026-05-26 — Lens prompt: editable textarea + lens PATCH route
- `lensSystemPrompt` saves via `PATCH /api/kip/lenses/:lensId` (`systemPrompt`), not agent PATCH
- Labeled secondary fields; composed prompt re-fetched after agent lens save (`handlePresenceRefresh`)
- Inline 10-character validation on lens PATCH rejection

### 2026-05-25 — Agent Board Phase 3 preflight: lens save validation inline error
- Debounced PATCH failures for `lensSystemPrompt` show inline message beneath the field (10-character minimum); errors clear on successful save or re-edit

### 2026-05-25 — Agent Board Phase 1–2: composed prompt + teach fields
- **Phase 1 (read):** Lead agents show read-only `composedSystemPrompt` from `GET /api/agents/:id/composed-prompt`; multiline `<pre>` for long prompts
- **Phase 2 (write):** Editable `tagline` (`config.tagline`), `lensSystemPrompt` (active domain lens via PATCH + `domainId`); `context_scope` relabeled from misleading "System Prompt" to **Context scope**
- `enrichAgent()` resolves lens via mode-config + lenses API; non-Lead agents hide lens/composed fields
- Agent Chronicle saves pass `domainId`; successful PATCH triggers presence refresh so composed prompt updates after edits

### 2026-05-25 — Presents: Theatre.js listener on KeeperPresence
- Added `present` and `context` props; motion via `PresentMotionProvider` when `layout="focus"`
- Journey focus + generic presence apply opacity/offset from Theatre values (not present-name branching)
- ChroniclePresenceView forwards `present` / `context`

### 2026-05-24 — Readability pass (storyboard contrast)
- KeeperPresence, FrameConfigPresence, BoardDefConfigPresence: +2px type scale, stronger section labels
- Story cards and thread buttons: clearer borders and elevated surfaces
- Reduced double-faded tertiary ink — labels use token secondary/tertiary directly

### 2026-05-24 — Step 2: Frame and BoardDef as first-class presence types
- Added `propsCatalog.ts`, `frameProps.ts`, `FrameConfigPresence`, `BoardDefConfigPresence`
- Frame config: preview, unified props catalog, domain board-data persistence, quiet JSON
- BoardDef config: human-readable structure (nav, conversation, chronicle subjects), quiet JSON
- `DesignBoardFrameDetail` superseded — not mounted; retained in codebase

### 2026-05-30 — Integration presence (Step 3A)
- `IntegrationPresence.tsx` — Connect / Disconnect / Reconnect via `POST /api/integrations/session` and Nango Connect UI
- `ChroniclePresenceView` branches `objectType === "service"` to integration surface
- `presenceEnrichment.enrichService` reads live status from `GET /api/integrations`

### 2026-05-24 — Universal Chronicle path (Steps 1 + 4)
- Replaced dead `context` prop with `layout: PresenceLayout` (`focus` | `config`) on `KeeperPresence`
- Added `types.ts` exporting `PresenceLayout`
- Journey focus layout: title + inline forward narrative, meta row (keeper, created, moment count), paths with prelude, tappable moments, Set as Active via `UniversalBoardContext`
- Config layout: surface tint, comfortable density, "Configuring" whisper
- Enrichment: path prelude, relative kept dates, paths-before-moments section order, structured journey meta

### 2026-06-12 — boardDef / domain presence-schema noise fix
- `KeeperPresence` skips domain schema fetch for `boardDef`, `frame` config, and `domain` focus — uses platform defaults / dedicated presence components; avoids 400 on `boardDef` and redundant 404 on `domain`

### 2026-06-10 — Key presence-schema 400 fix
- `usePresenceSchema` accepts optional `skipDomainFetch` to skip `GET /presence-schema/:objectType` when a dedicated focus component owns rendering
- `KeeperPresence` sets `skipDomainFetch` for `objectType === 'key' && layout === 'focus'` — matches `KeyFocusPresence` branch; avoids 400 from API rejecting unknown `key` objectType

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
