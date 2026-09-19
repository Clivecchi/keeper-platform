/**
 * Read-only detail extract for the 03:09 System One test Turn.
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';

const AGENT_MSG = '12b5dc10-adf5-4de5-9505-61c3556f8896';
const USER_MSG = '35ebf578-a93f-40bd-8e51-5fd85c890272';
const LOG = '4bec0f75-965a-46ec-bd10-a619fe774788';
const SINCE = new Date('2026-09-19T03:00:00.000Z');

function keysOf(value: unknown): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value as Record<string, unknown>);
}

async function main() {
  const [agentMsg, userMsg, log, nearbyLogs, nearbyCastMessages] = await Promise.all([
    prisma.kip_messages.findUnique({
      where: { id: AGENT_MSG },
      select: { id: true, created_at: true, content: true, metadata: true },
    }),
    prisma.kip_messages.findUnique({
      where: { id: USER_MSG },
      select: { id: true, created_at: true, content: true, metadata: true },
    }),
    prisma.kip_agent_logs.findUnique({
      where: { id: LOG },
      select: { id: true, created_at: true, model: true, execution_time_ms: true, input: true, output: true, error: true },
    }),
    prisma.kip_agent_logs.findMany({
      where: { created_at: { gte: SINCE } },
      orderBy: { created_at: 'asc' },
      select: { id: true, created_at: true, agent_id: true, model: true, execution_time_ms: true },
    }),
    prisma.kip_messages.findMany({
      where: {
        created_at: { gte: SINCE },
        OR: [
          { sender: { in: ['Rendr', 'Cloud', 'Ceox', 'rendr', 'cloud'] } },
          { metadata: { path: ['agentName'], string_contains: 'Rendr' } },
        ],
      },
      select: { id: true, created_at: true, sender: true, role: true, content: true, metadata: true },
      take: 20,
    }),
  ]);

  const meta = (agentMsg?.metadata ?? {}) as Record<string, unknown>;
  const output = log?.output ? JSON.parse(log.output) as Record<string, unknown> : null;
  const data = output?.data && typeof output.data === 'object' ? output.data as Record<string, unknown> : null;
  const prompt = typeof data?.composedSystemPrompt === 'string' ? data.composedSystemPrompt : '';

  console.log(JSON.stringify({
    userMeta: userMsg?.metadata ?? null,
    userContentLen: typeof userMsg?.content === 'string' ? userMsg.content.length : 0,
    agentCard: meta.card ?? null,
    agentActionResults: meta.actionResults ?? null,
    agentCastVoices: meta.castVoices ?? null,
    agentDelegation: meta.delegation ?? null,
    nearbyLogs,
    nearbyCastMessages: nearbyCastMessages.map((m) => ({
      id: m.id,
      created_at: m.created_at,
      sender: m.sender,
      role: m.role,
      agentName: (m.metadata as Record<string, unknown> | null)?.agentName ?? null,
      preview: typeof m.content === 'string' ? m.content.slice(0, 160) : null,
    })),
    log: log
      ? {
          id: log.id,
          created_at: log.created_at,
          model: log.model,
          execution_time_ms: log.execution_time_ms,
          error: log.error,
          inputLen: log.input.length,
          outputKeys: keysOf(output),
          dataKeys: keysOf(data),
          actions: data?.actions ?? null,
          orchestration: data?.orchestration ?? null,
          castVoices: data?.castVoices ?? null,
          directorDelegation: data?.directorDelegation ?? null,
          promptHasTypesafe: /typesafe|system one|turnPosture|jev/i.test(prompt),
          promptHasCastSynthesis: /cast consultation|Cloud|Rendr|Ceox/i.test(prompt),
          promptHasReorganizeDirective: /REVIEW & REORGANIZE|the human asked/i.test(prompt),
          promptExcerptHead: prompt.slice(0, 500),
          promptExcerptTail: prompt.slice(-800),
        }
      : null,
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
