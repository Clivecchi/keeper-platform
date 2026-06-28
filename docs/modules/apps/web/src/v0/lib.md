# v0/lib

## 📌 Purpose
Small V0 shell helpers — domain provisioning repair and frame seed detection.

## 🧱 Key Files
- `domainFrameLooksUnseeded.ts` — detects platform KE3P fallback on personal domains.
- `ensureDomainProvisioned.ts` — calls `POST /api/domains/:id/provision` (idempotent Step 1.2 repair).

## 🔄 Data & Behavior
- `V0Shell` runs auto-provision when an authenticated domain owner loads a personal domain whose frame still shows platform defaults; reloads frame JSON after success.
- SessionStorage key `keeper:provision-ok:{domainId}` avoids repeat POSTs in the same tab session.

## ⚠️ Notes & ToDo
- [ ] Surface provision failure in Chronicle or a toast when repair fails repeatedly.

## 📆 Update Log
- 2026-06-28: Step 1.2 onboard repair — `domainFrameLooksUnseeded` + `ensureDomainProvisioned` wired from `V0Shell`.
