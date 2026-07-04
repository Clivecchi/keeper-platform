# Domain Services

## 📌 Purpose
Database-layer services for hostname-to-Domain resolution, custom domain verification, and tenant CORS origin generation.

## 🧱 Key Files
- `DomainResolutionService.ts` — `{slug}.keeper.domains` → `getDomainBySlug`, custom domain lookup, allowed origins
- `DomainVerificationService.ts` — DNS/HTTP custom domain verification against `keeper.domains` platform targets
- `DomainService.ts` — CRUD and reserved hostname guards

## 🔄 Data & Behavior
- **Resolution order:** platform host (ke3p.com, www.keeper.domains, reserved infra) → custom domain (when `CUSTOM_DOMAINS_ENABLED`) → `{slug}.keeper.domains` slug lookup → not found.
- **Shared constants:** `@keeper/shared` `keeperDomainsHost` (suffix, reserved subdomains, tenant slug parser).
- **CORS origins:** slug resolution adds `https://{slug}.keeper.domains` via `buildKeeperTenantOrigin`.

## ⚠️ Notes & ToDo
- [ ] Align `apps/api` `keeperDomainsCors.ts` to re-export from `@keeper/shared` (optional dedup)
- [ ] `dynamicCorsMiddleware` platform allowlist remains in API layer

## 📆 Update Log
- **2026-07-04**: Aligned resolution with `keeper.domains` — tenant slug hosts resolve via `getDomainBySlug`; verification CNAME target `domains.keeper.domains`; reserved custom domains updated from `keeper.tools`.
