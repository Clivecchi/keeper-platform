# v0 API

## 📌 Purpose
Client-side helpers for calling v0 endpoints, with domain-aware request headers.

## 🧱 Key Files
- `v0Moments.ts`

## 🔄 Data & Behavior
Draft requests include `x-domain-slug` when provided and log request headers in dev for auditing.

## ⚠️ Notes & ToDo
- [ ] Confirm error handling UX for draft failures

## 📆 Update Log

### 2026-01-14 - Add domain-scoped draft headers
- Included `x-domain-slug` for all draft requests and added dev logging for request headers.
