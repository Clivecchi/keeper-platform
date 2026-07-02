# v0/lib

## 📌 Purpose
Small V0 shell helpers — domain provisioning repair and frame seed detection.

## 🧱 Key Files
- `domainFrameLooksUnseeded.ts` — thin wrapper over `@keeper/shared` unseeded detection.
- `ensureDomainProvisioned.ts` — calls `POST /api/domains/:id/provision` (idempotent Step 1.2 repair).

## 🔄 Data & Behavior
- `V0Shell` runs auto-provision when an authenticated domain owner loads a personal domain whose frame still shows platform defaults; reloads frame JSON after success.
- SessionStorage key `keeper:provision-ok:{domainId}` is set only after reload confirms the frame no longer looks unseeded (avoids blocking retries when repair did not rewrite `frame_json`).

## ⚠️ Notes & ToDo
- [ ] Surface provision failure in Chronicle or a toast when repair fails repeatedly.

## 📆 Update Log
- 2026-07-01: Phase 1.4 — shared unseeded detection (tagline/keeper_type/kip markers); session ok only after successful frame identity reload.
- 2026-06-28: Step 1.2 onboard repair — `domainFrameLooksUnseeded` + `ensureDomainProvisioned` wired from `V0Shell`.
