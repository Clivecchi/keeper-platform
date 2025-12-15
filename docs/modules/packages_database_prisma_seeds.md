# Database Seed Files

## 📌 Purpose
Seed files and scripts for initializing the Keeper Platform database with essential data.

## 🧱 Key Files
- `ai-keeper-sole.sql`
- `kip-agents.sql`
- `kip-sessions.sql`
- `lead-agents.sql`
- `coordinator-agent.sql`
- `lenses.seed.ts`

## 🔄 Data & Behavior
- SQL seeds hydrate core Keeper types, engagement templates, and agent/session fixtures.
- TS seeds run via `prisma/seed.ts` to insert platform roles, domains, boards, and now default Kip lenses (Domain Lens, Debug Investigator Lens for `default`).

## ⚠️ Notes & ToDo
- [ ] Confirm seeds remain idempotent when re-run in staging.
- [ ] Add coverage for future agent mode configs if stored outside `kip_agents.config`.

## 📆 Update Log
- 2025-12-14: Added `lenses.seed.ts` to create default Domain Lens and Debug Investigator Lens for the `default` domain via the TS seed runner.
