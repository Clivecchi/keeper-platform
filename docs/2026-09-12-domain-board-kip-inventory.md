# Domain Board and Kip — what already exists

Inventory only. Not a design. Code-backed 2026-09-12. Relational authority is not being designed here — the point is to keep that door open.

Converted from the session canvas. Gloss-only companion (shorter, Dialog voice) is on ke3p · Becoming Together.

| | |
|---|---|
| Default auth landing | Realm |
| Canonical Domain owner | `ownerId` |
| Domain-to-Domain shape | Peers |
| Local Store architecture | None |

---

## Track A · Domain Board

The live member surface is Universal Board. Auth landing is Realm (`?board=realm`), not Domain. Domain is a first-class tenant with its own owner and membership. Realm is a board mode, not a parent of Domains. ke3p is the platform slug — not the owner of other Domains.

### Keeper → Domains → routing

Prisma hierarchy is Domain → Keeper → Journey → Path → Moment. Domain is the tenant root. There is no Realm table and no `parentDomain` foreign key. Path has no `domainId` — it inherits scope through Journey and Keeper.

Member URL is `/d/:slug?board=*`. `V0Shell` loads the domain by slug, then mounts `UniversalBoard` when `?board=` matches a board def. Authenticated users with no board or frame land on Realm (`resolveDefaultWorkspaceBoardId` always returns `"realm"`). AGENTS.md still says Domain — the code won.

| Step | What happens | Where |
|---|---|---|
| Resolve slug | `/d/default` becomes ke3p; brand hosts use `/` | V0Shell + platformDomainSlug |
| Load domain | GET by-slug, then frame, then audience | loadDomainFrame + routes.ts |
| Pick board | Realm default; Domain / Agent on every slug | domainWorkspaceBoards.ts |
| Switch domain | Owned or DomainPermission union | GET /api/domains/my |
| Home | `/home` is always Realm board | HOME_SHELL_BOARD |

### What Domain Board actually is

`DomainBoard` is a thin wrapper: `UniversalBoard` plus `DOMAIN_BOARD_DEF`. Same three panels as every member board — Nav, Dialog, Chronicle. Idle Chronicle is the Domain cover (`DomainFocusPresence`). Configure opens Treatment, People, and Addresses.

**On Domain Board today**

- Directed Kip dialog with cast multi-select.
- Nav create Acts: Dialog, Draft, Keeper, Journey, Path, Moment.
- Config pane: Glossary, External Access, board links. People live in Chronicle Configure, not Nav.
- Invite collaborator → friend or connection.
- Library overlay from Nav. Glossary read in Chronicle.

**Not on Domain Board**

- Agents, Keys, Capabilities, Integrations (Build / Agent).
- RealmHomeChronicle (Realm only).
- Content-gated staged Nav (Realm only).
- Full DomainAdmin / policy (`?frame=admin`).
- Theme studio, studio wizard, Hub frame.

### Management that exists but is no longer the surface

| Capability | Status | Note |
|---|---|---|
| Members + roles | Live | DomainPeopleSection in Chronicle Configure |
| Invites | Live | API returns copyable accept path — no email send |
| Treatment / frame_json | Live | DomainConfigPresence |
| External access keys | Live | Per-domain, not platform master key |
| Custom domain + SSL | Partial | Addresses in Config; full SSL flow buried |
| Platform domain admin | Buried | /admin/domains — super-admin |
| Domain admin frame | Buried | ?frame=admin + DomainGovernanceCard |
| Ownership transfer | Schema only | DomainTransfer — no accept UI |
| Share workflows | Dead | cross-domain-routes.ts not mounted |
| Board data / management-board APIs | API only | No Domain Board UI |

### People, roles, ownership

There is no Membership or DomainMember model. Platform identity is KAM (`users` + `user_roles`). Domain membership is a separate table: `DomainPermission`. Login does not make you a member.

| Actor | How it is stored | What they can do |
|---|---|---|
| Owner | Domain.ownerId — not a permission row | All domain permissions |
| admin | DomainPermission.role | read write share admin invite delete |
| user | DomainPermission.role | read write share |
| friend | DomainPermission.role | read write |
| connection | DomainPermission.role | read |
| viewer (MVP leak) | No row — any authenticated user | read via middleware fallback |
| Guest | None | Public cover / Present; boards stripped |
| super-admin | platform user_roles | ke3p /admin — not Domain owner |

**Two authority systems must stay apart.** Platform roles (`user_roles`) and domain roles (`DomainPermission`) are already separate. Steward is a narrative word, not a schema field. Owner is a single user FK. Do not fold these together.

### Domain-to-Domain relationships

Domains are peers. No parent/child. The join tables already exist and are the right place to grow relational authority later.

| Table | Shape | Live use |
|---|---|---|
| CrossDomainShare | source ↔ target + content ref | Partial backend read |
| ShareRequest / Workflow / Activation | approval across domains | Unmounted — dead |
| CrossDomainCollaboration | host + memberDomainIds[] | No API mount |
| DomainTransfer | fromOwner → toOwner token | Schema only |
| DialogCastMember.homeDomainId | agent from another domain | Live on Dialogs |
| SoleMemoryScope.allowCrossDomain | memory boundary, default false | Live isolation flag |

### ke3p-specific vs universal

**Specific to ke3p / platform**

- Slug `ke3p`, legacy alias `default`.
- Build and Design boards only on platform slug.
- Cloud and Rendr merged into every domain roster.
- Realm / Build `boardCast: cloud, rendr`.
- Platform AI keys (`kip_platform_keys`).
- `/admin/domains` super-admin list.

**Genuinely universal**

- UniversalBoard + DOMAIN_BOARD_DEF on any slug.
- ownerId, permissions, invitations, frame_json.
- Brand host `/` (livecchi.us) as first-class Realm.
- Post-login never falls back to ke3p.
- Realm, Domain, Agent boards on every non-platform domain.

### Assumptions that imply Keeper authority over Domains

| Assumption in code today | Risk if left implicit |
|---|---|
| super-admin can repair / list all domains | Ops access reads as ownership |
| Cloud / Rendr / Kip injected into every roster | Platform cast is not optional |
| Any authenticated user gets domain read | Membership is optional in practice |
| GET /api/domains/ flat list is not caller-scoped | Global catalog of tenants |
| Default frame JSON merged for unseeded domains | ke3p template as implicit identity |
| Global kip_agents table, not per-domain agents | Agency lives above the Domain |

### Where Local Store would enter

There is no Local Store architecture. The phrase appears only as a Keeping Choice test fixture (“Develop Local Stores as a Story”). No IndexedDB, no per-domain client store, no local-first sync.

The live precedents a Local Store could sit beside — without being forced through Keeper as warehouse — are Domain isolation itself, `SoleMemoryScope` (server memory, default no cross-domain), Library as a domain-scoped index, and `Domain.frame_json` / `settings` as domain-local config. Client sessionStorage is cache only.

---

## Track B · How Kip becomes Kip

Cast runs get sharp delegation prompts and their own voice cards. The Lead turn then replaces the user’s message with a synthesis instruction: reply in 1–3 short sentences, do not repeat Cast, integrate. Kip is asked to report the room, not stay in the room.

### Layers

| Layer | What is stored | What the model actually sees |
|---|---|---|
| Base identity | kip_agents row slug=kip, role=Lead, purpose, tagline, personality | name + purpose + tagline. personality is UI / envelope only |
| Agency / role | role column: Lead / System / Coordinator / Standard | Lead branch is the live chat path. Persona has no branch |
| Agent Board config | voice_prompt, model, memory, dialog_participation, lens by domain | voice_prompt overrides lens. Domain Assignment has no save |
| Capabilities | policy pack + action allowlist | draft / SOLE / library / dialog / glossary / stage / delegate.consult. Seeded tools[] unused |
| Governance | Domain contract, policy pack, cast honesty | Injected as system blocks. Stops actions, not voice |
| Environment / casting | resolveAgentEnvironment + DialogCastMember | Compact JSON + roster. Cloud/Rendr always merged |
| Lead / Cast instructions | directorDialog.ts synthesis + delegation prompts | Cast gets a task. Lead gets a synthesis user message |
| Resolved Meaning | envelope sibling, Stage + Cast only | Not a general Dialog meaning layer |
| Runtime context | ~20 system blocks + 40 clipped history messages | Original user text is gone on cast turns |

### The live sequence

Seed / DB → resolve domain lead → assemble environment → optional Cast consults (Mechanism A parallel, or B single pin) → Lead `runAgent`. If Cast ran, `leadModelInput` is `buildCastConsultationsSynthesisPrompt` or `buildDirectorSynthesisPrompt`. Then `callAIModel` (~20 system blocks). Then actions. Then often a second model call: `buildReadActionFollowUpInput` — “Synthesize for the user…”

**Enters the model**

- Lens or voice_prompt
- Identity line (purpose + tagline)
- Compact environment JSON
- Cast honesty + Dialog Document
- Domain contract + action policy
- SOLE cards when memory is on

**Stored but ignored**

- config.personality
- kip_agents.tools / permissions
- Agent classes registry UI
- Persona role
- Cockpit composedSystemPrompt
- generateLeadAgentResponse (dead)

**Replaces the user**

- Mechanism A multi-cast synthesis
- Mechanism B director synthesis
- Read / delegate follow-up
- Domain Lens “summarizing platform state”
- Foreign-lead: Kip as platform support

### The collapse — three stacked instructions

| Mechanism | Instruction the Lead receives | What it produces |
|---|---|---|
| A · multi-cast (Domain / Realm) | Reply as Lead. 1–3 short sentences. Not a committee report. Do not repeat Cast. | Brief integrator prose after successful coordination |
| B · single pin | Integrate the cast member. Stay brief when they already answered. | Same collapse, one voice |
| C · read follow-up | Synthesize for the user using ONLY the real results. UI: Synthesizing what I found… | Second generic report pass |

Identity is still in the system stack — it is just outranked. The user message is the synthesis brief. Domain Lens also trains operational cards and “summarizing platform state.” Seeded personality — “Experience Director. I think alongside the people building this.” — never reaches that call.

This is not Coordinator-role switching and not a lost experienceContext. Universal Board keeps Lead Kip. The context is present as compact JSON. The collapse is an instruction, not a missing identity.

---

## Doors left open

Today’s work can leave relational authority open. Do not add a parent Domain. Do not make ke3p the owner of other Domains. Do not merge platform roles into domain roles. Do not delete the dormant cross-domain tables. Do not treat Kip as the Domain lead by default when a Domain already has one.

### Do not close these

| Door | Why it must stay |
|---|---|
| Domain.ownerId + DomainTransfer | Peer ownership, negotiated change — not platform reassignment |
| DomainPermission ≠ user_roles | Tenant authority vs platform ops |
| users.primaryDomainId | Home preference, not Keeper assignment |
| No parentDomain FK | Federation must be additive among peers |
| CrossDomainShare / ShareRequest / Collaboration | Dormant but schema-complete — destroying them is a migration |
| DialogCastMember.homeDomainId | Cross-domain agency without a hierarchy |
| DomainAccessKey / McpOAuthGrant | Domain-issued capability, not a platform master key |
| SoleMemoryScope.allowCrossDomain = false | Memory boundary per Domain |
| Brand-host / routing | A Domain can be a first-class Realm, not a ke3p subdirectory |
| DOMAIN_BOARD_DEF as a board spec | Grow Domain management as Chronicle Acts, not a new admin app |

### Tighten later — do not encode as truth

- The MVP “any authenticated user gets read” is the most important leak. It hides missing membership UX and makes Keeper look like it already owns every Domain.
- Injecting Cloud and Rendr into every roster is a platform convenience. A Domain should be able to refuse or recast them.
- Kip as default director on Domain and Realm boards is a board def, not Domain ownership of Agency. Domain lead resolution (`primaryAgentId`) already exists — use it; do not hardcode Kip as global Lead over Domains.

### Next logical work (not this session)

Track A: decide whether Universal Domain Board is Domain Board, Realm Board, or a treatment of both — without inventing a Domain tree.

Track B: after Cast success, keep Lead voice in `response` and put the brief in a structured field, or restate personality / “extend the conversation, don’t report on it” in the synthesis prompt. Trace one live turn’s `orchestration.mechanism` before changing prompts.
