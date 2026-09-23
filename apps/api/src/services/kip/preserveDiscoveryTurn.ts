/**
 * preserve-discovery@1 turn runner.
 * After the Lead reply and its receipts: one Choice, Keeper checks, one short completion, one Point.
 * Does not rescore. Does not speak to Cast. Does not grow the standing prompt.
 */

import { prisma, type ModelProvider, type ModelSettings } from '@keeper/database';
import { isDocumentBearingDialogTitleSource, parseDraftPoints } from '@keeper/shared';
import { getModelCapabilities, resolveExecutionPlan } from '../../config/index.js';
import { executeRegisteredChat } from '../executeRegisteredChat.js';
import { ModelProviderService, type ModelMessage } from '../ModelProviderService.js';
import { TYPESAFE_DEFAULT_MODEL } from '../TypeSafeProvider.js';
import { runTypeSafeEvaluateAction } from '../TypeSafeEvaluateService.js';
import { recordModelCall, type AgentRunPhaseTimings } from './agentRunTimings.js';
import { ensureDialogDocumentManuscript } from './ensureDialogDocumentManuscript.js';
import {
  buildPointObligationUnmetNotice,
  detectPointIntent,
  hasSuccessfulPointPropose,
  humanTurnTextForIntent,
} from './pointIntent.js';
import {
  PRESERVE_DISCOVERY_GATE_ID,
  PRESERVE_DISCOVERY_QUESTIONS,
  buildPreserveDiscoveryCompletionMessages,
  buildPreserveDiscoveryState,
  parsePreserveDiscoveryCompletion,
  preserveDiscoveryChoiceOpens,
  preserveDiscoveryResidueVeto,
  readPreserveDiscoveryChoice,
  type PreserveDiscoveryChoiceReading,
  type PreserveMoveProbabilities,
} from './preserveDiscoveryGate.js';

export type PreserveDiscoveryCloseReason =
  | 'ephemeral'
  | 'not_lead'
  | 'no_dialog'
  | 'not_document'
  | 'constrained'
  | 'other_obligation'
  | 'already_preserved'
  | 'manuscript_points'
  | 'durable_draft'
  | 'empty_exchange'
  | 'jev_error'
  | 'below_threshold'
  | 'completion_failed'
  | 'write_failed'
  | 'satisfied';

export type PreserveDiscoveryRecord = {
  gate: typeof PRESERVE_DISCOVERY_GATE_ID;
  opened: boolean;
  satisfied: boolean;
  reason: PreserveDiscoveryCloseReason;
  choice: string | null;
  confidence: number | null;
  probabilities: PreserveMoveProbabilities | null;
  model: string | null;
};

export type PreserveDiscoveryWrite = {
  content: string;
  label?: string;
  manuscriptDraftId: string;
};

export type PreserveDiscoveryTurnResult<TReceipt extends PointReceipt = PointReceipt> = {
  record: PreserveDiscoveryRecord;
  results: TReceipt[];
  notice: string | null;
  /** Success must not replace the Lead reply with a shorter Point sentence. */
  holdReply: boolean;
};

type PointReceipt = { type: string; status: string };

function closed<TReceipt extends PointReceipt>(
  reason: PreserveDiscoveryCloseReason,
  reading?: PreserveDiscoveryChoiceReading,
  model?: string | null,
): PreserveDiscoveryTurnResult<TReceipt> {
  return {
    record: {
      gate: PRESERVE_DISCOVERY_GATE_ID,
      opened: false,
      satisfied: false,
      reason,
      choice: reading?.choice ?? null,
      confidence: reading?.confidence ?? null,
      probabilities: reading?.probabilities ?? null,
      model: model ?? null,
    },
    results: [],
    notice: null,
    holdReply: false,
  };
}

export async function runPreserveDiscoveryTurn<TReceipt extends PointReceipt>(params: {
  ephemeral?: boolean;
  isLead: boolean;
  domainId?: string | null;
  userId?: string | null;
  dialogId?: string | null;
  agentId?: string | null;
  agentName: string;
  modelProvider?: string | null;
  model?: string | null;
  modelSettings?: unknown;
  input: string;
  displayContent?: string | null;
  kipReply: string;
  constrained?: boolean;
  glossRequired?: boolean;
  reorganizeRequired?: boolean;
  actionResults: PointReceipt[];
  timings?: AgentRunPhaseTimings;
  onStatus?: (status: string) => void;
  executePoint: (write: PreserveDiscoveryWrite) => Promise<TReceipt[]>;
}): Promise<PreserveDiscoveryTurnResult<TReceipt>> {
  if (params.ephemeral) return closed('ephemeral');
  if (!params.isLead) return closed('not_lead');
  if (!params.domainId || !params.userId || !params.dialogId) return closed('no_dialog');

  const human = humanTurnTextForIntent(params.input, params.displayContent);
  if (params.constrained || detectPointIntent(human).kind === 'constrained') {
    return closed('constrained');
  }
  if (params.glossRequired || params.reorganizeRequired) return closed('other_obligation');
  if (hasSuccessfulPointPropose(params.actionResults)) return closed('already_preserved');

  const dialog = await prisma.dialog.findFirst({
    where: { id: params.dialogId, domain_id: params.domainId },
    select: { title: true, title_source: true, orientation: true },
  });
  if (!dialog) return closed('no_dialog');
  if (!isDocumentBearingDialogTitleSource(dialog.title_source)) return closed('not_document');

  const drafts = await prisma.kip_drafts.findMany({
    where: {
      domain_id: params.domainId,
      dialog_id: params.dialogId,
      status: { notIn: ['promoted', 'archived'] },
    },
    select: { kind: true, spec_json: true },
  });
  const residue = preserveDiscoveryResidueVeto(
    drafts.map((draft) => ({
      kind: draft.kind,
      pointCount: parseDraftPoints(draft.spec_json).length,
    })),
  );
  if (residue) return closed(residue);

  const kip = params.kipReply.trim();
  if (!human.trim() || !kip) return closed('empty_exchange');

  params.onStatus?.('Preserving the discovery…');

  const state = buildPreserveDiscoveryState({
    human,
    kip,
    orientationText: dialog.orientation,
  });

  let outcome;
  try {
    outcome = await runTypeSafeEvaluateAction({
      payload: {
        state,
        questions: PRESERVE_DISCOVERY_QUESTIONS,
        model: TYPESAFE_DEFAULT_MODEL,
      },
      domainId: params.domainId,
      userId: params.userId,
    });
  } catch (error) {
    console.warn('[preserve-discovery@1] choice failed', error);
    return closed('jev_error');
  }
  if (outcome.ok === false) {
    console.warn('[preserve-discovery@1] choice rejected', outcome.message);
    return closed('jev_error', undefined, null);
  }

  const reading = readPreserveDiscoveryChoice(outcome.answers);
  if (!preserveDiscoveryChoiceOpens(reading.probabilities)) {
    return closed('below_threshold', reading, outcome.model);
  }

  const completionMessages = buildPreserveDiscoveryCompletionMessages({
    agentName: params.agentName,
    human,
    kip,
  });
  const started = Date.now();
  let completionRaw = '';
  try {
    completionRaw = await completePreserveDiscovery({
      modelProvider: params.modelProvider,
      model: params.model,
      modelSettings: params.modelSettings,
      domainId: params.domainId,
      userId: params.userId,
      messages: completionMessages,
    });
  } catch (error) {
    console.warn('[preserve-discovery@1] completion failed', error);
    recordModelCall(params.timings, 'preserve_discovery_completion', Date.now() - started);
    return unsatisfied('completion_failed', reading, outcome.model);
  }
  recordModelCall(params.timings, 'preserve_discovery_completion', Date.now() - started);

  const completion = parsePreserveDiscoveryCompletion(completionRaw);
  if (!completion) return unsatisfied('completion_failed', reading, outcome.model);

  let manuscriptId: string;
  try {
    const manuscript = await ensureDialogDocumentManuscript({
      domainId: params.domainId,
      dialogId: params.dialogId,
      dialogTitle: dialog.title,
      userId: params.userId,
      agentId: params.agentId ?? null,
    });
    if (!manuscript?.id) return unsatisfied('write_failed', reading, outcome.model);
    manuscriptId = manuscript.id;
  } catch (error) {
    console.warn('[preserve-discovery@1] manuscript failed', error);
    return unsatisfied('write_failed', reading, outcome.model);
  }

  let results: TReceipt[] = [];
  try {
    results = await params.executePoint({
      content: completion.survives,
      ...(completion.label ? { label: completion.label } : {}),
      manuscriptDraftId: manuscriptId,
    });
  } catch (error) {
    console.warn('[preserve-discovery@1] write failed', error);
    return unsatisfied('write_failed', reading, outcome.model);
  }

  if (!hasSuccessfulPointPropose(results)) {
    return {
      record: {
        gate: PRESERVE_DISCOVERY_GATE_ID,
        opened: true,
        satisfied: false,
        reason: 'write_failed',
        choice: reading.choice,
        confidence: reading.confidence,
        probabilities: reading.probabilities,
        model: outcome.model,
      },
      results,
      notice: buildPointObligationUnmetNotice(results),
      holdReply: false,
    };
  }

  return {
    record: {
      gate: PRESERVE_DISCOVERY_GATE_ID,
      opened: true,
      satisfied: true,
      reason: 'satisfied',
      choice: reading.choice,
      confidence: reading.confidence,
      probabilities: reading.probabilities,
      model: outcome.model,
    },
    results,
    notice: null,
    holdReply: true,
  };
}

function unsatisfied<TReceipt extends PointReceipt>(
  reason: 'completion_failed' | 'write_failed',
  reading: PreserveDiscoveryChoiceReading,
  model: string | null,
): PreserveDiscoveryTurnResult<TReceipt> {
  return {
    record: {
      gate: PRESERVE_DISCOVERY_GATE_ID,
      opened: true,
      satisfied: false,
      reason,
      choice: reading.choice,
      confidence: reading.confidence,
      probabilities: reading.probabilities,
      model,
    },
    results: [],
    notice: buildPointObligationUnmetNotice([]),
    holdReply: false,
  };
}

async function completePreserveDiscovery(params: {
  modelProvider?: string | null;
  model?: string | null;
  modelSettings?: unknown;
  domainId: string;
  userId: string;
  messages: Array<{ role: 'system' | 'user'; content: string }>;
}): Promise<string> {
  const stored =
    params.modelSettings &&
    typeof params.modelSettings === 'object' &&
    !Array.isArray(params.modelSettings)
      ? (params.modelSettings as Partial<ModelSettings>)
      : {};
  const provider = (params.modelProvider || 'openai') as ModelProvider;
  const preferenceModel =
    (typeof params.model === 'string' && params.model.trim()) ||
    (typeof stored.model === 'string' && stored.model.trim()) ||
    null;
  const preference = {
    provider,
    model: preferenceModel,
    source: 'agent_preference' as const,
  };
  const plan = resolveExecutionPlan(preference);
  const defaults = ModelProviderService.getDefaultSettings(plan.offering.provider as ModelProvider);
  const settings: ModelSettings = {
    ...defaults,
    ...stored,
    model: plan.offering.modelId,
  };
  const capabilities = getModelCapabilities(plan.offering.provider, plan.offering.modelId);
  const messages: ModelMessage[] = params.messages.map((message) => ({
    role: message.role,
    content: message.content,
  }));
  const executed = await executeRegisteredChat({
    preference,
    messages,
    settings,
    userId: params.userId,
    domainId: params.domainId,
    jsonMode: capabilities.jsonMode,
  });
  if (!executed.response.success) {
    throw new Error(executed.response.error || 'preserve completion failed');
  }
  return executed.response.content ?? '';
}
