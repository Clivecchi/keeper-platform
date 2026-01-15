# Prisma Migrations

## 📌 Purpose
Database schema migrations applied by Prisma for the Keeper platform.

## 🧱 Key Files
- `migration.sql`
- `migration_lock.toml`

## 🔄 Data & Behavior
Each timestamped folder contains SQL migrations that align the database with `schema.prisma`.

## ⚠️ Notes & ToDo
- [ ] Confirm production migrations are applied during deploy

## 📆 Update Log

### 2026-01-14 - Add Moment keptAt column
- Added migration to create `Moment.keptAt` for draft keep tracking.
### 2026-01-14 - Add anonymous moment claim fields
- Added nullable `ownerId` plus claim token fields for anonymous moment capture.
