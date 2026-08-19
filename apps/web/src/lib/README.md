# lib

## 📌 Purpose
Core utility functions and API clients for the Keeper web application, including authentication-aware API calls and service integrations.

## 🧱 Key Files
- `platformHost.ts` - ke3p.com / `*.keeper.domains` host detection, tenant slug from hostname
- `resolveHostDomain.ts` - verified custom domain hostname → slug (`GET /api/domains/resolve-host/:hostname`)
- `realmPaths.ts` - brand hosts render at `/`; platform hosts use `/d/:slug`
- `apiFetch.ts` - API base resolution (same-origin `/api` on platform + tenant + production custom domains)
- `nangoConnect.ts` - Integration Connect: Services open Nango UI; Custom (railway) uses token verify only
- `themeApi.ts` - Theme fetching and management
- `kipApi.ts` - KIP (Keeper Intelligence Platform) API client
- `kipDialogSession.ts` - Board-scoped Dialog session resume (`resolve/active`, reuse empty sessions)
- `composerDraftStorage.ts` - SessionStorage helpers for unsent composer draft autosave
- `prepareImageUpload.ts` - Client-side image downscale before library blob upload
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

### 2026-08-19 — Honest Kip run errors + named agent
- `formatKipRunErrorMessage` / `normalizeKipRunErrorCode` — session/dialog "not found" is not agent misconfiguration. Error copy names the speaking agent (Ceox, Kip) instead of always "Kip".

### 2026-08-18 — Named Dialog session bind
- `kipDialogSession` — `fetchDialogSessions`, `resumeNamedDialogSession`, `resumeOrCreateNamedDialogSession` attach to a Nav-selected Dialog instead of board Chatter `findOrCreate`.
- `KipApi.createSession` accepts `dialogId` to attach a new session to an existing Dialog.

### 2026-08-17 — External writing ingest
- `KipApi.ingestExternalWriting` — POST create (`/kip/dialogs/ingest`) or attach (`/kip/dialogs/:id/ingest`). Not a Library upload.

### 2026-07-30 — Dialog Chronicle History
- `KipApi.getDialogChronicleEvents(domainId, dialogId)` loads the Dialog-scoped History timeline without changing Realm Feed scope.

### 2026-07-30 — Echo sessions excluded from primary resume
- `pickBestDialogSessionId` never returns `"Agent Board Echo"` / `"Domain Lead Collaboration"` side-sessions.
- `resumeOrCreateBoardSession` matches/creates Echo sessions by exact name only (does not reuse the primary Kip thread).
- Exported `ECHO_SESSION_NAMES`, `isEchoSessionName`, `findSessionIdByName`, `sessionDisplayName`.

### 2026-07-28 — board Dialog resume = last session
- `kipDialogSession.pickBestDialogSessionId` — prefer the lead agent's session, then fall back to the Dialog's best session (with messages, else newest). Board land loads a session without requiring Nav to open a Dialog.
- Resume/create keys remain board-scoped (`resolve/active`); create stays deferred to first send.

### 2026-07-25 — network fetch clarity + dialogId on runAgent
- `apiFetch` — browser `Failed to fetch` / network errors map to an explicit "Could not reach the Keeper API…" message (`NETWORK_UNREACHABLE`).
- `KipApi.runAgent` options accept `dialogId` and forward it on the run payload.

### 2026-07-22 — stop-eager-dialog-creation
- `kipDialogSession.resumeBoardSession` — resume-only resolve for board mount/prefetch.
- `resumeOrCreateBoardSession` reserved for first real user send (not mount).

### 2026-07-19 — Draft list lineage on KipApi
- `KipDraftSummary` includes optional `dialogId` / `dialog_id` and `pointIds` from `GET .../kip/drafts` so Realm Nav can resolve Dialog lineage without per-draft detail fetches.

### 2026-07-18 — createSession gateway retry
- `kipDialogSession.resumeOrCreateBoardSession` — one retry on HTTP 502/503/504 or closed-connection errors before failing the composer.

### 2026-07-17 — Dialog hard-delete client
- `kipDialogSession.deleteDialog` — `DELETE /api/domains/:domainId/kip/dialogs/:dialogId` (204).
- `apiFetch` — treats 204 / empty body as success (no JSON parse) so hard deletes do not throw client-side.

### 2026-07-11 — Image upload downscale
- Added `prepareImageUpload.ts` — resizes large JPEG/PNG/WebP to max 1920px before base64 blob upload

### 2026-07-07 — Post-login landing correctness
- `resolveLandingPathAfterAuth` is async — brand hosts await `fetchHostDomain` before routing; unresolved brands stay at `/`, never platform `/home`.
- Tenant `*.keeper.domains` routes from hostname synchronously (unchanged).

- `resolveWebHostname()` — defaults to `window.location.hostname` when callers omit hostname
- Fixes production crash (`toLowerCase` on undefined) when `buildRealmShellPath(slug, params)` runs without a third argument

### 2026-07-06 — Clean brand URLs (`livecchi.us` stays at `/`)
- `realmPaths.ts` — `buildRealmShellPath`, `usesCleanRealmPaths`; brand + tenant `*.keeper.domains` use `/` not `/d/:slug`
- `BrandRealmShellPage` / `RealmRoot` — render V0Shell at root on brand hosts

### 2026-07-05 — Custom brand domain routing (livecchi.us → /d/livecchi)
- `resolveHostDomain.ts` + `useResolvedHostDomain` — resolve verified custom domain host to domain slug
- `platformHost.ts` — production custom domains use same-origin `/api` (Vercel rewrite)
- `HostnameSlugGuard` / `RootRedirect` / `AuthForm` — redirect wrong slugs; login lands on brand domain board
- API `GET /api/domains/resolve-host/:hostname` — public slug lookup for verified custom domains

### 2026-07-04 — keeper.domains tenant hostname helper
- `platformHost.ts` — `buildKeeperTenantHostname(slug)` for Chronicle domain addresses preview.

### 2026-07-04 — keeper.domains same-origin API + hostname slug
- `platformHost.ts` — `usesSameOriginApi`, `resolveTenantSlugFromHostname`, `resolvePostAuthPath`.
- `apiFetch.ts` / `fetch-shim.ts` — `*.keeper.domains` uses relative `/api` (Vercel rewrite), same as ke3p.com.

### 2026-07-02 — P1.2 draft list query params
- `KipApi.listDrafts` accepts optional `{ limit, excludeStatus }` for capped nav fetches (`limit=50&excludeStatus=promoted,archived`).

### 2026-06-30 — Draft point promotion (Phase 2.2b)
- Added `KipApi.promoteDraftPoint(domainId, draftId, pointId, { journeyId })` — POST promote route for accepted journey_spec points.

### 2026-06-22 — Composer draft autosave storage
- Added `composerDraftStorage.ts` — keyed read/write/clear/migrate for unsent Kip composer text in `sessionStorage`.

### 2026-06-22 — Dialog-scoped session resume
- Added `kipDialogSession.ts` with `pickBestDialogSessionId` (prefer sessions with messages, else reuse newest empty) and `resumeOrCreateBoardSession` for IDE/Agent/Domain/Designer boards.


### 2026-06-02 — Integration connect UX: named OAuth window + manual auth link
- **nangoConnect.ts**: Named popup `keeper_integration_oauth`, placeholder page before redirect, `buildNangoOAuthConnectUrl` + `onSessionReady`, `openIntegrationOAuthTab` fallback, host-aware popup-blocked message.
- **integrationChronicle/shared.tsx**: In-panel “Waiting for {service}” guidance; link to open Nango authorize URL when popup lands on GitHub Settings instead of Install/Authorize.

### 2026-06-02 — Popup OAuth: sync popup on click + oauth-callback persist
- **nangoConnect.ts**: `beginIntegrationOAuthPopup()` in click handler (before await); AuthorizationModal + `/oauth/connect` (no iframe); `POST /api/integrations/oauth-callback` after success.

### 2026-06-02 — Integrations Phase A: Custom connect (no Nango UI for railway)
- **nangoConnect.ts**: When `/api/integrations/session` returns `{ connected: true }`, invokes `onConnected` without opening Nango Connect UI.

### 2026-06-02 — apiFetch: preserve API error body on non-OK responses
- **apiFetch.ts**: Stopped using try/catch around `throw` after `response.json()` — that pattern swallowed parsed errors and replaced them with generic `HTTP 502`, dropping `message`, `hint`, and `nangoIntegrationId` from integration session failures.
- Integration Chronicle Connect UI can now surface Nango setup hints from `error.data`.

### 2026-05-25 — Experience rename: `experienceContext` → `agentContext`
- `KipApi.runAgent` options field renamed; wire format unchanged.

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

### 2026-03-04 - TypeScript fixes for api.ts, apiFetch.ts, kipApi.ts
- **api.ts**: Added explicit `import { apiFetch, getApiBase }` — previously only re-exported them, causing TS errors when used as local variables. Also cast `init` params to `any` in `api.get/post` wrappers for `FetchOptions` type compatibility.
- **apiFetch.ts**: Removed unused `API_HOST` module-level variable (dead code). Fixed headers spread type cast.
- **kipApi.ts**: Cast `agentResult.data` to `any` before accessing `.error`/`.errorCode` — `AgentResponse.data` is typed as `unknown`, so direct property access caused TS2339.
- **DomainsPage.tsx**: Removed broken `import { __internal }` from `apiFetch` (symbol does not exist).

### 2026-07-24 — Debug capture hardening
- `consoleDiagCapture.ts` redacts JWT/token fields via `@keeper/shared` `redactForLog` before buffering Dialog Diag stream.
- Client `[AgentTurn]` logs (in `useAgentDialog`) surface orchestration mechanism without dumping secrets.

### 2026-02-14 - Governance API client
- Added `governanceApi.ts`: getDomainGovernance, updateDomainGovernance, getContractDetail, getDomainCompliance. Used by DomainGovernanceCard and CockpitPanel compliance panel.

### Single-Domain MVP URLs

- All API calls resolve base from `VITE_API_URL` first, falling back to same-origin.
- Build absolute links using `VITE_PUBLIC_APP_ORIGIN` where needed.
- No hardcoded domains remain; prepare to re-enable subdomains post-MVP. // TODO(domains) 