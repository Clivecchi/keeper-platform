# Domain provisioning (API)

## 📌 Purpose
Seeds a newly created personal domain with frame JSON, domain lead agent, default keeper, primary domain pointer, and home board.

## 🧱 Key Files
- `domainFrameFallback.ts` — platform frame fallback (shared with GET `/:slug/frame`).
- `buildInitialDomainFrameJson.ts` — personal domain wordmark/tagline/agent wiring.
- `domainConnectionInvite.ts` — Phase 3.1 connection invite lookup, list, grant, and revoke helpers.
- `provisionDomainOnCreate.ts` — idempotent orchestration after `POST /api/domains`.
- `../scripts/repair-domain-frame.ts` — CLI repair for unseeded personal domains.

## 🔄 Data & Behavior
On create (and via `POST /api/domains/:id/provision` repair):
1. Creates `{slug}-lead` Kip agent (Lead role) or reuses if present; sets `settings.primaryAgentId`.
2. Writes `frame_json` when empty **or** when `@keeper/shared` `domainFrameLooksUnseeded` detects platform defaults — domain wordmark, tagline, `kip.agent_id`, interaction bar labels, agent board messaging.
3. Creates default Keeper (`DomainKeeper`) when none exists for the domain.
4. Sets `users.primaryDomainId` when unset.
5. Calls `ensureDomainHomeBoard`.

`domainConnectionInvite.ts` resolves invitees by case-insensitive email or display name. Known users receive `friend`/`connection` `DomainPermission` rows immediately; unknown email addresses create or refresh `DomainInvitation` tokens (7-day expiry).

Failures in individual steps log warnings and do not fail domain create.

### Manual repair
- **API:** `POST /api/domains/:id/provision` (domain admin auth) — same idempotent provisioner.
- **CLI:** from `apps/api`: `npx tsx src/scripts/repair-domain-frame.ts <slug>` or `--all-unseeded`.

## ⚠️ Notes & ToDo
- [x] V0Shell auto-repair — `ensureDomainProvisioned` calls `POST /api/domains/:id/provision` for unseeded personal domains.
- [ ] Domain lead persona/lens tuning via Designer Board after create.

## 📆 Update Log
- 2026-07-03: **`ensureDomainLeadAgentBySlug`** — repairs missing `kip_agents` rows when `frame_json.kip.agent_id` references a slug without a DB row; used by `GET /api/kip/agents?slug=`. `createDomainLeadAgent` accepts `preferredSlug` for exact frame slug match.

### 2026-07-01 — Phase 3.1 Connections
- Added `domainConnectionInvite.ts` with identifier lookup (email or display name), connection listing, direct grant, invitation upsert, and connection-only revoke.
- Unit tests in `domainConnectionInvite.test.ts`.

### 2026-07-01 — Phase 2.1 Guided Arrival
- `buildInitialDomainFrameJson` seeds `arrival.completed: false` alongside lead agent greeting.
- `defaultDomainSettingsForCreate` sets `settings.arrivalCompleted: false` on provision.

### 2026-07-01 — Phase 1.4 personal frame_json
- `buildInitialDomainFrameJson` now sets interaction bar `kip` label and agent board sign-in/empty messaging from domain name.
- `provisionDomainOnCreate` re-seeds when persisted platform defaults remain (not only empty `frame_json`).
- Added `repair-domain-frame.ts` CLI; provision response includes `frameWritten`.
- Unseeded detection shared via `@keeper/shared` `domainFrameLooksUnseeded`.

### 2026-06-30 — Phase 1.2 audit
- Confirmed primary paths wired: `POST /api/domains` (routes.ts), signup (`/api/kam/auth/register`), repair `POST /api/domains/:id/provision`.
- Added provisioner to legacy flat `POST /api/domains` (domains.ts) and super-admin `POST /api/admin/domains`.

### 2026-06-28 — Domain-accessible agent roster (Agent board Nav)
- `loadDomainScopedAgents.ts` — merges domain lead + Kip + platform agents (`cloud`, `rendr`) for every domain.
- `loadDomainAccessibleAgents()` — full agent rows for `GET /:domainId/kip/agents` (Agent board Nav + Chronicle Config).
- `loadDomainScopedAgents()` — summary rows for Kip environment / director delegation.

### 2026-06-28 — Step 1.2 seeding
- Added provisioning pipeline + admin repair route `POST /api/domains/:id/provision`.
- Signup path uses same provisioner (replaces inline keeper-only seed).
