/**
 * Seed script — Cloud platform agent
 *
 * Registers "Cloud" as a kip_agents record for the default domain.
 * Idempotent — creates or updates capabilities on existing Cloud record.
 *
 * Run with:
 *   cd apps/api && npx tsx src/scripts/seed-cloud-agent.ts
 *
 * KE3P · Keeper Platform
 */
import { PrismaClient } from '@keeper/database'
import 'dotenv/config'
import { CLOUD_INFRA_READ_CAPABILITIES } from '../capabilities/infraCapabilities.js'

const prisma = new PrismaClient()

async function main() {
  const existing = await prisma.kip_agents.findFirst({
    where: { slug: 'cloud' },
  })

  if (existing) {
    const agent = await prisma.kip_agents.update({
      where: { id: existing.id },
      data: {
        capabilities: [...CLOUD_INFRA_READ_CAPABILITIES],
      },
    })
    console.log(
      `[seed-cloud-agent] Updated capabilities — id: ${agent.id}, capabilities: ${agent.capabilities.join(', ')}`,
    )
    return
  }

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
      memory_enabled: true,
      tools:          [],
      permissions:    [],
      // Read infra capabilities only — deploy capabilities require confirmation gate before seeding
      // incomplete — deploy capabilities require human confirmation gate before seeding on Cloud
      capabilities:   [...CLOUD_INFRA_READ_CAPABILITIES],
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
