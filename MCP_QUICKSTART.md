# MCP Server Quick Start

## 🚀 Deploy in 5 Minutes

### Step 1: Generate API Key
```bash
# Option 1: OpenSSL
openssl rand -base64 32

# Option 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Option 3: Online (https://generate-secret.vercel.app)
```

**Save this key!** You'll need it for Railway and testing.

---

### Step 2: Set Railway Environment Variable
1. Go to [Railway Dashboard](https://railway.app)
2. Select **keeper-platform** project → **API** service
3. Go to **Variables** tab
4. Click **+ New Variable**
5. Add:
   ```
   OPAI_AGENT_MCP_KEY = <your-generated-key>
   ```
6. Save and wait for auto-deploy (~2 minutes)

---

### Step 3: Test Health Check
```bash
# Replace YOUR_KEY with the key from Step 1
curl -X GET https://api.ke3p.com/api/mcp/ \
  -H "Authorization: Bearer YOUR_KEY"
```

**Expected Response:**
```json
{
  "ok": true,
  "service": "keeper-mcp",
  "version": "0.0.1",
  "timestamp": "2025-10-11T12:00:00.000Z"
}
```

✅ If you see this, MCP server is working!

---

### Step 4: Get Tool Schema
```bash
curl -X GET https://api.ke3p.com/api/mcp/schema \
  -H "Authorization: Bearer YOUR_KEY"
```

**Expected Response:**
```json
{
  "service": "keeper-mcp",
  "version": "0.0.1",
  "tools": [
    {
      "name": "gk_recent_moments",
      "description": "List recent GenerationKeeper moments...",
      "parameters": { ... }
    },
    {
      "name": "pool_create_quote",
      "description": "Create a PoolKeeper quote...",
      "parameters": { ... }
    }
  ]
}
```

---

### Step 5: Call a Tool
```bash
curl -X POST https://api.ke3p.com/api/mcp/call \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "gk_recent_moments",
    "args": { "limit": 3 }
  }'
```

**Expected Response:**
```json
{
  "ok": true,
  "result": {
    "moments": [
      { "id": "mom_1", "title": "Mock Moment 1", "domain_id": null },
      { "id": "mom_2", "title": "Mock Moment 2", "domain_id": null },
      { "id": "mom_3", "title": "Mock Moment 3", "domain_id": null }
    ]
  },
  "timestamp": "2025-10-11T12:00:00.000Z"
}
```

---

## 🔧 Troubleshooting

### 401 Unauthorized
- ❌ **Problem**: Wrong or missing API key
- ✅ **Fix**: 
  1. Check key matches Railway env var exactly
  2. No extra spaces or quotes
  3. Use `Bearer` prefix or `x-api-key` header

### 404 Not Found
- ❌ **Problem**: Route doesn't exist or API not deployed
- ✅ **Fix**:
  1. Check URL is `https://api.ke3p.com/api/mcp/`
  2. Verify API is deployed in Railway
  3. Check Railway logs for startup errors

### Connection Refused
- ❌ **Problem**: API server is down
- ✅ **Fix**:
  1. Check Railway service status
  2. Look at Railway logs for errors
  3. Verify domain is correct

---

## 📝 Common Curl Examples

### Test with x-api-key header
```bash
curl -X GET https://api.ke3p.com/api/mcp/ \
  -H "x-api-key: YOUR_KEY"
```

### Call tool with domain scoping
```bash
curl -X POST https://api.ke3p.com/api/mcp/call \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -H "x-domain-id: domain-123" \
  -d '{
    "name": "pool_create_quote",
    "args": {
      "projectId": "proj_abc123",
      "craneOverHouse": true,
      "includesHeatPump": false
    }
  }'
```

### Pretty print JSON with jq
```bash
curl -X GET https://api.ke3p.com/api/mcp/schema \
  -H "Authorization: Bearer YOUR_KEY" \
  | jq .
```

---

## 🤖 OpenAI Agent Integration

### Configuration
```json
{
  "name": "keeper-mcp",
  "base_url": "https://api.ke3p.com/api/mcp",
  "auth": {
    "type": "bearer",
    "token": "YOUR_MCP_KEY"
  }
}
```

### Available Tools
- `gk_recent_moments(limit?: number)` - List recent moments
- `pool_create_quote(projectId: string, craneOverHouse?: boolean, includesHeatPump?: boolean)` - Create quote

---

## 📊 Monitoring

### Check Server Health
```bash
# Quick health check
curl -s https://api.ke3p.com/api/mcp/ \
  -H "Authorization: Bearer YOUR_KEY" \
  | jq '.ok'
# Should output: true
```

### View Railway Logs
1. Go to Railway Dashboard
2. Select API service
3. Click **Deployments** tab
4. Click latest deployment
5. View **Logs** tab

Look for:
```
✅ Keeper API Server (Domain-Enabled Version)
🚀 Server running on port 8080
```

---

## 🧪 Run Tests Locally

### Prerequisites
```bash
# Install dependencies (from repo root)
pnpm install

# Set test API key
export OPAI_AGENT_MCP_KEY="test-key-12345"
```

### Run Tests
```bash
# All MCP tests
pnpm --filter @keeper/api test src/mcp/mcp.test.ts

# Watch mode
pnpm --filter @keeper/api test:watch src/mcp/mcp.test.ts

# With coverage
pnpm --filter @keeper/api test:coverage src/mcp/mcp.test.ts
```

**Expected Output:**
```
✓ src/mcp/mcp.test.ts (18 tests) 125ms
  ✓ MCP Server > Authentication (8)
  ✓ MCP Server > Health Check (1)
  ✓ MCP Server > Schema Endpoint (3)
  ✓ MCP Server > Tool Call Endpoint (8)
  ✓ MCP Server > Domain Scoping (2)

Test Files  1 passed (1)
     Tests  18 passed (18)
```

---

## 📚 Next Steps

1. ✅ **Deploy** - Set Railway env var and deploy
2. ✅ **Test** - Run curl commands to verify
3. ✅ **Integrate** - Connect OpenAI Agent
4. 🔄 **Extend** - Add more tools as needed
5. 🔄 **Connect DB** - Wire tools to real data

---

## 🔗 Documentation Links

- **Full README**: `apps/api/src/mcp/README.md`
- **Implementation Summary**: `MCP_IMPLEMENTATION_SUMMARY.md`
- **API README**: `apps/api/README.md`
- **Test File**: `apps/api/src/mcp/mcp.test.ts`

---

## ✅ Deployment Checklist

- [ ] Generated secure API key (32+ characters)
- [ ] Added `OPAI_AGENT_MCP_KEY` to Railway
- [ ] Verified API deployed successfully
- [ ] Tested health check endpoint
- [ ] Tested schema endpoint
- [ ] Tested tool call endpoint
- [ ] Shared API key with OpenAI Agent team
- [ ] Monitored Railway logs for errors

---

**Ready to deploy?** Start with Step 1! 🚀

