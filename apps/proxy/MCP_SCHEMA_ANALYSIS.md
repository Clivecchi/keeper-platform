# MCP Schema Endpoint Analysis

## 1. Route Location and Response Construction

### File: `apps/proxy/src/mcpProxy.ts`
**Lines 37-62**: Main schema handler

```typescript
router.get("/schema", async (req: Request, res: Response) => {
  const key = extractApiKey(req);
  const r = await fetch(`${BASE}/api/mcp/schema`, {
    headers: {
      "x-api-key": key,
      "authorization": `Bearer ${key}`
    }
  });
  const src = await r.json(); // current shape: { service, version, tools:[ { name, description, parameters } ] }

  // Transform to MCP v1
  const mcpSchema = {
    mcp: { version: "1.0" },
    server: { name: { human_readable: src.service || "keeper-mcp" }, version: String(src.version || "0.0.1") },
    tools: (src.tools || []).map((t: any) => ({
      name: t.name,
      description: t.description,
      input_schema: t.parameters || { type: "object", properties: {} }, // MCP requires "input_schema"
    })),
  };

  res
    .status(200)
    .set("Content-Type", "application/json; charset=utf-8")
    .json(mcpSchema);
});
```

### File: `apps/proxy/src/index.ts`
**Line 169**: Route mounting
```typescript
app.use("/api/mcp", mcpProxy);
```

---

## 2. Final JSON Structure (MCP v1 Compliant)

The endpoint returns this exact structure:

```json
{
  "mcp": {
    "version": "1.0"
  },
  "server": {
    "name": {
      "human_readable": "keeper-mcp"
    },
    "version": "0.0.1"
  },
  "tools": [
    {
      "name": "create_topic",
      "description": "Create a new topic in the keeper system",
      "input_schema": {
        "type": "object",
        "properties": {
          "title": {
            "type": "string",
            "description": "Topic title"
          },
          "content": {
            "type": "string",
            "description": "Topic content"
          }
        },
        "required": ["title"]
      }
    }
  ]
}
```

**Status**: ✅ **MCP v1 COMPLIANT**

---

## 3. Transformation Function

### File: `apps/proxy/src/mcpProxy.ts`
**Lines 23-26**: Auth extraction

```typescript
function extractApiKey(req: Request) {
  const bearer = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
  return (req.header("x-api-key") || bearer || "").trim();
}
```

**Lines 47-56**: Schema transformation

```typescript
// Transform to MCP v1
const mcpSchema = {
  mcp: { version: "1.0" },
  server: { 
    name: { human_readable: src.service || "keeper-mcp" }, 
    version: String(src.version || "0.0.1") 
  },
  tools: (src.tools || []).map((t: any) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters || { type: "object", properties: {} },
  })),
};
```

**Transformation Details:**
- `src.service` → `server.name.human_readable`
- `src.version` → `server.version` (stringified)
- `tools[].parameters` → `tools[].input_schema` (key rename)
- Adds `mcp.version: "1.0"` wrapper

---

## 4. Auth & CORS Configuration

### File: `apps/proxy/src/mcpProxy.ts`
**Lines 8-20**: CORS middleware

```typescript
router.use((req, res, next) => {
  const origin = (req.headers.origin as string) || "";
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,HEAD");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key, x-domain-id");
  res.setHeader("Access-Control-Max-Age", "600");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
```

**Headers Accepted:**
- `Authorization: Bearer <token>`
- `x-api-key: <key>`

**Headers Forwarded to Upstream:**
- `x-api-key: <extracted_key>`
- `authorization: Bearer <extracted_key>`

**Methods Allowed:**
- `GET` - Main schema fetch
- `POST` - Tool calls
- `OPTIONS` - CORS preflight
- `HEAD` - Health probes

**CORS Behavior:**
- Echoes request `Origin` header (universal CORS)
- Allows credentials
- 600s cache for preflight

---

## 5. Environment Variables

### File: `apps/proxy/src/mcpProxy.ts`
**Line 5:**
```typescript
const BASE = process.env.KEEPER_API_BASE!;
```

### File: `apps/proxy/src/index.ts`
**Lines 11-17:**
```typescript
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const KAM_SERVICE_KEY = String(process.env.KAM_SERVICE_KEY || "dev-kam-key");
const KEEPER_API_BASE = String(process.env.KEEPER_API_BASE || "https://keeper-platform-production.up.railway.app");
const CORS_ORIGINS = String(process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((s) => s.trim())
  .filter((s) => s.length > 0);
```

**Environment Variables Used:**
- `KEEPER_API_BASE` - Upstream API base URL (required for mcpProxy)
- `PORT` - Server port (default: 3000)
- `CORS_ORIGINS` - Allowed origins for global CORS (not used by MCP routes, they echo Origin)
- `KEEPER_PROXY_ENABLED` - Feature flag to enable proxy (default: false)
- `NODE_ENV` - Environment mode (production/dev)

**Note:** MCP routes do NOT use the global `CORS_ORIGINS` allowlist. They implement universal CORS by echoing any Origin.

---

## 6. Complete Request Flow

1. **Request arrives:** `GET /api/mcp/schema` with `Authorization: Bearer <token>` or `x-api-key: <key>`
2. **Global middleware:** (index.ts) - Express JSON parser, global CORS (skipped by MCP middleware)
3. **MCP Router CORS:** (mcpProxy.ts:8-20) - Sets MCP-specific CORS headers, echoes Origin
4. **Auth extraction:** (mcpProxy.ts:23-26) - Extracts key from Bearer token OR x-api-key header
5. **Upstream fetch:** (mcpProxy.ts:39-44) - Fetches from `${KEEPER_API_BASE}/api/mcp/schema`
6. **Transform:** (mcpProxy.ts:47-56) - Converts to MCP v1 format
7. **Response:** (mcpProxy.ts:58-61) - Returns JSON with `Content-Type: application/json; charset=utf-8`

---

## 7. Upstream vs Proxy Format

### Upstream Format (from `${KEEPER_API_BASE}/api/mcp/schema`)
```json
{
  "service": "keeper-mcp",
  "version": "0.0.1",
  "tools": [
    {
      "name": "create_topic",
      "description": "Create a new topic",
      "parameters": {
        "type": "object",
        "properties": {...}
      }
    }
  ]
}
```

### Proxy Format (MCP v1)
```json
{
  "mcp": { "version": "1.0" },
  "server": {
    "name": { "human_readable": "keeper-mcp" },
    "version": "0.0.1"
  },
  "tools": [
    {
      "name": "create_topic",
      "description": "Create a new topic",
      "input_schema": {
        "type": "object",
        "properties": {...}
      }
    }
  ]
}
```

**Key Changes:**
- ✅ Wrapped in `mcp.version: "1.0"`
- ✅ `service` → `server.name.human_readable`
- ✅ `version` → `server.version`
- ✅ `tools[].parameters` → `tools[].input_schema`

