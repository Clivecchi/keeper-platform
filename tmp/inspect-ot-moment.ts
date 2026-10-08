import 'dotenv/config';
import { prisma } from '@keeper/database';

const id = 'cmv04wg0l0006mr01u06qrove';
const row = await prisma.moment.findUnique({
  where: { id },
  select: {
    id: true,
    title: true,
    ownerId: true,
    keptAt: true,
    narrative: true,
    domain: { select: { slug: true } },
    anonKey: true,
    claimToken: true,
  },
});
console.log(JSON.stringify({
  id: row?.id,
  title: row?.title,
  ownerId: row?.ownerId,
  keptAt: row?.keptAt,
  domain: row?.domain.slug,
  narrativePresent: Boolean(row?.narrative?.includes('OT anonymous autosave')),
  anonKeyPresent: Boolean(row?.anonKey),
  claimTokenPresent: Boolean(row?.claimToken),
}));
if (row && !row.ownerId) {
  await prisma.moment.delete({ where: { id } });
  console.log('deleted-unclaimed');
}
await prisma.$disconnect();
