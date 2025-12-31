# OpenAI Agent Builder - MCP Server Setup

## 🚀 Quick Setup (2 Minutes)

### Step 1: Deploy Updated API
```bash
# Push changes to trigger Railway deployment
git add .
git commit -m "Fix MCP CORS for OpenAI Agent Builder"
git push origin main

# Wait for deployment (~2 minutes)
# Check Railway dashboard for "Deployed" status
```

### Step 2: Verify CORS Headers
```bash
# Test OPTIONS preflight
curl -i -X OPTIONS https://api.ke3p.com/api/mcp/schema

# Should see:
# HTTP/1.1 200 OK
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Methods: GET,POST,OPTIONS
```

### Step 3: Configure OpenAI Agent Builder

#### Connection Settings
```
Name: Keeper MCP
Base URL: https://api.ke3p.com/api/mcp
Authentication: Bearer Token
API Key: [Your OPAI_AGENT_MCP_KEY value from Railway]
```

#### Finding Your API Key
1. Go to Railway → keeper-platform project → API service
2. Variables tab
3. Find `OPAI_AGENT_MCP_KEY`
4. Copy the value

### Step 4: Test Connection

1. Click "Connect" in OpenAI Agent Builder
2. Wait 2-5 seconds
3. Status should change to **"Connected"** ✅

**If it hangs at "Establishing connection...":**
- See troubleshooting section below

---

## 🧪 Verify Setup

### Test Health Endpoint
```bash
curl https://api.ke3p.com/api/mcp/ \
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

### Test Schema Endpoint
```bash
curl https://api.ke3p.com/api/mcp/schema \
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
  ],
  "timestamp": "2025-10-11T12:00:00.000Z"
}
```

### Run Full CORS Tests
```bash
export OPAI_AGENT_MCP_KEY="your_key_here"
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

---

## 🐛 Troubleshooting

### Problem: "Establishing connection..." Hangs

#### Check 1: CORS Headers
```bash
curl -i -X OPTIONS https://api.ke3p.com/api/mcp/schema
```

**Look for:**
- `HTTP/1.1 200 OK` ✅
- `Access-Control-Allow-Origin: *` ✅
- `Access-Control-Allow-Methods: GET,POST,OPTIONS` ✅

**If missing:**
- Verify deployment completed
- Check Railway logs for errors
- Redeploy if needed

#### Check 2: API Key
```bash
curl https://api.ke3p.com/api/mcp/ \
  -H "Authorization: Bearer YOUR_KEY"
```

**If 401 Unauthorized:**
- Verify key matches Railway env var
- No extra spaces or quotes
- Case-sensitive

#### Check 3: Content-Type
```bash
curl -i https://api.ke3p.com/api/mcp/ \
  -H "Authorization: Bearer YOUR_KEY"
```

**Look for:**
- `Content-Type: application/json; charset=utf-8` ✅

**If missing:**
- Verify changes were deployed
- Check Railway build logs

#### Check 4: Railway Logs
1. Go to Railway Dashboard
2. Select API service
3. Click Deployments → Latest
4. View Logs
5. Look for startup errors

**Should see:**
```
✅ Keeper API Server (Domain-Enabled Version)
🚀 Server running on port 8080
```

---

### Problem: 401 Unauthorized

**Cause**: API key mismatch

**Fix:**
1. Get key from Railway Variables tab
2. Copy exact value (no spaces)
3. Paste into OpenAI Agent Builder
4. Try again

---

### Problem: Schema Not Loading

**Cause**: Endpoint not responding or auth failing

**Fix:**
1. Test with curl:
   ```bash
   curl https://api.ke3p.com/api/mcp/schema \
     -H "Authorization: Bearer YOUR_KEY"
   ```
2. Verify 200 response with tools array
3. Check tools are present in response

---

### Problem: Tools Not Callable

**Cause**: Tool call endpoint issue

**Fix:**
1. Test tool call manually:
   ```bash
   curl -X POST https://api.ke3p.com/api/mcp/call \
     -H "Authorization: Bearer YOUR_KEY" \
     -H "Content-Type: application/json" \
     -d '{"name":"gk_recent_moments","args":{"limit":2}}'
   ```
2. Verify response includes `"ok": true` and result
3. Check Railway logs for errors

---

## 📋 Pre-Flight Checklist

Before testing in OpenAI Agent Builder:

- [ ] Changes pushed to main branch
- [ ] Railway deployment completed (check dashboard)
- [ ] OPTIONS returns 200 with CORS headers
- [ ] GET `/api/mcp/` returns health check with timestamp
- [ ] GET `/api/mcp/schema` returns tools with timestamp
- [ ] POST `/api/mcp/call` works with test tool
- [ ] API key copied from Railway Variables
- [ ] No trailing spaces in API key

---

## 🎯 Success Indicators

### In OpenAI Agent Builder

✅ **Status**: "Connected" (not "Establishing connection...")  
✅ **Schema**: Loaded successfully  
✅ **Tools**: 2 tools visible (gk_recent_moments, pool_create_quote)  
✅ **Description**: Tool descriptions visible  
✅ **Parameters**: Tool parameters visible  

### In Curl Tests

✅ **OPTIONS**: 200 OK with CORS headers  
✅ **GET /**: 200 OK with health check  
✅ **GET /schema**: 200 OK with tools array  
✅ **POST /call**: 200 OK with result  
✅ **Content-Type**: `application/json; charset=utf-8`  
✅ **Timestamps**: Present in all responses  

---

## 🔧 Advanced Configuration

### Custom Domain Scoping
Add `x-domain-id` header to scope tools to a specific domain:

```
x-domain-id: domain-123
```

### Multiple API Keys
To create multiple keys:
1. Generate new key: `openssl rand -base64 32`
2. Add as separate Railway variable (e.g., `OPAI_AGENT_MCP_KEY_2`)
3. Update code to check multiple keys (or use CSV list)

### Rate Limiting (TODO)
Currently no rate limiting. To add:
1. Install `express-rate-limit`
2. Add middleware before routes
3. Limit to 100 req/5min per key

---

## 📞 Support

### Documentation
- **Full README**: `apps/api/src/mcp/README.md`
- **CORS Fix Summary**: `MCP_CORS_FIX_SUMMARY.md`
- **Implementation Summary**: `MCP_IMPLEMENTATION_SUMMARY.md`

### Test Scripts
- **CORS Tests**: `test-mcp-cors.sh`
- **Unit Tests**: `apps/api/src/mcp/mcp.test.ts`

### Quick Tests
```bash
# Health check
curl https://api.ke3p.com/api/mcp/ -H "Authorization: Bearer KEY"

# Schema
curl https://api.ke3p.com/api/mcp/schema -H "Authorization: Bearer KEY"

# Tool call
curl -X POST https://api.ke3p.com/api/mcp/call \
  -H "Authorization: Bearer KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"gk_recent_moments","args":{"limit":2}}'
```

---

## ✅ Final Checklist

- [ ] API deployed to Railway
- [ ] CORS headers verified
- [ ] Health check works
- [ ] Schema loads
- [ ] Tool call works
- [ ] OpenAI Agent Builder configured
- [ ] Connection status shows "Connected"
- [ ] Tools are visible and callable

---

**Ready to connect!** 🚀

Copy your `OPAI_AGENT_MCP_KEY` from Railway and paste it into OpenAI Agent Builder.

