# COMPLETED — Rename agent classification field to `role`

> Executed 2026-06-12. This prompt is kept for audit trail.

Focused rename: legacy classification column on `kip_agents` is now `role`; type renamed to `AgentRole`. No behavior, value, or union changes.

**Exclusions honored:** applied migrations (except new rename migration), `AgentClassesPage`, capability logic.

**Verification:** schema + new Prisma migration, types/API/seeds/cover updated, `pnpm exec tsc --noEmit` clean on `@keeper/database` and `keeper-api`.
