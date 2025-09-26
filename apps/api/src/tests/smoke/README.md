# API Smoke Tests

## 📌 Purpose
Run minimal end-to-end checks against a deployed API instance to validate health, CORS, and auth registration.

## 🧱 Key Files
- `basic.test.ts`
- `production.test.ts`

## 🔄 Data & Behavior
- Uses `fetch` to call deployed endpoints.
- Base URL is resolved from `SMOKE_BASE_URL`, `API_BASE_URL`, `RAILWAY_PUBLIC_URL`, or `RAILWAY_PUBLIC_DOMAIN`.
- Validates:
- `GET /api/health` returns 200
  - `GET /api/test` returns 200 with `Origin: https://www.ke3p.com`
- `GET /api/test` returns 403 with `Origin: https://evil.example`
  - `POST /api/kam/auth/register` returns 201 (409 allowed on rare email collision)

## ⚠️ Notes & ToDo
- [ ] Confirm production base URL is injected when running via `railway run`.
- [ ] Ensure CORS allowlist contains `https://www.ke3p.com` when in production.

## 📆 Update Log
- 2025-09-24: Added `production.test.ts` and initial README. Duplicated to docs/modules.
