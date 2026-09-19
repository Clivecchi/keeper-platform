/**
 * Read-only trace of recent Finding the Plot turns.
 * Does not mutate anything.
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';

async function main() {
  const dialogs = await prisma.dialog.findMany({
    where: {
      is_archived: false,
      OR: [
        { title: { contains: 'Finding the Plot', mode: 'insensitive' } },
        { forward_title: { contains: 'Finding the Plot', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      title: true,
      domain_id: true,
      document_status: true,
      updated_at: true,
    },
    orderBy: { updated_at: 'desc' },
    take: 8,
  });
  console.log(JSON.stringify({ dialogs }, null, 2));

  const dialog = dialogs[0];
  if (!dialog) {
    console.log('No Finding the Plot dialog');
    return;
  }

  const sessions = await prisma.kip_sessions.findMany({
    where: { dialog_id: dialog.id, is_archived: false },
    select: { id: true, session_name: true, agent_id: true, updated_at: true },
    orderBy: { updated_at: 'desc' },
    take: 6,
  });
  console.log(JSON.stringify({ sessions }, null, 2));

  const messages = await prisma.kip_messages.findMany({
    where: {
      kip_sessions: { dialog_id: dialog.id, is_archived: false },
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
    take: 30,
  });

  const slim = messages.map((m) => {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    const actionResults = meta.actionResults;
    const orchestration = meta.orchestration;
    const provenance = meta.performanceProvenance;
    const castVoices = meta.castVoices;
    return {
      id: m.id,
      session_id: m.session_id,
      role: m.role,
      sender: m.sender,
      created_at: m.created_at,
      contentPreview: typeof m.content === 'string' ? m.content.slice(0, 800) : null,
      contentLen: typeof m.content === 'string' ? m.content.length : 0,
      actionResults,
      orchestration,
      provenance,
      castVoices: Array.isArray(castVoices)
        ? (castVoices as Array<Record<string, unknown>>).map((v) => ({
            slug: v.slug,
            attributedTo: v.attributedTo,
            status: v.status,
            contentPreview: typeof v.content === 'string' ? v.content.slice(0, 400) : null,
          }))
        : castVoices,
    };
  });

  console.log(JSON.stringify({ messageCount: slim.length, messages: slim }, null, 2));

  const manuscript = await prisma.kip_drafts.findFirst({
    where: {
      dialog_id: dialog.id,
      kind: 'document_manuscript',
      status: { notIn: ['archived', 'deleted'] },
    },
    orderBy: { updated_at: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      updated_at: true,
      spec_json: true,
    },
  });

  const spec = (manuscript?.spec_json ?? {}) as Record<string, unknown>;
  const proposal = spec.reorganizeProposal ?? spec.proposedDocument ?? spec.proposal ?? null;
  console.log(
    JSON.stringify(
      {
        manuscript: manuscript
          ? {
              id: manuscript.id,
              title: manuscript.title,
              status: manuscript.status,
              updated_at: manuscript.updated_at,
              specKeys: Object.keys(spec),
              hasProposal: Boolean(proposal),
              proposalPreview: proposal,
            }
          : null,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
