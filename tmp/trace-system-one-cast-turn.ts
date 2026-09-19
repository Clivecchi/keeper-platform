/**
 * Read-only trace of the just-completed System One Cast test Turn.
 * Does not mutate anything.
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';
import { detectReorganizeDetection, detectReorganizeIntent } from '@keeper/shared';

const SINCE = new Date('2026-09-19T01:00:00.000Z');
const DOMAIN = '9b0989f6-2fe4-4aa6-9c8a-f49a2516e7f9';
const FINDING = 'cmt274vr50009o6015ag28c89';

function preview(value: unknown, n = 1200): string | null {
  if (typeof value !== 'string') return value == null ? null : JSON.stringify(value).slice(0, n);
  return value.length > n ? `${value.slice(0, n)}…` : value;
}

function slimActions(raw: unknown) {
  if (!Array.isArray(raw)) return raw ?? null;
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    const data = r.data && typeof r.data === 'object' && !Array.isArray(r.data)
      ? (r.data as Record<string, unknown>)
      : null;
    return {
      type: r.type,
      status: r.status,
      message: preview(r.message, 240),
      errorCode: r.errorCode ?? null,
      dataKeys: data ? Object.keys(data) : [],
      spineOnly: data?.spineOnly ?? null,
      restatement: data?.restatement ?? null,
      dialogId: data?.dialogId ?? null,
      applied: data?.applied ?? null,
      proposalStored: data?.proposalStored ?? data?.stored ?? null,
    };
  });
}

async function main() {
  const recentMessages = await prisma.kip_messages.findMany({
    where: {
      created_at: { gte: SINCE },
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
          dialog: { select: { id: true, title: true, domain_id: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
    take: 40,
  });

  const findingMessages = await prisma.kip_messages.findMany({
    where: {
      kip_sessions: { dialog_id: FINDING, is_archived: false },
    },
    select: {
      id: true,
      session_id: true,
      role: true,
      sender: true,
      content: true,
      created_at: true,
      metadata: true,
    },
    orderBy: { created_at: 'desc' },
    take: 12,
  });

  const logs = await prisma.kip_agent_logs.findMany({
    where: { created_at: { gte: SINCE } },
    orderBy: { created_at: 'desc' },
    take: 40,
    select: {
      id: true,
      agent_id: true,
      user_id: true,
      created_at: true,
      model: true,
      execution_time_ms: true,
      error: true,
      input: true,
      output: true,
    },
  });

  const agents = await prisma.kip_agents.findMany({
    where: {
      OR: [
        { slug: { in: ['rendr', 'cloud', 'chuck-livecchi-lead', 'ceox', 'kip'] } },
        { id: { in: [...new Set(logs.map((l) => l.agent_id).filter(Boolean))] } },
      ],
    },
    select: { id: true, slug: true, name: true, model: true, model_provider: true, role: true },
  });
  const agentById = Object.fromEntries(agents.map((a) => [a.id, a]));

  const manuscript = await prisma.kip_drafts.findFirst({
    where: {
      domain_id: DOMAIN,
      dialog_id: FINDING,
      kind: 'document_manuscript',
      status: { notIn: ['promoted', 'archived'] },
    },
    orderBy: { updated_at: 'desc' },
    select: { id: true, title: true, status: true, updated_at: true, spec_json: true },
  });
  const spec = (manuscript?.spec_json ?? {}) as Record<string, unknown>;
  const proposal = spec.reorganizeProposal;
  let proposalSlim: Record<string, unknown> | null = null;
  if (proposal && typeof proposal === 'object' && !Array.isArray(proposal)) {
    const p = proposal as Record<string, unknown>;
    proposalSlim = {
      keys: Object.keys(p),
      title: p.title ?? null,
      proposedBy: p.proposedBy ?? null,
      proposedAt: p.proposedAt ?? p.updatedAt ?? null,
      rationale: typeof p.rationale === 'string' ? p.rationale.slice(0, 240) : p.rationale ?? null,
    };
  }

  const slimMsg = (m: (typeof recentMessages)[number] | (typeof findingMessages)[number]) => {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    const content = typeof m.content === 'string' ? m.content : '';
    const orch = meta.orchestration && typeof meta.orchestration === 'object'
      ? (meta.orchestration as Record<string, unknown>)
      : null;
    const session = 'kip_sessions' in m ? m.kip_sessions : null;
    return {
      id: m.id,
      created_at: m.created_at,
      role: m.role,
      sender: m.sender,
      session_id: m.session_id,
      dialog: session?.dialog ?? null,
      session_name: session?.session_name ?? null,
      content,
      phraseSignal: m.role === 'user' || m.sender === 'user'
        ? detectReorganizeDetection(content)
        : null,
      reorganizeIntent: m.role === 'user' || m.sender === 'user'
        ? detectReorganizeIntent(content)
        : null,
      model: meta.model ?? null,
      agentName: meta.agentName ?? null,
      actionResults: slimActions(meta.actionResults),
      orchestrationKeys: orch ? Object.keys(orch) : [],
      mechanism: orch?.mechanism ?? null,
      turnPostureShadow: orch?.turnPostureShadow ?? null,
      executedModel: orch?.executedModel ?? null,
      offeringId: orch?.offeringId ?? null,
      fallbackUsed: orch?.fallbackUsed ?? null,
      castConsultSlugs: orch?.castConsultSlugs ?? null,
      castConsultRecords: orch?.castConsultRecords ?? null,
      documentInContext: orch?.documentInContext ?? null,
      documentPointCount: orch?.documentPointCount ?? null,
      castVoices: Array.isArray(meta.castVoices)
        ? (meta.castVoices as Array<Record<string, unknown>>).map((v) => ({
            slug: v.slug,
            attributedTo: v.attributedTo,
            status: v.status,
            content: typeof v.content === 'string' ? v.content : null,
          }))
        : null,
      provenance: meta.performanceProvenance ?? null,
      metadataKeys: Object.keys(meta),
    };
  };

  console.log(JSON.stringify({
    recentAcrossDomain: recentMessages.map(slimMsg),
    findingLatest: findingMessages.map(slimMsg),
    manuscript: manuscript
      ? {
          id: manuscript.id,
          title: manuscript.title,
          status: manuscript.status,
          updated_at: manuscript.updated_at,
          specKeys: Object.keys(spec),
          proposal: proposalSlim,
        }
      : null,
    agents,
    recentLogs: logs.map((l) => ({
      id: l.id,
      created_at: l.created_at,
      agent: agentById[l.agent_id] ?? { id: l.agent_id },
      model: l.model,
      execution_time_ms: l.execution_time_ms,
      error: l.error,
      input: preview(l.input, 800),
      output: preview(l.output, 800),
      mentionsTypesafe: `${l.input}\n${l.output ?? ''}`.toLowerCase().includes('typesafe')
        || `${l.input}\n${l.output ?? ''}`.toLowerCase().includes('system one')
        || `${l.input}\n${l.output ?? ''}`.toLowerCase().includes('turnposture'),
      mentionsReorganize: `${l.input}\n${l.output ?? ''}`.toLowerCase().includes('reorganize'),
    })),
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
