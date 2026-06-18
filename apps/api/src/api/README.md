# Board Data API Endpoints

This directory contains the live data API endpoints for all Keeper Platform boards, replacing mock data with database-backed responses.

## 📌 Purpose

Provides same-origin API access for board data, eliminating mock data and connecting the frontend directly to the database through Express.js routes.

## 🧱 Key Files

### Core Board API
- `boards.ts` - Main board configuration and metadata endpoints
- `agents.ts` - Agent data for AgentBoard (connects to kip_agents table)
- `journeys.ts` - Journey data for JourneyBoard (connects to Journey, Path, Moment tables)
- `keeper-types.ts` - Keeper type data for KeeperTypeBoard (connects to KeeperType table)
- `people.ts` - User/people data for PeopleBoard (connects to users, roles, permissions)

## 🔄 Data & Behavior

### Security: Single-Domain Routing (MVP)
- All endpoints use relative paths (`/api/agents`, `/api/journeys`, etc.)
- Production API is served at `https://api.ke3p.com` with strict CORS allowlist
- Web origin is `https://www.ke3p.com`
- Authentication via `authMiddlewareCompat`

### API Structure
Each endpoint follows RESTful conventions:
```typescript
GET /api/{resource}         // List all with filtering
GET /api/{resource}/:id     // Get specific item
POST /api/{resource}        // Create new item
PUT /api/{resource}/:id     // Update item
```

### Response Format
```typescript
{
  [resource]: Array<T>,     // Main data array
  total: number,            // Total count for pagination
  page: number,             // Current page
  limit: number             // Items per page
}
```

## ⚠️ Notes & ToDo

### Database Integration
- ✅ Connects to live Prisma database
- ✅ Uses existing schema models (kip_agents, Journey, KeeperType, etc.)
- ✅ Includes proper relationships and joins
- ✅ Implements error handling and fallbacks
  - UUID validation on board-data routes
  - x-request-id propagation and structured error logs
  - Optional raw inspector endpoint behind ENABLE_RAW_INSPECTOR

### Frontend Integration
- ✅ BoardContext updated to use live API
- ✅ AgentBoard updated with real agent data
- ✅ Board Studio page updated to load from API
- ✅ V0 Board Studio integrated with V0-compatible data structure

### V0 Board Studio Integration
- ✅ Added POST /api/boards/:id for V0 board save/update
- ✅ Updated GET /api/boards/:id to return V0-compatible structure
- ✅ Support for StudioBoard, StudioFrame, and StudioProp types
- ✅ Pattern registry integration (focus, dialogic, wizard, canvas, gallery, form)
- ✅ Maintains loading and error states

### Seed Data
- ✅ Created `board-seed-data.sql` with brand-aligned sample records
- ✅ Includes all board types: agents, journeys, keeper-types, people, domains
- ✅ Sample data follows Keeper Platform brand voice and philosophy

### Performance & Caching
- [ ] Add Redis caching for frequently accessed data
- [ ] Implement request rate limiting
- [ ] Add database query optimization

### Testing
- [ ] Add unit tests for API endpoints
- [ ] Add integration tests for board data flow
- [ ] Add error handling tests

## 🚀 Usage

### Backend Setup
API endpoints are automatically mounted in `apps/api/src/index.ts`:

```typescript
app.use('/api/board-data', newBoardRoutes);
app.use('/api/agents', agentsRoutes);
app.use('/api/journeys', journeysRoutes);
app.use('/api/keeper-types', keeperTypesRoutes);
app.use('/api/people', peopleRoutes);
```

### Frontend Usage
Replace mock data imports with API calls:

```typescript
// Before: Mock data
const mockAgents = [...];

// After: Live API
const response = await fetch('/api/agents', { credentials: 'include' });
const { agents } = await response.json();
```

### Seed Database
Run the seed script to populate with sample data:

```bash
psql $DATABASE_URL -f packages/database/prisma/seeds/board-seed-data.sql
```

## 📊 Monitoring

All endpoints include:
- Request/response logging
- Error tracking with context
- Performance timing
- Authentication verification
 - Request correlation via reqId

## 📆 Update Log

- 2026-01-15: Adjusted Journey/Path moment relations to support multi-moment arrays in API responses.
- 2025-10-17: Added `GET /api/debug/opai-mcp-probe` - Read-only connectivity probe for OpenAI Agent Builder "Opai" MCP integration. Tests reachability, auth, and tool discovery. No secrets exposed, fully observational. Uses `OPAI_AGENT_MCP_URL` and `OPAI_AGENT_MCP_KEY` environment variables.
- 2025-09-02: Added UUID validation on board-data, raw inspector endpoint, reqId propagation, and safer defaults to prevent 500s when data/behavior are malformed.
- 2025-09-04: Agent Home Board ensure made idempotent (agentId-first, slug fallback, P2002-safe). Added `GET /api/admin/inspect/agent-home/:agentId`.
- 2025-09-04: Agent Home Board harden: ensure path now prunes duplicate/non-canonical frames and enforces exactly five canonical roles; Studio alias now calls the same ensure path; runtime "Edit in Board Studio" button removed for AHB.
- 2025-09-06: Added RO parity endpoint `GET /api/board-data/agents/:id/home` secured by KAM service key for Studio-vs-Runtime parity checks.
- 2025-09-11: Added `GET /api/domains/:domainId/management-board` calling ensure service for DMB (idempotent, deterministic frames).
- 2025-09-16: Mounted `domains.management.ts` under `domains.ts` providing `GET /api/domains/:id/management-board` that returns `{ boardId, domainId }`.
- 2025-09-17: Hardened domain resolution and board-data error handling:
  - `/api/domains/my` now idempotently self-heals `Domain.deletedAt` column via guard and resolves robustly using context, user primary, membership, and ownership fallbacks.
  - `GET /api/board-data/:id` calls the same DB guard and returns `403` on domain mismatch with `{ boardDomainId, ctxDomainId }` to prevent UI 500s on deep links.
 - 2025-09-21: H-updates
   - H2: Normalize domain context in `GET /api/board-data/:id` (prefer `req.domainContext.domain.id`, then legacy `req.context.domainId`, then `board.domainId`).
   - H1: Improve observability for Prisma read errors by tagging rethrown errors as `BOARD_READ_FAILED` and surfacing that code in 500 responses.
  - Alias→UUID compatibility: if `:id` not UUID, resolve via `BoardAlias(domainId, alias)` with required domainId. 404 if not found.
  - Request logging: durable `RequestLog` table and `/api/debug/req/:id` to fetch logs.
 - 2025-09-24: Single-domain MVP docs update. Production API entrypoint is `https://api.ke3p.com`; removed note about Vercel proxy. Added `KEEPER_PROXY_ENABLED=false` flag documentation at root.

### Auth Notes (Board-Data RO)

- `/api/board-data/*` accepts either:
  - KAM service key (`Authorization: Bearer <service-key>` or `X-KAM-Service-Key: <service-key>`)
  - User JWT (Studio, logged-in users)
- Composite guard: service key is tried first, then user JWT; if neither valid → 401.
- Read-only scope: if KAM key is used, `boards.ro` is required; any authenticated user can read.

## 🔧 Development

When adding new board types:
1. Create API endpoint in this directory
2. Add route mounting in `index.ts`
3. Update seed data script
4. Update frontend board component
5. Test end-to-end data flow

---

*Last updated: January 2025 - Live Data Integration Complete*

## 📆 Update Log
- 2026-06-16: Removed legacy `/api/agents/:id/drafts` router (`agents/drafts.ts`) and `Draft` Prisma model; live drafts use `kip_drafts` via `/api/domains/:domainId/kip/drafts` and Kip actions.
