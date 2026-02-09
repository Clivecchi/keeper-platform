# KAM Read-Only API

## 📌 Purpose
Expose read-only endpoints for Agent → Board → Frame → Config with scoped service-key auth, rate limits, and audit logging.

## 🧱 Key Files
- `routes.ts` – KAM router mounted at `/kam`
- `middleware.ts` – `kamAuth`, `kamScope`, `kamRateLimit`, `kamAudit`

## 🔄 Data & Behavior
- Read-only only; all routes require `Authorization: Bearer <SERVICE_KEY>` and `X-Domain-Id` headers.
- DTO responses (no Prisma internals).
- Rate limit: 100 req / 5 min per key.
- Audit: JSON line `[kam:audit]` per request.

## Routes
- `GET /kam/agents/:agentId/home` – Resolve Agent Home Board without mutation.
- `GET /kam/boards/:boardId` – Board metadata.
- `GET /kam/boards/:boardId/frames` – Ordered frames.
- `GET /kam/frames/:frameInstanceId/config` – Config/props of a frame.
- `GET /kam/boards?agentId=` – List boards by agent.

## Auth Endpoints (V0 UI)
- `/api/kam/auth/me` keeps the standard cookie session flow (`keeper_token` + `keeper_session`). The `authWeb` middleware now accepts both names so the V0 UI can confirm identity without re-logging.
- `/api/kam/settings` is kept for opt-in theme experiments. It now reads the same HttpOnly cookies (preferred) and falls back to Bearer tokens for CLI/KAM tooling, preventing the previous 401 spam during normal browsing.

## ⚠️ Notes & ToDo
- [ ] Persist audit to DB table `kam_audit` (future).
- [ ] Add automated tests.

## Auth Architecture (Consolidated 2026-02-08)

- **Login/Register/Logout**: Handled by inline handlers in `apps/api/src/index.ts`. These are the canonical production endpoints.
- **Identity (`GET /me`)**: Handled by `auth.ts` via `auth-routes.ts`, mounted at `/api/kam/auth`.
- **Cookie helper**: All auth handlers delegate to `setSessionCookie` / `clearSessionCookie` from `session.ts`, ensuring consistent `SameSite=None` + `Secure` + `HttpOnly` cookie attributes.
- Dead `login()` and `logout()` functions were removed from `auth.ts` on 2026-02-08. The `auth-routes.ts` router only mounts `GET /me`.

## 📆 Update Log
- 2026-02-08: **Auth consolidation** — Removed dead `login()`/`logout()` from `auth.ts`; `auth-routes.ts` now only mounts `GET /me`. Inline handlers in `index.ts` now delegate cookie ops to `session.ts` via `setSessionCookieShared`/`clearSessionCookie`, eliminating SameSite mismatch risk.
- 2025-12-09: Fixed `/api/kam/auth/me` 401 noise by allowing legacy `keeper_token` cookies in `authWeb`, and taught `/api/kam/settings` to reuse cookie auth (with Bearer fallback) so the V0 UI stops hitting it unauthenticated.
- 2025-10-15 (CRITICAL BUG FIX): Discovered and fixed missing cookie setting in login handler. The inline handler in `index.ts` (line 628) was being used instead of `auth.ts`, and it wasn't setting cookies at all. Added cookie setting directly to the `index.ts` handler. This explains why authenticated requests returned 401 despite successful login - no session cookie was ever being set!
- 2025-10-15 (Critical Fix): Fixed `session.ts` - changed `sameSite` from `'lax'` to `'none'` to enable cross-subdomain cookies between `api.ke3p.com` and `www.ke3p.com`. The `sameSite: 'lax'` setting was preventing the browser from storing the cookie when set from the API subdomain.
- 2025-10-15: Fixed `auth.ts` response format - login endpoint now returns `{ success: true, data: { token, user } }` to match frontend expectation (was `{ ok: true, token, user }`). Logout endpoint also changed from `{ ok: true }` to `{ success: true }`.
- 2025-10-11: Updated `session.ts` - `authWeb` middleware now ignores Authorization headers from browser requests (detected via Origin header). Header auth only allowed for CLI/tools (no Origin) or when `X-Client: cli` header is present. Enforces cookie-only authentication for web browsers in production.
- 2026-02-08: Fixed `session.ts` `clearSessionCookie` — changed `sameSite` from `'lax'` to `'none'` to match the cookie attributes used in `setSessionCookie`. Mismatched SameSite values prevented the browser from properly clearing cookies on logout.
- 2026-02-08: Fixed inline `setSessionCookie` in `index.ts` — changed `SameSite=Lax` to `SameSite=None` and made `Secure` unconditional.
- 2026-02-08: Fixed `authWeb` in `session.ts` — removed the restriction that blocked Authorization headers from browser requests (detected via Origin header). This caused a dead end where cookies were unavailable AND header auth was blocked, making `/api/kam/auth/me` always return 401 for browser users without working cookies. Now accepts both cookie and Bearer token from all clients.
- 2025-09-06: Allow domainless agents on ID/list routes (no domain header required if agent.domainId is null).
- 2025-09-06: Updated `/kam/agents/:agentId/home` to support domain discovery (no X-Domain-Id required).
- 2025-09-06: Added `lib/kamKeyLoader.ts`, normalized env key loading (CSV + single),
  dev-only diagnostics on first request, and bearer parsing improvements.
- 2025-09-04: Initial read-only implementation.


