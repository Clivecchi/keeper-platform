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
- `saveChronicleCoverUpload.ts` — optional Library shelf row for every Chronicle cover/avatar upload
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
- [x] Frame Chronicle save → `PATCH /api/domains/:slug/frame` (`handleChronicleSave` entityKind `frame`)
- [x] BoardDef Chronicle save is explicit (code-defined; no silent empty PATCH)
- [ ] Wire FrameConfigPresence prop edits through explicit save bar (Design Board — props still save on add)
- [ ] BoardDef persistence remains deferred until board defs are data-owned (`resolveBoardDefs` code-wins)
- [ ] **Domain ops migration (Phase 5):** retire `?frame=admin` DomainManager path; keep `/admin/domains` for platform admins

### Domain Management migration plan (Universal Chronicle)
| Phase | Surface | Fields / actions |
|-------|---------|------------------|
| **1 (done)** | Chronicle Configure | name, slug, tagline, character, purpose, theme color, visibility, cover; targeted post-save (no journey/moment re-fetch); switcher tagline sync |
| **2 (done)** | Chronicle Configure — Addresses | `customDomain`, keeper.domains hostname preview (`DomainAddressesSection`) |
| **3 (done)** | Chronicle Configure — DNS | Vercel attach, verify, DNS records (ported from `DomainDetailForm`) |
| **4 (done)** | Chronicle Configure — People | members list, invite, role PATCH (`DomainPeopleSection`) |
| **5** | Retire legacy | Remove standalone `DomainManager` from `?frame=admin`; keep `/admin/domains` for platform admins only |

## 📆 Update Log

### 2026-09-17 — TypeSafe in agent provider hint
- Chronicle PATCH copy lists TypeSafe with the other AI providers.

### 2026-09-16 — Domain Presence and custom domain on Save
- `splitDomainChroniclePatch` writes `keeperType` → `settings.keeperTypeKey` and `customDomain` onto the Domain row. Empty custom domain clears verification.

### 2026-09-15 — Chronicle upload is one path
- `ChronicleVisualUploadField` optionally files the image in Library, then persists the object. Success waits on that save. Domain / Keeper / Journey / Path / Moment use the same field. Keeper PATCH accepts cover + avatar together.

### 2026-09-13 — Config shell stays inside the Chronicle column
- `ChronicleConfigShell` is `.keeper-chronicle-stack` so header and Save stay pinned while the field list is the only scrollport.

### 2026-09-13 — Config uses the Domain reading page
- `ChronicleConfigShell` is a `.theme-reading-plane`. Header, Save bar, and labels use paper / ink / Action — not faint Warm Dark tertiary on the atmosphere floor.

### 2026-09-13 — Domain Card frames
- `ChronicleConfigShell` accepts `subnav` for quiet inner frames under the identity header. Domain Configure uses Domain · People · Addresses · Presence.

### 2026-09-13 — Chronicle Config is a bounded scrollport
- `ChronicleConfigShell` uses `overflow-hidden` on the shell so the inner panel, not the card, is the scroll surface.

### 2026-09-12 — Domain Board save / scroll honesty
- `useChronicleConfig` clears dirty/save state when `entityId` or `domainId` changes so a Domain switch cannot keep the previous Domain's unsaved banner.
- `ChronicleConfigShell` scroll area uses `overscroll-contain` and extra bottom padding so the last Configure fields stay above the Save bar.

### 2026-09-12 — Agent Board save honesty
- Empty Agent PATCH now stays idle with “No changes to save.” Failed saves still surface as error — never Saved.
- Save bar shows that idle message instead of a false “Ready to save” after a no-op.

### 2026-08-30 — Agent name save was blaming empty Purpose
- `buildAgentChroniclePatchBody` omits blank optional fields so renaming an agent (e.g. `liv`) is not rejected.
- `parseChroniclePatchFieldErrors` maps Zod `details[].path` onto the real field instead of pinning “Validation error” on Name.

### 2026-08-30 — Config header name is the name
- `ChronicleConfigShell` accepts `onNameChange` so Agent and Domain names edit in the identity header.

### 2026-08-30 — Cover is also Library + Treatment
- Domain cover save still uses `ChronicleCoverField`; Domain Configure also creates a Library row and extracts Treatment via `applyDomainVisualFromImage`. Library `+` does not write the Domain look.

### 2026-08-18 — Frame / boardDef Chronicle PATCH
- `handleChronicleSave("frame")` writes `frame_json` via `PATCH /api/domains/:slug/frame`
- `handleChronicleSave("boardDef")` returns an explicit code-defined error (no silent fall-through)

### 2026-07-04 — Platform slug rename save fix
- Domain save: frame PATCH uses slug returned from domain PATCH (fixes `default` → `ke3p` "Domain not found")
- API resolves `ke3p` ↔ `default` alias during platform migration

### 2026-07-04 — Domain people in Chronicle Configure (Phase 4)
- `DomainPeopleSection`: member list, user search invite, role update, remove

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
