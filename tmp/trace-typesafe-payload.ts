import 'dotenv/config';
import { prisma } from '@keeper/database';

async function main() {
  const ids = [
    '1143d4ff-f826-4dd6-9f76-5a6d43df588d',
    '19eb4b95-008c-4e24-9bac-51320ac4a2ea',
    '2946ebaa-d4b8-4ff0-8b61-ff58f2dea50d',
  ];
  const msgs = await prisma.kip_messages.findMany({
    where: { id: { in: ids } },
    select: { id: true, content: true, metadata: true, created_at: true },
  });
  for (const m of msgs) {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    console.log('====', m.id);
    console.log('content', m.content);
    console.log('metaKeys', Object.keys(meta));
    console.log(JSON.stringify(meta, null, 2).slice(0, 20000));
    console.log('====END');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
