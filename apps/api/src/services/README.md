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
- 2025-12-08: ModelProviderService now emits typed error codes (`MISSING_API_KEY`, `INVALID_MODEL`, `PROVIDER_UNAVAILABLE`) instead of mock responses.
- 2025-09-11: Added `boards/domainManagement.ts` ensure service for Domain Management Board.
- 2025-09-16: Added wrapper `ensureDomainManagementBoard.ts` to expose idempotent ensure via API service.
# Services Module

## 📌 Purpose
Provides reusable service-layer classes responsible for business logic, external API integrations, and platform-level utilities used throughout the API application.

## 🧱 Key Files
- `VercelDomainManagerService.ts` – Integrates with Vercel REST API to add / verify / remove custom domains for Keeper projects.
- `ModelProviderService.ts` – Resolves model provider API keys following user → platform → environment precedence.
- `PlatformApiKeyService.ts` – CRUD for platform-scoped API keys.
- `KipUserKeyService.ts` – Handles user-level API keys & permission checks.
- `KipAgentPermissionService.ts` – Manages agent-level permission evaluation.
- `SoleMemoryService.ts` – Manages scoped memory storage for agents.

## 🔄 Data & Behavior
Services are stateless classes instantiated on demand by route handlers or other services. They communicate with external APIs (Vercel, OpenAI, etc.) and the database via Prisma clients located in `packages/database`. State is passed in through constructor arguments or method parameters; no in-memory global state is maintained.

## ⚠️ Notes & ToDo
- [ ] Unify error handling strategy across all services (standard error types).
- [ ] Move common fetch logic into a base service helper.
- [ ] Ensure all external requests include proper timeouts.

## 📆 Update Log
### 2026-02-28 - ModelProviderService Anthropic integration + API key validation
- **ModelProviderService.ts**: Replaced mock Anthropic response with real `@anthropic-ai/sdk` integration. Anthropic provider now calls `client.messages.create()` using `ANTHROPIC_API_KEY` from env (or user/platform keys as fallback).
- **ModelProviderService.ts**: Added `ANTHROPIC_API_KEY` to key resolution hierarchy (env → user → platform). Both OpenAI and Anthropic now support env-first key resolution.
- **ModelProviderService.ts**: Added `requiresExplicitKey` for anthropic so `MISSING_API_KEY` is surfaced before hitting the SDK.
- **ModelProviderService.ts**: Added `validKey()` helper to treat empty/whitespace keys as invalid. Clearer error messages instruct users to add `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` to Railway environment variables.
- **AgentBoardFrame.tsx**: Improved error display to show actual API error messages instead of generic "Failed to send" when available.

### 2026-02-10 - EngagementTemplateExecutor production fixes
- **EngagementTemplateExecutor.ts**: Fixed `INTERNAL_API_URL` fallback to use dynamic `process.env.PORT` instead of hardcoded `3001`. On Railway, the server port is assigned dynamically, so the old default caused internal API calls to fail with connection refused.
- **EngagementTemplateExecutor.ts**: Added `autoResolveKeeperId()` method that automatically finds the domain's first Keeper when `keeperId` is missing from inputs but `domainId` is available. This removes the requirement for users to manually enter a Keeper UUID when creating a Journey.

### 2026-02-08 - Kip session journey/keeper context persistence
- **KipAgentService (agents.ts)**: `createSession` now accepts optional `context` parameter with `primaryJourneyId` and `primaryKeeperId`, persisting them to `kip_sessions.primary_journey_id` / `primary_keeper_id`.
- **KipAgentService (agents.ts)**: `runAgent` now updates existing session context when `activeJourneyId`/`activeKeeperId` change, and passes context when creating new sessions.

### 2026-02-08 - Quota exceeded (429) error handling
- **ModelProviderService.ts**: Added `QUOTA_EXCEEDED` error code to `ModelProviderErrorCode` union type.
- **ModelProviderService.ts**: Updated `normalizeProviderError()` to explicitly detect HTTP 429, `insufficient_quota`, and quota-related error messages. These are now mapped to `QUOTA_EXCEEDED` with `retryable: false` and a user-friendly message directing admins to check API key billing. Previously, 429 errors were silently classified as `PROVIDER_UNAVAILABLE` and retried 3 times (ineffective for quota issues).

### 2025-12-08
- **ModelProviderService.ts**: Extracted provider catalog data and default-setting factories into typed maps to eliminate the duplicated array literals that were confusing the TypeScript parser on Railway.
- **ModelProviderService.ts**: Replaced mock responses with structured `ModelProviderException` handling so agent callers receive concrete error codes such as `MISSING_API_KEY`, `INVALID_MODEL`, and `PROVIDER_UNAVAILABLE`. Updated retry logic to honor non-retryable errors and propagate the failing code to callers.
### 2025-10-17
- **ModelProviderService.ts**: Changed API key resolution order to ENV-first
  - **NEW ORDER**: Environment (`process.env.OPENAI_API_KEY`) → User keys → Platform DB keys
  - **OLD ORDER**: User keys → Platform DB keys → Environment (last resort)
  - **Rationale**: Prefer fresh ENV keys over potentially stale DB keys for reliability
  - Added `lastKeySource` tracking to expose which key source was used
  - Added `getLastKeySource()` method for debugging
  - Error messages now include key source information
  - **Impact**: Agents will now use Railway environment keys by default, with DB as fallback
  - **Benefits**: Aligns with 12-factor app principles, avoids stale key issues, better DevOps

### 2025-07-31
- Reverted Vercel request body to `{ name }` per API spec.
- Added initial README with module overview and file summaries.
- Updated `VercelDomainManagerService.ts` request body (`{ domain }` instead of `{ name }`) to match Vercel REST API specification.
