/**
 * Read-only: latest Finding the Plot Lead turn after System One → Lead V0.
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';
import {
  detectReorganizeDetection,
  detectReorganizeIntent,
  shouldShadowDocumentTurnPosture,
} from '@keeper/shared';

const AFTER = new Date('2026-09-19T14:00:00.000Z');
const SESSION = '0a2a6715-535f-48bc-b459-a43c0f16e384';

async function main() {
  const messages = await prisma.kip_messages.findMany({
    where: {
      session_id: SESSION,
      created_at: { gte: AFTER },
    },
    orderBy: { created_at: 'desc' },
    take: 8,
    select: {
      id: true,
      role: true,
      sender: true,
      content: true,
      created_at: true,
      metadata: true,
    },
  });

  const latestAny = await prisma.kip_messages.findMany({
    where: { session_id: SESSION },
    orderBy: { created_at: 'desc' },
    take: 4,
    select: {
      id: true,
      role: true,
      sender: true,
      content: true,
      created_at: true,
      metadata: true,
    },
  });

  const logs = await prisma.kip_agent_logs.findMany({
    where: {
      agent_id: '385689a0-d5e5-47a7-bf97-08d6597e1a33',
      created_at: { gte: AFTER },
    },
    orderBy: { created_at: 'desc' },
    take: 4,
    select: {
      id: true,
      created_at: true,
      model: true,
      execution_time_ms: true,
      input: true,
      output: true,
    },
  });

  const slim = (m: (typeof latestAny)[number]) => {
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
      content,
      displayContent: meta.displayContent ?? null,
      metadataKeys: Object.keys(meta),
      mechanism: orch?.mechanism ?? null,
      systemOneOrientation: orch?.systemOneOrientation ?? null,
      turnPostureShadow: orch?.turnPostureShadow
        ? {
            ok: (orch.turnPostureShadow as Record<string, unknown>).ok,
            model: (orch.turnPostureShadow as Record<string, unknown>).model,
            parsed: (orch.turnPostureShadow as Record<string, unknown>).parsed,
            phraseSignal: ((orch.turnPostureShadow as Record<string, unknown>).invocation as Record<string, unknown> | undefined)
              && ((orch.turnPostureShadow as Record<string, unknown>).invocation as Record<string, unknown>).state
              ? ((
                  (orch.turnPostureShadow as Record<string, unknown>).invocation as Record<string, unknown>
                ).state as Record<string, unknown>).phraseSignal
              : null,
            turnPreview: (() => {
              const inv = (orch.turnPostureShadow as Record<string, unknown>).invocation as Record<string, unknown> | undefined;
              const state = inv?.state as Record<string, unknown> | undefined;
              return typeof state?.turn === 'string' ? state.turn.slice(0, 180) : null;
            })(),
          }
        : null,
      castSlugs: orch?.castConsultSlugs ?? null,
      phraseSignal: m.role === 'user' ? detectReorganizeDetection(content) : null,
      intent: m.role === 'user' ? detectReorganizeIntent(content) : null,
      wouldShadowFull: m.role === 'user' ? shouldShadowDocumentTurnPosture(detectReorganizeDetection(content)) : null,
      wouldShadowDisplay: m.role === 'user' && typeof meta.displayContent === 'string'
        ? shouldShadowDocumentTurnPosture(detectReorganizeDetection(meta.displayContent))
        : null,
    };
  };

  console.log(JSON.stringify({
    afterFilter: messages.map(slim),
    latestAny: latestAny.map(slim),
    logs: logs.map((l) => {
      const output = l.output ? JSON.parse(l.output) as {
        data?: { composedSystemPrompt?: string; orchestration?: Record<string, unknown>; response?: string };
      } : null;
      const prompt = output?.data?.composedSystemPrompt ?? '';
      return {
        id: l.id,
        created_at: l.created_at,
        model: l.model,
        execution_time_ms: l.execution_time_ms,
        inputPreview: l.input.slice(0, 220),
        responsePreview: typeof output?.data?.response === 'string' ? output.data.response.slice(0, 400) : null,
        orchSystemOne: output?.data?.orchestration?.systemOneOrientation ?? null,
        orchShadowOk: (output?.data?.orchestration?.turnPostureShadow as Record<string, unknown> | undefined)?.ok ?? null,
        promptHasOrientationBlock: prompt.includes('[System One orientation — Lead only]'),
        promptHasAvailableYes: /Available: yes/.test(prompt),
        promptHasAvailableNo: /Available: no/.test(prompt),
        promptHasJevModel: /jev-1\.13\.0/.test(prompt),
        promptHasUnavailableLine: /No System One result was available to me for this Turn/.test(prompt),
      };
    }),
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
