import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });
const { prisma } = await import('@keeper/database');

const DIALOG = 'cmv04yrn50001otb8mwjrj0as';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const sessions = await prisma.kip_sessions.findMany({
  where: { dialog_id: DIALOG },
  select: { id: true, updated_at: true },
  orderBy: { updated_at: 'desc' },
  take: 2,
});

const rows = await prisma.kip_messages.findMany({
  where: { session_id: { in: sessions.map((row) => row.id) } },
  orderBy: { created_at: 'desc' },
  take: 8,
  select: {
    id: true,
    sender: true,
    role: true,
    created_at: true,
    content: true,
    metadata: true,
  },
});

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
          head: content.slice(0, 400),
        };
      })
    : [];
  const actions = Array.isArray(meta.actionResults)
    ? meta.actionResults.map((action) => {
        const item = asRecord(action);
        return {
          type: item?.type,
          status: item?.status,
          message: typeof item?.message === 'string' ? item.message.slice(0, 240) : '',
        };
      })
    : [];
  const trace = Array.isArray(meta.trace) ? meta.trace : [];
  const traceBrief = trace.slice(-8).map((step) => {
    const item = asRecord(step);
    return {
      kind: item?.kind ?? item?.type ?? item?.phase,
      label: typeof item?.label === 'string' ? item.label.slice(0, 160) : undefined,
      status: item?.status,
      message: typeof item?.message === 'string' ? item.message.slice(0, 180) : undefined,
    };
  });
  return {
    id: row.id,
    at: row.created_at,
    role: row.role || row.sender,
    contentLen: (row.content ?? '').length,
    content: (row.content ?? '').slice(0, 1200),
    metaKeys: Object.keys(meta).slice(0, 30),
    voices,
    actionCount: actions.length,
    actions: actions.slice(0, 16),
    traceCount: trace.length,
    traceBrief,
    error: meta.error ?? meta.failure ?? null,
    orchestration: meta.orchestration ?? null,
  };
});

writeFileSync(path.join(root, 'tmp', 'ot-last-turn.json'), JSON.stringify({ sessions, summary }, null, 2));
console.log(JSON.stringify(summary.map((row) => ({
  id: row.id,
  at: row.at,
  role: row.role,
  len: row.contentLen,
  voices: row.voices.map((voice) => `${voice.slug}:${voice.status}`),
  actions: row.actions.map((action) => `${action.type}:${action.status}`),
  head: row.content.slice(0, 180),
})), null, 2));
await prisma.$disconnect();
