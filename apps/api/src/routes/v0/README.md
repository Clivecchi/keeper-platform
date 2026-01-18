# v0 Routes

## 📌 Purpose
Express routes for v0 surfaces, including draft Moment creation and publishing.

## 🧱 Key Files
- `moments.ts`

## 🔄 Data & Behavior
Draft routes accept authenticated or anonymous requests with `x-domain-slug` and `x-anon-key`, allow body domain hints, and emit claim tokens when kept anonymously.

## ⚠️ Notes & ToDo
- [ ] Align draft error responses with client UX messaging

## 📆 Update Log

### 2026-01-14 - Header-based domain resolution for keep
- Resolved `x-domain-slug` for keep actions to avoid missing-domain 500s.
### 2026-01-14 - Add anonymous draft and claim flows
- Allowed anonymous draft create/update/keep via `x-anon-key`, added claim endpoint, and added kept-moment list endpoint.
### 2026-01-17 - Clarify draft route handling
- Added a 405 response for `GET /v0/moments/drafts` and allowed body domain hints for resolution.
