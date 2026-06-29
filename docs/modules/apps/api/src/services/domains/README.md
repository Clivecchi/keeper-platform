# Domain provisioning (API)

## 📌 Purpose
Seeds a newly created personal domain with frame JSON, domain lead agent, default keeper, primary domain pointer, and home board.

## 🧱 Key Files
- `domainFrameFallback.ts` — platform frame fallback (shared with GET `/:slug/frame`).
- `buildInitialDomainFrameJson.ts` — personal domain wordmark/tagline/agent wiring.
- `provisionDomainOnCreate.ts` — idempotent orchestration after `POST /api/domains`.
- `loadDomainScopedAgents.ts` — domain-accessible agent roster (lead + Kip + platform agents).

## 🔄 Data & Behavior
On create (and via `POST /api/domains/:id/provision` repair):
1. Creates `{slug}-lead` Kip agent (Lead role) or reuses if present; sets `settings.primaryAgentId`.
2. Writes `frame_json` when empty — domain wordmark, tagline, `kip.agent_id`, agent board messaging.
3. Creates default Keeper (`DomainKeeper`) when none exists for the domain.
4. Sets `users.primaryDomainId` when unset.
5. Calls `ensureDomainHomeBoard`.

Failures in individual steps log warnings and do not fail domain create.

## ⚠️ Notes & ToDo
- [ ] Onboard UI should invoke provision repair for domains created before Step 1.2 seeding.
- [ ] Domain lead persona/lens tuning via Designer Board after create.

## 📆 Update Log

### 2026-06-28 — Domain-accessible agent roster (Agent board Nav)
- `loadDomainScopedAgents.ts` — merges domain lead + Kip + platform agents (`cloud`, `rendr`) for every domain.
- `loadDomainAccessibleAgents()` — full agent rows for `GET /:domainId/kip/agents` (Agent board Nav + Chronicle Config).
- `loadDomainScopedAgents()` — summary rows for Kip environment / director delegation.

### 2026-06-28 — Step 1.2 seeding
- Added provisioning pipeline + admin repair route `POST /api/domains/:id/provision`.
- Signup path uses same provisioner (replaces inline keeper-only seed).
