# config

## Purpose
Shared configuration used by the API. Model catalog is the single source of truth for available AI models per provider.

## Key Files
- `modelCatalog.ts` — Model catalog: providers, model IDs, labels, default settings, capabilities (text/vision/audio). Add new models by editing this file.

## Data & Behavior
- `MODEL_CATALOG` — Record of provider → ModelCatalogEntry[]
- `DEFAULT_MODEL_BY_PROVIDER` — Default model ID per provider
- `getDefaultSettingsForProvider(provider)` — Build ModelSettings for provider default
- `getSettingsForModel(provider, modelId)` — Build ModelSettings for specific model

## Notes & ToDo
- [ ] Consider DB-backed catalog when non-developers need to add models without deploys

## Update Log
- 2026-03-08: Added `'image'` to `ModelCapability` union. Added FLUX image generation models to `TOGETHER_MODELS`: `black-forest-labs/FLUX.1-schnell` (fast, low-latency) and `black-forest-labs/FLUX.1-dev` (higher quality). Both carry `capabilities: ['image']` — no `defaultSettings` (FLUX parameters are image-specific and owned by the Step 3 subagent, not by ModelSettings).
- 2026-02-19: Added modelCatalog.ts. Single source of truth for model catalog. Used by ModelProviderService and GET /api/kip/models.
