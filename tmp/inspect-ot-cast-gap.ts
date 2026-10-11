/**
 * Read-only dump of one Operational Truth Cast turn.
 * Does not update messages, Points, or Sections.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });

const { prisma } = await import('@keeper/database');

const SESSION = '45dc89eb-d9e6-46cc-94ce-49924fee6d6c';
const HUMAN = 'a18def78-fde7-4df8-8bc8-bf3cc6429850';
const ASSISTANT = '953a0ddd-4978-4c43-b2d0-2f687b2f98ff';
const outDir = path.join(root, 'tmp', 'ot-cast-gap-2026-10-10');
mkdirSync(outDir, { recursive: true });

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const messages = await prisma.kip_messages.findMany({
  where: { session_id: SESSION },
  orderBy: { created_at: 'asc' },
  select: {
    id: true,
    sender: true,
    role: true,
    content: true,
    metadata: true,
    created_at: true,
  },
});

const humanIndex = messages.findIndex((row) => row.id === HUMAN);
const window = messages.filter((row) => row.id === HUMAN || row.id === ASSISTANT);

function summarizeAction(row: unknown): Record<string, unknown> {
  const rec = asRecord(row);
  if (!rec) return { raw: typeof row };
  const data = asRecord(rec.data);
  const points = Array.isArray(data?.points) ? data.points : Array.isArray(data?.document && asRecord(data.document)?.points)
    ? (asRecord(data?.document)?.points as unknown[])
    : null;
  const pointSample = Array.isArray(points)
    ? (points as unknown[]).slice(0, 2).map((point) => {
        const p = asRecord(point);
        return {
          keys: p ? Object.keys(p) : [],
          number: p?.number,
          id: p?.id,
          prelude: typeof p?.prelude === 'string' ? p.prelude.slice(0, 80) : undefined,
          previewLen: typeof p?.preview === 'string' ? p.preview.length : 0,
          contentLen: typeof p?.content === 'string' ? p.content.length : 0,
        };
      })
    : undefined;
  return {
    type: rec.type,
    status: rec.status,
    message: typeof rec.message === 'string' ? rec.message.slice(0, 400) : rec.message,
    errorCode: rec.errorCode,
    dataKeys: data ? Object.keys(data) : [],
    pointTotal: data?.pointTotal,
    pointOffset: data?.pointOffset,
    pointCount: Array.isArray(points) ? points.length : undefined,
    pointSample,
    error: data?.error ?? rec.error,
    dataMessage: typeof data?.message === 'string' ? data.message.slice(0, 400) : undefined,
    path: data?.path ?? data?.file,
    nearby: data?.nearby ?? data?.entries,
  };
}

const dump = window.map((row) => {
  const meta = asRecord(row.metadata) ?? {};
  const actions = Array.isArray(meta.actionResults) ? meta.actionResults : [];
  const trace = Array.isArray(meta.roomTrace) ? meta.roomTrace : Array.isArray(meta.trace) ? meta.trace : [];
  return {
    id: row.id,
    at: row.created_at.toISOString(),
    role: row.role,
    sender: row.sender,
    contentChars: row.content.length,
    content: row.content,
    metaKeys: Object.keys(meta),
    consultedSlugs: meta.consultedSlugs,
    actionCount: actions.length,
    actions: actions.map(summarizeAction),
    trace,
    gloss: meta.glossThreads ?? meta.gloss,
  };
});

const needle = '320e4056-fb0f-4338-8468-53d5c5a28212';
const hits = messages.filter((row) => JSON.stringify(row.metadata).includes(needle) || row.content.includes(needle) || row.id === needle);
writeFileSync(path.join(outDir, 'turn-window.json'), JSON.stringify(dump, null, 2));
writeFileSync(path.join(outDir, 'human-turn-hits.json'), JSON.stringify(hits.map((row) => row.id), null, 2));
writeFileSync(path.join(outDir, 'index.json'), JSON.stringify({
  session: SESSION,
  human: HUMAN,
  humanIndex,
  messageCount: messages.length,
  ids: messages.map((row) => ({
    id: row.id,
    at: row.created_at.toISOString(),
    role: row.role,
    chars: row.content.length,
    head: row.content.replace(/\s+/g, ' ').slice(0, 120),
  })),
}, null, 2));

console.log(JSON.stringify({
  humanIndex,
  messageCount: messages.length,
  window: dump.map((row) => ({
    id: row.id,
    at: row.at,
    role: row.role,
    contentChars: row.contentChars,
    actionCount: row.actionCount,
    consultedSlugs: row.consultedSlugs,
    actionTypes: row.actions.map((action) => `${action.type}:${action.status}`),
  })),
}, null, 2));

await prisma.$disconnect();
