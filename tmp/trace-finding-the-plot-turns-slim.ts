/**
 * Slim read-only trace of the last Finding the Plot turns.
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';
import { detectReorganizeIntent } from '@keeper/shared';

const SESSION = '0a2a6715-535f-48bc-b459-a43c0f16e384';
const DIALOG = 'cmt274vr50009o6015ag28c89';
const DOMAIN = '9b0989f6-2fe4-4aa6-9c8a-f49a2516e7f9';

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
      message: r.message,
      errorCode: r.errorCode ?? null,
      spineOnly: data?.spineOnly ?? null,
      restatement: data?.restatement ?? null,
      openDumpRepaired: data?.openDumpRepaired ?? null,
      oneSectionDumpRepaired: data?.oneSectionDumpRepaired ?? null,
      placedCount: data?.placedCount ?? null,
      identityOnly: data?.identityOnly ?? null,
      dialogId: data?.dialogId ?? null,
      summary: data?.summary ?? null,
    };
  });
}

function slimOrch(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  return {
    mechanism: o.mechanism,
    model: o.model,
    executedModel: o.executedModel,
    offeringId: o.offeringId,
    fallbackUsed: o.fallbackUsed,
    castConsultSlugs: o.castConsultSlugs,
    castConsultRecords: o.castConsultRecords,
    consultOkCount: o.consultOkCount,
    documentInContext: o.documentInContext,
    documentPointCount: o.documentPointCount,
    delegateConsultCount: o.delegateConsultCount,
  };
}

async function main() {
  const messages = await prisma.kip_messages.findMany({
    where: { session_id: SESSION },
    select: {
      id: true,
      role: true,
      sender: true,
      content: true,
      created_at: true,
      metadata: true,
    },
    orderBy: { created_at: 'desc' },
    take: 16,
  });

  const rows = messages.reverse().map((m) => {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    const content = typeof m.content === 'string' ? m.content : '';
    return {
      id: m.id,
      role: m.role,
      sender: m.sender,
      created_at: m.created_at,
      reorganizeIntent: m.role === 'user' || m.sender === 'user' ? detectReorganizeIntent(content) : null,
      content,
      actionResults: slimActions(meta.actionResults),
      orchestration: slimOrch(meta.orchestration),
      castVoices: Array.isArray(meta.castVoices)
        ? (meta.castVoices as Array<Record<string, unknown>>).map((v) => ({
            slug: v.slug,
            attributedTo: v.attributedTo,
            status: v.status,
            content: typeof v.content === 'string' ? v.content : null,
          }))
        : null,
      model: meta.model ?? null,
      agentName: meta.agentName ?? null,
    };
  });

  const manuscript = await prisma.kip_drafts.findFirst({
    where: {
      domain_id: DOMAIN,
      dialog_id: DIALOG,
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
    const sections = Array.isArray(p.sections) ? p.sections : [];
    const points = Array.isArray(p.points) ? p.points : [];
    proposalSlim = {
      keys: Object.keys(p),
      title: p.title ?? null,
      rationale: typeof p.rationale === 'string' ? p.rationale.slice(0, 400) : p.rationale ?? null,
      proposedBy: p.proposedBy ?? null,
      proposedAt: p.proposedAt ?? p.updatedAt ?? null,
      sectionCount: sections.length,
      sectionTitles: sections.slice(0, 20).map((s) => {
        const row = s as Record<string, unknown>;
        return row.title ?? row.id ?? null;
      }),
      pointCount: points.length,
      changeCounts: points.reduce<Record<string, number>>((acc, row) => {
        const change = String((row as Record<string, unknown>).change ?? 'unknown');
        acc[change] = (acc[change] ?? 0) + 1;
        return acc;
      }, {}),
    };
  }

  const logs = await prisma.kip_agent_logs.findMany({
    where: {
      created_at: { gte: new Date('2026-09-18T20:00:00.000Z') },
    },
    orderBy: { created_at: 'desc' },
    take: 30,
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

  const typesafeMessages = messages.filter((m) => {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    const actions = Array.isArray(meta.actionResults) ? meta.actionResults : [];
    return actions.some((row) => {
      const type = (row as Record<string, unknown>).type;
      return type === 'typesafe.evaluate';
    });
  });

  console.log(JSON.stringify({
    turns: rows,
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
    typesafeOnRecentMessages: typesafeMessages.map((m) => m.id),
    recentLogs: logs.map((l) => ({
      id: l.id,
      agent_id: l.agent_id,
      created_at: l.created_at,
      model: l.model,
      execution_time_ms: l.execution_time_ms,
      error: l.error,
      inputPreview: typeof l.input === 'string' ? l.input.slice(0, 400) : l.input,
      outputPreview: typeof l.output === 'string' ? l.output.slice(0, 400) : l.output,
      mentionsTypesafe: `${l.input}\n${l.output ?? ''}`.toLowerCase().includes('typesafe'),
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
