# MCP (Model Context Protocol) Server

## 📌 Purpose
Minimal MCP server for OpenAI Agent integration. Provides safe, domain-scoped tools that the agent can call via API key authentication.

## 🧱 Key Files
- `index.ts` - Express router with MCP routes
- `auth.ts` - API key authentication middleware
- `tools.ts` - Tool registry and handlers
- `mcp.test.ts` - Unit tests

## 🔄 Data & Behavior

### Authentication
- Uses static API key from `OPAI_AGENT_MCP_KEY` env var
- Accepts key from either:
  - `Authorization: Bearer <key>`
  - `x-api-key: <key>`
- Optional `x-domain-id` header for domain scoping

### Available Tools
1. **`gk_recent_moments`** - List recent GenerationKeeper moments
2. **`pool_create_quote`** - Create PoolKeeper quote with business rules

### Endpoints
- `GET /api/mcp/` - Health check
- `GET /api/mcp/schema` - Get tool list with JSON schemas
- `POST /api/mcp/call` - Invoke a tool

## 📚 API Examples

### Health Check
```bash
curl -X GET https://api.ke3p.com/api/mcp/ \
  -H "Authorization: Bearer YOUR_MCP_KEY"
```

**Response:**
```json
{
  "ok": true,
  "service": "keeper-mcp",
  "version": "0.0.1",
  "timestamp": "2025-10-11T12:00:00.000Z"
}
```

### Get Tool Schema
```bash
curl -X GET https://api.ke3p.com/api/mcp/schema \
  -H "Authorization: Bearer YOUR_MCP_KEY"
```

**Response:**
```json
{
  "service": "keeper-mcp",
  "version": "0.0.1",
  "tools": [
    {
      "name": "gk_recent_moments",
      "description": "List recent GenerationKeeper moments in the current domain.",
      "parameters": {
        "type": "object",
        "properties": {
          "limit": {
            "type": "number",
            "minimum": 1,
            "maximum": 20,
            "default": 5,
            "description": "Number of moments to return (1-20)"
          }
        }
      }
    },
    {
      "name": "pool_create_quote",
      "description": "Create a PoolKeeper quote with business rules.",
      "parameters": {
        "type": "object",
        "required": ["projectId"],
        "properties": {
          "projectId": {
            "type": "string",
            "description": "ID of the project to quote"
          },
          "craneOverHouse": {
            "type": "boolean",
            "default": false,
            "description": "Whether crane must go over house"
          },
          "includesHeatPump": {
            "type": "boolean",
            "default": false,
            "description": "Whether quote includes heat pump installation"
          }
        }
      }
    }
  ]
}
```

### Call Tool: gk_recent_moments
```bash
curl -X POST https://api.ke3p.com/api/mcp/call \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -H "x-domain-id: domain-123" \
  -d '{
    "name": "gk_recent_moments",
    "args": {
      "limit": 5
    }
  }'
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "moments": [
      {
        "id": "mom_1",
        "title": "Mock Moment 1",
        "domain_id": "domain-123"
      },
      {
        "id": "mom_2",
        "title": "Mock Moment 2",
        "domain_id": "domain-123"
      }
    ]
  },
  "timestamp": "2025-10-11T12:00:00.000Z"
}
```

### Call Tool: pool_create_quote
```bash
curl -X POST https://api.ke3p.com/api/mcp/call \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -H "x-domain-id: domain-456" \
  -d '{
    "name": "pool_create_quote",
    "args": {
      "projectId": "proj_abc123",
      "craneOverHouse": true,
      "includesHeatPump": false
    }
  }'
```

**Response:**
```json
{
  "ok": true,
  "result": {
    "quoteId": "q_1728648000000",
    "projectId": "proj_abc123",
    "domainId": "domain-456",
    "appliedRules": {
      "craneOverHouse": true,
      "includesHeatPump": false
    },
    "timestamp": "2025-10-11T12:00:00.000Z"
  },
  "timestamp": "2025-10-11T12:00:00.000Z"
}
```

### Using x-api-key Header (Alternative)
```bash
curl -X GET https://api.ke3p.com/api/mcp/schema \
  -H "x-api-key: YOUR_MCP_KEY"
```

## 🔒 Security

### API Key Storage
- Set `OPAI_AGENT_MCP_KEY` in Railway environment variables
- Use a strong, random key (minimum 32 characters recommended)
- Rotate key if compromised

### Domain Scoping
- All tools receive `domainId` from `x-domain-id` header
- Tools should filter results/operations by domain
- Null domain = cross-domain or unscoped operation

### Rate Limiting
- TODO: Add rate limiting middleware (e.g., express-rate-limit)
- Recommended: 100 requests per 5 minutes per key

### Audit Logging
- TODO: Log all tool calls to audit table
- Include: timestamp, tool name, args, domainId, IP, result status

## 🧪 Testing

### Run Tests
```bash
# From repo root
pnpm --filter @keeper/api test src/mcp/mcp.test.ts

# Watch mode
pnpm --filter @keeper/api test:watch src/mcp/mcp.test.ts
```

### Test Coverage
- ✅ Authentication (valid/invalid keys, different headers)
- ✅ Health check endpoint
- ✅ Schema endpoint
- ✅ Tool call endpoint
- ✅ Domain scoping
- ✅ Error handling

## 🚀 Deployment

### Environment Variables
```bash
# Required
OPAI_AGENT_MCP_KEY=your-secret-key-here

# Optional (for tool implementations)
DATABASE_URL=postgresql://...
JWT_SECRET=...
```

### Railway Setup
1. Go to Railway project → Variables
2. Add `OPAI_AGENT_MCP_KEY` with secure value
3. Deploy API
4. Test with curl:
   ```bash
   curl https://api.ke3p.com/api/mcp/ \
     -H "Authorization: Bearer YOUR_KEY"
   ```

## 🛠️ Adding New Tools

### Step 1: Define Tool in tools.ts
```typescript
{
  name: 'my_new_tool',
  description: 'Does something useful',
  parameters: {
    type: 'object',
    required: ['requiredParam'],
    properties: {
      requiredParam: { type: 'string' },
      optionalParam: { type: 'number', default: 10 }
    }
  },
  async handler(args, ctx) {
    // Implement tool logic
    // Use ctx.domainId for scoping
    return { result: 'success' };
  }
}
```

### Step 2: Add Tests
```typescript
it('calls my_new_tool successfully', async () => {
  const res = await request(app)
    .post('/api/mcp/call')
    .set('Authorization', `Bearer ${VALID_KEY}`)
    .send({ 
      name: 'my_new_tool',
      args: { requiredParam: 'value' }
    });
  
  expect(res.status).toBe(200);
  expect(res.body.ok).toBe(true);
});
```

### Step 3: Update Documentation
- Add tool description to this README
- Include curl example
- Document any special behavior

## ⚠️ Notes & ToDo

### Current Limitations
- [ ] Tools return mock data (not connected to real DB)
- [ ] No rate limiting implemented
- [ ] No audit logging to database
- [ ] No request validation beyond auth

### Planned Enhancements
- [ ] Connect `gk_recent_moments` to real moments table
- [ ] Connect `pool_create_quote` to real quote service
- [ ] Add rate limiting middleware
- [ ] Add audit logging to `mcp_audit_log` table
- [ ] Add request/response schema validation (Zod)
- [ ] Add more tools:
  - Board management (list, create, update)
  - Frame operations
  - Domain queries
  - User lookups

### Security Enhancements
- [ ] Add IP whitelisting option
- [ ] Add request signing (HMAC)
- [ ] Implement key rotation mechanism
- [ ] Add per-tool permission scopes

## 📆 Update Log
**2025-10-11**: Initial MCP server implementation with two mock tools, API key auth, and unit tests.

## 🔗 Related Documentation
- [KAM Authentication](../kam/README.md) - Cookie-based web auth
- [Domain Management](../../docs/modules/domain-manager.md) - Domain scoping
- [Board Studio API](../api/boards.js) - Board operations

