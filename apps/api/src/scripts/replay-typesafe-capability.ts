/**
 * Offline post-response capability replay.
 *
 * Frozen 2026-09-22. Does not modify the live turn path, prompts,
 * obligations, or actions. Does not send scores back to Kip.
 * Obligation is not asked. Orientation Alignment is measured and is not a gate.
 * Jev is a candidate signal for "a capability worth putting in front of Kip,"
 * not an instruction that the action must occur.
 *
 * Writes tmp/typesafe-signal-replay/capability-results.json
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma } from '@keeper/database';
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
/** Descriptive cut only. Not a gate. Not an instruction to emit. */
const SURFACING_CUT = 0.5;

const FROZEN_QUESTIONS: TypeSafeQuestions = {
  capability_worth_surfacing: {
    type: 'noul',
    instructions:
      'Is there a Keeper capability worth putting in front of Kip now? High means Kip should see that capability. It does not mean the action must be emitted.',
  },
  likely_capability: {
    type: 'choice',
    instructions:
      'Which Keeper capability, if any, is worth putting in front of Kip now? Choose none when no capability should be shown.',
    criteria: {
      none: 'No Keeper capability should be shown',
      'draft.update.propose': 'Propose a Point onto the Document',
      'document.orientation.update': 'Update Document Orientation',
      'gloss.append': 'Append Gloss beside a Point',
      'sole.save': 'Save agent memory',
      'delegate.consult': 'Consult another agent',
    },
  },
  relevance_reason: {
    type: 'choice',
    instructions:
      'Why did that capability become relevant? Choose none when no capability is worth putting in front of Kip.',
    criteria: {
      explicit_request: 'The human directly asked for the action',
      inferred_human_meaning: 'The human implied it in ordinary language without asking for a specific action',
      agent_judgment: 'The agent reply is what made the capability relevant',
      state_inconsistency: 'Stored Keeper state does not match what this Dialog has become',
      prior_execution_failure: 'A previous attempt to use the capability failed and the need remains',
      none: 'No capability became relevant',
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

const KEEPER_VOCAB =
  /\b(points?|documents?|drafts?|propos\w*|orientations?|gloss\w*|sole|keepers?|schemas?|captures?|capturing|saves?|saved|keeping|keeps|kept)\b/i;

const CLEAN_AGENT =
  'The two styles do feel different. The first one wandered, and this one got more direct. That difference is what this test turned up.';

const AGENT_SURFACES =
  'The two styles do feel different. That difference should not disappear when this chat ends.';

const ORIENT_CLEAN_AGENT =
  'You are right. A shared way to read this conversation should have been set once the test had a subject. It is still empty.';

const STORED = {
  greetingHuman: '162844c8-ff93-40ed-89f7-66644f34d72d',
  greetingAgent: '891ca962-cbae-43df-b2ed-418ff3d00b81',
  ordinaryHuman: 'd61481f3-5b58-4930-9c51-b07b283d8858',
  ordinaryAgent: '6af9714a-3936-4e83-8b1c-790f2bd54884',
  worthHuman: 'e0c92354-5828-45f8-b50b-3eaf3c1a1f91',
  worthAgent: 'ef2c7a16-5d5f-4ff7-acbb-56e47dec50f7',
  blankHuman: '9718489c-747b-4705-aa4c-b05e20327248',
  blankAgent: '258fd0bd-dfc3-4238-8a8d-b96f59747c29',
  orientHuman: '1c79e575-4b8d-4ca3-8a1c-2f9ae93cc974',
  orientAgent: 'c7323698-af78-4c2e-9d1e-186a0d103833',
} as const;

type TextSource =
  | { source: 'stored'; id: string; mustInclude: string }
  | { source: 'frozen'; text: string };

type CaseSpec = {
  label: string;
  family: 'none' | 'inferred' | 'explicit' | 'agent_judgment' | 'prior_failure' | 'state' | 'confound';
  human: TextSource;
  agent: TextSource;
  /** Snapshot and cast/profile taken from this stored human turn. */
  anchorHumanId: string;
  includeStoredReceipts: boolean;
  forbidKeeperVocabulary: boolean;
  hypothesis: { capability: string; reason: string };
};

const CASES: CaseSpec[] = [
  {
    label: 'none-greeting',
    family: 'none',
    human: { source: 'stored', id: STORED.greetingHuman, mustInclude: 'Well, what do you know?' },
    agent: { source: 'stored', id: STORED.greetingAgent, mustInclude: 'starting fresh' },
    anchorHumanId: STORED.greetingHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: false,
    hypothesis: { capability: 'none', reason: 'none' },
  },
  {
    label: 'none-ordinary',
    family: 'none',
    human: { source: 'stored', id: STORED.ordinaryHuman, mustInclude: 'too far too fast' },
    agent: { source: 'stored', id: STORED.ordinaryAgent, mustInclude: 'fair observation' },
    anchorHumanId: STORED.ordinaryHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: false,
    hypothesis: { capability: 'none', reason: 'none' },
  },
  {
    label: 'wk-original',
    family: 'inferred',
    human: { source: 'stored', id: STORED.worthHuman, mustInclude: 'worth keeping' },
    agent: { source: 'frozen', text: CLEAN_AGENT },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: false,
    hypothesis: { capability: 'draft.update.propose', reason: 'inferred_human_meaning' },
  },
  {
    label: 'wk-hang-onto',
    family: 'inferred',
    human: {
      source: 'frozen',
      text: "I'm testing these conversation styles. This feels like something we ought to hang onto.",
    },
    agent: { source: 'frozen', text: CLEAN_AGENT },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: true,
    hypothesis: { capability: 'draft.update.propose', reason: 'inferred_human_meaning' },
  },
  {
    label: 'wk-dont-lose',
    family: 'inferred',
    human: {
      source: 'frozen',
      text: "The shift between these two ways of talking is something I don't want to lose.",
    },
    agent: { source: 'frozen', text: CLEAN_AGENT },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: true,
    hypothesis: { capability: 'draft.update.propose', reason: 'inferred_human_meaning' },
  },
  {
    label: 'wk-around-later',
    family: 'inferred',
    human: {
      source: 'frozen',
      text: 'What showed up in this test matters enough that I want it around later.',
    },
    agent: { source: 'frozen', text: CLEAN_AGENT },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: true,
    hypothesis: { capability: 'draft.update.propose', reason: 'inferred_human_meaning' },
  },
  {
    label: 'wk-still-here',
    family: 'inferred',
    human: {
      source: 'frozen',
      text: "This isn't just chatter. The profile change is something that should still be here tomorrow.",
    },
    agent: { source: 'frozen', text: CLEAN_AGENT },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: true,
    hypothesis: { capability: 'draft.update.propose', reason: 'inferred_human_meaning' },
  },
  {
    label: 'wk-stored-reply',
    family: 'confound',
    human: { source: 'stored', id: STORED.worthHuman, mustInclude: 'worth keeping' },
    agent: { source: 'stored', id: STORED.worthAgent, mustInclude: 'worth capturing' },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: false,
    hypothesis: { capability: 'draft.update.propose', reason: 'agent_judgment' },
  },
  {
    label: 'explicit-write-down',
    family: 'explicit',
    human: {
      source: 'frozen',
      text: 'Please write down what we found about these conversation styles.',
    },
    agent: { source: 'frozen', text: CLEAN_AGENT },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: true,
    hypothesis: { capability: 'draft.update.propose', reason: 'explicit_request' },
  },
  {
    label: 'agent-surfaces',
    family: 'agent_judgment',
    human: { source: 'stored', id: STORED.greetingHuman, mustInclude: 'Well, what do you know?' },
    agent: { source: 'frozen', text: AGENT_SURFACES },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: true,
    hypothesis: { capability: 'draft.update.propose', reason: 'agent_judgment' },
  },
  {
    label: 'imply-dismissed',
    family: 'inferred',
    human: {
      source: 'frozen',
      text: "I'm testing these conversation styles. This feels like something we ought to hang onto.",
    },
    agent: { source: 'stored', id: STORED.greetingAgent, mustInclude: 'starting fresh' },
    anchorHumanId: STORED.worthHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: false,
    hypothesis: { capability: 'draft.update.propose', reason: 'inferred_human_meaning' },
  },
  {
    label: 'orient-explicit-clean',
    family: 'explicit',
    human: {
      source: 'stored',
      id: STORED.orientHuman,
      mustInclude: 'you should have written the Orientation',
    },
    agent: { source: 'frozen', text: ORIENT_CLEAN_AGENT },
    anchorHumanId: STORED.orientHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: false,
    hypothesis: { capability: 'document.orientation.update', reason: 'explicit_request' },
  },
  {
    label: 'orient-prior-failure',
    family: 'prior_failure',
    human: {
      source: 'stored',
      id: STORED.orientHuman,
      mustInclude: 'you should have written the Orientation',
    },
    agent: { source: 'stored', id: STORED.orientAgent, mustInclude: 'Orientation body is required' },
    anchorHumanId: STORED.orientHuman,
    includeStoredReceipts: true,
    forbidKeeperVocabulary: false,
    hypothesis: { capability: 'document.orientation.update', reason: 'prior_execution_failure' },
  },
  {
    label: 'state-blank',
    family: 'state',
    human: { source: 'stored', id: STORED.blankHuman, mustInclude: 'why is orientation still blank' },
    agent: { source: 'stored', id: STORED.blankAgent, mustInclude: 'still blank' },
    anchorHumanId: STORED.blankHuman,
    includeStoredReceipts: false,
    forbidKeeperVocabulary: false,
    hypothesis: { capability: 'document.orientation.update', reason: 'state_inconsistency' },
  },
];

type Receipt = { type: string; status: string; errorCode: string | null; message: string | null };

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
  human: string;
  agentResponse: string;
  actionsEmitted: Array<{ type: string; status: string }>;
  keeper: KeeperSnapshot;
};

type AnswerRow = {
  label: string;
  family: CaseSpec['family'];
  packetKind: 'post';
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
  hypothesis: CaseSpec['hypothesis'];
  hypothesisMatched: boolean | null;
  surfacingCut: {
    isGate: false;
    cut: number;
    surfacing: number | null;
    capability: string | null;
    sameSideNote: 'see spread';
    candidateThisRepeat: boolean;
  };
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function clip(text: string): string {
  const trimmed = text.trim();
  return trimmed.length <= CLIP_MAX ? trimmed : trimmed.slice(0, CLIP_MAX);
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((item) => stableJson(item)).join(',')}]`;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function packetHash(packet: SignalPacket): string {
  return createHash('sha256').update(stableJson(packet)).digest('hex');
}

function resolveText(
  source: TextSource,
  byId: Map<string, { content: string }>,
): string {
  if (source.source === 'frozen') return source.text.trim();
  const message = byId.get(source.id);
  if (!message) throw new Error(`Missing message ${source.id}`);
  if (!message.content.toLowerCase().includes(source.mustInclude.toLowerCase())) {
    throw new Error(`Stored text drifted for ${source.id}`);
  }
  return message.content.trim();
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

function readNumber(raw: unknown, key: 'noul' | 'score'): number | null {
  const row = asRecord(raw);
  return row && typeof row[key] === 'number' ? row[key] : null;
}

function readChoice(raw: unknown): string | null {
  const row = asRecord(raw);
  return row && typeof row.choice === 'string' ? row.choice : null;
}

function readConfidence(raw: unknown): number | null {
  const row = asRecord(raw);
  return row && typeof row.confidence === 'number' ? row.confidence : null;
}

async function main(): Promise<void> {
  if (KEEPER_VOCAB.test(CLEAN_AGENT) || KEEPER_VOCAB.test(AGENT_SURFACES)) {
    throw new Error('Clean agent text contains Keeper vocabulary');
  }

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
    select: { id: true, role: true, content: true, created_at: true, metadata: true },
  });
  const byId = new Map(messages.map((message) => [message.id, message]));
  const userMessages = messages.filter((message) => message.role === 'user');

  function snapshotFor(humanId: string): KeeperSnapshot {
    const human = byId.get(humanId);
    if (!human) throw new Error(`Missing anchor ${humanId}`);
    const agent = messages.find(
      (message) => message.role === 'assistant' && message.created_at > human.created_at,
    );
    const orch = asRecord(asRecord(agent?.metadata)?.orchestration);
    const cast = Array.isArray(orch?.castConsultSlugs)
      ? orch.castConsultSlugs.filter((slug): slug is string => typeof slug === 'string')
      : [];
    return {
      dialogId: dialog!.id,
      dialogTitle: dialog!.title,
      orientation: dialog!.orientation?.trim() || null,
      orientationUpdatedAt: dialog!.orientation_updated_at?.toISOString() ?? null,
      pointCount: 0,
      sectionTitles: [],
      forwardWritten: Boolean(dialog!.forward_title?.trim()),
      manuscriptExists: draftCount > 0,
      turnIndex: userMessages.findIndex((message) => message.id === humanId) + 1,
      conversationProfile: typeof orch?.conversationProfile === 'string' ? orch.conversationProfile : null,
      castSlugs: cast,
      dialogAgeSeconds: Math.round((human.created_at.getTime() - dialog!.created_at.getTime()) / 1000),
    };
  }

  const built = CASES.map((spec) => {
    const human = resolveText(spec.human, byId);
    const agent = resolveText(spec.agent, byId);
    if (spec.forbidKeeperVocabulary && (KEEPER_VOCAB.test(human) || KEEPER_VOCAB.test(agent))) {
      throw new Error(`Keeper vocabulary in ${spec.label}`);
    }
    const anchorAgent = messages.find(
      (message) =>
        message.role === 'assistant'
        && message.created_at > (byId.get(spec.anchorHumanId)?.created_at ?? new Date(0)),
    );
    const receipts = spec.includeStoredReceipts ? receiptsFromMetadata(anchorAgent?.metadata) : [];
    const packet: SignalPacket = {
      human: clip(human),
      agentResponse: clip(agent),
      actionsEmitted: receipts.map((receipt) => ({ type: receipt.type, status: receipt.status })),
      keeper: snapshotFor(spec.anchorHumanId),
    };
    return {
      spec,
      packet,
      hash: packetHash(packet),
      pointIntent: detectPointIntent(human).kind,
      receipts,
    };
  });

  const rows: AnswerRow[] = [];
  for (const item of built) {
    for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
      const started = Date.now();
      const outcome = await runTypeSafeEvaluateAction({
        payload: {
          state: item.packet,
          questions: FROZEN_QUESTIONS,
          model: TYPESAFE_DEFAULT_MODEL,
        },
        domainId: dialog.domain_id,
      });
      const latencyMs = Date.now() - started;
      if (outcome.ok === false) {
        rows.push({
          label: item.spec.label,
          family: item.spec.family,
          packetKind: 'post',
          packetHash: item.hash,
          packet: item.packet,
          repeat,
          modelRequested: TYPESAFE_DEFAULT_MODEL,
          model: null,
          ok: false,
          errorCode: outcome.errorCode,
          message: outcome.message,
          latencyMs,
          usage: null,
          answers: null,
          hypothesis: item.spec.hypothesis,
          hypothesisMatched: null,
          surfacingCut: {
            isGate: false,
            cut: SURFACING_CUT,
            surfacing: null,
            capability: null,
            sameSideNote: 'see spread',
            candidateThisRepeat: false,
          },
        });
        console.error(`[capability] ${item.spec.label} #${repeat} failed`, outcome.message);
        continue;
      }
      const surfacing = readNumber(outcome.answers.capability_worth_surfacing, 'noul');
      const capability = readChoice(outcome.answers.likely_capability);
      const reason = readChoice(outcome.answers.relevance_reason);
      rows.push({
        label: item.spec.label,
        family: item.spec.family,
        packetKind: 'post',
        packetHash: item.hash,
        packet: item.packet,
        repeat,
        modelRequested: TYPESAFE_DEFAULT_MODEL,
        model: outcome.model,
        ok: true,
        latencyMs,
        usage: outcome.usage ?? null,
        answers: outcome.answers,
        hypothesis: item.spec.hypothesis,
        hypothesisMatched:
          capability === item.spec.hypothesis.capability && reason === item.spec.hypothesis.reason,
        surfacingCut: {
          isGate: false,
          cut: SURFACING_CUT,
          surfacing,
          capability,
          sameSideNote: 'see spread',
          candidateThisRepeat:
            capability != null && capability !== 'none' && surfacing != null && surfacing >= SURFACING_CUT,
        },
      });
      console.log(
        `[capability] ${item.spec.label} #${repeat} ${latencyMs}ms surfacing=${surfacing} capability=${capability} reason=${reason}`,
      );
    }
  }

  const spread = built.map((item) => {
    const matching = rows.filter((row) => row.label === item.spec.label && row.ok);
    const surfacing = matching.map((row) => readNumber(row.answers?.capability_worth_surfacing, 'noul'));
    const alignment = matching.map((row) => readNumber(row.answers?.orientation_alignment, 'score'));
    const capability = matching.map((row) => readChoice(row.answers?.likely_capability));
    const reason = matching.map((row) => readChoice(row.answers?.relevance_reason));
    const capabilityConfidence = matching.map((row) => readConfidence(row.answers?.likely_capability));
    const reasonConfidence = matching.map((row) => readConfidence(row.answers?.relevance_reason));
    const nums = (values: Array<number | null>) => values.filter((value): value is number => typeof value === 'number');
    const surfNums = nums(surfacing);
    const alignNums = nums(alignment);
    const span = (values: number[]) =>
      values.length ? Number((Math.max(...values) - Math.min(...values)).toFixed(4)) : null;
    const unique = (values: Array<string | null>) => [
      ...new Set(values.filter((value): value is string => typeof value === 'string')),
    ];
    const capabilityChoices = unique(capability);
    const reasonChoices = unique(reason);
    const straddlesCut =
      surfNums.some((value) => value >= SURFACING_CUT) && surfNums.some((value) => value < SURFACING_CUT);
    return {
      label: item.spec.label,
      family: item.spec.family,
      hypothesis: item.spec.hypothesis,
      pointIntent: item.pointIntent,
      surfacing,
      surfacingSpread: span(surfNums),
      straddlesCut,
      alignment,
      alignmentSpread: span(alignNums),
      capability,
      capabilityChoices,
      capabilityStable: capabilityChoices.length === 1 && capability.length === matching.length,
      capabilityConfidence,
      reason,
      reasonChoices,
      reasonStable: reasonChoices.length === 1 && reason.length === matching.length,
      reasonConfidence,
      candidate:
        capabilityChoices.length === 1
        && capabilityChoices[0] !== 'none'
        && surfNums.length === REPEATS
        && surfNums.every((value) => value >= SURFACING_CUT),
      orientationUsedAsGate: false,
    };
  });

  const cleanParaphrases = spread.filter((row) =>
    ['wk-hang-onto', 'wk-dont-lose', 'wk-around-later', 'wk-still-here'].includes(row.label),
  );
  const paraphraseCapabilities = [...new Set(cleanParaphrases.flatMap((row) => row.capabilityChoices))];

  const usageTotals = rows.reduce(
    (sum, row) => {
      sum.input += row.usage?.input_tokens ?? row.usage?.prompt_tokens ?? 0;
      sum.output += row.usage?.output_tokens ?? row.usage?.completion_tokens ?? 0;
      return sum;
    },
    { input: 0, output: 0 },
  );

  const report = {
    experiment: 'typesafe-capability-replay',
    frozenAt: '2026-09-22',
    question:
      'Can TypeSafe reliably tell Keeper there is a capability worth putting in front of Kip now, without deciding that the action must occur?',
    role: 'Jev is a candidate signal. It does not own capability selection. Surfacing cut is not a gate. Orientation Alignment is not a gate. Obligation was not asked.',
    livePathMutated: false,
    scoresSentToKip: false,
    surfacingCut: SURFACING_CUT,
    surfacingCutIsGate: false,
    dialog: {
      id: dialog.id,
      title: dialog.title,
      orientation: dialog.orientation,
      forwardTitle: dialog.forward_title,
      draftCount,
    },
    modelRequested: TYPESAFE_DEFAULT_MODEL,
    repeats: REPEATS,
    questions: FROZEN_QUESTIONS,
    cleanParaphraseSummary: {
      labels: cleanParaphrases.map((row) => row.label),
      capabilities: paraphraseCapabilities,
      allStablePropose:
        cleanParaphrases.length === 4
        && cleanParaphrases.every(
          (row) => row.capabilityStable && row.capabilityChoices[0] === 'draft.update.propose',
        ),
    },
    cases: built.map((item) => ({
      label: item.spec.label,
      family: item.spec.family,
      hypothesis: item.spec.hypothesis,
      pointIntent: item.pointIntent,
      packetHash: item.hash,
      forbidKeeperVocabulary: item.spec.forbidKeeperVocabulary,
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
    '../../../../tmp/typesafe-signal-replay/capability-results.json',
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[capability] wrote ${outPath}`);
  console.log('[capability] spread', JSON.stringify(spread, null, 2));
  console.log('[capability] paraphrases', JSON.stringify(report.cleanParaphraseSummary));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
