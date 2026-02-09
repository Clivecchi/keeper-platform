# v0 API

## 📌 Purpose
Client-side helpers for calling v0 endpoints, with domain-aware request headers.

## 🧱 Key Files
- `v0Moments.ts`

## 🔄 Data & Behavior
Draft requests include `x-domain-slug`, optionally send `domainSlug` in the body, and add an anonymous key when needed, with dev logging for auditing.

## ⚠️ Notes & ToDo
- [ ] Confirm error handling UX for draft failures

## 📆 Update Log

### 2026-01-14 - Add domain-scoped draft headers
- Included `x-domain-slug` for all draft requests and added dev logging for request headers.
### 2026-01-14 - Add anonymous draft + claim helpers
- Added anonymous key support, claim calls, and kept-moment listing helpers.
### 2026-01-17 - Send domain slug in draft creation
- Included `domainSlug` in the draft creation payload to mirror domain-scoped headers.
### 2026-01-17 - Skip anon headers for authenticated sessions
- Avoided sending `x-anon-key` when a session cookie is present.
### 2026-02-08 - Fix dev fallback port
- Changed `v0Moments.ts` default API port from `3002` to `3001` to match the standard dev server port.
