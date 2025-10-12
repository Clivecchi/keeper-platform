# MCP Schema - Quick Reference Card

## 📍 Current Status: ✅ MCP v1 COMPLIANT

---

## 🎯 Route Location

**Endpoint:** `GET /api/mcp/schema`  
**File:** `apps/proxy/src/mcpProxy.ts`  
**Lines:** 37-62

---

## 📤 Actual JSON Output

```json
{
  "mcp": { "version": "1.0" },
  "server": {
    "name": { "human_readable": "keeper-mcp" },
    "version": "0.0.1"
  },
  "tools": [
    {
      "name": "tool_name",
      "description": "Tool description",
      "input_schema": { "type": "object", "properties": {...} }
    }
  ]
}
```

**✅ Compliant:** All MCP v1 required fields present

---

## 🔑 Auth

**Accepts:**
- `Authorization: Bearer <token>`
- `x-api-key: <key>`

**Forwards both to upstream:**
```json
{
  "x-api-key": "<extracted_key>",
  "authorization": "Bearer <extracted_key>"
}
```

---

## 🌐 CORS

**Behavior:** Universal (echoes any Origin)  
**Headers:** Content-Type, Authorization, x-api-key, x-domain-id  
**Methods:** GET, POST, OPTIONS, HEAD  
**Credentials:** Allowed

---

## 🔧 Env Vars

- `KEEPER_API_BASE` - Required (upstream URL)
- `NODE_ENV` - Optional (enables debug route)
- `MCP_DEBUG_KEY` - Optional (debug auth)

---

## 🐛 Debug Route (Dev Only)

**Endpoint:** `GET /api/mcp/__debug/mcp-schema`  
**Auth:** None required  
**Shows:** Both upstream and transformed schemas

```bash
curl http://localhost:3000/api/mcp/__debug/mcp-schema | jq .
```

---

## 🧪 Tests

**File:** `apps/proxy/src/mcpProxy.test.ts`  
**Run:** `pnpm test`  
**Coverage:** MCP v1 compliance, auth, CORS, probes

---

## 📚 Documentation Files

1. **`DELIVERABLES_SUMMARY.md`** - Complete deliverables overview
2. **`MCP_SCHEMA_VERIFICATION.md`** - Verification guide & commands
3. **`MCP_SCHEMA_ANALYSIS.md`** - Technical deep dive
4. **`MCP_QUICK_REFERENCE.md`** - This file

---

## ⚡ Quick Test

```bash
# Production
curl -H "Authorization: Bearer $KEY" \
  https://keeper-domains-proxy-production.up.railway.app/api/mcp/schema | jq .

# Verify MCP v1
curl -s -H "Authorization: Bearer $KEY" \
  https://your-proxy/api/mcp/schema | \
  jq 'has("mcp") and has("server") and has("tools")'
# Expected: true
```

---

## ✅ Compliance Checklist

- [x] `mcp.version` = `"1.0"`
- [x] `server.name.human_readable` exists
- [x] `server.version` exists
- [x] `tools[].input_schema` (NOT parameters)
- [x] Dual auth support
- [x] Universal CORS
- [x] HEAD probes
- [x] Content-Type with charset
- [x] Unit tests
- [x] Debug route

**Status: PRODUCTION READY** 🚀

