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
### 2025-07-31
- Reverted Vercel request body to `{ name }` per API spec.
- Added initial README with module overview and file summaries.
- Updated `VercelDomainManagerService.ts` request body (`{ domain }` instead of `{ name }`) to match Vercel REST API specification.
