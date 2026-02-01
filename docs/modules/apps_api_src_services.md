# Services

## 📌 Purpose
Central location for API service-layer modules used by route handlers.

## 🧱 Key Files
- `KipAgentPermissionService.ts`
- `PlatformApiKeyService.ts`
- `SoleMemoryService.ts`
- `VercelDomainManagerService.ts`
- `boards/domainManagement.ts`

## 🔄 Data & Behavior
Services encapsulate business logic and data access via Prisma and caches. They are stateless and idempotent where possible.

## ⚠️ Notes & ToDo
- [ ] Document domain board ensure/hydration behaviors
- [ ] Behavior to confirm with Kip

## 📆 Update Log
- 2026-01-31: Expanded Engagement template permission handling to cover journey/path/moment contexts.
- 2025-12-08: Refactored `ModelProviderService` model catalogs/default settings into shared constants so Railway builds can safely clone and reuse retry scaffolding without TS parse errors.
