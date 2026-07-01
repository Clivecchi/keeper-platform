# integrationChronicle

## 📌 Purpose
Integration and Key Chronicle feeds, declaration-driven block rendering, and config/manage surfaces. Connected integrations and Key entities render chronicle blocks from `chronicle_blocks` declarations via `DeclarationChronicleBlocks`.

## 🧱 Key Files
- `declarationChronicle.tsx` — `DeclarationChronicleBlocks`, `resolveDeclarationActions`, integration + key block dispatch
- `serviceConfig.tsx` — per-service feed schemas and action builders
- `shared.tsx` — connection hooks, hero/status primitives, integration DTO types
- `feeds/KeeperFeed.tsx` — Keeper EntityKind feed hook (`useKeeperFeedData`, `recordToKeeperDto`)
- `feeds/CapabilityFeed.tsx` — Capability EntityKind feed hook (`useCapabilityFeedData`)
- `feeds/AIModelFeed.tsx` — AI model provider feed
- `KeyConfigPresence.tsx` — Key Config Mode CRUD surface
- `CapabilityConfigPresence.tsx` — Capability Config Mode (display_label, description)
- `capabilityNavUtils.ts` — Nav fetch/group + `capabilityChronicleTitle()` shared with cover
- `agentNavUtils.ts` — optimistic Agents nav row patch after agent Config save
- `IntegrationConfigPresence.tsx` — AI model integration Config Mode
- `ServiceBindingConfigPresence.tsx` — infra service binding Config Mode (GitHub repo + branch)
- `JourneyConfigPresence.tsx` — Journey Config Mode (name, forward) via `useChronicleConfig`
- `JourneyChronicleBlocks.tsx` — Paths + Moments declaration blocks below journey cover
- `DialogConfigPresence.tsx` — Dialog Config Mode (title) via `useChronicleConfig`
- `DialogChronicleBlocks.tsx` — Recent Exchanges + Sessions below dialog cover
- `DraftConfigPresence.tsx` — Draft Config Mode (title, status) via `useChronicleConfig`
- `DraftChronicleBlocks.tsx` — Summary, points (Accept + Discuss), versions, linked dialog sessions
- `cdraft.tsx` — Manuscript Chronicle treatment (header, manage bar, warm charcoal canvas)
- `draftManuscriptUtils.ts` — Point beats (prelude/opener/closer), path-emergence clustering
- `DraftFilmStrip.tsx` — Horizontal accepted-path frames with moment sub-frames
- `DraftVersionStrip.tsx` — Read-only last N versions from `GET .../versions`
- `DraftSessionsBlock.tsx` — Sessions on linked Dialog; highlights `active_draft_id` below draft cover
- `PathChronicleBlocks.tsx` — Prelude + moments below path cover
- `MomentChronicleBlocks.tsx` — Story body below moment cover

## 🔄 Data & Behavior
- **Cover (Integration + Key + Capability):** `IntegrationFocusPresence` / `KeyFocusPresence` / `CapabilityFocusPresence` always render `DeclarationChronicleBlocks` below `EntityCoverPresence`; client-side defaults from `@keeper/shared` when DB `chronicle_blocks` is empty (`resolveChronicleDeclaration.ts`)
- **Config mode:** metadata (`display_label`, `description`, `connect_copy` / key fields) saves through `useChronicleConfig` → `chroniclePatch.ts`; **service bindings** (GitHub `repository` + `defaultBranch`) save via `PATCH /api/integrations/:service?domainId=` → `domain.settings.serviceBindings` with legacy `ideBuildContext` sync; credential actions (verify, rotate, paste-key, disconnect) stay on POST routes via `KeyHealthBlock` and cover action buttons
- **Feed hooks:** `useAIModelFeedData` / `useKeyFeedData` supply live data to declaration blocks and Config credential blocks — no legacy cover feed UI
- `serviceConfig.tsx` — per-service feed hooks, hero/glow/status, and cover action builders (no `FeedComponent`)

## ⚠️ Notes & ToDo
- [ ] `resolveKeyDeclarationActions` for chronicle action bar on Key cover (verify/rotate/revoke slugs)
- [ ] Rendr layout grouping for InteractionBar (jsonframe Step 3)
- [ ] Promote draft journey_spec points → Journey/Path/Moment (Phase 3)

## 📆 Update Log

### 2026-06-29 — Draft film strip + structured path points
- `draftPointStructure.ts` (shared) — parse `PATH N: NAME — Subtitle` content; prelude → Path.prelude, moments → Moment.title on promote
- `buildDraftSummaryFromAcceptedPoints` — short beat arc (`A → B → C`), not full content dump
- `DraftFilmStrip.tsx` — horizontal accepted-frame journey; moment sub-frames in focus panel
- `DraftPointRow` manuscript — prelude from parsed subtitle; moment chips; no generic "An idea forming"
- Agent `draft.update.propose` / `draft.point.rewrite` accept optional `prelude`, `closer`, `moments`

### 2026-06-28 — Draft script-IDE rewrite queue
- **Rewrite** on proposed/pending points → Dialog prefilled for `draft.point.rewrite` (via `requestRewriteDraftPoint`)
- Manuscript **Anchors** collapsible when >2 accepted; **Rewrite queue** section for pending points
- Cdraft meta strip: anchor count + queue count
