# Middleware

## 📌 Purpose
Express middleware for authentication, domain resolution, permissions, CORS, and caching. Handles cross-cutting concerns for API routes.

## 🧱 Key Files
- `authMiddleware.ts`
- `domainPermissionMiddleware.ts`
- `domainResolutionMiddleware.ts`
- `dynamicCorsMiddleware.ts`
- `memoryAccessMiddleware.ts`
- `logRequestMiddleware.ts`
- `validationMiddleware.ts`
- `idempotency.ts` - Request idempotency via requestId (NEW)

## 🔄 Data & Behavior
- Handles user authentication and session management
- Resolves and validates domain context for requests
- Manages permissions and access control
- Integrates with Redis for caching (if available)
- All middleware now uses a Redis-optional pattern:
  - Redis is only instantiated if `REDIS_URL` is set and `DISABLE_REDIS` is not true
  - If Redis is not available, all downstream code must check for null before using Redis
  - In development, Redis is optional and features will degrade gracefully if not available

## ⚠️ Notes & ToDo
- [ ] Ensure all new middleware follows the Redis-optional pattern
- [ ] Add more tests for degraded (no Redis) mode
- [ ] Confirm all cache-dependent features degrade gracefully

## 📆 Update Log

- 2025-11-09: Added `idempotency.ts` middleware for requestId-based idempotency. Prevents duplicate operations using in-memory cache with 10-minute TTL. Returns cached results for matching requestId+input, returns 409 for same requestId with different input.
- 2025-10-15 (Fix): Fixed cookie name mismatch in `auth.ts` - added `keeper_session` to COOKIE_CANDIDATES array. This resolves authenticated access failure where login sets `keeper_session` cookie but middleware was only checking for `token`, `keeper_token`, and `auth_token`.
- 2025-10-15: Added lightweight `attachUser` in `auth.ts` to parse Bearer/cookies and set `req.user` early without DB lookups. Used by debug and KIP routes during stabilization.
- 2024-06-09: Updated all middleware to use Redis-optional pattern. Redis is now only instantiated if `REDIS_URL` is set and `DISABLE_REDIS` is not true. All middleware must check for null before using Redis. In development, Redis is optional and features degrade gracefully. // TODO: Verify all downstream code is null-safe. 
// 2025-09-23: Enforced single-domain MVP
- Domain resolution fallback now uses `FALLBACK_DOMAIN` env (default `www.ke3p.com`).
- Domain resolution runs before CORS, auth, and route guards.
- CORS locked down to exact allowlist from `CORS_ALLOWLIST`. Dev allows `http://localhost:5173` and `http://localhost:3000` when not in production.
- TODO(domains): enable subdomain and custom domain handling after MVP.
- 2026-01-17: Added `x-anon-key` and `x-domain-slug` to default CORS allowed headers for dynamic CORS.
- 2026-02-08: Fixed `authMiddleware.ts` — all three auth middleware functions (`authMiddleware`, `authMiddlewareCompat`, `optionalAuthMiddleware`) now check all legacy cookie names (`keeper_session`, `keeper_token`, `token`, `auth_token`) for backwards compatibility, matching `authWeb` in `session.ts`. Previously only `keeper_session` was checked, causing 401 errors for users with cookies set under legacy names.