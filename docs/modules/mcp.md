# MCP (Model Context Protocol) Server

## 📌 Purpose
Minimal MCP server for OpenAI Agent integration. Provides safe, domain-scoped tools that the agent can call via API key authentication.

**✨ Updated for OpenAI Agent Builder**: Includes universal CORS headers and JSON-RPC 2.0 support to prevent connection issues.

## 🧱 Key Files
- `apps/api/src/mcp/index.ts` - Express router with MCP routes (instrumented with logging)
- `apps/api/src/mcp/jsonRpc.ts` - JSON-RPC 2.0 dispatcher for OpenAI Agent Builder
- `apps/api/src/mcp/core.ts` - Core business logic (shared by REST and JSON-RPC)
- `apps/api/src/mcp/cors.ts` - CORS middleware (universal headers for OpenAI Agent Builder)
- `apps/api/src/mcp/tools.ts` - Tool registry and handlers
- `apps/api/src/mcp/log.ts` - Structured logging for production diagnostics
- `apps/api/src/mcp/id.ts` - Request ID generator for correlation
- `apps/api/src/mcp/auth.ts` - Authentication helper
- `apps/api/src/mcp/mcp.test.ts` - Unit tests (21 test cases)

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

MCP routes are mounted at BOTH `/mcp` and `/api/mcp` for compatibility.

**No Auth Required:**
- `GET /mcp/health` - Health check / reachability test
- `GET /mcp/_diag` - Diagnostic endpoint (safe, no secrets)

**Auth Required** (Bearer token):

*JSON-RPC 2.0 Endpoint (OpenAI Agent Builder):*
- `POST /mcp` - **JSON-RPC base endpoint** (list_actions, call_action, capabilities)
- `POST /api/mcp` - Same as above (alias for compatibility)

*REST Endpoints (backward compatibility):*
- `GET /mcp/` - Root endpoint
- `GET /mcp/whoami` - Auth validation
- `GET /mcp/tools` - Standard tool discovery
- `GET /mcp/actions` - Actions discovery
- `POST /mcp/actions/list` - Actions listing (POST variant)
- `GET /mcp/capabilities` - Server capabilities
- `GET /mcp/.well-known/mcp` - Well-known discovery
- `GET /mcp/schema` - Detailed tool schemas
- `POST /mcp/call` - Invoke a tool

## 🔌 JSON-RPC 2.0 Support

### Supported Methods
1. **`list_actions`** - Returns available tools/actions with schemas
2. **`call_action`** - Invokes a specific tool by name
3. **`capabilities`** - Returns server capabilities

### Request Format
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "method": "list_actions",
  "params": {}
}
```

### Response Format
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "result": {
    "actions": [...]
  }
}
```

### Error Format
```json
{
  "jsonrpc": "2.0",
  "id": "request-id",
  "error": {
    "code": -32601,
    "message": "Method not found"
  }
}
```

## 🔧 Vercel Routing Configuration

The Vercel edge proxy must forward both the exact `/mcp` path and all `/mcp/*` sub-paths to Railway.

**Critical:** The exact path rewrite must come **before** the wildcard pattern:

```json
{
  "rewrites": [
    { "source": "/mcp", "destination": "https://keeper-platform-production.up.railway.app/mcp" },
    { "source": "/mcp/(.*)", "destination": "https://keeper-platform-production.up.railway.app/mcp/$1" }
  ]
}
```

**Why This Matters:**
- OpenAI Agent Builder POSTs JSON-RPC requests to the **base URL** (`/mcp`), not sub-paths
- Without the exact path rewrite, Vercel returns 405 Method Not Allowed
- The wildcard pattern `/mcp/(.*)` only matches paths like `/mcp/something`, not `/mcp` exactly

## 🌐 CORS & OpenAI Agent Builder

### CORS Headers
All MCP endpoints include universal CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET,POST,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, x-domain-id`
- `Access-Control-Max-Age: 600`

### OpenAI Agent Builder Setup
1. **Base URL**: `https://api.ke3p.com/mcp` (or `https://api.ke3p.com/api/mcp`)
2. **Authentication**: Custom Header
3. **Header Name**: `Authorization`
4. **Header Value**: `Bearer YOUR_OPAI_AGENT_MCP_KEY`
5. **Expected Status**: "Connected" ✅

## 🔍 Logging & Diagnostics

### Structured Logging
Every MCP request produces a structured JSON log:
```json
{
  "ts": "2025-10-22T12:34:56.789Z",
  "id": "a7f3k9m2",
  "path": "/mcp",
  "method": "POST",
  "status": 200,
  "ms": 12,
  "hasAuth": true,
  "ua": "OpenAI-Agent/1.0",
  "origin": "https://agent.openai.com",
  "rpcMethod": "list_actions"
}
```

**Security:** No bearer tokens, API keys, or sensitive data are logged. Only boolean `hasAuth` flags.

### Diagnostic Endpoint
Use `GET /mcp/_diag` to troubleshoot connection issues:
```bash
curl https://api.ke3p.com/mcp/_diag \
  -H "Authorization: Bearer YOUR_KEY"
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
- TODO: Add rate limiting middleware
- Recommended: 100 requests per 5 minutes per key

## 🧪 Testing

### Run Unit Tests
```bash
# From repo root
pnpm --filter @keeper/api test src/mcp/mcp.test.ts

# Watch mode
pnpm --filter @keeper/api test:watch src/mcp/mcp.test.ts
```

### Test JSON-RPC with Curl
```bash
# Set your API key
export OPAI_AGENT_MCP_KEY="your_key_here"

# Test list_actions
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":"test-1","method":"list_actions","params":{}}'

# Test call_action
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer $OPAI_AGENT_MCP_KEY" \
  -H "Content-Type: application/json" \
  -H "x-domain-id: domain-123" \
  -d '{"jsonrpc":"2.0","id":"test-2","method":"call_action","params":{"name":"gk_recent_moments","arguments":{"limit":5}}}'
```

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
4. Test with curl

### Vercel Setup
1. Ensure `vercel.json` includes exact `/mcp` path rewrite
2. Deploy to Vercel (automatic on git push)
3. Verify rewrites in Vercel Dashboard

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
- [ ] Add more tools (boards, frames, domains, users)

### Security Enhancements
- [ ] Add IP whitelisting option
- [ ] Add request signing (HMAC)
- [ ] Implement key rotation mechanism
- [ ] Add per-tool permission scopes

## 📆 Update Log

**2025-10-22 (v7)**: Fixed Vercel routing to forward `POST /mcp` to Railway API. Added exact path rewrite for `/mcp` (not just `/mcp/*`) in `vercel.json`. This resolves 405 Method Not Allowed errors when OpenAI Agent Builder POSTs to the base MCP endpoint.

**2025-10-22 (v6)**: Added JSON-RPC 2.0 dispatcher (`jsonRpc.ts`, `core.ts`) to fix OpenAI Agent Builder 424 errors. Base endpoint `POST /mcp` now accepts JSON-RPC requests with methods `list_actions`, `call_action`, `capabilities`.

**2025-10-21 (v5)**: Added production-safe structured logging (`log.ts`, `id.ts`) for troubleshooting. All endpoints now emit `[MCP]` JSON logs with request ID, status, latency, hasAuth flag (no secrets).

**2025-10-17 (v4)**: Fixed MCP routing to prevent web app SPA interception. Added standard discovery endpoints. Dual-mounted at `/mcp` and `/api/mcp` for compatibility.

## 🔗 Related Documentation
- [MCP Base URL Fix](../../MCP_BASE_URL_FIX_COMPLETE.md) - Latest routing fix
- [KAM Authentication](../../apps/api/src/kam/README.md) - Cookie-based web auth
- [Domain Management](./domain-manager.md) - Domain scoping
- [Board Studio API](../../apps/api/src/api/boards.js) - Board operations
