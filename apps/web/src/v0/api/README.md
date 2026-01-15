# v0 API

## 📌 Purpose
Client-side helpers for calling v0 endpoints, with domain-aware request headers.

## 🧱 Key Files
- `v0Moments.ts`

## 🔄 Data & Behavior
Draft requests include `x-domain-slug` and an anonymous key when needed, and log request headers in dev for auditing.

## ⚠️ Notes & ToDo
- [ ] Confirm error handling UX for draft failures

## 📆 Update Log

### 2026-01-14 - Add domain-scoped draft headers
- Included `x-domain-slug` for all draft requests and added dev logging for request headers.
### 2026-01-14 - Add anonymous draft + claim helpers
- Added anonymous key support, claim calls, and kept-moment listing helpers.
