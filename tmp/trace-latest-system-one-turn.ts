/**
 * Read-only trace of the latest Finding the Plot Cast Turn.
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';
import { detectReorganizeDetection, detectReorganizeIntent, shouldShadowDocumentTurnPosture } from '@keeper/shared';

const SESSION = '0a2a6715-535f-48bc-b459-a43c0f16e384';
const AFTER = new Date('2026-09-19T03:10:00.000Z');

function preview(value: unknown, n = 900): string | null {
  if (typeof value !== 'string') return value == null ? null : JSON.stringify(value).slice(0, n);
  return value.length > n ? `${value.slice(0, n)}…` : value;
}

function slimActions(raw: unknown) {
  if (!Array.isArray(raw)) return raw ?? null;
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      type: r.type,
      status: r.status,
      message: preview(r.message, 200),
    };
  });
}

async function main() {
  const messages = await prisma.kip_messages.findMany({
    where: {
      created_at: { gte: AFTER },
      kip_sessions: { is_archived: false },
    },
    select: {
      id: true,
      session_id: true,
      role: true,
      sender: true,
      content: true,
      created_at: true,
      metadata: true,
      kip_sessions: {
        select: {
          id: true,
          session_name: true,
          agent_id: true,
          dialog_id: true,
          dialog: { select: { id: true, title: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take: 30,
  });

  const logs = await prisma.kip_agent_logs.findMany({
    where: { created_at: { gte: AFTER } },
    orderBy: { created_at: 'desc' },
    take: 20,
    select: {
      id: true,
      agent_id: true,
      created_at: true,
      model: true,
      execution_time_ms: true,
      error: true,
      input: true,
      output: true,
    },
  });

  const agents = await prisma.kip_agents.findMany({
    where: { id: { in: [...new Set(logs.map((l) => l.agent_id))] } },
    select: { id: true, slug: true, name: true, model: true, model_provider: true },
  });
  const agentById = Object.fromEntries(agents.map((a) => [a.id, a]));

  const rows = messages.map((m) => {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    const orch = meta.orchestration && typeof meta.orchestration === 'object'
      ? (meta.orchestration as Record<string, unknown>)
      : null;
    const content = typeof m.content === 'string' ? m.content : '';
    return {
      id: m.id,
      created_at: m.created_at,
      role: m.role,
      sender: m.sender,
      session_name: m.kip_sessions.session_name,
      dialog: m.kip_sessions.dialog,
      content,
      phraseSignal: m.role === 'user' || m.sender === 'user' ? detectReorganizeDetection(content) : null,
      reorganizeIntent: m.role === 'user' || m.sender === 'user' ? detectReorganizeIntent(content) : null,
      wouldShadow: m.role === 'user' || m.sender === 'user'
        ? shouldShadowDocumentTurnPosture(detectReorganizeDetection(content))
        : null,
      model: meta.model ?? null,
      agentName: meta.agentName ?? null,
      actionResults: slimActions(meta.actionResults),
      mechanism: orch?.mechanism ?? null,
      turnPostureShadow: orch?.turnPostureShadow ?? null,
      executedModel: orch?.executedModel ?? null,
      offeringId: orch?.offeringId ?? null,
      castConsultSlugs: orch?.castConsultSlugs ?? null,
      castConsultRecords: orch?.castConsultRecords ?? null,
      castVoices: Array.isArray(meta.castVoices)
        ? (meta.castVoices as Array<Record<string, unknown>>).map((v) => ({
            slug: v.slug,
            attributedTo: v.attributedTo,
            status: v.status,
            content: typeof v.content === 'string' ? v.content : null,
          }))
        : null,
      metadataKeys: Object.keys(meta),
    };
  });

  console.log(JSON.stringify({ rows, agents, logs: logs.map((l) => ({
    id: l.id,
    created_at: l.created_at,
    agent: agentById[l.agent_id] ?? { id: l.agent_id },
    model: l.model,
    execution_time_ms: l.execution_time_ms,
    error: l.error,
    input: preview(l.input, 600),
    output: preview(l.output, 400),
  })) }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
