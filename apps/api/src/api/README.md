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

### Security: Same-Origin Routing
- All endpoints use relative paths (`/api/agents`, `/api/journeys`, etc.)
- Routes through Vercel proxy in production
- No CORS needed for same-origin calls
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

### Frontend Integration
- ✅ BoardContext updated to use live API
- ✅ AgentBoard updated with real agent data
- ✅ Board Studio page updated to load from API
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

## 🔧 Development

When adding new board types:
1. Create API endpoint in this directory
2. Add route mounting in `index.ts`
3. Update seed data script
4. Update frontend board component
5. Test end-to-end data flow

---

*Last updated: January 2025 - Live Data Integration Complete*
