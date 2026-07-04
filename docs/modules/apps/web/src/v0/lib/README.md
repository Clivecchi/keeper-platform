# v0/lib

## 📌 Purpose
Small V0 shell helpers — domain provisioning repair and frame seed detection.

## 🧱 Key Files
- `domainFrameLooksUnseeded.ts` — thin wrapper over `@keeper/shared` unseeded detection.
- `ensureDomainProvisioned.ts` — calls `POST /api/domains/:id/provision` (idempotent Step 1.2 repair).
- `frameLeadAgentIdentity.ts` — resolve `frame_json.kip.agent_id` slug → agent display name (cached).

## 🔄 Data & Behavior
- `V0Shell` runs auto-provision when an authenticated domain owner loads a personal domain whose frame still shows platform defaults; reloads frame JSON after success.
- SessionStorage key `keeper:provision-ok:{domainId}` is set only after reload confirms the frame no longer looks unseeded (avoids blocking retries when repair did not rewrite `frame_json`).
- `fetchFrameLeadAgentDisplayName` loads `kip_agents.name` via `KipApi.getAgentBySlug`; used by `useFrameLeadAgentIdentity` hook.
- `resolveLeadAgentId` / `resolveDialogAgentSlug` map placeholder slugs (`kip`, `kip-default`) and fall back to platform `kip` when a domain lead row is missing.

## ⚠️ Notes & ToDo
- [ ] Surface provision failure in Chronicle or a toast when repair fails repeatedly.

## 📆 Update Log
- 2026-07-03: `resolveFrameLeadAgentIdentity` singleflight — dialog + display name share one slug lookup (one 404 max per missing lead).
- 2026-07-02: `kip-default` treated as platform default; `resolveLeadAgentId` falls back to `kip` on 404.
- 2026-06-30: Added `frameLeadAgentIdentity` — shared lead agent display name resolver for Universal Dialog.
- 2026-07-01: Phase 1.4 — shared unseeded detection (tagline/keeper_type/kip markers); session ok only after successful frame identity reload.
- 2026-06-28: Step 1.2 onboard repair — `domainFrameLooksUnseeded` + `ensureDomainProvisioned` wired from `V0Shell`.
