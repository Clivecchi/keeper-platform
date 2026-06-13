# API Routes

## 📌 Purpose

Express route handlers for all API endpoints. Handles HTTP request/response cycles, validation, authentication, and delegates to services.

## 🧱 Key Files

- `integration-routes.ts` - Integration connect (Services → Nango OAuth; Custom → env verify), webhook, proxy, list, PATCH metadata, disconnect
- `railway-routes.ts` - Capability-gated Railway GraphQL proxy (services, deployments, logs, redeploy)
- `vercel-routes.ts` - Capability-gated Vercel deployment routes (deployments, logs, project)
- `webhook-routes.ts` - Inbound Railway, Vercel, GitHub webhook receivers (stub processing)
- `capability-routes.ts` - `GET /api/capabilities/resolve` for Chronicle and clients
- `boards.ts` - Board CRUD and management operations
  - Standard CRUD: GET, POST, PATCH, DELETE
  - Domain Board Management: viewer-mode, frames, cover, nav, publish (NEW)
- `boards.schemas.ts` - Zod validation schemas for board operations (NEW)
- `frames.ts` - Frame operations

## 🔄 Data & Behavior

### Board Routes (`boards.ts`)

#### Legacy CRUD Operations
- `GET /api/boards` - List boards (deprecated, returns mock data)
- `POST /api/boards` - Create board (mock)
- `GET /api/boards/:boardId` - Get board details (mock)
- `PATCH /api/boards/:boardId` - Update board (mock)
- `DELETE /api/boards/:boardId` - Delete board (mock)

#### Domain Board Management (NEW - 2025-11-09)

All endpoints support:
- ✅ Authentication via Bearer token
- ✅ Domain permission checking
- ✅ Zod schema validation
- ✅ Idempotency via `requestId`
- ✅ Dry-run mode via `dryRun: true`
- ✅ Audit logging

**Set Viewer Mode**
```
PATCH /api/boards/:boardId/viewer-mode
Body: { mode: 'public'|'member'|'editor', dryRun?: boolean, requestId?: uuid }
```

**Add Frame**
```
POST /api/boards/:boardId/frames
Body: { 
  pattern: string, 
  name: string, 
  index?: number, 
  props?: object,
  dryRun?: boolean, 
  requestId?: uuid 
}
```

**Update Frame**
```
PATCH /api/boards/frames/:frameId
Body: { patch: object, dryRun?: boolean, requestId?: uuid }
```

**Set Cover**
```
POST /api/boards/:boardId/cover
Body: { 
  mime: string, 
  name: string, 
  bytesBase64: string, 
  dryRun?: boolean, 
  requestId?: uuid 
}
```

**Upsert Navigation**
```
PUT /api/boards/:boardId/nav
Body: { 
  items: Array<{label: string, href: string, icon?: string}>, 
  dryRun?: boolean, 
  requestId?: uuid 
}
```

**Publish Board**
```
PATCH /api/boards/:boardId/publish
Body: { isPublic: boolean, dryRun?: boolean, requestId?: uuid }
```

### Validation Schemas (`boards.schemas.ts`)

All schemas use Zod for type-safe validation:
- `viewerModeSchema` - Validates mode enum
- `addFrameSchema` - Validates frame creation
- `updateFrameSchema` - Validates frame patch
- `setCoverSchema` - Validates cover upload
- `upsertNavSchema` - Validates nav items array
- `publishSchema` - Validates publish flag

### Middleware Stack

Typical endpoint stack:
```typescript
router.patch(
  '/:boardId/viewer-mode',
  authMiddlewareCompat,           // Authentication
  idempotencyMiddleware(),        // Idempotency
  validationMiddleware(schema),   // Input validation
  async (req, res) => { ... }     // Handler
);
```

### Error Handling

Standard error responses:
- `401` - Authentication required
- `403` - ACCESS_DENIED (insufficient permissions)
- `404` - Resource not found (FRAME_NOT_FOUND, BOARD_NOT_FOUND)
- `409` - Conflict (duplicate requestId with different input)
- `400` - Validation error or INVALID_PATCH
- `500` - Internal server error

### Dry-Run Mode

All endpoints support dry-run for safe testing:
```json
{
  "dryRun": true
}
```

Returns:
```json
{
  "ok": true,
  "dryRun": true,
  "diff": {
    "boardId": "...",
    "message": "Would update viewer mode",
    ...
  }
}
```

### Idempotency

Using `requestId` prevents duplicate operations:
```json
{
  "requestId": "550e8400-e29b-41d4-a716-446655440000"
}
```

- First call: executes and caches (10 min TTL)
- Repeated call: returns cached result with `cached: true`
- Same ID + different input: returns `409 Conflict`

## ⚠️ Notes & ToDo

- [ ] Replace legacy CRUD mock responses with real persistence
- [ ] Add frame reordering endpoint
- [ ] Add bulk frame operations
- [ ] Add board cloning endpoint
- [ ] Add frame visibility toggle
- [ ] Add board search/filter endpoints
- [ ] Consider pagination for board lists
- [ ] Add board versioning/history

## 📆 Update Log

### 2026-06-13 — Integration/Key Chronicle metadata PATCH + declaration backfill
- `PATCH /api/integrations/:service` — update `display_label`, `description`, `connect_copy` (Chronicle Config Mode)
- `PATCH /api/keys/:id` — extended with `display_label`, `description`
- `upsertIntegration` applies shared declaration defaults on create and backfills empty columns on update
- Migration `20260613120000_backfill_integration_key_chronicle_declarations` backfills existing rows with empty `chronicle_blocks`

### 2026-06-02 — Popup OAuth callback + webhook providerConfigKey mapping
- `POST /oauth-callback` (auth): persist connected after popup `nango.auth()` when Nango webhook is not forwarded to Keeper API.
- `POST /webhook`: map Nango `providerConfigKey` (e.g. `github-app`) → Keeper service slug via `resolveServiceFromProviderConfigKey`.

### 2026-06-02 — Integrations Phase A (integration_type + Custom connect)
- `Integration.integration_type`: `Services` | `Custom` | `AI_Model` (migration `20260602120000_add_integration_type`)
- `railway` → Custom connect verifies `RAILWAY_TOKEN` + `RAILWAY_PROJECT_ID`; no Nango session
- `vercel` / `github` → Services; unchanged Nango OAuth session path
- Webhook ignores non-Services provider keys (e.g. legacy railway Nango events)

### 2026-05-31 — Infrastructure capabilities (Step 3B)
- Added `railway-routes.ts`, `vercel-routes.ts`, `webhook-routes.ts`, `capability-routes.ts`
- Capability middleware in `../middleware/requireCapability.ts`
- Services: `RailwayService.ts` (GraphQL v2), `VercelDeploymentService.ts` (deployments only)

### 2026-06-01 — Nango legacy connect session body
- `POST /session` uses `end_user` / `organization` (not `tags`) for self-hosted Nango on Railway
- Webhook accepts legacy `end_user` or newer `tags` on auth payloads

### 2026-06-01 — Nango session errors
- `POST /session` maps service slugs via `resolveNangoIntegrationId()`; returns Nango `message` + `hint` on failure (502)
- Default `NANGO_HOST` when unset — matches web Connect UI host

### 2026-05-30 — Nango integration infrastructure (Step 3A)
- Added `integration-routes.ts`: `POST /session`, `POST /webhook`, `POST /proxy`, `GET /`, `POST /disconnect`
- Shared Nango client in `../lib/nango.ts` (self-hosted `NANGO_HOST`)
- Webhook smoke tests in `../tests/integration-webhook.test.ts`

### 2025-11-09 - Domain Board Management
- Added 6 new board management endpoints
- Created `boards.schemas.ts` with Zod validation
- Integrated idempotency middleware
- Added audit logging to all operations
- All endpoints support dry-run mode
- Linked to Domain engagement templates
- Permission checking via domain scope

### Earlier
- Basic CRUD operations (mock implementation)
- Frame routes scaffolding

