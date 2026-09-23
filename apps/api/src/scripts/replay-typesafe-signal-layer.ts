/**
 * Offline TypeSafe signal-layer replay.
 *
 * Frozen 2026-09-22. Does not modify the live turn path, prompts,
 * obligations, or actions. Does not send scores back to Kip.
 * Jev is a candidate signal source, not the owner of these judgments.
 *
 * Writes tmp/typesafe-signal-replay/results.json
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '@keeper/database';
import {
  detectReorganizeDetection,
  shouldShadowDocumentTurnPosture,
} from '@keeper/shared';
import { detectPointIntent } from '../services/kip/pointIntent.js';
import { runTypeSafeEvaluateAction } from '../services/TypeSafeEvaluateService.js';
import {
  TYPESAFE_DEFAULT_MODEL,
  type TypeSafeQuestions,
  type TypeSafeUsage,
} from '../services/TypeSafeProvider.js';

const DIALOG_ID = 'cmuc18qo00001nt01cyx3lm1n';
const REPEATS = 3;
const CLIP_MAX = 1500;
const GATE_THRESHOLD = 0.8;

/**
 * FROZEN question wording. Do not reword between repeats or packets.
 * Same map is sent for pre-reply and post-reply packets.
 */
const FROZEN_QUESTIONS: TypeSafeQuestions = {
  initiative: {
    type: 'noul',
    instructions:
      'Is there something Keeper should notice or tend on this turn, including when no write is required?',
  },
  obligation: {
    type: 'noul',
    instructions:
      'Has something happened that should not end as prose only? A constraint such as don\'t write yet scores low.',
  },
  responsibility: {
    type: 'choice',
    instructions: 'Which role owns the next judgment?',
    criteria: {
      lead: 'The Lead owns the next judgment',
      ceox: 'Ceox owns the next judgment',
      rendr: 'Rendr owns the next judgment',
      cloud: 'Cloud owns the next judgment',
      human: 'The human owns the next judgment',
      none: 'No role owns a next judgment',
    },
  },
  likely_capability: {
    type: 'choice',
    instructions: 'What Keeper capability may now be relevant?',
    criteria: {
      none: 'No Keeper capability is relevant',
      'draft.update.propose': 'Propose a Point onto the Document',
      'document.orientation.update': 'Update Document Orientation',
      'gloss.append': 'Append Gloss beside a Point',
      'sole.save': 'Save agent memory',
      'delegate.consult': 'Consult another agent',
    },
  },
  orientation_alignment: {
    type: 'score',
    instructions:
      'How accurately does the current Orientation represent what this Dialog has become? Blank is accurate while the Dialog has no Points, no Forward, and no settled subject. A low score means the Lead should reconsider Orientation. A low score is not an instruction to rewrite it.',
    criteria: [
      '0 — inaccurate: stored Orientation, including blank, does not represent what this Dialog has become',
      '1 — accurate: stored Orientation, including blank, represents what this Dialog has become',
    ],
  },
};

/** Field names only. Read of actionPayloadSchemas. Not sent to Jev. Not executed. */
const DRY_SCHEMAS: Record<string, string[]> = {
  'draft.update.propose': [
    'content',
    'title|prelude',
    'section|sectionId',
    'type',
    'author|proposedBy',
    'closer',
    'moments',
    'referencesPointId',
  ],
  'document.orientation.update': ['body'],
  'gloss.append': ['content', 'pointId?'],
  'sole.save': ['content', 'topic?'],
  'delegate.consult': ['agentSlug', 'question?'],
  none: [],
};

const SPECIMEN = [
  {
    label: 'greeting',
    humanMessageId: '162844c8-ff93-40ed-89f7-66644f34d72d',
    agentMessageId: '891ca962-cbae-43df-b2ed-418ff3d00b81',
    humanMustInclude: 'Well, what do you know?',
  },
  {
    label: 'ordinary-middle',
    humanMessageId: 'd61481f3-5b58-4930-9c51-b07b283d8858',
    agentMessageId: '6af9714a-3936-4e83-8b1c-790f2bd54884',
    humanMustInclude: 'doesnt look like we are going too far too fast',
  },
  {
    label: 'worth-keeping',
    humanMessageId: 'e0c92354-5828-45f8-b50b-3eaf3c1a1f91',
    agentMessageId: 'ef2c7a16-5d5f-4ff7-acbb-56e47dec50f7',
    humanMustInclude: 'worth keeping',
  },
  {
    label: 'orientation-write',
    humanMessageId: '1c79e575-4b8d-4ca3-8a1c-2f9ae93cc974',
    agentMessageId: 'c7323698-af78-4c2e-9d1e-186a0d103833',
    humanMustInclude: 'you should have written the Orientation',
  },
] as const;

type Receipt = {
  type: string;
  status: string;
  errorCode: string | null;
  message: string | null;
};

type KeeperSnapshot = {
  dialogId: string;
  dialogTitle: string;
  orientation: string | null;
  orientationUpdatedAt: string | null;
  pointCount: number;
  sectionTitles: string[];
  forwardWritten: boolean;
  manuscriptExists: boolean;
  turnIndex: number;
  conversationProfile: string | null;
  castSlugs: string[];
  dialogAgeSeconds: number;
};

type SignalPacket = {
  kind: 'pre' | 'post';
  human: string;
  humanChars: number;
  clipped: boolean;
  agentResponse?: string;
  agentResponseChars?: number;
  actionsEmitted: Array<{ type: string; status: string }>;
  keeper: KeeperSnapshot;
};

type AnswerRow = {
  turn: string;
  packetKind: 'pre' | 'post';
  packetHash: string;
  packet: SignalPacket;
  repeat: number;
  modelRequested: string;
  model: string | null;
  ok: boolean;
  errorCode?: string;
  message?: string;
  latencyMs: number;
  usage: TypeSafeUsage | null;
  answers: Record<string, unknown> | null;
  hypotheticalGate: {
    rule: string;
    executed: false;
    obligation: number | null;
    threshold: number;
    capability: string | null;
    capabilityAllowed: boolean;
    actionAbsent: boolean;
    wouldFire: boolean;
    straddlesNote: 'per-repeat; see spread.unstable for the three-repeat test';
    drySchema: string[] | null;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function clip(text: string): { text: string; chars: number; clipped: boolean } {
  const trimmed = text.trim();
  if (trimmed.length <= CLIP_MAX) {
    return { text: trimmed, chars: trimmed.length, clipped: false };
  }
  return { text: trimmed.slice(0, CLIP_MAX), chars: trimmed.length, clipped: true };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function packetHash(packet: SignalPacket): string {
  return createHash('sha256').update(stableJson(packet)).digest('hex');
}

function receiptsFromMetadata(metadata: unknown): Receipt[] {
  const meta = asRecord(metadata);
  const rows = meta && Array.isArray(meta.actionResults) ? meta.actionResults : [];
  return rows.map((row) => {
    const rec = asRecord(row);
    return {
      type: typeof rec?.type === 'string' ? rec.type : 'unknown',
      status: typeof rec?.status === 'string' ? rec.status : 'unknown',
      errorCode: typeof rec?.errorCode === 'string' ? rec.errorCode : null,
      message: typeof rec?.message === 'string' ? rec.message.slice(0, 240) : null,
    };
  });
}

function orchestrationOf(metadata: unknown): Record<string, unknown> | null {
  const meta = asRecord(metadata);
  return asRecord(meta?.orchestration);
}

function readNumber(raw: unknown, key: 'noul' | 'score'): number | null {
  const row = asRecord(raw);
  return row && typeof row[key] === 'number' ? row[key] : null;
}

function readChoice(raw: unknown): string | null {
  const row = asRecord(raw);
  return row && typeof row.choice === 'string' ? row.choice : null;
}

function leadAllowlist(): Set<string> {
  return new Set([
    'draft.update.propose',
    'document.orientation.update',
    'gloss.append',
    'sole.save',
    'delegate.consult',
  ]);
}

function hypotheticalGate(params: {
  answers: Record<string, unknown> | null;
  actions: Array<{ type: string; status: string }>;
}): AnswerRow['hypotheticalGate'] {
  const obligation = params.answers ? readNumber(params.answers.obligation, 'noul') : null;
  const capability = params.answers ? readChoice(params.answers.likely_capability) : null;
  const allowed = leadAllowlist();
  const capabilityAllowed = capability != null && capability !== 'none' && allowed.has(capability);
  const actionAbsent =
    capability != null
    && capability !== 'none'
    && !params.actions.some((action) => action.type === capability);
  const wouldFire =
    obligation != null
    && obligation >= GATE_THRESHOLD
    && capabilityAllowed
    && actionAbsent;
  return {
    rule: 'obligation >= 0.80 AND capability in the closed Lead allowlist AND that action is absent from this packet. Computed only. Not executed.',
    executed: false,
    obligation,
    threshold: GATE_THRESHOLD,
    capability,
    capabilityAllowed,
    actionAbsent,
    wouldFire,
    straddlesNote: 'per-repeat; see spread.unstable for the three-repeat test',
    drySchema: capability && DRY_SCHEMAS[capability] ? DRY_SCHEMAS[capability] : null,
  };
}

type SpreadRow = {
  turn: string;
  packet: 'pre' | 'post';
  questionId: string;
  values: Array<string | number | null>;
  min: number | null;
  max: number | null;
  spread: number | null;
  choices: string[];
  choiceStable: boolean | null;
  straddlesThreshold: boolean;
  unstable: boolean;
};

function spreadFor(
  rows: AnswerRow[],
  turn: string,
  packet: 'pre' | 'post',
  questionId: string,
): SpreadRow {
  const matching = rows.filter((row) => row.turn === turn && row.packetKind === packet && row.ok);
  const values = matching.map((row) => {
    const raw = row.answers?.[questionId];
    if (questionId === 'initiative' || questionId === 'obligation') return readNumber(raw, 'noul');
    if (questionId === 'orientation_alignment') return readNumber(raw, 'score');
    return readChoice(raw);
  });
  const numbers = values.filter((value): value is number => typeof value === 'number');
  const choices = values.filter((value): value is string => typeof value === 'string');
  const min = numbers.length ? Math.min(...numbers) : null;
  const max = numbers.length ? Math.max(...numbers) : null;
  const spread = min != null && max != null ? Number((max - min).toFixed(4)) : null;
  const uniqueChoices = [...new Set(choices)];
  const straddlesThreshold =
    questionId === 'obligation'
    && numbers.some((value) => value >= GATE_THRESHOLD)
    && numbers.some((value) => value < GATE_THRESHOLD);
  const choiceStable = uniqueChoices.length ? uniqueChoices.length === 1 && choices.length === matching.length : null;
  const numericUnstable = spread != null && spread >= 0.15;
  return {
    turn,
    packet,
    questionId,
    values,
    min,
    max,
    spread,
    choices: uniqueChoices,
    choiceStable,
    straddlesThreshold,
    unstable: straddlesThreshold || numericUnstable || choiceStable === false,
  };
}

async function main(): Promise<void> {
  const dialog = await prisma.dialog.findUnique({
    where: { id: DIALOG_ID },
    select: {
      id: true,
      title: true,
      domain_id: true,
      orientation: true,
      orientation_updated_at: true,
      forward_title: true,
      created_at: true,
    },
  });
  if (!dialog) throw new Error(`Dialog ${DIALOG_ID} not found`);

  const draftCount = await prisma.kip_drafts.count({ where: { dialog_id: DIALOG_ID } });
  const messages = await prisma.kip_messages.findMany({
    where: { kip_sessions: { dialog_id: DIALOG_ID, is_archived: false } },
    orderBy: { created_at: 'asc' },
    select: {
      id: true,
      role: true,
      content: true,
      created_at: true,
      metadata: true,
    },
  });
  const byId = new Map(messages.map((message) => [message.id, message]));
  const userMessages = messages.filter((message) => message.role === 'user');

  const turns = SPECIMEN.map((spec) => {
    const human = byId.get(spec.humanMessageId);
    const agent = byId.get(spec.agentMessageId);
    if (!human || !agent) {
      throw new Error(`Missing frozen message for ${spec.label}`);
    }
    if (!human.content.includes(spec.humanMustInclude)) {
      throw new Error(`Frozen human text drifted for ${spec.label}`);
    }
    const turnIndex = userMessages.findIndex((message) => message.id === human.id) + 1;
    if (turnIndex < 1) throw new Error(`Turn index missing for ${spec.label}`);
    const orch = orchestrationOf(agent.metadata);
    const cast = Array.isArray(orch?.castConsultSlugs)
      ? orch.castConsultSlugs.filter((slug): slug is string => typeof slug === 'string')
      : [];
    const profile = typeof orch?.conversationProfile === 'string' ? orch.conversationProfile : null;
    const receiptList = receiptsFromMetadata(agent.metadata);
    const phrase = detectReorganizeDetection(human.content);
    const humanClip = clip(human.content);
    const agentClip = clip(agent.content);
    const snapshot: KeeperSnapshot = {
      dialogId: dialog.id,
      dialogTitle: dialog.title,
      orientation: dialog.orientation?.trim() || null,
      orientationUpdatedAt: dialog.orientation_updated_at?.toISOString() ?? null,
      pointCount: 0,
      sectionTitles: [],
      forwardWritten: Boolean(dialog.forward_title?.trim()),
      manuscriptExists: draftCount > 0,
      turnIndex,
      conversationProfile: profile,
      castSlugs: cast,
      dialogAgeSeconds: Math.round((human.created_at.getTime() - dialog.created_at.getTime()) / 1000),
    };
    const pre: SignalPacket = {
      kind: 'pre',
      human: humanClip.text,
      humanChars: humanClip.chars,
      clipped: humanClip.clipped,
      actionsEmitted: [],
      keeper: snapshot,
    };
    const post: SignalPacket = {
      kind: 'post',
      human: humanClip.text,
      humanChars: humanClip.chars,
      clipped: humanClip.clipped || agentClip.clipped,
      agentResponse: agentClip.text,
      agentResponseChars: agentClip.chars,
      actionsEmitted: receiptList.map((receipt) => ({
        type: receipt.type,
        status: receipt.status,
      })),
      keeper: snapshot,
    };
    return {
      label: spec.label,
      humanMessageId: human.id,
      agentMessageId: agent.id,
      keeperDid: {
        detectPointIntent: detectPointIntent(human.content).kind,
        reorganizeShadowWouldRun: shouldShadowDocumentTurnPosture(phrase),
        phraseSignal: phrase,
        actions: receiptList,
        conversationProfile: profile,
        castSlugs: cast,
        note: 'Historical Keeper behavior on the live turn. This replay did not act.',
      },
      packets: { pre, post },
    };
  });

  const allowlist = [...leadAllowlist()];
  const rows: AnswerRow[] = [];

  for (const turn of turns) {
    for (const kind of ['pre', 'post'] as const) {
      const packet = turn.packets[kind];
      const hash = packetHash(packet);
      for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
        const started = Date.now();
        const outcome = await runTypeSafeEvaluateAction({
          payload: {
            state: packet,
            questions: FROZEN_QUESTIONS,
            model: TYPESAFE_DEFAULT_MODEL,
          },
          domainId: dialog.domain_id,
        });
        const latencyMs = Date.now() - started;
        if (outcome.ok === false) {
          rows.push({
            turn: turn.label,
            packetKind: kind,
            packetHash: hash,
            packet,
            repeat,
            modelRequested: TYPESAFE_DEFAULT_MODEL,
            model: null,
            ok: false,
            errorCode: outcome.errorCode,
            message: outcome.message,
            latencyMs,
            usage: null,
            answers: null,
            hypotheticalGate: hypotheticalGate({ answers: null, actions: packet.actionsEmitted }),
          });
          console.error(`[replay] ${turn.label} ${kind} #${repeat} failed`, outcome.message);
          continue;
        }
        rows.push({
          turn: turn.label,
          packetKind: kind,
          packetHash: hash,
          packet,
          repeat,
          modelRequested: TYPESAFE_DEFAULT_MODEL,
          model: outcome.model,
          ok: true,
          latencyMs,
          usage: outcome.usage ?? null,
          answers: outcome.answers,
          hypotheticalGate: hypotheticalGate({
            answers: outcome.answers,
            actions: packet.actionsEmitted,
          }),
        });
        const obligation = readNumber(outcome.answers.obligation, 'noul');
        const capability = readChoice(outcome.answers.likely_capability);
        console.log(
          `[replay] ${turn.label} ${kind} #${repeat} ${latencyMs}ms obligation=${obligation} capability=${capability} model=${outcome.model}`,
        );
      }
    }
  }

  const questionIds = Object.keys(FROZEN_QUESTIONS);
  const spread = turns.flatMap((turn) =>
    (['pre', 'post'] as const).flatMap((packet) =>
      questionIds.map((questionId) => spreadFor(rows, turn.label, packet, questionId)),
    ),
  );

  const usageTotals = rows.reduce(
    (sum, row) => {
      const usage = row.usage;
      if (!usage) return sum;
      sum.input += usage.input_tokens ?? usage.prompt_tokens ?? 0;
      sum.output += usage.output_tokens ?? usage.completion_tokens ?? 0;
      sum.total += usage.total_tokens ?? 0;
      return sum;
    },
    { input: 0, output: 0, total: 0 },
  );

  const report = {
    experiment: 'typesafe-signal-layer-replay',
    frozenAt: '2026-09-22',
    role: 'Jev is a candidate signal source. It does not own Initiative, Obligation, Responsibility, capability selection, or Orientation Alignment.',
    livePathMutated: false,
    scoresSentToKip: false,
    dialog: {
      id: dialog.id,
      title: dialog.title,
      orientation: dialog.orientation,
      forwardTitle: dialog.forward_title,
      draftCount,
    },
    modelRequested: TYPESAFE_DEFAULT_MODEL,
    repeats: REPEATS,
    gateThreshold: GATE_THRESHOLD,
    allowlist,
    allowlistNote:
      'Closed Lead subset used by the hypothetical gate. delegate.consult is included because these turns stored a cast roster. mcp.call is excluded.',
    questions: FROZEN_QUESTIONS,
    turns: turns.map((turn) => ({
      label: turn.label,
      humanMessageId: turn.humanMessageId,
      agentMessageId: turn.agentMessageId,
      keeperDid: turn.keeperDid,
      packetHashes: {
        pre: packetHash(turn.packets.pre),
        post: packetHash(turn.packets.post),
      },
    })),
    usageTotals,
    latencyMs: {
      min: Math.min(...rows.map((row) => row.latencyMs)),
      max: Math.max(...rows.map((row) => row.latencyMs)),
      mean: Math.round(rows.reduce((sum, row) => sum + row.latencyMs, 0) / rows.length),
    },
    spread,
    rows,
  };

  const outPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../tmp/typesafe-signal-replay/results.json',
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[replay] wrote ${outPath}`);
  console.log('[replay] spread', JSON.stringify(spread, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
