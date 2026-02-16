import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const KEEPER_MARK_ID = 'clx_emotif_keeper_mark';

async function main() {
  console.log('🎭 Seeding platform emotifs...');

  await prisma.platformEmotif.upsert({
    where: { symbol: 'keeper_mark' },
    update: { label: 'Keeper Mark' },
    create: {
      id: KEEPER_MARK_ID,
      symbol: 'keeper_mark',
      label: 'Keeper Mark',
    },
  });

  console.log('✅ Platform emotif upserted: keeper_mark (Keeper Mark)');
  console.log('🎉 Platform emotifs seed completed');
}

export default main;
