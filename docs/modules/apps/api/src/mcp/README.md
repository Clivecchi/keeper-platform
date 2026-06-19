# MCP (Model Context Protocol) Server

## 📌 Purpose
Minimal MCP server for OpenAI Agent integration. Provides safe, domain-scoped tools that the agent can call via API key authentication.

**✨ Updated for OpenAI Agent Builder**: Includes universal CORS headers to prevent connection hanging.

## 🧱 Key Files
- `index.ts` - Express router with MCP routes (instrumented with logging)
- `jsonRpc.ts` - JSON-RPC 2.0 dispatcher for OpenAI Agent Builder
- `core.ts` - Core business logic (shared by REST and JSON-RPC)
- `cors.ts` - CORS middleware (universal headers for OpenAI Agent Builder)
- `tools.ts` - Tool registry and handlers
- `log.ts` - Structured logging for production diagnostics
- `id.ts` - Request ID generator for correlation
- `auth.ts` - Authentication helper
- `mcp.test.ts` - Unit tests (21 test cases)

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
- `POST /mcp` - **JSON-RPC base endpoint** (initialize, tools/list, tools/call, and legacy methods)
- `POST /api/mcp` - Same as above (alias for compatibility)

*REST Endpoints (backward compatibility):*
- `GET /mcp/` - Root endpoint
- `GET /mcp/whoami` - Auth validation
- `GET /mcp/tools` - Standard tool discovery (OpenAI Agent Builder)
- `GET /mcp/actions` - Actions discovery (OpenAI compatibility)
- `POST /mcp/actions/list` - Actions listing (POST variant)
- `GET /mcp/capabilities` - Server capabilities
- `GET /mcp/.well-known/mcp` - Well-known discovery
- `GET /mcp/schema` - Detailed tool schemas
- `POST /mcp/call` - Invoke a tool

**404 Handling:**
- All unsupported `/mcp/*` paths return JSON 404 (not HTML)

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

## 🔌 JSON-RPC 2.0 Support

### Overview
OpenAI Agent Builder uses JSON-RPC 2.0 format to communicate with MCP servers. The base endpoint `POST /mcp` (and `POST /api/mcp`) accepts JSON-RPC requests and returns JSON-RPC responses.

**MCP Handshake Flow (Spec-Aligned):**
1. Agent Builder sends `initialize` with `protocolVersion` → Server echoes version and responds with spec-correct capabilities
2. Agent Builder optionally sends `notifications/initialized` → Server acknowledges (no-op)
3. Agent Builder calls `tools/list` → Server returns tools with camelCase `inputSchema` and optional `title`
4. Agent Builder calls `tools/call` with `arguments` → Server executes tool and returns structured response with `content` array

**Key Spec Compliance:**
- ✅ Echoes `protocolVersion` from client request (defaults to "2025-03-26")
- ✅ Returns spec-correct capabilities: `logging`, `prompts`, `resources`, `tools`
- ✅ Echoes `MCP-Protocol-Version` header when provided
- ✅ Uses camelCase `inputSchema` (not snake_case)
- ✅ Returns `content` array + `structuredContent` in tool responses
- ✅ Accepts both spec (`arguments`, `notifications/initialized`) and legacy formats

This implements the full MCP protocol per OpenAI spec, solving **424 Failed Dependency** and **"Unable to load tools"** errors.

### JSON-RPC Request Format
```json
{
  "jsonrpc": "2.0",
  "id": "request-1",
  "method": "list_actions",
  "params": {}
}
```

### Supported Methods

#### 0. initialize (MCP handshake)
MCP protocol handshake that returns server capabilities. Echoes the client's requested `protocolVersion` per spec.

**Request:**
```bash
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -H "MCP-Protocol-Version: 2025-03-26" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-0",
    "method": "initialize",
    "params": {
      "protocolVersion": "2025-03-26",
      "clientInfo": {
        "name": "openai-agent-builder",
        "version": "1.0"
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-0",
  "result": {
    "protocolVersion": "2025-03-26",
    "capabilities": {
      "logging": {},
      "prompts": {
        "listChanged": true
      },
      "resources": {
        "subscribe": true,
        "listChanged": true
      },
      "tools": {
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "keeper-mcp",
      "version": "0.0.1"
    },
    "instructions": "Keeper MCP"
  }
}
```

**Note:** Server echoes `MCP-Protocol-Version` header if provided by client.

#### 0b. initialized (MCP handshake acknowledgment)
Optional follow-up notification from client. Server acknowledges with no-op response.

Accepts both `notifications/initialized` (spec) and `initialized` (legacy).

**Request:**
```bash
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-0b",
    "method": "notifications/initialized",
    "params": {}
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-0b",
  "result": {
    "ok": true
  }
}
```

#### 1. list_actions (legacy)
Lists all available tools/actions in legacy format.

**Request:**
```bash
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-1",
    "method": "list_actions",
    "params": {}
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "actions": [
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
              "default": 5
            }
          }
        }
      }
    ]
  }
}
```

#### 1b. tools/list (OpenAI Agent Builder format)
Lists all available tools with `inputSchema` in camelCase (MCP spec-correct format).

**Request:**
```bash
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-1",
    "method": "tools/list",
    "params": {}
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "tools": [
      {
        "name": "gk_recent_moments",
        "title": "gk_recent_moments",
        "description": "List recent GenerationKeeper moments in the current domain.",
        "inputSchema": {
          "$schema": "https://json-schema.org/draft-07/schema#",
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
      }
    ]
  }
}
```

**Note:** Uses camelCase `inputSchema` (not `input_schema`) and includes optional `title` field per MCP spec.

#### 2. call_action (legacy)
Invokes a specific tool/action using legacy format.

**Request:**
```bash
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -H "x-domain-id: domain-123" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-2",
    "method": "call_action",
    "params": {
      "name": "gk_recent_moments",
      "arguments": {
        "limit": 5
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-2",
  "result": {
    "moments": [
      {
        "id": "mom_1",
        "title": "Mock Moment 1",
        "domain_id": "domain-123"
      }
    ]
  }
}
```

#### 2b. tools/call (OpenAI Agent Builder format)
Invokes a specific tool using MCP standard format with `arguments` parameter. Returns structured response with both textual and structured content.

**Request:**
```bash
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -H "x-domain-id: domain-123" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-2b",
    "method": "tools/call",
    "params": {
      "name": "gk_recent_moments",
      "arguments": {
        "limit": 5
      }
    }
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-2b",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"moments\":[{\"id\":\"mom_1\",\"title\":\"Mock Moment 1\",\"domain_id\":\"domain-123\"}]}"
      }
    ],
    "structuredContent": {
      "moments": [
        {
          "id": "mom_1",
          "title": "Mock Moment 1",
          "domain_id": "domain-123"
        }
      ]
    },
    "__keeper_canary": {
      "origin": "railway-api",
      "service": "keeper-api-mcp",
      "build": "dev",
      "timestamp": "2025-10-23T12:00:00.000Z"
    }
  }
}
```

**Note:** Accepts both `arguments` (spec) and `args` (legacy). Returns content array for richer client support.

#### 3. capabilities
Returns server capabilities.

**Request:**
```bash
curl -X POST https://api.ke3p.com/mcp \
  -H "Authorization: Bearer YOUR_MCP_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": "req-3",
    "method": "capabilities",
    "params": {}
  }'
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-3",
  "result": {
    "service": "keeper-mcp",
    "version": "0.0.1",
    "protocol": "http",
    "capabilities": {
      "tools": true,
      "actions": true,
      "toolExecution": true,
      "domainScoping": true
    }
  }
}
```

### Error Responses
JSON-RPC errors follow the standard format:

**Method Not Found:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-x",
  "error": {
    "code": -32601,
    "message": "Method not found: unknown_method",
    "data": {
      "availableMethods": [
        "initialize",
        "notifications/initialized",
        "initialized",
        "list_actions",
        "call_action",
        "capabilities",
        "tools/list",
        "tools/call"
      ]
    }
  }
}
```

**Invalid Parameters:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-x",
  "error": {
    "code": -32602,
    "message": "Missing required parameter: name (tool name)"
  }
}
```

**Server Error:**
```json
{
  "jsonrpc": "2.0",
  "id": "req-x",
  "error": {
    "code": -32000,
    "message": "Tool execution failed"
  }
}
```

### Minimal Format Support
For simpler clients, a minimal format is also supported:

```json
{
  "action": "list_actions"
}
```

```json
{
  "action": "call",
  "name": "gk_recent_moments",
  "arguments": { "limit": 3 }
}
```

## 🔍 Logging & Diagnostics

### Request Logging
Every MCP request produces a structured JSON log with zero secrets:
```json
{
  "ts": "2025-10-21T12:34:56.789Z",
  "id": "a7f3k9m2",
  "path": "/mcp/actions/list",
  "method": "POST",
  "status": 200,
  "ms": 12,
  "hasAuth": true,
  "ua": "OpenAI-Agent/1.0",
  "origin": "https://agent.openai.com",
  "tool": "gk_recent_moments"
}
```

**Log Fields:**
- `ts` - ISO 8601 timestamp
- `id` - Unique request ID (also in `x-request-id` response header)
- `path` - Request path
- `method` - HTTP method
- `status` - Response status code
- `ms` - Request latency in milliseconds
- `hasAuth` - Boolean indicating if Authorization header was present (never logs the actual token)
- `ua` - User-Agent header
- `origin` - Origin header (may be "n/a" for server-to-server)
- `tool` - Tool name (only for `/call` endpoint)

**CORS Logging:**
CORS middleware logs each decision separately:
```json
{
  "ts": "2025-10-21T12:34:56.789Z",
  "path": "/mcp/tools",
  "method": "GET",
  "origin": "https://agent.openai.com",
  "hasOrigin": true,
  "allow": true
}
```

### Diagnostic Endpoint
Use `GET /mcp/_diag` to troubleshoot OpenAI Agent 424s:

```bash
curl https://api.ke3p.com/mcp/_diag \
  -H "Authorization: Bearer YOUR_KEY"
```

**Response:**
```json
{
  "service": "keeper-mcp",
  "version": "0.0.1",
  "endpoints": [
    "/mcp/tools",
    "/mcp/actions",
    "/mcp/actions/list",
    "/mcp/call",
    "/mcp/schema",
    "/mcp/_diag",
    "/mcp/health",
    "/mcp/whoami",
    "/mcp/capabilities",
    "/mcp/.well-known/mcp"
  ],
  "hasAuthHeader": true,
  "timestamp": "2025-10-21T12:34:56.789Z"
}
```

**Security:** No bearer tokens, API keys, or sensitive data are logged. Only boolean `hasAuth` / `hasAuthHeader` flags.

### Response Headers
All MCP responses include:
- `x-request-id` - Unique ID matching the log entry
- `Content-Type: application/json; charset=utf-8`

### Troubleshooting OpenAI 424s
1. Check Railway/Vercel logs for `[MCP]` entries
2. Look for requests from OpenAI's origin
3. Verify `hasAuth: true` in logs
4. Check `status` codes (should be 200 for discovery endpoints)
5. Confirm latency is reasonable (`ms < 1000`)
6. Hit `/_diag` to verify server is responding

**Log Grep Examples:**
```bash
# Find all MCP requests in Railway logs
railway logs | grep '\[MCP\]'

# Find failed auth attempts
railway logs | grep '\[MCP\]' | grep '"status":401'

# Find OpenAI Agent requests
railway logs | grep '\[MCP\]' | grep 'OpenAI'

# Find slow requests (>1s)
railway logs | grep '\[MCP\]' | grep '"ms":[0-9]\{4,\}'
```

## 🌐 CORS & OpenAI Agent Builder

### CORS Headers
All MCP endpoints include universal CORS headers:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET,POST,OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, x-domain-id`
- `Access-Control-Max-Age: 600`

### Content-Type
All responses include:
- `Content-Type: application/json; charset=utf-8`

### Preflight Handling
OPTIONS requests are handled automatically and return 200 OK with CORS headers.

### OpenAI Agent Builder Setup
1. **Base URL**: `https://api.ke3p.com/mcp` (or `https://api.ke3p.com/api/mcp`)
2. **Authentication**: Custom Header
3. **Header Name**: `Authorization`
4. **Header Value**: `Bearer YOUR_OPAI_AGENT_MCP_KEY`
5. **Expected Status**: "Connected" ✅ (not "Establishing connection..." or 424)

**Key Points:**
- OpenAI Agent Builder POSTs JSON-RPC 2.0 requests to the **base URL** (no sub-path)
- The base endpoint now supports JSON-RPC format
- No more 424 Failed Dependency errors!

**Troubleshooting Connection Issues:**
- ✅ Verify CORS headers with `curl -i -X OPTIONS https://api.ke3p.com/mcp`
- ✅ Check Content-Type header is `application/json; charset=utf-8`
- ✅ Test JSON-RPC: `curl -X POST https://api.ke3p.com/mcp -H "Authorization: Bearer YOUR_KEY" -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":"test","method":"list_actions","params":{}}'`
- ✅ Check logs for `[MCP]` entries with `rpcMethod` field
- ✅ Verify `/_diag` endpoint: `curl https://api.ke3p.com/mcp/_diag -H "Authorization: Bearer YOUR_KEY"`

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
- ✅ Production-safe structured logs to console (Railway/Vercel)
- ✅ Request ID correlation via `x-request-id` header
- ✅ Zero secrets in logs (only boolean hasAuth flag)
- TODO: Persist logs to database audit table
- TODO: Include full args in DB audit (not console logs)

## 🧪 Testing

### Run Unit Tests
```bash
# From repo root
pnpm --filter @keeper/api test src/mcp/mcp.test.ts

# Watch mode
pnpm --filter @keeper/api test:watch src/mcp/mcp.test.ts
```

### Test Coverage
- ✅ CORS headers (OPTIONS preflight, wildcard origin)
- ✅ Content-Type headers (charset=utf-8)
- ✅ Authentication (valid/invalid keys, different headers)
- ✅ Health check endpoint
- ✅ Schema endpoint
- ✅ Tool call endpoint
- ✅ Domain scoping
- ✅ Error handling
- ✅ Timestamp in all responses

### Test CORS with Curl
```bash
# Set your API key
export OPAI_AGENT_MCP_KEY="your_key_here"

# Run CORS tests
bash test-mcp-cors.sh
```

**Expected Output:**
```
✅ PASS: Preflight returns 200
✅ PASS: CORS Origin is *
✅ PASS: CORS Methods include GET and POST
✅ PASS: Content-Type is application/json; charset=utf-8
✅ PASS: Response body contains ok:true
✅ PASS: Schema contains tools and timestamp
✅ PASS: Tool call response valid
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

## 🐤 Canary Verification System

To prove whether MCP requests reach Railway backend (not dying at Vercel edge), we've added comprehensive canary markers:

### Canary Headers
All `/mcp*` responses include:
- `X-Keeper-Origin: railway-api`
- `X-Keeper-Build: <deployment-id>`
- `X-Keeper-Service: keeper-api-mcp`

### Teapot Endpoint
`GET/POST /mcp/_canary` returns **418 I'm a teapot** with:
```json
{
  "ok": true,
  "why": "teapot",
  "origin": "railway-api",
  "service": "keeper-api-mcp",
  "build": "prod-abc123",
  "timestamp": "..."
}
```

### JSON-RPC Canary Markers
All JSON-RPC success responses include `__keeper_canary`:
```json
{
  "jsonrpc": "2.0",
  "id": "req-1",
  "result": {
    "actions": [...],
    "__keeper_canary": {
      "origin": "railway-api",
      "service": "keeper-api-mcp",
      "build": "prod-abc123",
      "timestamp": "..."
    }
  }
}
```

### Trace Logging
Every `/mcp*` request logged:
```
[MCP TRACE] method=POST path=/mcp host=api.ke3p.com origin="..." ua="..." rid=abc-123
```

### 404 Detection
Missed routes explicitly logged:
```
[MCP 404] method=POST path=/mcp/invalid rid=abc-123
```

### Testing
Run comprehensive verification:
```powershell
.\test-mcp-canary.ps1
```

See [MCP_CANARY_VERIFICATION.md](../../../MCP_CANARY_VERIFICATION.md) for full details.

## 📆 Update Log

**2026-06-18**: Cloud agent runs invoke MCP tools in-process via `mcp.call` action (`services/mcpAgentBridge.ts`). Capability gate now enforced when `agentCapabilities` is present on tool context.

**2025-10-23 (v11)**: Aligned MCP JSON-RPC implementation with OpenAI spec for full compatibility. Key changes: (1) `initialize` now echoes client's `protocolVersion` from params (defaults to "2025-03-26"), returns spec-correct capabilities object with logging/prompts/resources/tools, adds `instructions` field; (2) accepts both `notifications/initialized` (spec) and `initialized` (legacy); (3) `tools/list` now uses camelCase `inputSchema` (not snake_case) and includes optional `title` field; (4) `tools/call` returns structured response with `content` array and `structuredContent` for richer client support, accepts both `arguments` (spec) and `args` (legacy); (5) echoes `MCP-Protocol-Version` header when provided by client. All legacy methods remain fully functional.

**2025-10-23 (v10)**: Implemented MCP handshake protocol with `initialize` and `initialized` methods. The `initialize` method returns server capabilities (`protocolVersion: "2024-10-01"`, tools support) required by OpenAI Agent Builder before it proceeds to `tools/list`. The `initialized` method handles optional follow-up notifications as a no-op. Added `[MCP METHOD]` logger to track every incoming method call for diagnostics. This fixes "Unable to load tools" errors in Agent Builder by properly completing the MCP handshake sequence.

**2025-10-22 (v9)**: Added OpenAI Agent Builder MCP compatibility with `tools/list` and `tools/call` methods. These complement existing `list_actions` and `call_action` methods. Tools format uses `input_schema` (instead of `parameters`) with JSON Schema draft-07 `$schema` property. Preserves backward compatibility with legacy action methods. Enhanced logging to clearly show which method variant is being called. Updated error responses to list all available methods.

**2025-10-22 (v8)**: Added comprehensive canary verification system to prove MCP requests reach Railway backend. Includes: canary headers (`X-Keeper-Origin`), teapot endpoint (`/_canary` → 418), JSON-RPC canary markers (`__keeper_canary`), trace logging (`[MCP TRACE]`), 404 detection, and defensive JSON parsing. Also added PowerShell test script (`test-mcp-canary.ps1`) for A/B verification (Vercel vs direct Railway).

**2025-10-22 (v7)**: Fixed Vercel routing to forward `POST /mcp` to Railway API. Added exact path rewrite for `/mcp` (not just `/mcp/*`) in `vercel.json`. This resolves 405 Method Not Allowed errors when OpenAI Agent Builder POSTs to the base MCP endpoint. Vercel now correctly proxies both `/mcp` and `/mcp/*` to Railway.

**2025-10-22 (v6)**: Added JSON-RPC 2.0 dispatcher (`jsonRpc.ts`, `core.ts`) to fix OpenAI Agent Builder 424 errors. Base endpoint `POST /mcp` now accepts JSON-RPC requests with methods `list_actions`, `call_action`, `capabilities`. Extracted core logic to `core.ts` for reuse by both REST and JSON-RPC dispatchers. Supports both standard JSON-RPC 2.0 format and simplified format. OpenAI Agent Builder now connects successfully without 424 errors!

**2025-10-21 (v5)**: Added production-safe structured logging (`log.ts`, `id.ts`) for troubleshooting OpenAI Agent 424s. All endpoints now emit `[MCP]` JSON logs with request ID, status, latency, hasAuth flag (no secrets). Added `/_diag` diagnostic endpoint. All responses include `x-request-id` header for correlation. CORS middleware logs origin decisions separately.

**2025-10-17 (v4)**: Fixed MCP routing to prevent web app SPA interception. Added standard discovery endpoints (`/tools`, `/capabilities`, `/.well-known/mcp`, `/whoami`). Dual-mounted at `/mcp` and `/api/mcp` for OpenAI Agent Builder compatibility. Added 404 handler to return JSON instead of HTML for unsupported routes.

**2025-10-11 (v3)**: Refactored CORS into dedicated `cors.ts` file. Added server-level OPTIONS handler and `Vary: Origin` header. Improved code organization and maintainability.

**2025-10-11 (v2)**: Added universal CORS headers and proper Content-Type to fix OpenAI Agent Builder connection hanging. All responses now include timestamps.

**2025-10-11 (v1)**: Initial MCP server implementation with two mock tools, API key auth, and unit tests.

## 🔗 Related Documentation
- [KAM Authentication](../kam/README.md) - Cookie-based web auth
- [Domain Management](../../docs/modules/domain-manager.md) - Domain scoping
- [Board Studio API](../api/boards.js) - Board operations

