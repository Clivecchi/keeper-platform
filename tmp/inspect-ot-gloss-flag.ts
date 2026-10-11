import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });
const { prisma } = await import('@keeper/database');

const row = await prisma.kip_messages.findUnique({
  where: { id: '23cba57e-614c-4b6c-8136-6c0c6d910571' },
  select: { metadata: true },
});
const meta = row?.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
  ? row.metadata as Record<string, unknown>
  : {};
console.log(JSON.stringify({
  keys: Object.keys(meta),
  glossCarrier: meta.glossCarrier,
  threadCount: Array.isArray(meta.glossThreads) ? meta.glossThreads.length : 0,
}, null, 2));
await prisma.$disconnect();
