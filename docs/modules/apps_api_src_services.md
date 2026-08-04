# Services

## 📌 Purpose
Central location for API service-layer modules used by route handlers.

## 🧱 Key Files
- `KipAgentPermissionService.ts`
- `ModelProviderService.ts`
- `PlatformApiKeyService.ts`
- `SoleMemoryService.ts`
- `VercelDomainManagerService.ts`
- `boards/domainManagement.ts`

## 🔄 Data & Behavior
Services encapsulate business logic and data access via Prisma and caches. They are stateless and idempotent where possible. `ModelProviderService` normalizes external AI provider failures into typed, sanitized model error codes before API routes expose them to clients.

## ⚠️ Notes & ToDo
- [ ] Document domain board ensure/hydration behaviors
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2026-08-03: **Dialog Cueing vocabulary rename** — `directorDialog.ts` instrument-oriented helpers renamed to Cast vocabulary (`resolveInstrumentLabel` → `resolveCastMemberLabel`, `buildInstrumentDelegationPrompt` → `buildCastMemberDelegationPrompt`, `BoardInstrumentSlug` → `CastMemberSlug`). `ensureBoardInstrumentAgent.ts` renamed to `ensureCastMemberAgent.ts` (`ensureBoardInstrumentAgent` kept as a deprecated alias). See `apps/api/src/services/README.md` and `docs/dialog-cueing-plan.md`.
- 2026-06-23: `ModelProviderService` now classifies provider overloads (including Anthropic 529), timeouts, quota, missing keys, and invalid models with sanitized messages plus retryability/status metadata for Kip UI error handling.
- 2026-01-31: Expanded Engagement template permission handling to cover journey/path/moment contexts.
- 2025-12-08: Refactored `ModelProviderService` model catalogs/default settings into shared constants so Railway builds can safely clone and reuse retry scaffolding without TS parse errors.
