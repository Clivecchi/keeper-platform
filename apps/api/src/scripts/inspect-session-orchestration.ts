/**
 * Read-only: dump kip_messages + orchestration metadata for a session.
 * Usage: DATABASE_URL=... npx tsx src/scripts/inspect-session-orchestration.ts <sessionId>
 */
import { prisma } from '@keeper/database';

const sessionId = process.argv[2] || '8a694977-ce7c-4697-bf71-58d99dcfc25d';

async function main() {
  const session = await prisma.kip_sessions.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      dialog_id: true,
      agent_id: true,
      created_at: true,
      session_name: true,
      user_id: true,
    },
  });
  console.log('SESSION', JSON.stringify(session, null, 2));

  const msgs = await prisma.kip_messages.findMany({
    where: { session_id: sessionId },
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
  console.log('MSG_COUNT', msgs.length);

  for (const m of msgs) {
    const meta =
      m.metadata && typeof m.metadata === 'object' && !Array.isArray(m.metadata)
        ? (m.metadata as Record<string, unknown>)
        : {};
    const preview = (m.content || '').slice(0, 400).replace(/\n/g, ' ');
    console.log('\n---MSG---');
    console.log(
      JSON.stringify(
        {
          id: m.id,
          sender: m.sender,
          role: m.role,
          created_at: m.created_at,
          preview,
          orchestration: meta.orchestration ?? null,
          agent_id: meta.agent_id ?? null,
          actionResultsCount: Array.isArray(meta.actionResults)
            ? meta.actionResults.length
            : 0,
        },
        null,
        2,
      ),
    );
    if (typeof m.content === 'string' && /cast honesty/i.test(m.content)) {
      console.log('FULL_CONTENT_MATCH_CAST_HONESTY:');
      console.log(m.content);
    }
  }

  // Sibling sessions around the same dialog (instrument sub-runs use sessionId undefined)
  if (session?.dialog_id) {
    const nearby = await prisma.kip_sessions.findMany({
      where: {
        dialog_id: session.dialog_id,
        created_at: {
          gte: new Date('2026-07-25T12:00:00.000Z'),
          lte: new Date('2026-07-25T14:00:00.000Z'),
        },
      },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        agent_id: true,
        session_name: true,
        created_at: true,
        _count: { select: { kip_messages: true } },
      },
      take: 40,
    });
    console.log('\nNEARBY_DIALOG_SESSIONS', JSON.stringify(nearby, null, 2));
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
