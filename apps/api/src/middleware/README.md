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
- 2024-06-09: Updated all middleware to use Redis-optional pattern. Redis is now only instantiated if `REDIS_URL` is set and `DISABLE_REDIS` is not true. All middleware must check for null before using Redis. In development, Redis is optional and features degrade gracefully. // TODO: Verify all downstream code is null-safe. 