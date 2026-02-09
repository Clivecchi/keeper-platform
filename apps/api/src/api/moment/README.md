# Moment API (Domain-Integrated)

## 📌 Purpose
Provides domain-aware CRUD endpoints for Moments with permission checks and query filtering.

## 🧱 Key Files
- `domain-integrated-routes.ts`

## 🔄 Data & Behavior
Routes support filtering by domain, journey, and path, and enforce domain access permissions for authenticated users.

## ⚠️ Notes & ToDo
- [x] ~~Align Moment payload fields (`content` vs `narrative`) across API and schema.~~ Fixed 2026-02-08.

## 📆 Update Log
- 2026-02-08: Fixed schema field mismatch - changed `content` to `narrative` in create/update/search schemas to match Prisma `Moment.narrative` field.
- 2026-01-31: Added domain/journey/path query filtering for Moments.
