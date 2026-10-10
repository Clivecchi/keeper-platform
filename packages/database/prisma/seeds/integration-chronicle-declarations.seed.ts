#!/usr/bin/env tsx

/**
 * Populates Integration Chronicle declaration fields for all platform integrations.
 * Idempotent — safe to re-run.
 */

import { prisma } from '../seedPrisma.ts';
import { INTEGRATION_CHRONICLE_DECLARATIONS } from '@keeper/shared';


export { INTEGRATION_CHRONICLE_DECLARATIONS };

export default async function seedIntegrationChronicleDeclarations(): Promise<void> {
  console.log('🔗 Seeding Integration Chronicle declarations...');

  for (const [service, declaration] of Object.entries(INTEGRATION_CHRONICLE_DECLARATIONS)) {
    const result = await prisma.integration.updateMany({
      where: {
        service,
        tier: 'platform',
        domainId: null,
        userId: null,
      },
      data: declaration,
    });

    if (result.count === 0) {
      console.warn(`  ⚠ No platform Integration row found for service="${service}" — skipped`);
      continue;
    }

    console.log(`  ✓ ${service}`);
  }

  console.log('✅ Integration Chronicle declarations seeded');
}
