/**
 * Seed script — Kip and Cloud cover personality lines (config.personality)
 *
 * Run standalone:
 *   cd apps/api && npx tsx src/scripts/seed-agent-personalities.ts
 */
import 'dotenv/config';
import seedAgentPersonalities from '../../../../packages/database/prisma/seeds/agent-personalities.seed.js';
import { prisma } from '@keeper/database';
seedAgentPersonalities()
  .catch((err) => {
    console.error('[seed-agent-personalities] Error:', err);
    process.exit(1);
  })
  