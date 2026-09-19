# config

## Purpose
Shared configuration used by the API. Model catalog is the single source of truth for available AI models per provider.

## Key Files
- `modelRegistry.ts` — In-code Model Registry V0. Model Identity ≠ Provider Offering. `resolveExecutionPlan()` turns Agent/companion preferences into a chat offering + optional sibling fallback.
- `modelCatalog.ts` — Picker catalog: providers, model IDs, labels, default settings, capabilities (text/vision/audio). Add picker entries here; execution authority is the Registry.

## Data & Behavior
- `MODEL_CATALOG` — Record of provider → ModelCatalogEntry[]
- `DEFAULT_MODEL_BY_PROVIDER` — Default model ID per provider
- `getDefaultSettingsForProvider(provider)` — Build ModelSettings for provider default
- `getSettingsForModel(provider, modelId)` — Build ModelSettings for specific model

## Notes & ToDo
- [ ] Consider DB-backed catalog when non-developers need to add models without deploys

## Update Log
- 2026-09-18: **Model Registry V0** — `modelRegistry.ts` + `resolveExecutionPlan()`. Sonnet 5 is an Anthropic offering (sibling of 4.6). Catalog default for Anthropic is now `claude-sonnet-5`. TypeSafe stays in the catalog for keys, not chat execution.
- 2026-09-17: TypeSafe (`typesafe`) is a fifth catalog provider: `jev-latest`, `jev-1.13.0`, `jev-preview`. Capabilities: jsonMode, no streaming. `catalogConfigs.ts` fetches `GET https://api.typesafe.ai/v1/models`.
- 2026-03-08: Added `'image'` to `ModelCapability` union. Added FLUX image generation models to `TOGETHER_MODELS`: `black-forest-labs/FLUX.1-schnell` (fast, low-latency) and `black-forest-labs/FLUX.1-dev` (higher quality). Both carry `capabilities: ['image']` — no `defaultSettings` (FLUX parameters are image-specific and owned by the Step 3 subagent, not by ModelSettings).
- 2026-02-19: Added modelCatalog.ts. Single source of truth for model catalog. Used by ModelProviderService and GET /api/kip/models.
