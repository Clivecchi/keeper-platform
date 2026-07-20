/**
 * Repair personal domain frame_json when platform KE3P branding was persisted.
 *
 * Usage:
 *   npx tsx src/scripts/repair-domain-frame.ts <slug>
 *   npx tsx src/scripts/repair-domain-frame.ts --all-unseeded
 *
 * Equivalent API (domain admin auth required):
 *   POST /api/domains/:id/provision
 */
import { prisma } from '@keeper/database';
import { domainFrameLooksUnseeded } from '@keeper/shared';
import 'dotenv/config';
import { provisionDomainOnCreate } from '../services/domains/provisionDomainOnCreate.js';

function isEmptyJson(value: unknown): boolean {
  return (
    value === null ||
    value === undefined ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value as object).length === 0)
  );
}

function frameNeedsRepair(
  frameJson: unknown,
  slug: string,
  name: string,
): boolean {
  if (isEmptyJson(frameJson)) return true;
  if (typeof frameJson !== 'object' || frameJson === null || Array.isArray(frameJson)) return true;
  return domainFrameLooksUnseeded(frameJson as Record<string, unknown>, slug, name);
}

async function repairDomain(slug: string): Promise<boolean> {
  const domain = await prisma.domain.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      ownerId: true,
      settings: true,
      theme: true,
      frame_json: true,
    },
  });

  if (!domain) {
    console.log(`❌ No domain found for slug "${slug}"`);
    return false;
  }

  if (domain.slug === 'default') {
    console.log(`⏭️  Skipping platform hub "${slug}"`);
    return false;
  }

  if (!frameNeedsRepair(domain.frame_json, domain.slug, domain.name)) {
    console.log(`✅ ${slug} — frame_json already seeded`);
    return false;
  }

  const result = await provisionDomainOnCreate(prisma, { domain });
  console.log(
    `🔧 ${slug} — repaired (frameWritten=${result.frameWritten}, leadAgent=${result.leadAgentSlug ?? 'none'})`,
  );
  return result.frameWritten;
}

async function repairAllUnseeded(): Promise<void> {
  const domains = await prisma.domain.findMany({
    where: { slug: { not: 'default' } },
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      ownerId: true,
      settings: true,
      theme: true,
      frame_json: true,
    },
    orderBy: { slug: 'asc' },
  });

  let repaired = 0;
  for (const domain of domains) {
    if (!frameNeedsRepair(domain.frame_json, domain.slug, domain.name)) continue;
    const result = await provisionDomainOnCreate(prisma, { domain });
    if (result.frameWritten) {
      repaired += 1;
      console.log(`🔧 ${domain.slug} — frame rewritten`);
    }
  }

  console.log(`\nDone. Repaired ${repaired} domain(s).`);
}

async function main() {
  const arg = process.argv[2]?.trim();
  if (!arg) {
    console.log('Usage: npx tsx src/scripts/repair-domain-frame.ts <slug|--all-unseeded>');
    process.exit(1);
  }

  if (arg === '--all-unseeded') {
    await repairAllUnseeded();
    return;
  }

  await repairDomain(arg);
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  