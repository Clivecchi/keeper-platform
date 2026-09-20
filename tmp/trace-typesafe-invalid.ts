import 'dotenv/config';
import { prisma } from '@keeper/database';

async function main() {
  const since = new Date(Date.now() - 6 * 60 * 60 * 1000);
  const msgs = await prisma.kip_messages.findMany({
    where: {
      created_at: { gte: since },
      OR: [
        { content: { contains: 'INVALID_QUESTIONS', mode: 'insensitive' } },
        { content: { contains: 'typesafe.evaluate', mode: 'insensitive' } },
        { content: { contains: 'TypeSafe Probe', mode: 'insensitive' } },
        { content: { contains: 'high-confidence', mode: 'insensitive' } },
      ],
    },
    orderBy: { created_at: 'desc' },
    take: 40,
    select: {
      id: true,
      role: true,
      sender: true,
      created_at: true,
      session_id: true,
      content: true,
      metadata: true,
    },
  });
  console.log('MSG_COUNT', msgs.length);
  for (const m of msgs) {
    const meta = (m.metadata ?? {}) as Record<string, unknown>;
    const orch = (meta.orchestration ?? {}) as Record<string, unknown>;
    console.log('---');
    console.log(
      JSON.stringify(
        {
          id: m.id,
          created_at: m.created_at,
          role: m.role,
          senderName: meta.senderName ?? meta.agentName ?? m.sender,
          contentHead: (m.content || '').slice(0, 500),
          card: meta.card ?? null,
          actionResults: meta.actionResults ?? meta.actions ?? null,
          mechanism: orch.mechanism ?? null,
          castConsultSlugs: orch.castConsultSlugs ?? null,
          castConsultRecords: orch.castConsultRecords ?? null,
          agentSlug: orch.agentSlug ?? meta.agentName ?? null,
        },
        null,
        2,
      ),
    );
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
