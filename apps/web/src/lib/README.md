# lib

## 📌 Purpose
Core utility functions and API clients for the Keeper web application, including authentication-aware API calls and service integrations.

## 🧱 Key Files
- `api.ts` - Core API client with authentication error handling
- `themeApi.ts` - Theme fetching and management
- `kipApi.ts` - KIP (Keeper Intelligence Platform) API client
- `agentRegistry.ts` - Agent registration and discovery
- `governanceApi.ts` - Domain governance, contracts, compliance metrics

## 🔄 Data & Behavior
- **API Client**: Centralized fetch wrapper with proper error handling
- **Authentication**: Bearer token management and error prevention
- **Theme Management**: User theme preferences and fallback handling
- **Agent Registry**: Dynamic agent discovery and routing
- **HTTP Requests**: Backend service communication
- **Mock Agent Support**: Development and testing utilities

## ⚠️ Notes & ToDo
- [x] Fixed Microsoft sign-in prompts by improving API error handling
- [x] Added authentication headers to API requests
- [ ] Replace mock TypeAgent with real implementation
- [ ] Add request retry logic for network failures
- [ ] Implement request caching for performance
- [ ] Add request interceptors for logging

## 📆 Update Log

### 2025-12-17 - Domain policy client
- Added `getDomainPolicy`/`updateDomainPolicy` helpers to edit domain-scoped Kip policy JSON via `/api/domains/:domainId/policy`.
### 2025-12-16 - Kip drafts client + environment helper
- Added Kip draft directory client helpers (list/read/create/update, set/clear active draft) and `getEnvironment` to surface session-bound activeDraft summaries from `/api/domains/:domainId/kip/environment`.

### 2025-12-13 - KipApi session diagnostics + domain-aware payload
- `createSession` now accepts optional domainId/domainSlug and logs URL/body before the call; errors include HTTP status/request id for session create/message fetch.

### 2025-12-12 - KipApi createSession/messaging error enrichment
- KipApi now logs create-session payloads for debugging, enriches thrown errors with HTTP status and request ids from headers, and surfaces backend error messages for create-session and message fetch failures.

### 2025-12-11 - Session metadata patch endpoint
- Added `KipApi.updateSessionMetadata`, surfaced topic/summary/tag fields on `KipSession`, and aligned session creation defaults with the new topic column.

### 2025-12-10 - Kip sessions response normalization
- `KipApi.getSessionsByAgentId` now understands the `{ sessions, total, page }` envelope and returns the sessions array, preventing UI `.map` errors in the Kip Agent Board.

### 2025-12-08 - apiFetch Error Payload Propagation
- Error objects now prefer API-provided `message` values and include `error.code` plus the parsed response body on `error.data`. This enables UI surfaces (e.g., DomainAgentPage) to render actionable error copy instead of generic HTTP codes.

### 2025-10-17 - apiFetch Error Status Attachment Fix
**Issue Resolved**: Error objects thrown by `apiFetch` didn't include `status` property, preventing `handleAuthError` from detecting 401s
**Root Cause**: Plain `Error` objects were thrown without attaching the HTTP status code from the response
**Solution**: All error objects now include `error.status` and `error.response` properties for proper error handling
**Impact**: 401 errors are now properly detected and handled, preventing inappropriate session clearing on non-auth errors

### 2025-10-15 - apiFetch JSON Parsing Fix
**Issue Resolved**: `apiFetch` was returning raw Response objects instead of parsed JSON
**Root Cause**: The function was calling `return fetch(...)` directly without awaiting and parsing the response body
**Solution**: Updated `apiFetch` to await response, check status, and return parsed JSON. Error responses are caught and thrown as Error objects with meaningful messages.
**Impact**: All API calls now receive parsed JSON data directly, fixing login errors and simplifying error handling across the application

### 2025-09-13 - Added shared apiFetch with env/global/same-origin base and JWT
**Change**: Introduced `apiFetch.ts` with base URL resolution priority: `VITE_API_URL` → `window.__API_URL` → `location.origin`. Added JWT auto-injection from storage and JSON content-type defaults. Exported as global `apiFetch` for legacy callers. Updated `api.ts` to re-export from `apiFetch`.
**Impact**: Fixes "apiFetch is not defined" and prevents 404s due to env drift; compatible with Vercel same-origin.

### 2025-01-15 - Microsoft Authentication Fix
**Issue Resolved**: Fixed double Microsoft sign-in prompts during login
**Root Cause**: API error handling was throwing raw Response objects, which could trigger browser-level authentication prompts when responses contained certain headers
**Solution**: Modified `apiFetch` to create proper Error objects instead of throwing Response objects, preventing browser authentication challenges
**Impact**: Users should no longer see Microsoft sign-in prompts when using the platform

### 2025-01-15 - Authentication Protection Restored  
**Issue**: Routes were accessible without authentication
**Solution**: Added `ProtectedRoute` component to wrap authenticated routes
**Impact**: All protected routes now properly redirect to login when user is not authenticated

### 2025-01-03 - Initial Implementation
- Added agentRegistry.ts with mock agents and TypeAgent simulation
- Added kipApi.ts with database-backed KIP agent operations
- Established core API client functionality 

### 2026-02-08 - KipApi runAgent error surfacing
- **kipApi.ts**: Removed mock fallback from `runAgent()` — API errors (429 quota, 401 auth, etc.) were being silently caught and replaced with mock responses, hiding all failures from the user. Now, real errors propagate to the UI.
- **kipApi.ts**: Added inner `AgentResponse.success` check — the API returns HTTP 200 even when the agent execution fails internally (`success: false`). The method now detects this and throws with the real error message, including user-friendly messages for `QUOTA_EXCEEDED` and `MISSING_API_KEY` error codes.

### 2026-02-08 - Auth Token Store + Reliable Auth
- Added `authTokenStore.ts` — in-memory + sessionStorage store for the JWT auth token, providing a reliable fallback when HttpOnly cookies are unavailable.
- Rewrote `apiFetch.ts` — removed production-only Authorization header stripping. Now injects JWT from `authTokenStore` as `Authorization: Bearer` header on every API request. Cookies still sent via `credentials: 'include'` as secondary fallback.
- **Root cause fixed**: The previous cookie-only auth approach in production had zero fallback. If cookies were blocked by browser settings, SameSite restrictions, or cross-subdomain issues, every API call returned 401 and the entire app was non-functional (Kip wouldn't respond, sessions failed, etc.).

### 2026-02-14 - Governance API client
- Added `governanceApi.ts`: getDomainGovernance, updateDomainGovernance, getContractDetail, getDomainCompliance. Used by DomainGovernanceCard and CockpitPanel compliance panel.

### Single-Domain MVP URLs

- All API calls resolve base from `VITE_API_URL` first, falling back to same-origin.
- Build absolute links using `VITE_PUBLIC_APP_ORIGIN` where needed.
- No hardcoded domains remain; prepare to re-enable subdomains post-MVP. // TODO(domains) 