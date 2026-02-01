# Path API (Domain-Integrated)

## 📌 Purpose
Provides domain-aware CRUD endpoints for Paths that belong to Journeys and Keepers.

## 🧱 Key Files
- `domain-integrated-routes.ts`

## 🔄 Data & Behavior
Routes support filtering by domain, journey, and keeper, and enforce domain access permissions for authenticated users.

## ⚠️ Notes & ToDo
- [ ] Confirm whether Path IDs should be UUIDs or deterministic slugs.

## 📆 Update Log
- 2026-01-31: Added domain-integrated Path CRUD routes.
- 2026-01-31: Ordered Path list by name to match schema fields.
