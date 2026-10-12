import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });
const { prisma } = await import('@keeper/database');

const SESSION = '45dc89eb-d9e6-46cc-94ce-49924fee6d6c';
const rows = await prisma.kip_messages.findMany({
  where: { session_id: SESSION },
  orderBy: { created_at: 'desc' },
  take: 4,
  select: {
    id: true,
    sender: true,
    role: true,
    created_at: true,
    content: true,
    metadata: true,
  },
});

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const summary = rows.reverse().map((row) => {
  const meta = asRecord(row.metadata) ?? {};
  const voices = Array.isArray(meta.castVoices)
    ? meta.castVoices.map((voice) => {
        const item = asRecord(voice);
        const content = typeof item?.content === 'string' ? item.content : '';
        return {
          slug: item?.slug,
          name: item?.attributedTo,
          status: item?.status,
          len: content.length,
          head: content.slice(0, 220),
        };
      })
    : [];
  const actions = Array.isArray(meta.actionResults)
    ? meta.actionResults.map((action) => {
        const item = asRecord(action);
        return {
          type: item?.type,
          status: item?.status,
          message: typeof item?.message === 'string' ? item.message.slice(0, 180) : '',
          tool: asRecord(item?.data)?.tool,
        };
      })
    : [];
  return {
    id: row.id,
    at: row.created_at,
    role: row.role || row.sender,
    contentLen: (row.content ?? '').length,
    contentHead: (row.content ?? '').slice(0, 500),
    voices,
    actionCount: actions.length,
    actions: actions.slice(0, 12),
    traceCount: Array.isArray(meta.trace) ? meta.trace.length : 0,
  };
});

writeFileSync(
  path.join(root, 'tmp', 'latest-cast-turn.json'),
  JSON.stringify(summary, null, 2),
);
console.log('wrote', summary.length);
await prisma.$disconnect();
