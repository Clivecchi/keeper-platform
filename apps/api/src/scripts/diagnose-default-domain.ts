/**
 * Diagnostic: Check default domain frame_json state
 * Run with: npx tsx src/scripts/diagnose-default-domain.ts
 */
import { PrismaClient } from '@keeper/database'
import 'dotenv/config'

const prisma = new PrismaClient()

const GOVERNED_KEYS = [
  'cover',
  'commons',
  'moment',
  'kept_moments',
  'journeys',
  'agent_board',
  'diagnostics',
  'domain_admin',
] as const

async function main() {
  const domain = await prisma.domain.findFirst({
    where: { slug: 'default' },
    select: { id: true, slug: true, frame_json: true },
  })

  if (!domain) {
    console.log('❌ NO DOMAIN WITH SLUG "default" FOUND')
    return
  }

  console.log(`✅ Domain found`)
  console.log(`   id:   ${domain.id}`)
  console.log(`   slug: ${domain.slug}`)

  const fj = domain.frame_json as Record<string, unknown> | null

  if (!fj || typeof fj !== 'object') {
    console.log('   frame_json: NULL or not an object')
    return
  }

  const allKeys = Object.keys(fj)
  console.log(`\n   All frame_json keys (${allKeys.length}): ${allKeys.join(', ')}`)
  console.log('\n   Governed frame status:')

  let populatedCount = 0
  for (const key of GOVERNED_KEYS) {
    const val = fj[key]
    const hasContent =
      val !== null &&
      val !== undefined &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      Object.keys(val as object).length > 0
    console.log(`   ${hasContent ? '🟢' : '⚫'} ${key}: ${hasContent ? 'POPULATED' : 'EMPTY/MISSING'}`)
    if (hasContent) populatedCount++
  }

  console.log(`\n   ${populatedCount} of ${GOVERNED_KEYS.length} governed frames populated`)
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
