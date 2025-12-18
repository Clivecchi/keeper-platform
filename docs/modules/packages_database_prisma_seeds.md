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
- `policy.seed.ts`

## 🔄 Data & Behavior
- SQL seeds hydrate core Keeper types, engagement templates, and agent/session fixtures.
- TS seeds run via `prisma/seed.ts` to insert platform roles, domains, boards, Kip lenses (Domain Lens, Debug Investigator Lens for `default`), and default domain policy packs (`policy-v1`) for every domain.

## ⚠️ Notes & ToDo
- [ ] Confirm seeds remain idempotent when re-run in staging.
- [ ] Add coverage for future agent mode configs if stored outside `kip_agents.config`.

## 📆 Update Log
- 2025-12-17: Added `policy.seed.ts` to upsert default policy-v1 for all domains (kept in sync with Kip policy pack) and wired it into the TypeScript seed runner after domain creation.
- 2025-12-14: Added `lenses.seed.ts` to create default Domain Lens and Debug Investigator Lens for the `default` domain via the TS seed runner.
