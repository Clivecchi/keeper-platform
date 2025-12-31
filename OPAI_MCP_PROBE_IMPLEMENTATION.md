# OpenAI Agent "Opai" MCP Connectivity Probe

**Date:** 2025-10-17  
**Status:** ✅ Implemented  
**Endpoint:** `GET /api/debug/opai-mcp-probe`

## Purpose

Read-only debug endpoint that reports whether OpenAI Agent Builder "Opai" can reach our MCP server and list available tools. Does not modify auth, cookies, or any server state—only observes and reports connectivity status.

## Problem Context

We have an OpenAI Agent ("Opai") configured with MCP tools. Previous attempts to connect failed, but we lacked visibility into where the connection was breaking:
- **Reachability?** DNS/TLS/network issues?
- **Auth?** Invalid bearer token?
- **MCP Handshake?** Wrong endpoint or protocol?

This probe provides a single JSON snapshot to diagnose the exact failure point.

## Endpoint Details

### Route
```
GET /api/debug/opai-mcp-probe
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPAI_AGENT_MCP_URL` | Yes | Public base URL of the MCP server (e.g., `https://proxy.ke3p.com/mcp`) |
| `OPAI_AGENT_MCP_KEY` | No* | Bearer token for MCP server authentication |

*If `OPAI_AGENT_MCP_KEY` is missing, reachability still runs but auth will fail with error message.

### Three-Phase Probe

#### Phase 1: Reachability Test
- **Endpoint:** `{OPAI_AGENT_MCP_URL}/health`
- **Method:** `GET`
- **Timeout:** 5 seconds
- **Checks:** HTTP connectivity, DNS resolution, TLS handshake
- **Result:** Sets `reachable` boolean and `reach` object with status/error

#### Phase 2: Auth Test
- **Endpoint:** `{OPAI_AGENT_MCP_URL}/whoami`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {OPAI_AGENT_MCP_KEY}`
- **Timeout:** 5 seconds
- **Checks:** Bearer token validity
- **Result:** Sets `authOk` boolean and `auth` object with status/error
- **Skipped if:** No `OPAI_AGENT_MCP_KEY` provided

#### Phase 3: MCP Handshake (Tool Discovery)
- **Attempts multiple endpoints in order:**
  1. `{OPAI_AGENT_MCP_URL}/tools`
  2. `{OPAI_AGENT_MCP_URL}/mcp/tools`
  3. `{OPAI_AGENT_MCP_URL}/api/tools`
- **Method:** `GET`
- **Headers:** `Authorization: Bearer {OPAI_AGENT_MCP_KEY}`
- **Timeout:** 5 seconds per endpoint
- **Checks:** MCP protocol handshake and tool list retrieval
- **Result:** Sets `handshakeOk` boolean and `tools` array with tool names
- **Skipped if:** Auth failed

### Response Schema

```typescript
{
  mcpUrl: string | null;           // The MCP URL being tested
  reachable: boolean;               // True if base health endpoint responds
  reach: {                          // Reachability test details
    status: number | null;          // HTTP status code
    ok: boolean;                    // True if 200-299
    error: string | null;           // Error message if failed
  };
  authOk: boolean;                  // True if auth endpoint accepts token
  auth: {                           // Auth test details
    status: number | null;          // HTTP status code
    ok: boolean;                    // True if 200-299
    error: string | null;           // Error message if failed
  };
  handshakeOk: boolean;             // True if tool list retrieved
  tools: string[];                  // Array of tool names/IDs
  error: string | null;             // Overall error message if any
  timestamp: string;                // ISO timestamp of probe
}
```

### Example Responses

#### Success - All Checks Pass
```json
{
  "mcpUrl": "https://proxy.ke3p.com/mcp",
  "reachable": true,
  "reach": {
    "status": 200,
    "ok": true,
    "error": null
  },
  "authOk": true,
  "auth": {
    "status": 200,
    "ok": true,
    "error": null
  },
  "handshakeOk": true,
  "tools": [
    "read_file",
    "write_file",
    "list_directory",
    "search_files"
  ],
  "error": null,
  "timestamp": "2025-10-17T14:30:00.000Z"
}
```

#### Failure - Missing URL
```json
{
  "mcpUrl": null,
  "reachable": false,
  "reach": {
    "status": null,
    "ok": false,
    "error": null
  },
  "authOk": false,
  "auth": {
    "status": null,
    "ok": false,
    "error": null
  },
  "handshakeOk": false,
  "tools": [],
  "error": "missing OPAI_AGENT_MCP_URL",
  "timestamp": "2025-10-17T14:30:00.000Z"
}
```

#### Failure - Auth Failed
```json
{
  "mcpUrl": "https://proxy.ke3p.com/mcp",
  "reachable": true,
  "reach": {
    "status": 200,
    "ok": true,
    "error": null
  },
  "authOk": false,
  "auth": {
    "status": 401,
    "ok": false,
    "error": "HTTP 401"
  },
  "handshakeOk": false,
  "tools": [],
  "error": null,
  "timestamp": "2025-10-17T14:30:00.000Z"
}
```

#### Failure - Network Timeout
```json
{
  "mcpUrl": "https://proxy.ke3p.com/mcp",
  "reachable": false,
  "reach": {
    "status": null,
    "ok": false,
    "error": "timeout after 5s"
  },
  "authOk": false,
  "auth": {
    "status": null,
    "ok": false,
    "error": "missing OPAI_AGENT_MCP_KEY"
  },
  "handshakeOk": false,
  "tools": [],
  "error": null,
  "timestamp": "2025-10-17T14:30:00.000Z"
}
```

## Security & Privacy

### No Secrets Exposed
- Bearer tokens are **never** included in responses
- Tokens are masked in logs: `****W1AA` (only last 4 chars shown)
- Only connection status and tool names are returned
- No request/response bodies are logged

### Read-Only Operation
- No state modifications
- No database writes
- No auth changes
- No cookie manipulation
- No CORS modifications

### Timeouts & Limits
- Each network request has a 5-second timeout
- No retry logic (single attempt per check)
- Minimal resource usage

## Testing & Usage

### Test from Command Line

#### PowerShell
```powershell
Invoke-RestMethod -Uri "https://api.ke3p.com/api/debug/opai-mcp-probe" -Method Get | ConvertTo-Json
```

#### curl
```bash
curl https://api.ke3p.com/api/debug/opai-mcp-probe
```

#### From Browser
Simply navigate to:
```
https://api.ke3p.com/api/debug/opai-mcp-probe
```

### Interpreting Results

#### ✅ Full Success
- `reachable: true`
- `authOk: true`
- `handshakeOk: true`
- `tools: ["tool1", "tool2", ...]`

**Meaning:** MCP server is fully operational. OpenAI Agent Builder should be able to connect.

#### ⚠️ Reachability Failed
- `reachable: false`
- `reach.error: "timeout after 5s"` or DNS error

**Meaning:** Network or DNS issue. Check:
- MCP server is running
- Firewall rules allow inbound connections
- DNS is correctly configured
- TLS certificate is valid

#### ⚠️ Auth Failed
- `reachable: true`
- `authOk: false`
- `auth.error: "HTTP 401"`

**Meaning:** Bearer token is invalid or expired. Check:
- `OPAI_AGENT_MCP_KEY` is set correctly in environment
- Token matches what MCP server expects
- Token hasn't expired

#### ⚠️ Handshake Failed
- `reachable: true`
- `authOk: true`
- `handshakeOk: false`

**Meaning:** MCP protocol issue. Check:
- MCP server implements standard tool discovery endpoints
- Endpoint paths match expected convention (`/tools`, `/mcp/tools`, or `/api/tools`)
- Response format is valid JSON with tool list

## Implementation Notes

### File Modified
- `apps/api/src/api/debug.ts` - Added new route handler

### Dependencies
- Uses native `fetch` API (Node.js 18+)
- Uses `AbortController` for timeouts
- Uses existing `logger` from `@keeper/shared`

### Tool Endpoint Discovery
The probe tries multiple common MCP endpoint paths:
1. `/tools` - Standard MCP convention
2. `/mcp/tools` - Namespaced variant
3. `/api/tools` - API prefix variant

First successful response is used. Stops on first match.

### Tool Name Extraction
Supports multiple response formats:
```json
// Format 1: Direct array
["tool1", "tool2"]

// Format 2: Wrapped in tools property
{ "tools": [{ "name": "tool1" }, { "name": "tool2" }] }

// Format 3: Wrapped in data property
{ "data": [{ "id": "tool1" }, { "id": "tool2" }] }
```

## Troubleshooting

### Probe endpoint returns 404
- API server not running
- Debug routes not mounted
- Check API server logs

### All checks fail with "missing OPAI_AGENT_MCP_URL"
- Environment variable not set
- Add `OPAI_AGENT_MCP_URL=https://your-mcp-server.com` to Railway/environment

### Reachability fails but server is running
- Firewall blocking connections
- Server not listening on public interface
- TLS certificate issues
- Check with: `curl https://your-mcp-server.com/health`

### Auth fails but key is correct
- Key format incorrect (should be bare token, not "Bearer token")
- MCP server expects different auth header
- Key expired or revoked

### Handshake fails but auth succeeds
- Tool endpoint path mismatch
- MCP server not implementing standard discovery
- Response format doesn't match expected schema
- Check MCP server documentation for correct endpoint

## Next Steps (Optional)

1. **Monitoring:** Set up periodic probes and alert if connectivity drops
2. **Metrics:** Track probe success rate over time
3. **Dashboard:** Add visual status indicator in admin UI
4. **Notifications:** Send alerts when probe fails
5. **Extended Probes:** Add per-tool health checks

## Acceptance Criteria - All Met ✅

- [x] `GET /api/debug/opai-mcp-probe` returns 200 with JSON object
- [x] When `OPAI_AGENT_MCP_URL` unset, returns `reachable=false` and error message
- [x] When `OPAI_AGENT_MCP_KEY` unset, reachability runs but `authOk=false`
- [x] With valid URL/key against live MCP server, all checks pass
- [x] No secrets in logs or responses (tokens masked as `****W1AA`)
- [x] All network errors summarized as short strings
- [x] Read-only operation (no modifications)
- [x] No changes to auth, cookies, or CORS
- [x] Available in production
- [x] Small timeout prevents hanging (5s per check)
- [x] One attempt per step (no endless retries)

