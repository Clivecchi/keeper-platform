/**
 * Seed script — Cloud platform agent
 *
 * Delegates to the canonical database seed (runs automatically via `prisma db seed`).
 *
 * Run standalone:
 *   cd apps/api && npx tsx src/scripts/seed-cloud-agent.ts
 *
 * KE3P · Keeper Platform
 */
import 'dotenv/config';
import seedCloudAgent, {
  cloudAgentPrisma,
} from '../../../../packages/database/prisma/seeds/cloud-agent.seed.js';

seedCloudAgent()
  .catch((err) => {
    console.error('[seed-cloud-agent] Error:', err);
    process.exit(1);
  })
  .finally(() => cloudAgentPrisma.$disconnect());
