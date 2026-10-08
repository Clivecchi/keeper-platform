/**
 * Live replay of the progressive Cast room. Observation only.
 * Same order as apps/web/src/v0/boards/castRoomTurn.ts plus the Lead present pass.
 * Does not change prompts, allowlists, or actions.
 */
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prisma } from '@keeper/database';
import {
  buildCastSpeechAndAgencyLines,
  castRoomEvent,
  parseCastRoomEngage,
  projectCastRoomTrail,
  type CastRoomEvent,
  type CastRoomOfferLine,
} from '@keeper/shared';
import { KipAgentService } from '../api/kip/agents.js';
import { runCastOffer } from '../services/castRoomOffer.js';

const VOICE_SLUGS = ['cloud', 'rendr', 'chuck-livecchi-lead'] as const;

type ActionRow = {
  type?: string;
  status?: string;
  message?: string;
  data?: Record<string, unknown>;
};

type TurnReport = {
  human: string;
  offers: Array<{ slug: string; offer: string }>;
  direction: string;
  engage: { slug: string; aim: string } | null;
  contribution: {
    slug: string;
    reply: string;
    actions: ActionRow[];
    handedToPresent: false;
  } | null;
  present: {
    reply: string;
    actions: ActionRow[];
  };
  trace: Array<{ who: string; what: string; label?: string }>;
  promptFlags: {
    directionHasCore: boolean;
    directionSkipsProbe: boolean;
    contributionHasCore: boolean;
    contributionHasCatalog: boolean;
    presentHasCore: boolean;
    presentHasHistoryHint: boolean;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function dig(root: unknown, key: string): unknown {
  const seen = new Set<unknown>();
  const walk = (node: unknown, depth: number): unknown => {
    if (!node || typeof node !== 'object' || depth > 6 || seen.has(node)) return undefined;
    seen.add(node);
    const record = node as Record<string, unknown>;
    if (key in record) return record[key];
    if (record.data !== undefined) return walk(record.data, depth + 1);
    return undefined;
  };
  return walk(root, 0);
}

function replyOf(result: unknown): string {
  const value = dig(result, 'response');
  return typeof value === 'string' ? value.trim() : '';
}

function actionsOf(result: unknown): ActionRow[] {
  const value = dig(result, 'actions');
  if (!Array.isArray(value)) return [];
  return value.flatMap((row) => {
    const record = asRecord(row);
    if (!record || typeof record.type !== 'string') return [];
    return [{
      type: record.type,
      status: typeof record.status === 'string' ? record.status : undefined,
      message: typeof record.message === 'string' ? record.message : undefined,
      data: asRecord(record.data) ?? undefined,
    }];
  });
}

function promptOf(result: unknown): string {
  const value = dig(result, 'composedSystemPrompt');
  return typeof value === 'string' ? value : '';
}

function clip(text: string, max = 1200): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max)}…`;
}

function summarizeAction(row: ActionRow): string {
  const data = row.data ?? {};
  const title = typeof data.title === 'string' ? data.title : '';
  const draft = asRecord(data.draft);
  const draftTitle = typeof draft?.title === 'string' ? draft.title : title;
  const content = typeof data.content === 'string'
    ? data.content
    : typeof draft?.content === 'string'
      ? draft.content
      : '';
  return [
    row.type,
    row.status,
    row.message,
    draftTitle ? `title=${draftTitle}` : '',
    content ? `body=${clip(content, 500)}` : '',
  ].filter(Boolean).join(' | ');
}

function delegationPrompt(userMessage: string, label: string): string {
  return [
    `[Director delegation — ${label} on the Build board]`,
    `The user addressed ${label} (Cast member pinned on the Build board).`,
    `Kip (Lead) relayed:`,
    `"${userMessage}"`,
    '',
    ...buildCastSpeechAndAgencyLines({
      castMemberLabel: label,
      directorName: 'Kip',
    }),
    'If they ask you to name an item from the Dialog Document / a Path, quote ONLY a title or preview from the DIALOG DOCUMENT Points block in your system prompt. Never invent a title. Never treat a system-rule heading as a Document item. If you cannot find a matching Point, say you cannot name one.',
  ].join('\n');
}

function traceLine(event: CastRoomEvent): { who: string; what: string; label?: string } {
  return {
    who: event.actor.slug || event.actor.kind,
    what: event.what,
    ...(event.label ? { label: event.label } : {}),
  };
}

async function runTurn(params: {
  human: string;
  voices: Array<{ slug: string; label: string; id: string }>;
  kipId: string;
  userId: string;
  domainId: string;
  dialogId: string;
  sessionId: string;
  previousTrace: CastRoomEvent[];
}): Promise<{ report: TurnReport; trace: CastRoomEvent[] }> {
  const humanTurnId = randomUUID();
  const where = {
    humanTurnId,
    dialogId: params.dialogId,
    sessionId: params.sessionId,
    domainId: params.domainId,
  };
  const trace: CastRoomEvent[] = [
    castRoomEvent({
      actor: { kind: 'human' },
      what: 'spoke',
      ...where,
      label: params.human.trim().slice(0, 180),
    }),
  ];
  const agentContext = {
    conversationProfile: 'agency',
    skipDelegateConsult: true,
  };
  const trailForOffers = projectCastRoomTrail(trace, params.previousTrace);
  console.error(`\n[replay] offers for: ${clip(params.human, 120)}`);
  const offers: CastRoomOfferLine[] = [];
  for (const voice of params.voices) {
    const offer = await runCastOffer({
      slug: voice.slug,
      label: voice.label,
      userMessage: params.human,
      trail: trailForOffers,
      userId: params.userId,
      domainId: params.domainId,
    });
    const text = offer.offer.trim();
    console.error(`[replay] offer ${voice.slug}: ${clip(text, 240) || '(silence)'}`);
    if (text) {
      trace.push(castRoomEvent({
        actor: { kind: 'agent', slug: voice.slug },
        what: 'offered',
        ...where,
        label: text,
      }));
    }
    offers.push({ slug: voice.slug, label: voice.label, offer: text });
  }

  console.error('[replay] Kip direction');
  const directionResult = await KipAgentService.runAgent(
    params.kipId,
    params.human,
    params.userId,
    params.sessionId,
    {
      domainId: params.domainId,
      dialogId: params.dialogId,
      humanTurnId,
      ephemeral: true,
      agentContext: {
        ...agentContext,
        castRoom: {
          phase: 'direct',
          trail: projectCastRoomTrail(trace, params.previousTrace),
          offers,
          allowEngage: true,
          trace,
          consumption: [],
        },
      },
    },
  );
  const directionText = replyOf(directionResult);
  const engageRaw = dig(directionResult, 'engage');
  const engage = parseCastRoomEngage(engageRaw);
  const allowed = engage && params.voices.some((voice) => voice.slug === engage.slug) ? engage : null;
  console.error(`[replay] direction: ${clip(directionText, 400)}`);
  console.error(`[replay] engage: ${allowed ? `${allowed.slug} — ${allowed.aim}` : 'none'}`);

  let contribution: TurnReport['contribution'] = null;
  let contributionPrompt = '';
  if (allowed) {
    const voice = params.voices.find((row) => row.slug === allowed.slug)!;
    trace.push(castRoomEvent({
      actor: { kind: 'agent', slug: 'kip' },
      what: 'directed',
      ...where,
      label: `${allowed.slug}: ${allowed.aim}`,
    }));
    console.error(`[replay] full contribution ${voice.slug}`);
    const castResult = await KipAgentService.runAgent(
      voice.id,
      `${delegationPrompt(params.human, voice.label)}\n\nRoom trail:\n${projectCastRoomTrail(trace, params.previousTrace)}\n\nLead aim: ${allowed.aim}`,
      params.userId,
      params.sessionId,
      {
        domainId: params.domainId,
        dialogId: params.dialogId,
        humanTurnId,
        ephemeral: true,
        agentContext,
      },
    );
    const castReply = replyOf(castResult);
    const castActions = actionsOf(castResult);
    contributionPrompt = promptOf(castResult);
    console.error(`[replay] ${voice.slug} reply: ${clip(castReply, 500)}`);
    for (const action of castActions) console.error(`[replay] ${voice.slug} action: ${summarizeAction(action)}`);
    if (castReply) {
      trace.push(castRoomEvent({
        actor: { kind: 'agent', slug: voice.slug },
        what: 'contributed',
        ...where,
        label: castReply.slice(0, 180),
      }));
    }
    contribution = {
      slug: voice.slug,
      reply: castReply,
      actions: castActions,
      handedToPresent: false,
    };
  }

  const heard = params.voices.map((voice) => voice.slug).join(', ');
  trace.push(castRoomEvent({
    actor: { kind: 'runtime' },
    what: 'presented',
    ...where,
    label: contribution?.reply
      ? `Agency — unfinished — heard ${heard}`
      : `Agency — undirected — heard ${heard}`,
  }));

  console.error('[replay] Kip present');
  const presentResult = await KipAgentService.runAgent(
    params.kipId,
    params.human,
    params.userId,
    params.sessionId,
    {
      domainId: params.domainId,
      dialogId: params.dialogId,
      humanTurnId,
      agentContext: {
        ...agentContext,
        castRoom: {
          phase: 'present',
          trail: projectCastRoomTrail(trace, params.previousTrace),
          decision: directionText,
          trace,
          consumption: [],
          allowEngage: false,
        },
      },
      ...(contribution?.reply
        ? {
            castConsultations: {
              userMessage: params.human,
              directorDisplayName: 'Kip',
              consultations: [{
                instrumentSlug: contribution.slug,
                instrumentReply: contribution.reply,
                status: 'ok' as const,
              }],
            },
          }
        : {}),
    },
  );
  const presentReply = replyOf(presentResult);
  const presentActions = actionsOf(presentResult);
  const presentPrompt = promptOf(presentResult);
  const directionPrompt = promptOf(directionResult);
  console.error(`[replay] present: ${clip(presentReply, 500)}`);
  for (const action of presentActions) console.error(`[replay] present action: ${summarizeAction(action)}`);

  return {
    trace,
    report: {
      human: params.human,
      offers: offers.map((row) => ({ slug: row.slug, offer: row.offer })),
      direction: directionText,
      engage: allowed,
      contribution,
      present: { reply: presentReply, actions: presentActions },
      trace: trace.map(traceLine),
      promptFlags: {
        directionHasCore: /AGENCY CORE v2/.test(directionPrompt),
        directionSkipsProbe: /Do not call jev\.probe/.test(directionPrompt),
        contributionHasCore: /AGENCY CORE v2/.test(contributionPrompt),
        contributionHasCatalog: /Bodies are not loaded/.test(contributionPrompt),
        presentHasCore: /AGENCY CORE v2/.test(presentPrompt),
        presentHasHistoryHint: /Enter|newline|new line/i.test(presentPrompt),
      },
    },
  };
}

async function main(): Promise<void> {
  const scenario = process.argv[2] === 'compliance' ? 'compliance' : 'mobile';
  const domain = await prisma.domain.findFirst({
    where: { slug: 'ke3p' },
    select: { id: true, ownerId: true, slug: true },
  });
  if (!domain?.ownerId) throw new Error('ke3p domain or owner missing');
  const rows = await prisma.kip_agents.findMany({
    where: { slug: { in: ['kip', ...VOICE_SLUGS] } },
    select: { id: true, slug: true, name: true, config: true },
  });
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const kip = bySlug.get('kip');
  if (!kip) throw new Error('Kip agent missing');
  const voices = VOICE_SLUGS.flatMap((slug) => {
    const row = bySlug.get(slug);
    if (!row) return [];
    const config = asRecord(row.config);
    const participation = typeof config?.dialogParticipation === 'string' ? config.dialogParticipation : 'voice';
    if (participation !== 'voice') return [];
    return [{ slug, label: row.name || slug, id: row.id }];
  });
  const dialog = await prisma.dialog.create({
    data: {
      title: scenario === 'mobile'
        ? 'Cursor agency replay — mobile enter'
        : 'Cursor agency replay — compliance',
      title_source: 'user_set',
      domain_id: domain.id,
      user_id: domain.ownerId,
      available_to: ['member'],
      context: { board: 'domain', replay: scenario },
    },
    select: { id: true },
  });
  const session = await KipAgentService.createSession(kip.id, domain.ownerId, `replay-${scenario}`, undefined, {
    domainId: domain.id,
    dialogId: dialog.id,
    board: 'domain',
  });
  const turns = scenario === 'mobile'
    ? [
        'On mobile, when I press Enter I want a new line. Right now Enter sends the message. Change the mobile Enter behavior.',
        'do it.',
      ]
    : [
        'Possible legal and compliance risks for Keeper: signup never asks for age, which is a COPPA problem. Google Fonts may be a GDPR problem. Session replay may be a CIPA problem. Email may be a CAN-SPAM problem. Renewal terms are unclear. There is no registered DMCA agent.',
        'The purpose is protecting Keeper.',
      ];
  const reports: TurnReport[] = [];
  let previousTrace: CastRoomEvent[] = [];
  for (const human of turns) {
    const turn = await runTurn({
      human,
      voices,
      kipId: kip.id,
      userId: domain.ownerId,
      domainId: domain.id,
      dialogId: dialog.id,
      sessionId: session.id,
      previousTrace,
    });
    reports.push(turn.report);
    previousTrace = turn.trace;
  }
  const outPath = resolve(process.cwd(), `tmp/agency-replay-${scenario}.json`);
  mkdirSync(resolve(process.cwd(), 'tmp'), { recursive: true });
  writeFileSync(outPath, JSON.stringify({
    scenario,
    dialogId: dialog.id,
    sessionId: session.id,
    voices: voices.map((voice) => voice.slug),
    turns: reports,
  }, null, 2));
  console.error(`\n[replay] wrote ${outPath}`);
  console.log(JSON.stringify({ scenario, dialogId: dialog.id, sessionId: session.id, turns: reports.length }));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
