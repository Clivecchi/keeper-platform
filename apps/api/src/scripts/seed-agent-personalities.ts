/**
 * Seed script — Kip and Cloud cover personality lines (config.personality)
 *
 * Run standalone:
 *   cd apps/api && npx tsx src/scripts/seed-agent-personalities.ts
 */
import 'dotenv/config';
import seedAgentPersonalities from '../../../../packages/database/prisma/seeds/agent-personalities.seed.js';
import { PrismaClient } from '@keeper/database';

const prisma = new PrismaClient();

seedAgentPersonalities()
  .catch((err) => {
    console.error('[seed-agent-personalities] Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
