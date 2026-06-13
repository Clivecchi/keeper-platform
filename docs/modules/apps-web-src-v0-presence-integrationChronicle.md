# integrationChronicle

## 📌 Purpose
Integration and Key Chronicle feeds, declaration-driven block rendering, and config/manage surfaces. Connected integrations and Key entities render chronicle blocks from `chronicle_blocks` declarations via `DeclarationChronicleBlocks`.

## 🧱 Key Files
- `declarationChronicle.tsx` — `DeclarationChronicleBlocks`, `resolveDeclarationActions`, integration + key block dispatch
- `serviceConfig.tsx` — per-service feed schemas and action builders
- `shared.tsx` — connection hooks, hero/status primitives, integration DTO types
- `feeds/KeyFeed.tsx` — Key EntityKind feed hook (`useKeyFeedData`)
- `feeds/AIModelFeed.tsx` — AI model provider feed
- `KeyConfigPresence.tsx` — Key Config Mode CRUD surface
- `IntegrationConfigPresence.tsx` — AI model integration Config Mode
- `blocks/` — `ConnectionStatusBlock`, `KeyHealthBlock`, `LinkedAgentsBlock`, etc.

## 🔄 Data & Behavior
- **Integration focus:** `IntegrationFocusPresence` → `DeclarationChronicleBlocks` when `integration.chronicle_blocks` is non-empty
- **Key focus:** `KeyFocusPresence` → `DeclarationChronicleBlocks` with `variant="key"` when `key.chronicle_blocks` is non-empty
- Key seeds declare `['connection_status', 'key_health', 'linked_agents']` and actions `['verify', 'rotate', 'revoke']`
- Cover actions (Verify, Manage) remain in `keyCoverSchema`; declaration blocks render below `EntityCoverPresence`

## ⚠️ Notes & ToDo
- [ ] `resolveKeyDeclarationActions` for chronicle action bar on Key cover (verify/rotate/revoke slugs)
- [ ] Rendr layout grouping for InteractionBar (jsonframe Step 3)

## 📆 Update Log

### 2026-06-13 — Key variant + orphan cleanup
- Extended `DeclarationChronicleBlocks` with `variant="key"` and `KeyDeclarationChronicleBlockList`
- Deleted unused `IntegrationChronicle.tsx` and `blocks/BlockPrimitivesPreview.tsx` (superseded by `IntegrationFocusPresence` + declaration blocks)
