#!/usr/bin/env tsx

import { prisma } from '../seedPrisma.ts';
import { ensureAllCanonicalBoards } from '../../src/system-boards/index.js';


export default async function seedSystemBoards() {
  console.log('🧊 Seeding canonical system boards...');

  try {
    const domains = await prisma.domain.findMany({
      select: { id: true, name: true },
    });

    if (domains.length === 0) {
      console.log('   ⚠️ No domains found. Skipping system board seed.');
      return;
    }

    for (const domain of domains) {
      await ensureAllCanonicalBoards(prisma, domain.id);
      console.log(`   ✅ Ensured boards for domain "${domain.name}" (${domain.id})`);
    }
  } catch (error) {
    console.error('❌ Failed to seed system boards:', error);
    throw error;
  }
}














