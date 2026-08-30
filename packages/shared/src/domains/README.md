# domains (shared)

## 📌 Purpose
Shared constants and helpers for personal domain `frame_json` identity — detecting platform-default branding bleed and keeping API/web detection aligned.

## 🧱 Key Files
- `domainFrameIdentity.ts` — platform marker constants + `domainFrameLooksUnseeded`.
- `domainLeadBindings.ts` — DB-first slug sync helper + synthetic `-lead` detection; Playbill `resolvePlaybillDomainLabel` / `resolvePlaybillStarName` (domain label, not "Agent").
- `domainLeadMirror.ts` — frame-as-mirror read/patch helpers for `frame_json.kip.agent_id`.
- `keeperDomainsHost.ts` — `keeper.domains` suffix, reserved subdomains, tenant slug from hostname.
- `resolveDomainAudience.ts` — guest | friend | keeper | admin from auth + domain role.
- `audienceVisibility.ts` — hierarchical `available_to` checks for frame JSON elements.
- `filterContentByAudience.ts` — `presenceSchema.realmVisibility` filtering for journeys/moments.

## 🔄 Data & Behavior
- **Lead identity pattern:** `settings.primaryAgentId` → `kip_agents` is authoritative; `frame_json.kip.agent_id` is a mirror synced via API `syncDomainLeadAuthority`.
- Marker strings mirror API `DOMAIN_FRAME_FALLBACK` (GET `/api/domains/:slug/frame` empty-row fallback).
- `domainFrameLooksUnseeded` is used by web `V0Shell` auto-repair and API `provisionDomainOnCreate` re-seed decisions.
- `resolveDomainAudience` is shared by API `GET /by-slug/:slug/audience` and web `V0Shell` (via API fetch).
- `filterContentByAudience` gates public vs friends-content journey/moment lists by optional `realmVisibility`.

## ⚠️ Notes & ToDo
- [ ] If fallback shape changes, update markers here and in `domainFrameFallback.ts` together.

## 📆 Update Log
- 2026-08-30: Playbill helpers — `resolvePlaybillDomainLabel` promotes the slug when the name is a short clip (`Liv` / `livecchi.biz`). `resolvePlaybillStarName` falls back to that label, never "Agent".
- 2026-07-11: **Frame-as-mirror** — removed `CANONICAL_DOMAIN_LEAD_BINDINGS`; `domainLeadMirror.ts` + `resolveDomainLeadAgentSlugSync` (DB-enriched fields only).
- 2026-07-04: Added `keeperDomainsHost.ts` — shared `{slug}.keeper.domains` tenant slug resolution for database services and web/API alignment.
- 2026-07-01: Phase 3.2 — `friend` audience role, `resolveDomainAudience`, hierarchical frame visibility, realm content filtering.
- 2026-07-01: Phase 1.4 — shared unseeded detection for wordmark, tagline, keeper_type, and kip defaults.
