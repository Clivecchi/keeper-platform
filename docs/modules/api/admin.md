# Admin API Routes

## 📌 Purpose
Provides platform-level administration endpoints for managing domains and platform roles. Accessible only to users with the `super-admin` platform role.

## 🧱 Key Files
- `apps/api/src/api/admin/domains.ts`
- `apps/api/src/api/admin/roles.ts`

## 🔄 Data & Behavior
- Super-admin–gated via `requireSuperAdmin` middleware.
- Domains: list, create, update, suspend, archive, and member management.
- Roles: list roles, list users with roles, assign / revoke roles.
- Caches domains through `DomainCacheService`.

## ⚠️ Notes & ToDo
- [ ] Rate-limit admin actions.
- [ ] Add pagination for large user lists.

## 📆 Update Log
- 2025-07-19 – Module created for new admin routes. 