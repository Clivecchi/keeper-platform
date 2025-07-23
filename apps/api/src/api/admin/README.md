# Admin API Routes

## 📌 Purpose
Provides platform-level administration endpoints for managing domains and platform roles. Accessible only to users with the `super-admin` platform role.

## 🧱 Key Files
- `domains.ts` – CRUD & member-management for any domain across the platform.
- `roles.ts` – Endpoints to list roles, view user role assignments, and assign / revoke roles.

## 🔄 Data & Behavior
- Relies on `requireSuperAdmin` middleware to gate access.
- Uses `DomainService`, `DomainPermissionService`, and Prisma client directly.
- Caches domain changes through `DomainCacheService` and triggers cache invalidation by reloading lists on the client.
- Feature-flag aware (`DOMAIN_LAYER_ENABLED`).

## ⚠️ Notes & ToDo
- [ ] Add rate-limiting for sensitive admin actions.
- [ ] Consider pagination for users-with-roles endpoint when user count grows.

## 📆 Update Log
- 2025-07-19 – Initial creation with domain & role management endpoints. 