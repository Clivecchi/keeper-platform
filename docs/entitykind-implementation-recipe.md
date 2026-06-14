# Keeper Platform — EntityKind Implementation Recipe

### The Repeatable Specification for Adding Any EntityKind

*Governing Document — Same Weight as the Universal Board Constitution*

Reference Implementation: Key EntityKind (Post-Phase 6, June 2026)

KE3P · Keeper Platform · June 2026
Written by Claude · Chuck directing

---

## Table of Contents

1. [Purpose](#1-purpose)
2. [The Universal Shape](#2-the-universal-shape)
3. [Worked Reference — The Key EntityKind](#3-worked-reference--the-key-entitykind)
4. [The Recipe Checklist](#4-the-recipe-checklist)
5. [Cloud Handoff Map](#5-cloud-handoff-map)
6. [Known Divergences — What to Watch For](#6-known-divergences--what-to-watch-for)
7. [Next Application — Capability as EntityKind](#7-next-application--capability-as-entitykind)

---

## 1. Purpose

This document is the governing specification for adding any EntityKind to the Keeper platform. It exists because the platform reached a point where three EntityKinds — agent, key, and integration — had each grown a cover layer through the universal pattern, but diverged below the cover: different Chronicle rendering paths, different save plumbing, different Nav label sources. Phases 1–6 of the June 2026 unification work closed those gaps. Key is now the cleanest, fully-wired instance of the pattern end to end — cover, Chronicle body, Config save, and Nav all consistent and confirmed in browser.

This Recipe documents that pattern as it now actually exists, using Key as the worked reference. Every future EntityKind — starting with Capability, then Journey, Path, Moment, Keeper, and Draft, then Library — is built against this Recipe. No EntityKind ships with stubs or partial wiring. If it ships, it ships connected to real data, following this pattern exactly.

### 1.1 Governing Principles

| Principle | What It Means Here |
|---|---|
| **Record → Cover Schema → Chronicle** | Every EntityKind follows this flow completely at time of creation. The database model, the Layer 2 cover schema, and the Chronicle render path are built together — not staged across sessions. |
| **No stubs, no rewiring later** | If a step in this Recipe is skipped — a block left unwired, a Nav label left on a different formatter — it becomes exactly the kind of drift that took six phases to correct for Key and Integration. Each layer is connected to real data before moving to the next. |
| **The shape does not change** | Agent, Key, and Integration prove the shape is universal: five cover slots, declaration blocks below the cover, Config mode through `useChronicleConfig`, one PATCH endpoint, Nav reading the same label as Chronicle. A new EntityKind does not invent a new shape — it fills the existing one. |
| **Diagnostic before decision** | Before building a new EntityKind, confirm what already exists — database columns, any partial UI, any existing routes. Read before writing. |
| **Platform more, code less** | Declaration defaults (`chronicle_blocks`, `chronicle_actions`, `display_label`, `description`) live in shared data — `packages/shared` — not duplicated per-file. New EntityKinds extend the shared declarations module rather than hardcoding block lists. |
| **Close threads before opening new ones** | Each layer of the Recipe is confirmed in browser before the next begins. A cover schema with no Chronicle blocks wired is an open thread — exactly the state Key was in before Phase 6. |

### 1.2 What This Recipe Is Not

This Recipe does not cover Treatment, theming, or motion — those are governed by the Universal Board Constitution and the Motion Architecture document. It does not cover Board-level concerns (Nav · Dialog · Chronicle panel structure) — a Board hosts EntityKinds; this Recipe is about the EntityKind itself. And it does not cover agent-specific extensions like Training Mode, which are additive layers on top of the base pattern documented here, not part of the base pattern itself.

---

## 2. The Universal Shape

Every EntityKind that has presence in Chronicle — agent, key, and integration today — is built from the same seven pieces. This is the checklist. The sections that follow walk through each piece using Key as the worked example.

| # | Layer | What It Is |
|---|---|---|
| 1 | **Cover schema (Layer 2)** | `schemas/{kind}CoverSchema.ts` — implements `EntityCoverSchema<TRecord>`, mapping the record's fields onto the five universal cover slots. |
| 2 | **Focus orchestrator** | `{Kind}FocusPresence.tsx` — owns Cover ↔ Config mode switching, loads the feed, renders `EntityCoverPresence` + declaration blocks. |
| 3 | **Chronicle blocks** | A variant branch in `DeclarationChronicleBlocks`, plus shared block defaults in `@keeper/shared` (`packages/shared/src/integrationChronicleDeclarations.ts`). |
| 4 | **Config presence** | `{Kind}ConfigPresence.tsx` — wraps `useChronicleConfig({ entityKind })` inside `ChronicleConfigShell` for the Save bar and editable fields. |
| 5 | **PATCH route** | One endpoint, wired into `chroniclePatch.resolveChroniclePatchEndpoint` — the single save path for metadata fields. |
| 6 | **Nav utils** | Fetch, collapse/group logic, and a label helper shared with the cover — plus an optimistic `bump*Nav` function called after save. |
| 7 | **DB declaration columns** | `display_label`, `description`, `chronicle_blocks`, `chronicle_actions` on the Prisma model, with shared defaults applied on create. |

### 2.1 The Five Cover Slots (Layer 1)

`EntityCoverPresence.tsx` defines five fixed slots, rendered in this order, for every EntityKind without exception. A Layer 2 cover schema's only job is to resolve a record into these five slots.

| Slot | Contains |
|---|---|
| **hero** | Avatar (single letter or icon), glow state (active / inactive / error), accent color, chrome title, status label, role label. |
| **identity** | Name (the Chronicle title), a role/subtitle line, and an optional voice quote — typically the record's description. |
| **traits** | A horizontal strip of 3–4 short fact chips — status, last-verified date, source, expiry, etc. |
| **credits** | Up to ~8 chips — capabilities, scopes, or tags associated with the record. |
| **actions** | Two buttons — a primary action (e.g. Verify, Open Session) and a secondary action (e.g. Manage / Configure, which switches to Config mode). |

### 2.2 Cover ↔ Config ↔ (Training) Modes

Every EntityKind's Focus orchestrator supports at minimum two modes: Cover (the default presence view, read-mostly) and Config (editable metadata, entered via the secondary cover action). Agent additionally has a third mode, Training, which is an agent-specific extension documented separately — new EntityKinds do not need a third mode unless their product requirements call for one.

---

## 3. Worked Reference — The Key EntityKind

Key is the cleanest fully-wired instance of the pattern as of Phase 6 (June 2026). Every layer below is shown as it actually exists in the codebase — file paths, field mappings, and data flow — so it can be used directly as a template.

### 3.1 Architecture at a Glance

```
UniversalNavPanel (IDE board)
  │  fetchAllDomainKeyRows(domainId)
  │  collapseKeyNavRows → one row per AI provider
  │  label: keyChronicleTitle(key)
  │
  ▼  onKeySelect
KeyFocusPresence (Cover Mode)
  │  useKeyFeedData → GET /api/keys/:id
  │  EntityCoverPresence + keyCoverSchema.resolve()
  │  DeclarationChronicleBlocks variant="key"
  │
  ▼  Manage action
KeyConfigPresence (Config Mode)
  │  useChronicleConfig entityKind="key"
  │  chroniclePatch → PATCH /api/keys/:id
  │  verify / rotate / revoke — not Save bar
  │
  ▼  onSaved + bumpKeyNav
  ▼  onLabelResolved → TrailBar
```

### 3.2 Entry Points by Layer

| Layer | File | Role |
|---|---|---|
| Nav | `apps/web/src/v0/boards/UniversalNavPanel.tsx` | Fetch, collapse, label Keys |
| Chronicle orchestration | `apps/web/src/v0/presence/cover/KeyFocusPresence.tsx` | Cover ↔ Config modes |
| Cover schema (Layer 2) | `apps/web/src/v0/presence/cover/schemas/keyCoverSchema.ts` | Slot fill for `EntityCoverPresence` |
| Cover renderer (Layer 1) | `apps/web/src/v0/presence/cover/EntityCoverPresence.tsx` | Five fixed slots — shared by all kinds |
| Chronicle body | `apps/web/src/v0/presence/integrationChronicle/declarationChronicle.tsx` | Block dispatch for Key |
| Config | `apps/web/src/v0/presence/integrationChronicle/KeyConfigPresence.tsx` | Metadata + credential ops |
| Shared defaults | `packages/shared/src/integrationChronicleDeclarations.ts` | Block/action defaults |
| API | `apps/api/src/routes/key-entity-routes.ts` | CRUD + verify/rotate/revoke |
| DB | `packages/database/prisma/schema.prisma` → `model Key` | Persistence |

### 3.3 Cover Schema (Layer 2)

`keyCoverSchema.resolve()` takes a `KeyRecord` and maps its fields onto the five universal slots. The input shape is:

```
{
  id, provider, key_source, status, scope,
  last_verified, expires_at,
  display_label, description,
  chronicle_actions?, integration_capabilities?
}
```

| Slot | Resolved Content | Source Fields / Logic |
|---|---|---|
| `hero.avatar` | Single letter | `providerIconLetter(provider)` — e.g. "A" for Anthropic, "T" for together-ai |
| `hero.avatarGlow` | active / inactive / error | valid → active; invalid/revoked → error; else inactive |
| `hero.accentColor` | Fixed theme token | `hsl(var(--theme-accent-primary))` |
| `hero.chromeTitle` | Provider label | `providerDisplayLabel(provider, display_label)` — custom label or `PROVIDER_LABELS` map |
| `hero.statusLabel` | Uppercase status | `mapDisplayStatus(status)` → VALID / INVALID / MISSING |
| `hero.roleLabel` | Source | `key_source.toUpperCase()` (ENV / USER / PLATFORM) |
| `identity.name` | Chronicle title | `keyChronicleTitle(record)` — `display_label.trim()` or `` `${provider} Key` `` |
| `identity.roleLine` | Provider name | `providerDisplayLabel(provider)` — no custom label fallback path |
| `identity.voiceQuote` | Description | `description ?? undefined` |
| `traits` | 3–4 items | Status, Last verified, Source, optional Expires |
| `credits` | Up to 8 chips | `scope` (or provider label if no scope) + `integration_capabilities[]` from feed |
| `actions` | 2 buttons | Verify Key (primary → `feed.verify()`); Manage / Add Key (secondary → Config mode) |

> **Note:** cover actions are hardcoded in `resolveActions()` — they do not read `chronicle_actions` from the database. `chronicle_actions` currently gates only the Revoke button in Chronicle blocks (see 3.4).

#### Action Handlers (wired in KeyFocusPresence)

```
{
  onConfigure: () => setCoverMode("config"),
  onOpenSession: () => feed.verify(),  // "Verify Key" button
}
```

### 3.4 Chronicle Body — DeclarationChronicleBlocks

#### Block Resolution

In Cover mode, after `EntityCoverPresence` renders, blocks are resolved:

```
const chronicleBlocks = resolveKeyChronicleBlocks(
  feed?.key.provider ?? keyRecord.provider,
  feed?.key.chronicle_blocks,
)
```

`resolveKeyChronicleBlocks` (`resolveChronicleDeclaration.ts`) follows this priority:

1. If `chronicle_blocks.length > 0` on the DB row → use as-is
2. Else → `resolveKeyChronicleDefaults(provider).chronicle_blocks`
3. Else → `DEFAULT_KEY_CHRONICLE_BLOCKS`

Default block order for all Key providers:

```
['connection_status', 'key_health', 'linked_agents']
```

> Blocks render only when the feed is loaded and `chronicleBlocks.length > 0` — the defaults always satisfy this, so a Key Chronicle never renders cover-only.

#### Key Variant Dispatch

`DeclarationChronicleBlocks` with `variant="key"` routes to `KeyDeclarationChronicleBlockList`:

| Block Slug | Component | Key-Specific Data Mapping |
|---|---|---|
| `connection_status` | `ConnectionStatusBlock` | `connectedAt: key.last_verified`; `credentialSource`: ENV/USER/PLATFORM from `key_source`; `health`: valid→connected, invalid/revoked→error, else disconnected |
| `key_health` | `KeyHealthBlock` | Source/status from entity; `onKeyUpdate` → `keyFeed.saveCredential()`; `readOnly={keyStatus === "valid"}` on cover (badges only when valid); no `allowValidRotate` on cover |
| `linked_agents` | `LinkedAgentsBlock` | Agents from `KipApi.getAllAgents()` filtered by `model_provider === key.provider` |

> Unknown block slugs return `null` and are silently skipped — forward-compatible with new block types.

#### Feed Data — useKeyFeedData

`apps/web/src/v0/presence/integrationChronicle/feeds/KeyFeed.tsx` provides:

- `GET /api/keys/:id` — full Key row
- Agents — `KipApi.getAllAgents()` filtered by provider
- Capabilities — derived from `/api/integrations` metadata (model count, provider-specific caps)
- Inline ops (not Save bar): `POST /api/keys/:id/verify`, `POST /api/keys/:id/rotate`, `POST /api/keys`, `DELETE /api/keys/:id`

### 3.5 Config Mode — useChronicleConfig

#### Wiring

`KeyConfigPresence.tsx` owns Config mode, entered from the cover's Manage / Add Key action:

```
useChronicleConfig({
  entityKind: "key",
  entityId: keyId,
  domainId,
  buildPayload: () => { /* diff display_label + description */ },
  validate: () => fieldValues.display_label.trim() ? null : "Display label is required.",
  onSaved: (field, value) => { /* nav sync */ },
  onRefresh,
})
```

> Wrapped in `ChronicleConfigShell`, which provides the compressed header and Save bar.

#### Editable Fields (Save Bar)

| Field | UI | Validation | PATCH Key |
|---|---|---|---|
| `display_label` | text input | Required, non-empty trim | `display_label` |
| `description` | textarea | Optional | `description` |

> `buildPayload()` sends only changed fields (baseline diff). An empty diff skips the save silently.

#### Not on the Save Bar — Inline / Immediate API Calls

| Operation | UI | API |
|---|---|---|
| Verify | "Verify key" button | `POST /api/keys/:id/verify` |
| Rotate / add credential | `KeyHealthBlock` with `allowValidRotate` | `POST /api/keys/:id/rotate` or `POST /api/keys` |
| Revoke | Shown if `chronicle_actions` includes "revoke" | `DELETE /api/keys/:id` (soft revoke) |
| Key source / linked integration | Read-only info panels | — |
| Linked agents | `LinkedAgentsBlock` (read-only in config) | — |

#### Save Path

```
KeyConfigPresence.handleSave()
  → useChronicleConfig.handleSave()
    → handleChronicleSave("key", keyId, payload, { domainId })
      → resolveChroniclePatchEndpoint("key", id) → /api/keys/:id
      → apiFetch PATCH (JSON body)
```

> `patchKeySchema` accepts: `status`, `scope`, `expires_at`, `display_label`, `description` — but Chronicle Config only PATCHes `display_label` and `description`. The other fields are reserved for inline operations.

#### Post-Save Sync

On successful save, `onSaved` performs three things:

1. Updates the local baseline ref
2. Calls `onLabelResolved(value)` when `display_label` changed → updates the Chronicle trail bar
3. Calls `board.actions.bumpKeyNav({ keyId, display_label?, description? })` → optimistic Nav patch + refetch trigger

### 3.6 Nav — Fetch, Label, Sync

#### Where Rows Are Fetched

File: `UniversalNavPanel.tsx`. Condition: IDE board only — `def.boardId === "ide"` and the AI integrations group is present.

```
fetchAllDomainKeyRows(domainId)  // keyNavUtils.ts
```

Flow:

1. For each of `IDE_AI_PROVIDERS` (anthropic, openai, together-ai, elevenlabs): `GET /api/keys?domainId=…&provider=…&sync=1` (materializes rows if missing)
2. Then `GET /api/keys?domainId=…` — all non-revoked rows
3. `collapseKeyNavRows(rows, selectedKeyId)` — one Nav row per provider. Prefers `selectedKeyId` if it matches that provider; else prefers source rank: env → user → platform

> Refetch trigger: `keyListVersion` (= `selection.keyNavRevision` from `bumpKeyNav`).

#### Nav Label Derivation

```
label: keyChronicleTitle(key)
// display_label.trim() || `${provider} Key`
```

Nav description (status hint): `keyStatusNavHint(status)` → valid | warning | error.

> **Deprecated but present:** `keyNavLabel()` strips a trailing " Key" for provider-only labels. Nav uses `keyChronicleTitle`, not `keyNavLabel` — this was the source of the Nav/Chronicle label mismatch fixed in Phase 6. New EntityKinds should use a single label helper shared between Nav and cover from the start.

#### Chronicle Trail Bar Label Sync

Three paths keep Nav and Chronicle aligned on `display_label`:

| Path | When | Mechanism |
|---|---|---|
| Initial load | Key selected | `KeeperPresence` → `enrichPresenceRecord` → `primaryField("key") = "display_label"` → `onLabelResolved` if non-empty |
| Feed load | Cover mode | `KeyFocusPresence` effect: `feed.key.display_label` → `onLabelResolved` |
| Config save | After PATCH | `KeyConfigPresence.onSaved` → `onLabelResolved` + `bumpKeyNav` |

The trail bar updates via `UniversalViewPanel.handleLabelResolved` → `labelCache` + `panelHistory` entry patch. Nav's optimistic patch (`KeyNavRowPatch`) applies `display_label` to the matching `keyId` before the refetch completes. `description` is included in the patch type, but the Nav UI only displays `display_label` today.

### 3.7 Database — the Key Model

File: `packages/database/prisma/schema.prisma`

```
model Key {
  id                String    @id @default(cuid())
  provider          String
  key_source        String    // env | user | platform
  status            String    @default("unknown")  // valid | invalid | expired | revoked | unknown
  scope             String?
  last_verified     DateTime?
  expires_at        DateTime?
  domain_id         String
  user_id           String?
  integration_id    String?
  chronicle_blocks  String[]  @default([])
  chronicle_actions String[]  @default([])
  display_label     String?
  description       String?
  created_at        DateTime  @default(now())
  updated_at        DateTime  @updatedAt
  @@unique([domain_id, provider, key_source, user_id])
}
```

#### Field → Surface Mapping

| DB Field | Cover | Chronicle Blocks | Config Save | Nav | Notes |
|---|---|---|---|---|---|
| `display_label` | identity.name, hero.chromeTitle | — | editable | label | Primary identity field |
| `description` | identity.voiceQuote | — | editable | — | |
| `chronicle_blocks` | — | Block order/content | — | — | DB first, then shared defaults |
| `chronicle_actions` | — | — | — | — | Gates Revoke button only. Default: `['verify','rotate','revoke']`; cover actions ignore this |
| `provider` | hero avatar, traits, credits fallback | Block defaults lookup | read-only panels | collapse key | One Nav row per provider |
| `key_source` | hero.roleLabel, traits, credits | connection_status, key_health | read-only panel | pick priority | |
| `status` | hero glow, statusLabel, traits, actions label | all three blocks | header status | Nav description hint | Updated by verify/rotate/revoke |
| `scope` | credits chips | — | — | — | Shown as first credit chip |
| `last_verified` | traits "Last verified" | connection_status | KeyHealthBlock | — | |
| `expires_at` | optional trait "Expires" | — | — | — | |
| `integration_id` | — (capabilities via feed) | — | linked integration panel | — | Links to platform Integration row |
| `domain_id` | — | feed scope | PATCH context | fetch scope | |
| `user_id` | — | credential resolution | — | unique constraint | |

#### Shared Defaults (Create / Sync / Backfill)

From `@keeper/shared` → `resolveKeyChronicleDefaults(provider)`:

```
chronicle_blocks: ['connection_status', 'key_health', 'linked_agents']
chronicle_actions: ['verify', 'rotate', 'revoke']
display_label: `${IntegrationDeclaration.display_label} Key`  // e.g. "Anthropic Key"
description: IntegrationDeclaration.description
```

Applied on: Key create, `syncProviderKeyPresence`, and `provider-keys.seed.ts`.

#### Routing & Selection Priority

Chronicle subject resolution (`UniversalViewPanel.resolveKindId`):

```
selectedKeyId → kind: "key"  (priority above service, dialog, agent, etc.)
```

`KeeperPresence` short-circuits the generic presence schema for Key focus:

```
skipPresenceSchemaFetch = true when objectType === "key" && layout === "focus"
// Renders KeyFocusPresence directly (not the generic field editor)
```

---

## 4. The Recipe Checklist

Use this checklist for every new EntityKind. Each item references the Key pattern in Section 3 as the template. Items are ordered — do not batch steps. Each one confirms in browser before the next begins.

| # | Step | Template (Key Pattern) |
|---|---|---|
| 1 | **Database model** | Prisma model with `display_label`, `description`, `chronicle_blocks String[]`, `chronicle_actions String[]`, plus EntityKind-specific fields. See 3.7. |
| 2 | **Shared declaration defaults** | `resolve{Kind}ChronicleDefaults()` in `packages/shared/src/integrationChronicleDeclarations.ts` — default block list, default actions, default `display_label`/`description` pattern. See 3.7, "Shared Defaults". |
| 3 | **Apply defaults on create** | Wire the shared defaults into the create/sync path for the new model — every new record gets non-empty `chronicle_blocks` from the start. (Phase 1 of the June 2026 unification did this for Key and Integration after discovering new rows had empty arrays.) |
| 4 | **Cover schema (Layer 2)** | `schemas/{kind}CoverSchema.ts` implementing `EntityCoverSchema<TRecord>` — resolve the five universal slots (hero, identity, traits, credits, actions) per the table in 3.3. |
| 5 | **Focus orchestrator** | `{Kind}FocusPresence.tsx` — Cover ↔ Config mode state, feed hook (`use{Kind}FeedData`), renders `EntityCoverPresence` + `DeclarationChronicleBlocks`. See 3.2, 3.4. |
| 6 | **Chronicle block variant** | Add a variant branch to `DeclarationChronicleBlocks` (e.g. `variant="{kind}"`) with a block dispatch list. Start from `DEFAULT_{KIND}_CHRONICLE_BLOCKS` — reuse existing block components (`connection_status`, `key_health`, `linked_agents`, etc.) where they fit; add new block types only when none of the existing ones apply. |
| 7 | **Config presence** | `{Kind}ConfigPresence.tsx` wrapped in `ChronicleConfigShell`, using `useChronicleConfig({ entityKind: "{kind}", entityId, domainId, buildPayload, validate, onSaved, onRefresh })`. Editable fields at minimum: `display_label` (required), `description` (optional). See 3.5. |
| 8 | **PATCH route** | Add a PATCH endpoint for the entity (`PATCH /api/{kind}s/:id`) accepting at minimum `display_label` and `description`. Wire it into `chroniclePatch.resolveChroniclePatchEndpoint` for entityKind `"{kind}"`. |
| 9 | **Nav wiring** | Fetch + label logic in `UniversalNavPanel.tsx` (or the relevant Nav utils file). Use a single label helper — e.g. `{kind}ChronicleTitle(record)` — shared between Nav and the cover schema's `identity.name`. Do not introduce a second label formatter (see 3.6, deprecated `keyNavLabel` note). |
| 10 | **Post-save sync** | `onSaved` calls `onLabelResolved(value)` when `display_label` changes (updates Chronicle trail bar) and `bump{Kind}Nav(...)` for an optimistic Nav patch + refetch trigger. See 3.5, "Post-Save Sync". |
| 11 | **Routing / selection priority** | Add the new kind to `UniversalViewPanel.resolveKindId` with appropriate priority, and to `KeeperPresence`'s `skipPresenceSchemaFetch` condition if the kind should render its Focus orchestrator directly rather than the generic field editor. |
| 12 | **Browser verification** | Confirm: Cover renders all five slots with real data · Chronicle blocks render below cover · Config mode Save bar persists `display_label` and `description` (check via reload, not just in-session) · Nav label matches Chronicle title, both immediately after save and after reload. |

**Definition of done for any EntityKind:** every row in the table above is checked, and step 12's four confirmations all pass after a full page reload — not just in-session.

---

## 5. Cloud Handoff Map

Cloud has Railway, Vercel, and GitHub MCP tools — it can read deployments, trigger redeploys, write files, and create PRs. Once Cloud is trained on this Recipe, some steps become mechanical execution Cloud can perform once a schema is defined, while others require codebase reasoning that stays Cursor's territory.

| # | Step | Territory | Why |
|---|---|---|---|
| 1 | Database model | Cursor | Schema design requires understanding relationships to existing models and the EntityKind hierarchy. |
| 2 | Shared declaration defaults | Cursor | Requires judgment about what blocks/actions are appropriate defaults for a new kind — a design decision, not mechanical. |
| 3 | Apply defaults on create | Cloud (after #2 defined) | Once the shared defaults function exists, wiring it into a create path is mechanical — import and call. |
| 4 | Cover schema (Layer 2) | Cursor | Mapping a new record shape onto five slots requires codebase reasoning — this is the core design step for the new EntityKind. |
| 5 | Focus orchestrator | Cursor | New component, follows an established pattern but requires reasoning about the feed hook and mode-switching for this kind. |
| 6 | Chronicle block variant | Cursor (first pass), Cloud (reusing existing blocks) | Adding a new variant branch requires reasoning; if all blocks already exist (`connection_status`, etc.), wiring the dispatch list is closer to mechanical. |
| 7 | Config presence | Cursor | New component following the `{Kind}ConfigPresence` pattern — requires reasoning about which fields are editable for this kind. |
| 8 | PATCH route | Cloud (once schema + fields are defined) | Once the model and editable fields are confirmed, a PATCH route following the existing `{kind}-entity-routes.ts` pattern is largely mechanical — Cloud can write it and open a PR via GitHub MCP. |
| 9 | Nav wiring | Cursor | Requires reasoning about how the new kind fits into existing Nav grouping/collapse logic. |
| 10 | Post-save sync | Cloud (once #5, #7 exist) | Wiring `onSaved` → `onLabelResolved` + `bump{Kind}Nav` follows the Key pattern almost verbatim — mechanical once the surrounding components exist. |
| 11 | Routing / selection priority | Cursor | Requires understanding the full priority list in `resolveKindId` and where the new kind fits. |
| 12 | Browser verification | Cloud or Cursor | Cloud can run deploys and report on Railway/Vercel logs; visual confirmation of Cover/Chronicle rendering is best done by whoever can view the browser (Chuck, or Cursor via browser tools). |

In practice: Cursor leads steps 1, 2, 4, 5, 7, 9, 11 — the design and reasoning-heavy steps. Once those land and are confirmed, Cloud can execute steps 3, 8, and 10 mechanically, following the established pattern files almost line-for-line. This is the "end the copy-paste relay" unlock described in the Forward Steps document — Cloud writing its own focused PRs for the mechanical steps once the pattern is proven.

---

## 6. Known Divergences — What to Watch For

These are documented not because they are part of the Recipe, but because they are exactly the kinds of drift the Recipe exists to prevent. If a new EntityKind starts to look like any of these, stop and reconsider before proceeding.

| Pattern to Avoid | What Happened When It Occurred |
|---|---|
| **Two label formatters for the same field** | `keyNavLabel()` (strips " Key" suffix) vs. `keyChronicleTitle()` (`display_label || \`${provider} Key\``) existed simultaneously. Nav used one, Chronicle used the other. Result: Nav showed "ElevenLabs" while Chronicle showed "11-Labs Key 123" for the same record. Fixed in Phase 6 by aligning both to `keyChronicleTitle`. |
| **A fork in Chronicle body rendering** | `IntegrationFocusPresence` had `useDeclaration = chronicle_blocks.length > 0`, branching between `DeclarationChronicleBlocks` and a legacy `FeedComponent`. New rows created via `upsertIntegration` had empty `chronicle_blocks`, so they silently fell into the legacy path. Fixed in Phase 4 by always rendering declaration blocks with client-side fallback defaults. |
| **A declared field with no UI to edit it** | `KeyFocusPresence` hand-rolled a linked-agents list but never called `DeclarationChronicleBlocks`, even though the Key model already had `chronicle_blocks` / `chronicle_actions` populated. The data existed; nothing rendered it. Fixed in Phase 6 alongside the Integration fork. |
| **chroniclePatch.ts with no case for the entity kind** | `ChronicleEntityKind` included "key" and "service", but `resolveChroniclePatchEndpoint`'s switch had no cases for them — falling through to "No save path for this entity kind." Save bars existed in the UI with nowhere to send data. Fixed in Phase 3. |
| **Remounting a component on a param change it should just re-read** | `V0Shell` keyed `UniversalBoard` on `boardId:definition`, causing `UniversalNavPanel` to fully remount on every Board Definition click — and lose its `useSearchParams` subscription after the first remount. URL updated correctly; the component simply stopped listening. A days-long debugging detour before the actual cause (subscription loss on remount, not a stale-closure or routing issue) was found. |
| **Test/diagnostic writes left in production data** | Browser-verification steps during Phase 3 wrote "Anthropic Ops Test" / "Anthropic Key Ops Test" into `display_label` on live records. These persisted (correctly — proving the save path worked) but sat in the platform as visible test data until manually reverted after Phase 6 closed. |

The common thread: each of these was a place where two surfaces (Nav vs. Chronicle, declared data vs. rendered UI, a save bar vs. a save endpoint) were supposed to agree but didn't, because they were built or wired at different times. The Recipe's ordering — model → defaults → cover → blocks → config → PATCH → Nav → sync — exists specifically so that every surface for a new EntityKind is wired against the same data, in the same session, before moving on.

---

## 7. Next Application — Capability as EntityKind

Per the Forward Steps sequence, Capability as EntityKind is the next build, and the first EntityKind built fully against this Recipe. Today, capability exists only as string arrays on `kip_agents` (`capabilities`, `tools`, `permissions`) plus a runtime resolution endpoint (`GET /api/capabilities/resolve`) — there is no Capability model, no cover schema, no Chronicle presence, and no "capability" entry in `ChronicleEntityKind`.

Before writing Cursor prompts for Capability, run the Recipe's checklist (Section 4) as a planning pass: for each of the 12 steps, identify what the Capability EntityKind's database fields, default declaration blocks, cover slot mappings, and Nav grouping should be. This planning pass becomes the spec that the actual Cursor prompts are written against — consistent with "the spec is the authority" and "architectural decisions must be locked before Cursor prompts are written."

---

*KE3P · Keeper Platform · EntityKind Implementation Recipe · June 2026*
*Written by Claude · Chuck directing · Reference implementation: Key EntityKind, Phases 1–6 complete*
