# Keeper Object Glossary

> **STATUS: Working v1 — governing platform vocabulary.**  
> Same governing tier as `docs/entitykind-implementation-recipe.md`.  
> Code-derived from `packages/database/prisma/schema.prisma`, mounted API routes under `apps/api/src`, and Chronicle/presence TypeScript in `apps/web/src/v0/presence` (+ Nav in `apps/web/src/v0/boards`).  
> When this document conflicts with live code, **the codebase wins** — then update this glossary.  
> Landed: 2026-08-02.

---

## Key distinctions (product language)

These two “path” concepts must never be collapsed:

| Term | What it is | Where it lives |
|---|---|---|
| **Journey Path** | A named segment under a Journey (Prisma `Path` row) that contains Moments | Narrative hierarchy: Domain → Keeper → Journey → **Path** → Moment |
| **Document Section** | A declared group for Document Points on a Dialog (JSON `document_paths` / pathGroupId today; product language is “Section,” not Journey Path) | Dialog/Document workspace — **not** a Journey Path row and **not** an EntityKind |

**Document** itself is Dialog state (freeform workspace scaffolding), not a separate Prisma EntityKind. Never call the Object Glossary a “Document” in platform language — that word stays reserved for the Dialog-associated construct.

---

## Board-emphasis invariant (governing)

Same standing as the EntityKind Recipe and Universal Board Constitution. **Acceptance criterion for any future board work.**

> Switching boards may change what's emphasized about a Chronicle Subject — which facet is surfaced first, information density, which agent is Lead, which controls appear up front. It must never change the subject's identity or the actions available on it. If board switching changes what an object *is* or *can do*, that's a bug. If it only changes what's placed in front of the user first, it's working as intended.

### Per-board lens

Same underlying Dialog / Document / Draft in every row:

| Board | What comes into focus | What must stay identical |
|---|---|---|
| **Domain** | Orientation — index across Dialogs, Keeper, Library, Journeys | The object itself, untouched — this is the index, not a deep dive |
| **Build** | Construction — Points, Versions, Draft mechanics, Add to Document | Same underlying Points; Build surfaces editing controls first |
| **Design** | Structure — EntityKind, rendering path, Treatment | Identity as an EntityKind; Design defines it, doesn't change it per-view |
| **Realm** | Accumulation — kept/presented output | Same Document; Realm foregrounds finished state over raw mechanics |
| **Agent** | Cast — Lead, cueing, participation for this Dialog | Same Dialog; Agent surfaces roster/responsibility controls only |

### Standing exceptions (not bugs of this pass)

Draft, Moment, Library, and Domain-idle currently violate this invariant via the Document-tree / Presence-tree fork (registry vs `KeeperPresence`). They will not conform until that fork is resolved separately. Do not treat those four as new bugs, and do not patch the fork as a side effect of board work.

---

## How this glossary was built

| Source | What was checked |
|---|---|
| Prisma | Every `model` and `enum` in `packages/database/prisma/schema.prisma` (106 models, 2 enums) |
| EntityKind recipe | `docs/entitykind-implementation-recipe.md` 7-layer checklist used as a **checklist only** — status judged by whether those code artifacts exist |
| Chronicle | `ChroniclePresenceView.tsx`, `KeeperPresence.tsx`, `chronicleEntityRegistry.ts`, `*FocusPresence.tsx`, `*ConfigPresence.tsx`, `chroniclePatch.ts`, `ChronicleEntityKind` in `chronicleConfig/types.ts` |
| API | Mounts in `apps/api/src/index.ts` + route files; inactive/unmounted routers noted where found |

### EntityKind status labels (this glossary)

Judged against the recipe’s seven layers as **files/columns that exist in code today**:

1. Cover schema (`*CoverSchema.ts`)
2. Focus orchestrator (`*FocusPresence.tsx`)
3. Chronicle blocks (`DeclarationChronicleBlocks` variant **or** kind-specific `*ChronicleBlocks.tsx`)
4. Config presence (`*ConfigPresence.tsx` + `useChronicleConfig` / equivalent save shell)
5. PATCH via `resolveChroniclePatchEndpoint`
6. Nav fetch/label/bump utilities used from Universal Nav
7. DB declaration columns: `display_label`, `description`, `chronicle_blocks`, `chronicle_actions`

| Label | Meaning in this glossary |
|---|---|
| **Fully wired EntityKind** | All seven present with real wiring |
| **Partial EntityKind** | Cover + Focus (and usually Config/PATCH) exist, but declaration columns and/or Nav/blocks diverge from recipe |
| **Not an EntityKind** | No cover schema / FocusPresence pattern for this Prisma model |

### Chronicle presence labels

| Label | Meaning |
|---|---|
| **KeeperPresence → \*FocusPresence** | `ChroniclePresenceView` → `KeeperPresence` dispatches to a kind-specific Focus component |
| **ChronicleEntityView (registry)** | `isRegistryEntityKind` path — currently **library only** |
| **Bespoke** | Dedicated presence component outside the FocusPresence pattern |
| **None** | No Chronicle objectType / presence renderer found for this model |

---

## Index — all Prisma models (100)

| # | Model | EntityKind | Chronicle |
|---|---|---|---|
| 1 | ContextualContainerConfig | Not | None |
| 2 | InteractionContentConfig | Not | None |
| 3 | Journey | Partial | KeeperPresence → JourneyFocusPresence |
| 4 | Keeper | Fully wired | KeeperPresence → KeeperFocusPresence |
| 5 | KeeperMapping | Not | None |
| 6 | KeeperRecord | Not | None |
| 7 | KeeperType | Not | None |
| 8 | FrameConfig | Not | Partial (frame config UI, not model Focus) |
| 9 | Board | Not | boardDef config only |
| 10 | Topic | Not | None |
| 11 | Task | Not | None |
| 12 | Activity | Not | None |
| 13 | MemoryCard | Not | None |
| 14 | Moment | Partial | KeeperPresence → MomentFocusPresence |
| 15 | Path | Partial | KeeperPresence → PathFocusPresence |
| 16 | PlatformStorageConfig | Not | None |
| 17 | StudioModule | Not | None |
| 18 | ThreadBlob | Not | None |
| 19 | UserApiCredential | Not | None |
| 20 | UserSettings | Not | None |
| 21 | UserStorageConfig | Not | None |
| 22 | content_permissions | Not | None |
| 23 | engagement_fields | Not | None (nested in templates) |
| 24 | engagement_styles | Not | None |
| 25 | engagement_templates | Not | Act shell uses templates; not EntityKind |
| 26 | engagements | Not | None |
| 27 | entity_types | Not | None |
| 28 | field_definitions | Not | None |
| 29 | keeper_activity_log | Not | None |
| 30 | keeper_journeys | Not | None |
| 31 | keeper_revisions | Not | None |
| 32 | FrameInstance | Not | frame config path |
| 33 | note_tags | Not | None |
| 34 | notes | Not | None |
| 35 | roles | Not | None |
| 36 | shared_content | Not | None |
| 37 | tags | Not | None |
| 38 | themes | Not | None |
| 39 | user_roles | Not | None |
| 40 | kip_agents | Partial | KeeperPresence → AgentFocusPresence |
| 41 | kip_agent_logs | Not | None |
| 42 | kip_drafts | Partial | KeeperPresence → DraftFocusPresence |
| 43 | kip_draft_versions | Not | None |
| 44 | Dialog | Partial | KeeperPresence → DialogFocusPresence |
| 45 | ChronicleEvent | Not | History timeline (not Focus cover) |
| 46 | DialogCastMember | Not | Nested under Dialog |
| 47 | kip_sessions | Not | Session select → conversation; no FocusPresence |
| 48 | kip_messages | Not | None (message list, not Chronicle entity) |
| 49 | users | Not | None |
| 50 | SessionHandoffKey | Not | None |
| 51 | UserVoicePreferences | Not | None |
| 52 | PlatformEmotif | Not | None |
| 53 | DomainEmotif | Not | None |
| 54 | UserEmotif | Not | None |
| 55 | MomentEmotif | Not | None |
| 56 | kip_user_keys | Not | Backing store for Key EntityKind |
| 57 | kip_agent_permissions | Not | None |
| 58 | kip_platform_keys | Not | Backing store for Key EntityKind |
| 59 | kip_agent_keeper_types | Not | None |
| 60 | kip_lenses | Not | Agent config field, not own Focus |
| 61 | keeper_type_engagement_templates | Not | None |
| 62 | SoleReflection | Not | None |
| 63 | SoleMemoryCard | Not | Bespoke SoleMemoryPresence |
| 64 | SoleVoiceEntry | Not | None |
| 65 | SoleEcho | Not | None |
| 66 | SoleLogbookEntry | Not | None |
| 67 | Domain | Partial | KeeperPresence → DomainFocusPresence |
| 68 | DomainPolicy | Not | None |
| 69 | PresenceSchema | Not | Feeds presence fields; not EntityKind |
| 70 | AgentContract | Not | None |
| 71 | DomainAgentPolicy | Not | None |
| 72 | AgentLens | Not | None (deprecated in schema comment) |
| 73 | GovernanceComplianceLog | Not | None |
| 74 | DomainAudit | Not | None |
| 75 | DomainPermission | Not | None |
| 76 | CrossDomainShare | Not | None |
| 77 | DomainInvitation | Not | None |
| 78 | DomainUsage | Not | None |
| 79 | SoleMemoryScope | Not | None |
| 80 | MemoryShare | Not | None |
| 81 | MemoryMigration | Not | None |
| 82 | MemoryAccess | Not | None |
| 83 | MemoryAlert | Not | None |
| 84 | DomainTransfer | Not | None |
| 85 | ShareWorkflow | Not | None |
| 86 | ShareWorkflowStep | Not | None |
| 87 | ShareRequest | Not | None |
| 88 | ShareStepExecution | Not | None |
| 89 | ShareActivation | Not | None |
| 90 | ShareAccessLog | Not | None |
| 91 | ShareNotification | Not | None |
| 92 | ShareTemplate | Not | None |
| 93 | CrossDomainCollaboration | Not | None |
| 94 | CollaborationActivity | Not | None |
| 95 | SslCertificate | Not | None |
| 96 | MediaContent | Not | None |
| 97 | MediaFrameConfig | Not | None |
| 98 | media_frame_instances | Not | None |
| 99 | BoardAlias | Not | None |
| 100 | RequestLog | Not | None |
| 101 | Integration | Partial | KeeperPresence → IntegrationFocusPresence (`objectType: "service"`) |
| 102 | Key | Fully wired | KeeperPresence → KeyFocusPresence (+ ExternalAccessKeyPresence for DomainAccessKey ids) |
| 103 | DomainAccessKey | Not | Bespoke ExternalAccessKeyPresence (routed as `objectType: "key"`) |
| 104 | Capability | Fully wired | KeeperPresence → CapabilityFocusPresence |
| 105 | AgentCapability | Not | Join table; no own presence |
| 106 | LibraryItem | Fully wired | ChronicleEntityView registry (`objectType: "library"`) |

*(Index numbering above groups Integration–LibraryItem after RequestLog as they appear later in the schema file; total Prisma `model` count = 100. Enums: `IntegrationType`, `LibraryItemSourceType`.)*

### Non-model concepts checked because they appear in product language

| Name | Persistence | Notes |
|---|---|---|
| **Treatment** | JSON inside `Domain.frame_json` (`DomainFrameTreatment` in `domain-frame.types.ts`) | No Prisma model. Patched via `PATCH /api/domains/:slug/frame` (`patchDomainTreatment` in `chroniclePatch.ts`). |
| **DraftPoint** | Nested JSON inside `kip_drafts.spec_json` (`@keeper/shared` types) | No Prisma model. `Moment.sourcePointId` references point ids. |
| **RealmFeedEvent** | Referenced in `ChronicleEvent` schema comment | **No Prisma model found** with that name. |
| **Session** (product name) | Prisma model `kip_sessions` | See entry below. |
| **Agent** (product name) | Prisma model `kip_agents` | See entry below. |
| **Draft** (product name) | Prisma model `kip_drafts` | See entry below. |
| **Library** (product name) | Prisma model `LibraryItem` | See entry below. |

---

# Part A — Named platform objects (expanded)

## Domain

### What it is
A tenant/workspace row: unique `name`/`slug`, owner, status/features/limits, and a `frame_json` blob that drives frame/Treatment UI. Owns Keepers, Journeys, Moments, Dialogs, drafts, Keys, Capabilities, LibraryItems, boards, and policy relations.

### Schema
- **Key fields:** `id`, `name` (unique), `slug` (unique), `slugHistory`, `customDomain*`, `status`, `features`/`limits`/`theme`/`settings`/`frame_json` (Json), `ownerId`, `isPublic`, `isActive`, `deletedAt`, …
- **FKs / relations:** `ownerId` → `users`; children include `Keeper`, `Journey`, `Moment`, `Board`, `kip_drafts`, `Dialog`, `Key`, `Capability`, `LibraryItem`, `DomainPolicy`, `DomainPermission`, etc.

### EntityKind status
**Partial.** Checked: `domainCoverSchema.ts`, `DomainFocusPresence.tsx`, `DomainConfigPresence.tsx`, PATCH `case "domain"` → `/api/domains/:id`, treatment/frame split in `chroniclePatch.ts`. Missing recipe DB declaration columns (`display_label` / `chronicle_blocks` / `chronicle_actions` not on `Domain`). No `DeclarationChronicleBlocks` variant. Domain is board host more than a Nav EntityKind list.

### Current Chronicle presence
**KeeperPresence → DomainFocusPresence** (also idle/default Chronicle subject in `UniversalViewPanel`).

### Known inconsistencies
- Domain has `description` but not the four EntityKind declaration columns that Key/Integration/Capability/LibraryItem/Keeper use — open question whether Domain is meant to complete the recipe or remain a host surface.
- Treatment lives in `frame_json`, not as columns on Domain — open question how “Domain theme” (`Domain.theme` Json) vs `frame_json.treatment` / `frame_json.theme` relate at runtime.
- Multiple Domain API surfaces mounted (`api/domains/routes.ts`, `api/domains.ts`, `api/admin/domains.ts`).

---

## Keeper

### What it is
A first-class content container under a Domain: `title`/`purpose`, optional KeeperType, theme, SOLE JSON blobs, and declaration columns for Chronicle. Parent of Journeys/Paths and link target for drafts, engagement templates, and library assignments.

### Schema
- **Key fields:** `id`, `title`, `purpose`, `display_label`, `description`, `chronicle_blocks`, `chronicle_actions`, `keeperTypeId`, `ownerId`, `theme_id`, `keeperType` (String?), `memoryPattern`, `sole`/`soleDraft`/`soleSubmittedAt`, `domainId`, `presenceSchema`
- **FKs:** `domainId` → Domain, `keeperTypeId` → KeeperType, `theme_id` → themes; children Journey, Path, Sole*, kip_drafts, engagement_templates, LibraryItem assignments

### EntityKind status
**Fully wired.** Cover, Focus, `DeclarationChronicleBlocks variant="keeper"`, `KeeperConfigPresence` + `useChronicleConfig`, PATCH `/api/keepers/:id`, `keeperNavUtils` + `bumpKeeperNav`, all four DB declaration columns present.

### Current Chronicle presence
**KeeperPresence → KeeperFocusPresence.**

### Known inconsistencies
- Dual string fields: `keeperType` (String?) **and** `keeperTypeId` → KeeperType — open which is canonical at runtime.
- Dual Keeper API mounts: `/api/keepers` (`domain-integrated-routes.ts`) and `/api/keeper/keepers` (`keeper/routes.ts`).
- Cover TS type is named `KeeperRecord` in `keeperCoverSchema.ts`, colliding in name with Prisma model `KeeperRecord` (different thing).

---

## Journey

### What it is
A named narrative container under a Keeper (and optionally Domain): `name`, `forward`, owner, theme, `presenceSchema`; parents Moments and Paths; linked from SOLE reflections/cards.

### Schema
- **Key fields:** `id`, `name`, `forward`, `ownerId`, `keeperId`, `theme_id`, `domainId`, `presenceSchema`, timestamps
- **FKs:** `keeperId` → Keeper (required), `domainId` → Domain (optional), `theme_id` → themes; children Moment[], Path[], SoleReflection[], SoleMemoryCard[]

### EntityKind status
**Partial.** Cover + Focus + `JourneyConfigPresence` + PATCH `/api/journeys/:id` + Nav list/`bumpJourneyNav` exist. Blocks are `JourneyChronicleBlocks.tsx` (not `DeclarationChronicleBlocks`). **No** DB declaration columns on `Journey`.

### Current Chronicle presence
**KeeperPresence → JourneyFocusPresence.** Create acts via `ChronicleActPresence` / engagement templates (`journey.create`, etc.).

### Known inconsistencies
- `domainId` optional while `keeperId` required — Journey can be domain-scoped via Keeper’s domain, but also carries its own `domainId`; open whether both can disagree.
- Inactive dual router: `apps/api/src/api/journey/domain-integrated-routes.ts` exists and is **not mounted**; active is `apps/api/src/api/journeys.ts`.
- Product “forward” also appears on Dialog as `forward_title` / `forward_description` — same word, different fields/models.

---

## Path

### What it is
A named segment under a Journey (and Keeper): `name`, `prelude`, owner; container for Moments.

### Schema
- **Key fields:** `id`, `name`, `prelude`, `ownerId`, `journeyId`, `keeperId`, `theme_id`, `presenceSchema`
- **FKs:** `journeyId` → Journey, `keeperId` → Keeper, `theme_id` → themes; children Moment[]
- **No `domainId` column** (unlike Journey/Moment/Keeper).

### EntityKind status
**Partial.** Cover, Focus, PathChronicleBlocks, Config + PATCH `/api/paths/:id` present. No DB declaration columns. Nav nested under journey; no dedicated `bumpPathNav` found in Config save path.

### Current Chronicle presence
**KeeperPresence → PathFocusPresence.**

### Known inconsistencies
- Dialog has `document_paths` Json described in-schema as “Declared Path groups for Document Points — not Journey Path rows.” Product language for those groups is **Document Section** — two different concepts that must not share vocabulary casually.
- Path has no `domainId` while Moment/Journey do — domain scoping for Path is only via Journey/Keeper.

---

## Moment

### What it is
A kept narrative unit: `title` + `narrative`, optionally linked to Path/Journey/Domain, with claim/anon fields, archive flag, and draft-origin pointers (`sourceDraftId`, `sourcePointId`, `evolvedFromMomentId`).

### Schema
- **Key fields:** `id` (cuid), `title`, `narrative`, `pathId`, `journeyId`, `ownerId`, `theme_id`, `domainId`, `keptAt`, `anonKey`, `claimToken*`, `presenceSchema`, `sourceDraftId`, `sourcePointId`, `evolvedFromMomentId`, `archived`
- **FKs:** Domain?, Journey?, Path?, themes?; SoleReflection[], SoleMemoryCard[], MomentEmotif[]
- **No Prisma FK** defined for `sourceDraftId` / `sourcePointId` / `evolvedFromMomentId` (plain String fields + indexes only).

### EntityKind status
**Partial.** Cover, Focus, MomentChronicleBlocks, Config + PATCH `/api/moments/:id`. No DB declaration columns. No dedicated Nav bump utility found.

### Current Chronicle presence
**KeeperPresence → MomentFocusPresence.**

### Known inconsistencies
- Dual mounted moment APIs: `/api/moments` and `/api/v0/moments`.
- `sourcePointId` comments claim 1:1 Moment.id == Point.id in some cases, but Moment.id is `@default(cuid())` — open whether that convention is enforced in create paths.
- `evolvedFromMomentId` has no Prisma `@relation` back to Moment.

---

## Session (`kip_sessions`)

### What it is
An agent chat session row: agent + optional user, name/topic/summary/tags, optional primary Keeper/Journey, optional active draft, optional Dialog membership, archive flag, `beat_metadata`.

### Schema
- **Key fields:** `id` (Uuid), `agent_id`, `user_id`, `session_name`, `topic`, `summary`, `tags`, `primary_keeper_id`, `primary_journey_id`, `active_draft_id`, `dialog_id`, `is_archived`, `beat_metadata`, timestamps
- **FKs:** `agent_id` → kip_agents, `user_id` → users?, `active_draft_id` → kip_drafts?, `dialog_id` → Dialog?; children kip_messages[], SessionHandoffKey[]
- `primary_keeper_id` / `primary_journey_id` are **untyped strings** (no Prisma relations).

### EntityKind status
**Not an EntityKind.** No session cover schema / FocusPresence. Not in `ChronicleEntityKind`.

### Current Chronicle presence
**None as EntityKind.** Dialog chronicle blocks can navigate via `navigateKind: "session"` → `onSessionSelect`, which drives the **conversation** panel (`UniversalBoardContext`), not a Session Focus cover.

### Known inconsistencies
- `UniversalBoardSchema.ts` still documents `onSessionSelect` as a stub/TODO, while `UniversalBoardContext.tsx` implements a real callback — schema comment vs code diverge.
- Sessions can exist without a Dialog (guest/ephemeral path is described in Dialog model comments); Dialog groups sessions — open when Dialog is required vs optional in auth flows.
- `primary_keeper_id` / `primary_journey_id` lack FKs unlike `active_draft_id` / `dialog_id`.

---

## Dialog

### What it is
Persistent named conversation container scoped to domain (+ optional user): archives, document lifecycle fields (`document_status`, forward/step fields, `document_paths`), holds sessions and drafts, cast members, and ChronicleEvents.

**Pathway (locked 2026-08-18):** Nav selects this Dialog. Dialog panel is its conversation (resume that Dialog’s session). Chronicle renders its Document. Agent `dialog.read { id }` returns that same Document — empty Points means unbuilt, not “I read it.” Auto-named (`title_source: auto_generated`) rows are Chatter, not Nav-primary Dialogs.

### Schema
- **Key fields:** `id` (cuid), `title`, `domain_id`, `user_id`, `available_to` (String[]), `context` (Json), `is_archived`, `document_status`, `forward_title`, `forward_description`, `step_title`, `step_body`, `document_paths`, `presenceSchema`, timestamps
- **FKs:** domain → Domain, user → users?; sessions[], drafts[], castMembers[], chronicleEvents[]

### EntityKind status
**Partial.** Cover, Focus, DialogChronicleBlocks, Config + PATCH under `/api/domains/:domainId/kip/dialogs/:id`, Nav list + `bumpDialogNav`. **No** DB declaration columns.

### Current Chronicle presence
**KeeperPresence → DialogFocusPresence.**

### Known inconsistencies
- Schema comments say Dialog is the Document’s durable identity and that `document_paths` are **not** Journey Path rows — Document vocabulary overlays Dialog without a separate Document model. Product language: those JSON groups are **Document Sections**.
- `available_to` is String[] with comment examples; no enum enforcement in Prisma.
- Config path may update trail without calling `bumpDialogNav` (Config vs Nav sync gap).

---

## Draft (`kip_drafts`)

### What it is
Domain-scoped working document/spec: kind/key/title/status, `spec_json` (includes DraftPoints in app code), optional keeper/agent/dialog links, version history, and sessions that point at it as `active_draft`.

### Schema
- **Key fields:** `id` (Uuid), `domain_id`, `owner_id`, `keeper_id`, `agent_id`, `kind`, `key`, `title`, `summary`, `status`, `spec_json`, `presenceSchema`, `dialog_id`, timestamps
- **FKs:** domain, owner (users), keeper?, agent?, dialog?; versions[], active_sessions[]

### EntityKind status
**Partial.** Cover, Focus (`DraftFocusPresence` → Cdraft body), DraftChronicleBlocks, Config + PATCH, `draftNavUtils` + `bumpDraftNav`. **No** DB declaration columns.

### Current Chronicle presence
**KeeperPresence → DraftFocusPresence.**

### Known inconsistencies
- Draft “Points” are not a Prisma model; promotion to Moment uses `sourceDraftId`/`sourcePointId` without FK constraints.
- Agent draft endpoints also exist on `/api/agents` in addition to domain kip-drafts routes — dual surfaces.

---

## Agent (`kip_agents`)

### What it is
Runnable AI agent configuration: slug/name/purpose/model/provider, tools/permissions/capabilities string arrays, role/visibility/status, config Json, optional `presenceSchema`; owns sessions, drafts, boards, lenses, capability grants, library assignments, dialog cast membership.

### Schema
- **Key fields:** `id` (Uuid), `slug` (unique), `name`, `purpose`, `model`, `context_scope`, `memory_enabled`, `tools`/`permissions`/`capabilities` (String[]), `config`, `status`, `role`, `model_provider`, `model_settings`, `created_by`, `visibility`, `presenceSchema`, timestamps
- **FKs / children:** sessions, drafts, boards, AgentLens, AgentCapability[], LibraryItem[], DialogCastMember[]
- **No** `display_label` / `chronicle_blocks` / `chronicle_actions` columns.

### EntityKind status
**Partial.** Cover + Focus (+ Training mode) + agent PATCH `/api/agents/:id` + Nav/`bumpAgentNav`. Config save often goes through KeeperPresence’s `useChronicleConfig({ entityKind: "agent" })` rather than Config component owning `useChronicleConfig`. No DeclarationChronicleBlocks variant; no recipe DB declaration columns.

### Current Chronicle presence
**KeeperPresence → AgentFocusPresence.**

### Known inconsistencies
- Dual capability storage: `kip_agents.capabilities` String[] **and** `AgentCapability` join to `Capability` model (schema comment: join “Does not replace kip_agents array columns”).
- Dual agent API mounts: `/api/kip/agents` and `/api/agents`.
- `AgentLens` schema-marked `@deprecated` in favor of `kip_lenses` + `UserVoicePreferences`, but relation still on kip_agents.

---

## Library (`LibraryItem`)

### What it is
Domain-scoped reference material row: source type (upload/url/github/gdrive/draft), `source_ref`, optional agent perspective, category tags, embedding float[], optional assigned Keeper/Agent, declaration columns for Chronicle.

### Schema
- **Key fields:** `id`, `domain_id`, `source_type` (enum), `source_ref`, `display_label`, `description`, `agent_perspective`, `category` String[], `embedding` Float[], `assigned_keeper_id`, `assigned_agent_id`, `chronicle_blocks`, `chronicle_actions`, timestamps
- **FKs:** domain, assignedKeeper?, assignedAgent?

### EntityKind status
**Fully wired** (and uniquely registered in `CHRONICLE_ENTITY_REGISTRY`). Cover, Focus, blocks variant `"library"`, Config + PATCH `/api/library-items/:id`, Nav utils + bump, all declaration columns.

### Current Chronicle presence
**ChronicleEntityView (registry)** — does **not** go through KeeperPresence. `objectType: "library"`.

### Known inconsistencies
- Only Library is on the registry path while Key/Capability/etc. still branch inside KeeperPresence — two Chronicle wiring styles coexist.
- `embedding` stored as `Float[]` with schema comment that pgvector is not enabled yet.
- `source_type` includes `draft` for connective pointers; relationship to `kip_drafts` is via `source_ref` string, not FK.

---

## Integration

### What it is
Third-party service connection row: `service`, `integration_type` (Services | Custom | AI_Model), Nango connection id, status/tier/scopes, optional domain/user, gateway flag, declaration columns; can own provider `Key` rows.

### Schema
- **Key fields:** `id`, `service`, `integration_type`, `nangoConnectionId`, `status`, `tier`, `scopes`, `domainId`, `userId`, `metadata`, `connectedAt`, `chronicle_blocks`, `chronicle_actions`, `is_gateway`, `display_label`, `description`, `connect_copy`, timestamps
- **FKs:** providerKeys → Key[]; **no Prisma relation** to Domain/users despite `domainId`/`userId` columns
- **Unique:** `[service, tier, domainId, userId]`

### EntityKind status
**Partial (near-complete).** Cover, Focus, declaration blocks, Config (`entityKind: "service"`), PATCH `/api/integrations/:id` (+ domainId query). DB declaration columns present. Nav uses board-def integration labels; **no** dedicated `*NavUtils` / `bumpIntegrationNav` found.

### Current Chronicle presence
**KeeperPresence → IntegrationFocusPresence** when `objectType === "service"` (not `"integration"`).

### Known inconsistencies
- `ChronicleEntityKind` includes both `"service"` and `"integration"` mapping to the same PATCH endpoint; UI objectType is `"service"`.
- Integration has no Prisma `@relation` to Domain despite `domainId` column.
- Recipe Nav/bump incomplete vs Key/Capability.

---

## Key

### What it is
Domain-scoped provider API key **presence** row: provider, `key_source` (env/user/platform), status/scope/verification/expiry, optional user/integration, declaration columns. Schema comment: “EntityKind presence layer over kip_user_keys / kip_platform_keys / env.”

### Schema
- **Key fields:** `id`, `provider`, `key_source`, `status`, `scope`, `last_verified`, `expires_at`, `domain_id`, `user_id`, `integration_id`, declaration columns, timestamps
- **FKs:** domain, user?, integration?
- **Unique:** `[domain_id, provider, key_source, user_id]`

### EntityKind status
**Fully wired.** All seven recipe layers present (Key is the recipe reference implementation).

### Current Chronicle presence
**KeeperPresence → KeyFocusPresence.**  
**Exception:** `objectType === "key"` with external-access chronicle ids → **Bespoke** `ExternalAccessKeyPresence` (`DomainAccessKey`, not this model).

### Known inconsistencies
- Secret material lives in `kip_user_keys` / `kip_platform_keys` / env; `Key` is a parallel presence/metadata table — two (or three) stores must stay in sync (create/rotate paths in `key-entity-routes.ts` write both).
- `DomainAccessKey` is a different model but can appear in Chronicle under `objectType: "key"`.
- Session handoff router also mounts under `/api/keys` (`session-handoff-keys.ts`) — shared mount prefix with Key EntityKind.

---

## Capability

### What it is
Platform capability registry row: unique `slug`, `kind`, optional domain, declaration columns; granted to agents via `AgentCapability`.

### Schema
- **Key fields:** `id`, `slug` (unique), `kind`, `display_label`, `description`, `chronicle_blocks`, `chronicle_actions`, `domain_id`, timestamps
- **FKs:** domain?, agent_grants → AgentCapability[]

### EntityKind status
**Fully wired.** Cover, Focus, blocks, Config, PATCH `/api/capabilities/:id`, Nav utils + bump, declaration columns.

### Current Chronicle presence
**KeeperPresence → CapabilityFocusPresence.**

### Known inconsistencies
- Agent runtime still reads string `capabilities` arrays on `kip_agents` / config; join table is additive — open which list is authoritative for “what can this agent do?”
- Dual capability routers mounted at `/api/capabilities` (`capability-entity-routes.ts` and `capability-routes.ts`).

---

## Treatment

### What it is
**Not a Prisma model.** A named presence/visual configuration (`name`, `palette.background`/`accent`, `font.family`) resolved from `Domain.frame_json.treatment` (with fallback from frame theme) by `resolveDomainTreatment.ts`. Applied in Chronicle via `ChronicleTreatmentShell`.

### Schema
- N/A as table. Type: `DomainFrameTreatment` in `apps/web/src/v0/data/domain-frame.types.ts`. Persisted inside `Domain.frame_json`.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
Shell/wrapper around other presence bodies (`ChronicleTreatmentShell`), not a selectable EntityKind cover. Domain Config can patch treatment via frame endpoint.

### Known inconsistencies
- Domain also has top-level `theme` Json column separate from `frame_json.theme` / `frame_json.treatment` — three theming-adjacent stores.
- `ChronicleEntityKind` does not include `"treatment"`; saves go through frame PATCH helpers.

---

# Part B — Remaining Prisma models

Entries below use the same sections; shorter where code shows little or no active surface.

---

## ContextualContainerConfig

### What it is
Named config row with `defaultMode`, `allowedModes`, optional permissions Json — appears to be a legacy/studio configuration table.

### Schema
`id` Uuid, `name` unique, `description`, `defaultMode`, `allowedModes` String[], `permissions` Json?, timestamps. **No relations.**

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- No `prisma.contextualContainerConfig` usage found under `apps/api/src` in this pass — schema-only relative to mounted API.

---

## InteractionContentConfig

### What it is
Named interaction content config: `contentMode`, `components` Json[], `config` Json, permissions, `createdBy`.

### Schema
`id` Uuid, `name` unique, `description`, `contentMode`, `components`, `permissions`, `config`, `createdBy`, timestamps. **No relations.**

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- No mounted API usage found in this pass.

---

## KeeperMapping

### What it is
Suggestion/mapping row from a MemoryCard toward a Keeper/Journey/Path with strength and status.

### Schema
`id`, `memoryCardId` → MemoryCard, optional `keeperId`/`journeyId`/`pathId` (**no Prisma FKs** to those), `suggestedType`, `suggestionStrength`, `status`, `createdAt`.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Query helpers exist in `packages/database/src/queries`; **no API route** found mounting KeeperMapping CRUD.
- Optional keeper/journey/path ids are untyped strings without relations.

---

## KeeperRecord

### What it is
Generic typed-instance row: `typeId` → KeeperType, optional `customBoardId` → Board, freeform `data` Json.

### Schema
As above; indexes on `typeId`, `customBoardId`.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- `boardResolver.ts` / design-board types reference KeeperRecord, but **no mounted API route** found that uses `prisma.keeperRecord`.
- Name collision with TS `KeeperRecord` type in `keeperCoverSchema.ts` (maps the **Keeper** model for covers).

---

## KeeperType

### What it is
Named keeper classification: optional `memoryPattern`, `system` flag, optional default Board template; links Keepers, KeeperRecords, engagement templates, agent associations.

### Schema
`id`, `name`, `memoryPattern`, `system`, `defaultBoardTemplateId` → Board?, relations to Keeper[], KeeperRecord[], join tables.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** (admin/registry surfaces via `/api/keeper-types` and `/api/keeper/keeper-types`).

### Known inconsistencies
- Dual mounted KeeperType routes.
- Keeper also stores string `keeperType` alongside `keeperTypeId`.

---

## FrameConfig

### What it is
Reusable frame configuration: name, description, theme Json; parent of FrameInstance rows.

### Schema
`id` Uuid, `name`, `description`, `theme`, timestamps; FrameInstance[].

### EntityKind status
**Not an EntityKind.** (`ChronicleEntityKind` includes `"frame"` but that maps to domain frame JSON / FrameConfigPresence UI, not this table as a cover EntityKind.)

### Current Chronicle presence
**FrameConfigPresence** when `objectType === "frame"` && `layout === "config"` inside KeeperPresence — config UI, not Focus cover schema.

### Known inconsistencies
- `/api/frames` (`routes/frames.ts`) described as largely mock in route audit; real FrameConfig create/find appears under board-data (`api/boards.ts`).

---

## Board

### What it is
Board definition/instance: keeperId + slug, theme/behavior/data/config/access Json, optional agent/domain, template flag, uniqueness on `[domainId, boardType]` and `[keeperId, slug]`.

### Schema
Fields as in schema ~157–200; relations to FrameInstance[], kip_agents?, Domain?, KeeperType templates, KeeperRecord custom boards.

### EntityKind status
**Not an EntityKind.** `boardDef` in ChronicleEntityKind is config for **code** board definitions (`BOARD_DEFINITIONS`), not necessarily this Prisma row.

### Current Chronicle presence
**BoardDefConfigPresence** for `objectType === "boardDef"` — may not equal a Board table row.

### Known inconsistencies
- Dual board APIs: `/api/board-data` (real) vs `/api/boards` (deprecated/mock per audit).
- Universal Board product surface (`?board=domain`) is largely client board-defs + Domain, not 1:1 with every Board row.

---

## Topic / Task / Activity

### What it is
Agent-scoped work entities (Phase 11 comment): Topic (title/status/data), Task (title/status/due/draft link), Activity (type/data). **No Prisma relations** between them despite Topic/Task fields.

### Schema
String ids, `agentId` (no FK to kip_agents), optional board/topic/draft ids without relations.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Mounted stubs under `/api/agents` (`topics.ts`, `tasks.ts`, `activity.ts`) **do not use** `prisma.topic` / `prisma.task` / `prisma.activity` (in-memory/stub behavior found in audit).

---

## MemoryCard / ThreadBlob

### What it is
Legacy thread capture: ThreadBlob holds messages Json; MemoryCard extracts typed cards with tags/status and KeeperMapping children.

### Schema
ThreadBlob: `userId`, `assistantId`, `title`, `messages`, `source`, …  
MemoryCard: `threadBlobId` → ThreadBlob, `type`, `title`, `content`, `tags`, `timestamp`, `status`, `suggestionType`.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** for MemoryCard. (SOLE uses separate SoleMemoryCard + `objectType: "soleMemory"`.)

### Known inconsistencies
- Parallel memory systems: MemoryCard/ThreadBlob vs SoleMemoryCard/SoleReflection — no Prisma link between them.
- No API routes found using these Prisma models in this pass.

---

## PlatformStorageConfig / UserStorageConfig / StudioModule

### What it is
Storage provider configs (platform-wide and per-user) and Studio module registry rows (slug, moduleType, config Json).

### Schema
As in schema; UserStorageConfig → users; PlatformStorageConfig standalone unique provider; StudioModule Uuid id.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- No mounted API usage found for these models in this pass.

---

## UserApiCredential

### What it is
Per-user provider API key with scopes; FK to users.

### Schema
`id`, `userId` → users, `provider`, `apiKey`, `scopes`, timestamps.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Overlaps conceptually with `kip_user_keys` and Key EntityKind user source — **three** user-key-ish tables; no route found for UserApiCredential in this pass.

---

## UserSettings / UserStorageConfig / UserVoicePreferences

### What it is
Per-user preferences: theme mode / preferred theme id; storage provider; voice directness/conciseness/preamble.

### Schema
1:1 (or unique) with users.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- UserSettings exposed via KAM settings handler; VoicePreferences has dedicated router; storage config appears schema-only in this pass.

---

## content_permissions / entity_types / roles / user_roles

### What it is
Generic RBAC-ish tables: entity_types catalog; content_permissions grants by entityType/entityId; roles + user_roles assignment.

### Schema
Uuid ids; content_permissions → entity_types, roles?; user_roles → roles. **user_roles.userId has no Prisma FK to users.**

### EntityKind status
**Not an EntityKind.** (Unrelated to UI “EntityKind” recipe — naming collision.)

### Current Chronicle presence
**None.**

### Known inconsistencies
- Product “EntityKind” (Chronicle cover pattern) ≠ Prisma `entity_types` table.
- Admin roles API exists (`/api/admin/roles`); AGENTS.md notes `GET /api/admin/roles/users` returning empty roles — flagged as known platform debt (verify against current line if changing).

---

## engagement_templates / engagement_fields / engagement_styles / engagements

### What it is
Template system for create/engage flows: template has label/slug/type/targetType/config, optional keeperId; fields and styles children; `engagements` is a separate sparse event/content row (`type`, `content`, `targetId`, `targetType`).

### Schema
As in schema ~404–455; templates relate to Keeper?, Sole*, keeper_type join.

### EntityKind status
**Not an EntityKind.** Templates drive **ChronicleActPresence** / engagement execute APIs, not Focus covers.

### Current Chronicle presence
**None** as selectable EntityKind. Acts render through `ChronicleActPresence` when Nav requests engagement.

### Known inconsistencies
- `engagements` model: **no API route / prisma usage found** in this pass.
- Template execution is live; `engagements` table appears unused relative to templates.

---

## field_definitions

### What it is
Standalone field metadata catalog (name/label/type/config/required). **No relations.**

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- No mounted API usage found in this pass. Presence field defs in UI come from `KeeperPresenceDefaults` / PresenceSchema, not clearly this table.

---

## keeper_activity_log / keeper_journeys / keeper_revisions

### What it is
Auxiliary Keeper audit/snapshot tables: activity log, journey snapshot join, revision Json blobs. **No Prisma relations** to Keeper/Journey despite keeperId/journeyId strings.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Parallel to first-class `Journey` model: `keeper_journeys` is a separate snapshot table, not the Journey relation.
- No mounted API usage found in this pass.

---

## FrameInstance

### What it is
Placed frame on a board (or entity): entityType/entityId, configId → FrameConfig, boardId?, layout/props/visibility/pattern/frameType, etc.

### Schema
As in schema ~501–525.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
Indirect via `objectType: "frame"` config UI (may load instance props) — not FrameInstance Focus cover.

### Known inconsistencies
- Parallel media tables `media_frame_instances` / MediaFrameConfig exist with similar shape.

---

## notes / note_tags / tags

### What it is
User notes with tag M2M. **notes.userId / tags.userId have no Prisma FK to users.**

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- No mounted notes API found in this pass; LibraryItem is the active reference-index model instead.

---

## shared_content

### What it is
Public share slug row for arbitrary contentType/contentId with visibility/theme/meta.

### Schema
Uuid id, `urlSlug` unique, counters, Json theme/meta. **No relations.**

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Overlaps conceptually with CrossDomainShare / ShareRequest suites; no route found in this pass.

---

## themes

### What it is
Palette/style theme rows linked from Keeper/Journey/Path/Moment via `theme_id`.

### Schema
Uuid id, `label`, `slug` unique, `palette` Json, `style`, `source_image`, `default_mode`, tags Json, timestamps; relations to Journey/Keeper/Moment/Path.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Read endpoints mounted inline in `index.ts` (`GET /api/themes/...`); Domain Treatment/frame theme is a separate system from this `themes` table.

---

## kip_agent_logs

### What it is
Per-agent execution log: input/output/error/model/timing.

### Schema
FK to kip_agents, optional users.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

---

## kip_draft_versions

### What it is
Versioned snapshot of a draft’s spec_json/title/summary/status; optional `created_by_session_id` (no FK).

### Schema
Unique `[draft_id, version]`; FK to kip_drafts.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** (history under Draft APIs).

---

## ChronicleEvent

### What it is
Dialog-scoped History quick-review event (named session chapters + Document keeps — not a turn transcript): actor, eventType (`session | moment | structural`), short title/summary, optional anchor Json, parent/child self-relation, optional sessionId/messageId.

### Schema
Mapped table `chronicle_events`; FKs to Dialog, Domain, self parent.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**History timeline data**, not a Focus cover. Nested under dialog API (`kip-dialogs.ts` / chronicleEvents service).

### Known inconsistencies
- Comment distinguishes from `RealmFeedEvent`, but **no RealmFeedEvent model** exists in schema.
- `sessionId` / `messageId` lack Prisma FKs to kip_sessions / kip_messages.

---

## DialogCastMember

### What it is
Join enabling a kip_agent as cast on a Dialog, recording homeDomainId and enabledByUserId for server-side admin checks.

### Schema
Unique `[dialogId, agentId]`; FKs to Dialog, kip_agents, Domain (home), users (enabledBy).

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** (nested Dialog API).

---

## kip_messages

### What it is
Chat message row in a session: sender, content, role, metadata Json.

### Schema
FK → kip_sessions.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** (Dialog/conversation UI).

---

## users

### What it is
Auth/identity row: email/password tokens, name/avatar, settings Json, primaryDomainId (no FK), hub for most ownership relations.

### Schema
`id` String (not Uuid-enforced), many reverse relations.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Multiple user surfaces: inline profile routes, `/api/admin/users`, `/api/people`, KAM auth.

---

## SessionHandoffKey

### What it is
Domain-issued guest session handoff token for warm return / login promotion: session_id, expires, claimed_by/at.

### Schema
Mapped `kip_session_handoff_keys`; FKs Domain, kip_sessions, users?.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Router mounted at `/api/keys` alongside Key EntityKind routes — shared URL prefix.

---

## PlatformEmotif / DomainEmotif / UserEmotif / MomentEmotif

### What it is
Emotif symbol catalogs (platform / domain slots / user slots) and Moment attachments referencing emotif ids by type string.

### Schema
MomentEmotif stores `emotifId` + `emotifType` without polymorphic Prisma relation.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** (API: `api/emotifs/routes.ts` mounted).

### Known inconsistencies
- MomentEmotif.userId has no FK to users; emotifId is not a typed relation to the three emotif tables.

---

## kip_user_keys / kip_platform_keys

### What it is
Actual secret stores for user and platform provider API keys. Key EntityKind create/rotate writes these when `key_source` is user/platform.

### Schema
kip_user_keys: unique `[user_id, provider]`, **no FK to users**.  
kip_platform_keys: unique `provider`, api_key, label, is_active.

### EntityKind status
**Not an EntityKind** (backing stores).

### Current Chronicle presence
**None** (surfaced via Key EntityKind).

### Known inconsistencies
- Secrets + Key metadata dual-write; env source has no DB secret row.
- kip_user_keys.user_id is Uuid-typed in schema but users.id is plain String — type mismatch risk.

---

## kip_agent_permissions / kip_agent_keeper_types

### What it is
Per-agent user permission grants; M2M agent ↔ KeeperType.

### Schema
FKs to kip_agents (+ KeeperType for the latter). kip_agent_permissions.user_id **no users FK**.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

---

## kip_lenses

### What it is
Named systemPrompt (+ rules/output schema Json) optionally scoped by domainId (unique `[domainId, name]`). **No Domain FK relation.**

### Schema
As above.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** as own object; Agent config can PATCH lens fields via agent save path.

### Known inconsistencies
- Parallel deprecated `AgentLens` model still in schema.
- domainId optional without Prisma relation to Domain.

---

## keeper_type_engagement_templates

### What it is
M2M KeeperType ↔ engagement_templates.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

---

## SoleReflection / SoleMemoryCard / SoleVoiceEntry / SoleEcho / SoleLogbookEntry

### What it is
SOLE memory subsystem rows attached primarily to Keeper (and optionally Domain/Journey/Moment/template for reflection/card): reflections can promote to SoleMemoryCard; voice/echo/logbook are keeper+agent annotated entries.

### Schema
SoleMemoryCard → SoleReflection (required); optional FKs to Keeper/Domain/Journey/Moment/engagement_templates. Voice/Echo/Logbook require Keeper FK; agentId strings **without** kip_agents FK.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**SoleMemoryCard:** Bespoke **`SoleMemoryPresence`** when `objectType === "soleMemory"`.  
Others: **None** as Chronicle covers (API under `/api/keeper/...` SOLE routes).

### Known inconsistencies
- SoleMemoryCard vs legacy MemoryCard naming overlap.
- Dual SoleMemoryCard list paths: `/api/keeper/.../memory-cards` and `/api/domains/:domainId/kip/sole-memory-cards`.
- `SoleMemoryScope` + sharing suite is a separate domain-isolation model; SOLE cards do not FK to SoleMemoryScope.

---

## DomainPolicy / DomainAgentPolicy / AgentContract / AgentLens / GovernanceComplianceLog / DomainAudit

### What it is
Governance stack: DomainPolicy Json; AgentContract versioned contract text + DomainAgentPolicy binding; deprecated AgentLens tone profile; compliance log and domain audit rows.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- AgentLens explicitly `@deprecated` in schema toward kip_lenses + UserVoicePreferences, but still present with relations.
- GovernanceComplianceLog has no Prisma relations (domainId/agentId/sessionId are plain fields).

---

## DomainPermission / DomainInvitation / DomainUsage / DomainTransfer / SslCertificate

### What it is
Domain membership (role/permissions), email invitations, usage events, ownership transfer tokens, custom-domain SSL certificate rows.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- DomainPermission.role is a free String (default `"user"`) while `roles` / `user_roles` tables also exist — dual role systems.

---

## CrossDomainShare (+ Share* suite) / CrossDomainCollaboration / CollaborationActivity

### What it is
Large sharing/collaboration schema: CrossDomainShare content shares; ShareWorkflow/Step/Request/Activation/AccessLog/Notification/Template; CrossDomainCollaboration projects; CollaborationActivity log.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- Full suite router `api/sharing/cross-domain-routes.ts` **not mounted** in `index.ts` (audit). Partial create via Keeper `POST /:id/share` exists.
- DialogCastMember comments explicitly say CrossDomainShare is the wrong shape for cast enablement — two cross-domain mechanisms with different purposes in code comments.

---

## SoleMemoryScope / MemoryShare / MemoryMigration / MemoryAccess / MemoryAlert

### What it is
Domain memory isolation scope (size, categories Json, access lists) plus share/migrate/access/alert satellite tables.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- `api/memory/sole-memory-routes.ts` **not mounted** in `index.ts` (audit); tests may still expect `/api/memory/...`.
- Parallel to SoleMemoryCard subsystem without FK linkage.

---

## MediaContent / MediaFrameConfig / media_frame_instances

### What it is
Media URL content + media frame configs/instances (parallel to FrameConfig/FrameInstance).

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None.**

### Known inconsistencies
- No API routes found using these models in this pass; naming duplicates the Board frame system.

---

## BoardAlias

### What it is
Legacy board id alias within a domain scope (`domainId`, `boardId`, `alias` unique per domain). **No Prisma relations.**

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** (resolved inside board get flows).

---

## RequestLog

### What it is
Durable request diagnostic log: reqId, level, step, meta Json.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** (debug API read).

---

## DomainAccessKey

### What it is
Domain-scoped external tool access token (MCP/Cursor etc.): label, key_prefix, **key_hash** (hashed at rest), scopes, status, expiry, last_used, created_by.

### Schema
Mapped `domain_access_keys`; FK → Domain.

### EntityKind status
**Not an EntityKind** (no cover schema of its own).

### Current Chronicle presence
**Bespoke `ExternalAccessKeyPresence`**, reached when Chronicle `objectType === "key"` and id matches external-access key id helper — **reuses Key’s objectType**.

### Known inconsistencies
- Product “Key” Chronicle path serves two different Prisma models (Key vs DomainAccessKey).
- Distinct from Key / kip_user_keys / kip_platform_keys / UserApiCredential.

---

## AgentCapability

### What it is
Join table granting a Capability to a kip_agent with a `source` string. Schema: does not replace kip_agents array columns.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
**None** (managed via Capability/agent APIs).

### Known inconsistencies
- Dual capability representation (array vs join) — see Capability / Agent entries.

---

## PresenceSchema

### What it is
Per-domain, per-`objectType` field schema Json used to drive presence field lists (alongside platform defaults in `KeeperPresenceDefaults`).

### Schema
Unique `[domainId, objectType]`; FK → Domain.

### EntityKind status
**Not an EntityKind.**

### Current Chronicle presence
Feeds field resolution for KeeperPresence; not selectable as its own cover.

### Known inconsistencies
- Many entities also store a **row-level** `presenceSchema` Json column (Keeper, Journey, Path, Moment, Dialog, drafts, agents) **in addition to** this Domain PresenceSchema table — two layers named the same.

---

## Enums (not models)

### IntegrationType
`Services` | `Custom` | `AI_Model` — used by Integration.integration_type.

### LibraryItemSourceType
`upload` | `url` | `github` | `gdrive` | `draft` — used by LibraryItem.source_type.

---

# Part C — Cross-cutting open questions (code-backed)

1. **Two Chronicle architectures:** Library uses `CHRONICLE_ENTITY_REGISTRY` / `ChronicleEntityView`; other EntityKinds still hard-branch in `KeeperPresence` — open whether registry is the intended end-state for all kinds.
2. **Declaration columns** (`display_label`, `description`, `chronicle_blocks`, `chronicle_actions`) now exist on Journey, Path, Moment, Dialog, kip_drafts, kip_agents, and Domain (`description` already existed on Domain). Schema + migration `20260819010000_entitykind_declaration_columns`. Chronicle UI/PATCH wiring for the new columns is remaining work.
3. **Multiple “Key” stores:** `Key`, `kip_user_keys`, `kip_platform_keys`, `DomainAccessKey`, `UserApiCredential`, plus env — Chronicle `objectType: "key"` is overloaded.
4. **Multiple “Path” / “Forward” / “Document” vocabularies:** Journey Path rows vs Dialog `document_paths` vs DraftPoints; Journey.forward vs Dialog.forward_*.
5. **Multiple memory stacks:** MemoryCard/ThreadBlob vs Sole* vs SoleMemoryScope share suite — live paths favor Sole* + Library embeddings.
6. **Unmounted route files** coexist with mounted ones (journey domain-integrated, sharing suite, sole-memory-routes) — schema implies features that mounts do not expose.
7. **Stub agent Topic/Task/Activity APIs** do not touch their Prisma models.
8. **Treatment is not an object table** while Domain.theme, themes table, and frame_json.theme/treatment all exist.
9. **Board-emphasis invariant exceptions:** Draft, Moment, Library, and Domain-idle currently violate the governing board-emphasis invariant via the Document-tree / Presence-tree fork. Pending a separate Rendr/product decision — not patched as a side effect of board rename or Glossary nav.

---

# Part D — Maintenance checklist

- [ ] Brand/voice pass (optional polish — content is already governing v1)
- [ ] Confirm any model marked “no API usage” with a full-repo prisma client search (scripts/packages outside `apps/api` may still write)
- [ ] Re-audit EntityKind layers after any recipe migration of Journey/Path/Moment/Dialog/Draft/Agent/Domain/Integration Nav
- [ ] Resolve or document intentional dual mounts before deleting “Known inconsistencies”

---

*Governing Object Glossary v1. Prefer a flagged gap over a polished invention.*

## 📆 Update Log

### 2026-08-18 — Glossary agent read
- Agents read this file via `glossary.read` (same Chronicle presence as Nav Glossary). A draft titled Glossary with empty Points is not the glossary.

### 2026-08-18 — Nav · Dialog · Chronicle pathway locked
- Dialog entry records the locked three-panel sentence: Nav selects; Dialog is that conversation; Chronicle + `dialog.read` share the Document. Empty Points = unbuilt.

### 2026-08-17 — Board-emphasis invariant + Build board
- Added governing **board-emphasis invariant** and per-board lens table (Domain · Build · Design · Realm · Agent). Acceptance criterion for future board work.
- Flagged Draft / Moment / Library / Domain-idle as standing invariant exceptions (Document-tree / Presence-tree fork) — not patched here.
- Display rename: IDE Board → **Build Board**. Internal routing key remains `ide`; canonical URL write is `?board=build` with `ide` as a legacy alias.
