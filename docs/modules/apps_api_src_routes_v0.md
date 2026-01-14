# v0 Routes

## 📌 Purpose
Express routes for v0 surfaces, including draft Moment creation and publishing.

## 🧱 Key Files
- `moments.ts`

## 🔄 Data & Behavior
Draft routes require authentication and use domain context from middleware or `x-domain-slug`.

## ⚠️ Notes & ToDo
- [ ] Align draft error responses with client UX messaging

## 📆 Update Log

### 2026-01-14 - Header-based domain resolution for keep
- Resolved `x-domain-slug` for keep actions to avoid missing-domain 500s.
