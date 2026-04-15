/**
 * Seed script — Cloud platform agent
 *
 * Registers "Cloud" as a kip_agents record for the default domain.
 * Idempotent — skips if a record with slug "cloud" already exists.
 *
 * Note: The POST /api/agents route (apps/api/src/api/agents.ts) is the
 * canonical create path but requires an authenticated session.  Platform
 * bootstrap records like Cloud are seeded here instead, consistent with the
 * pattern used in seed-default-domain-frames.ts.
 *
 * Run with:
 *   cd apps/api && npx tsx src/scripts/seed-cloud-agent.ts
 *
 * KE3P · Keeper Platform
 */
import { PrismaClient } from '@keeper/database'
import 'dotenv/config'

const prisma = new PrismaClient()

async function main() {
  // ── Check for existing record ─────────────────────────────────────────────
  const existing = await prisma.kip_agents.findFirst({
    where: { slug: 'cloud' },
  })

  if (existing) {
    console.log(`[seed-cloud-agent] Already exists — id: ${existing.id}, name: ${existing.name}. Skipping.`)
    return
  }

  // ── Create Cloud agent ────────────────────────────────────────────────────
  const agent = await prisma.kip_agents.create({
    data: {
      name:           'Cloud',
      slug:           'cloud',
      model:          'claude-sonnet-4-6',
      model_provider: 'anthropic',
      purpose:        'Technical agent. Codebase, Railway, Vercel, GitHub. Reads and executes. No persona overlay.',
      agent_class:    'System',
      status:         'ready',
      visibility:     'private',
      tools:          [],
      permissions:    [],
      // persona: none — do not load Kip's system prompt or SOLE memory
      config: {
        persona: null,
        suppress_kip_system_prompt: true,
        suppress_sole_memory:       true,
        domain:                     'default',
      },
      model_settings: {},
    },
  })

  console.log(`[seed-cloud-agent] Created — id: ${agent.id}, name: ${agent.name}, model: ${agent.model}`)
}

main()
  .catch((err) => {
    console.error('[seed-cloud-agent] Error:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
