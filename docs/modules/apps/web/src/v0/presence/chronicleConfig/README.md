# chronicleConfig

## 📌 Purpose
Universal Chronicle Config Mode infrastructure — one explicit save pattern for every board. Provides `useChronicleConfig`, targeted PATCH routing, the persistent save bar, and the Config Mode shell (compressed identity header + editable body + save bar).

## 🧱 Key Files
- `types.ts` — `ChronicleSaveStatus`, `ChronicleEntityKind`
- `chroniclePatch.ts` — `handleChronicleSave`, `parseChroniclePatchFieldErrors`, domain/agent patch builders
- `useChronicleConfig.ts` — hook: dirty state, validate, build payload, save handler
- `ChronicleSaveBar.tsx` — green/red confirmed save indicator
- `ChronicleConfigShell.tsx` — universal Config Mode layout shell
- `ChronicleActPresence.tsx` — engagement template Acts through the same shell (Submit bar, declared fields)
- `ChronicleCoverField.tsx` — cover image upload (Vercel Blob via `MediaUploader`); saves immediately on upload
- `ChronicleRecordDelete.tsx` — danger-zone delete with confirm for Journey, Path, Moment Config

## 🔄 Data & Behavior
- **Cover image CRUD:** Domain Configure → `theme.coverImage`; Journey/Path/Moment Configure → `presenceSchema.coverImage` via targeted PATCH. Cover saves immediately (not through Save bar). Hero avatar on `EntityCoverPresence` reflects uploaded image.
- **Config metadata:** Agent, Domain, Integration (service), and Key → `useChronicleConfig` + explicit Save bar → `chroniclePatch.ts`
- **Act (engagement create):** Nav `+` or action bar → `ChronicleActPresence` inside `ChronicleConfigShell` — same header/save bar as Manage; fields use `keeper-presence-field-label` + theme tokens. **Not** generic `EngagementForm`.
- **Config credentials:** verify, rotate, paste-key, revoke, disconnect → POST routes on feed hooks / block actions (not `handleChronicleSave`)
- Agent saves → `PATCH /api/agents/:id` with `domainId` (explicit Save, no autosave)
- Domain saves → `PATCH /api/domains/:id` plus optional partial `PATCH /api/domains/:slug/frame` for tagline/theme/kip visibility
- Integration (service) saves → `PATCH /api/integrations/:serviceSlug?domainId=` for `display_label`, `description`, `connect_copy`
- Key saves → `PATCH /api/keys/:id` for `display_label`, `description`
- IDE build context fields persist under `domain.settings.ideBuildContext` via domain PATCH
- Known gaps flagged in code: unchanged save no-op, static model list, capability textarea, domain assignment read-only, recent sessions not tappable

## ⚠️ Notes & ToDo
- [ ] Wire FrameConfigPresence prop edits through explicit save bar (Design Board — props still save on add)
- [ ] BoardDefConfigPresence remains read-only — no targeted save route for board defs
- [ ] **Domain ops migration (Phase 4):** members — port from `DomainManager`; retire `?frame=admin` DomainManager path

### Domain Management migration plan (Universal Chronicle)
| Phase | Surface | Fields / actions |
|-------|---------|------------------|
| **1 (done)** | Chronicle Configure | name, slug, tagline, character, purpose, theme color, visibility, cover; targeted post-save (no journey/moment re-fetch); switcher tagline sync |
| **2 (done)** | Chronicle Configure — Addresses | `customDomain`, keeper.domains hostname preview (`DomainAddressesSection`) |
| **3 (done)** | Chronicle Configure — DNS | Vercel attach, verify, DNS records (ported from `DomainDetailForm`) |
| **4** | Chronicle Configure — People | members list, invite, role PATCH |
| **5** | Retire legacy | Remove standalone `DomainManager` from `?frame=admin`; keep `/admin/domains` for platform admins only |

## 📆 Update Log

### 2026-07-04 — Domain addresses in Chronicle Configure (Phases 2–3)
- `DomainAddressesSection`: keeper subdomain preview, custom domain (`livecchi.us`), Vercel attach/verify, DNS panel
- `buildKeeperTenantHostname` in `platformHost.ts`; `enrichDomain` loads `customDomain` + verified flag

### 2026-07-04 — Domain slug + fast save + switcher tagline
- Chronicle Domain Configure: editable **slug** (PATCH domain + navigate on rename)
- Post-save: local record merge via `onSaveComplete` — no full `enrichDomain` reload (journeys/moments)
- Tagline dual-write to `domain.theme.tagline` + `frame_json.theme.tagline`; switcher prefers theme tagline over description (purpose)
- `patchDomainSwitcherCacheEntry` + `subscribeDomainSwitcherCache` keep picker cards fresh after save

### 2026-07-01 — Hidden `pathId` on moment Acts
- `ChronicleActPresence` merges `pathId` from engagement context into submit payload (with `journeyId`, `keeperId`, `domainId`)

### 2026-06-30 — Object theme bits + Keeper/Agent avatar upload
- `@keeper/shared/objectTheme` — each visual upload appends an ordered theme bit; cover/avatar active fields sync to latest bit of that role
- Keeper Configure: avatar upload via `presenceSchema` (`Keeper.presenceSchema` migration)
- Agent Configure: portrait upload + emoji fallback; theme bits on `kip_agents.presenceSchema`
- Configure modes show **Object theme** strip (upload history in order)

### 2026-06-30 — Chronicle cover upload + record delete
- `ChronicleCoverField` wires cover image upload in Domain/Journey/Path/Moment Configure modes
- `ChronicleRecordDelete` adds delete for Journey, Path, Moment in Configure danger zone
- Shared cover helpers in `@keeper/shared/presenceCover`

### 2026-06-19 — ChronicleActPresence (declared engagement Acts)
- Engagement templates render through `ChronicleConfigShell` + declared fields — same surface as Agent Manage, not bespoke `EngagementForm` chrome

### 2026-06-17 — Keeper PATCH domain query
- `handleChronicleSave` appends `?domainId=` for `entityKind === "keeper"` (matches integration pattern)

### 2026-06-13 — Phase 6 unified pattern documentation
- Clarified Cover vs Config: declaration blocks always on cover; metadata via Save bar; credentials on separate POST routes

### 2026-06-13 — Integration/Key Chronicle metadata save (Phase 3)
- `chroniclePatch.ts` routes `service` / `integration` → `PATCH /api/integrations/:slug?domainId=` and `key` → `PATCH /api/keys/:id`
- `IntegrationConfigPresence` and `KeyConfigPresence` use `useChronicleConfig` with editable metadata fields and explicit Save bar
- Credential verify/rotate/revoke remain inline block actions (not `handleChronicleSave`)

### 2026-05-29 — Step 2: Universal Chronicle CRUD
- Extracted universal save pattern from Agent Board into `useChronicleConfig`
- Added `ChronicleSaveBar` and `ChronicleConfigShell` shared components
- Wired Agent, Domain, IDE (build context), and Design (domain idle) boards through the same hook
