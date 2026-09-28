/**
 * preserve-discovery@1 turn runner.
 * After the Lead reply: Jev sees the living Document, one Choice, at most one Point.
 * Does not rescore. Does not speak to Cast. Does not grow the standing prompt.
 */

import type { ModelProvider, ModelSettings } from '@keeper/database';
import { isDocumentBearingDialogTitleSource } from '@keeper/shared';
import { getModelCapabilities, resolveExecutionPlan } from '../../config/index.js';
import { executeRegisteredChat } from '../executeRegisteredChat.js';
import { ModelProviderService, type ModelMessage } from '../ModelProviderService.js';
import { TYPESAFE_DEFAULT_MODEL } from '../TypeSafeProvider.js';
import { runTypeSafeEvaluateAction } from '../TypeSafeEvaluateService.js';
import { recordModelCall, type AgentRunPhaseTimings } from './agentRunTimings.js';
import { ensureDialogDocumentManuscript } from './ensureDialogDocumentManuscript.js';
import { loadDialogDocumentForAgent, type AgentDialogDocument } from './loadDialogDocumentForAgent.js';
import {
  buildPointObligationUnmetNotice,
  detectPointIntent,
  hasSuccessfulPointPropose,
  humanTurnTextForIntent,
} from './pointIntent.js';
import {
  PRESERVE_DISCOVERY_AGENCY,
  PRESERVE_DISCOVERY_GATE_ID,
  PRESERVE_DISCOVERY_LEAD_SILENCE,
  PRESERVE_DISCOVERY_MAX_ALREADY_REPRESENTED,
  PRESERVE_DISCOVERY_QUESTIONS,
  assembleDiscoveryHuman,
  buildPreserveDiscoveryCompletionMessages,
  buildPreserveDiscoveryState,
  heldItemsFromDocumentPoints,
  leadReplyForDiscovery,
  manuscriptRepresentsExchange,
  parsePreserveDiscoveryCompletion,
  preserveDiscoveryKeptMessage,
  preserveDiscoveryShouldKeep,
  readPreserveDiscoveryChoice,
  type PreserveDiscoveryChoiceReading,
  type PreserveDiscoveryHeldItem,
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
  | 'already_represented'
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
  proposedBy: typeof PRESERVE_DISCOVERY_AGENCY;
};

export type PreserveDiscoveryTurnResult<TReceipt extends PointReceipt = PointReceipt> = {
  record: PreserveDiscoveryRecord;
  results: TReceipt[];
  notice: string | null;
  /** Success must not replace the Lead reply with a shorter Point sentence. */
  holdReply: boolean;
};

type PointReceipt = {
  type: string;
  status: string;
  message?: string;
  data?: unknown;
};

function directionFromDocument(doc: AgentDialogDocument): string | null {
  if (doc.forwardAuthored === false) return null;
  const title = doc.forward?.title?.trim() ?? '';
  const description = doc.forward?.description?.trim() ?? '';
  if (!title && !description) return null;
  return [title, description].filter(Boolean).join(': ').slice(0, 500);
}

function heldLines(held: readonly PreserveDiscoveryHeldItem[]): string[] {
  return held.map((item) => {
    const title = item.title.trim();
    const preview = item.preview.trim();
    if (title && preview && title !== preview) return `${title} — ${preview}`;
    return title || preview;
  }).filter(Boolean);
}

function hostTitleFromReceipt(result: PointReceipt): string {
  const data = result.data && typeof result.data === 'object'
    ? (result.data as Record<string, unknown>)
    : {};
  const host = typeof data.hostTitle === 'string' ? data.hostTitle.trim() : '';
  if (host) return host;
  const draftTitle = typeof data.draftTitle === 'string' ? data.draftTitle.trim() : '';
  return draftTitle || 'the Document';
}

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
  /** Earlier human turns. A "what belongs" ask carries these to Jev. */
  priorHuman?: readonly string[];
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

  const visible = humanTurnTextForIntent(params.input, params.displayContent);
  if (params.constrained || detectPointIntent(visible).kind === 'constrained') {
    return closed('constrained');
  }
  if (params.glossRequired || params.reorganizeRequired) return closed('other_obligation');
  if (hasSuccessfulPointPropose(params.actionResults)) return closed('already_preserved');

  const document = await loadDialogDocumentForAgent(params.dialogId, params.domainId);
  if (!document) return closed('no_dialog');
  if (!isDocumentBearingDialogTitleSource(document.titleSource)) return closed('not_document');

  const human = assembleDiscoveryHuman({
    visible,
    assembled: params.input,
    priorHuman: params.priorHuman,
  });
  const spoken = leadReplyForDiscovery(params.kipReply);
  if (!human.trim()) return closed('empty_exchange');
  const kip = spoken || PRESERVE_DISCOVERY_LEAD_SILENCE;

  const held = heldItemsFromDocumentPoints(document.points);
  const state = buildPreserveDiscoveryState({
    human,
    kip,
    orientationText: document.orientation?.body ?? null,
    direction: directionFromDocument(document),
    documentTitle: document.title ?? null,
    held,
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
  const keep = preserveDiscoveryShouldKeep({
    probabilities: reading.probabilities,
    alreadyRepresented: reading.alreadyRepresented,
    existingDurableItemRepresentsWhatWasJustFound:
      state.existingDurableItemRepresentsWhatWasJustFound,
  });
  if (!keep) {
    const represented =
      state.existingDurableItemRepresentsWhatWasJustFound
      || (
        typeof reading.alreadyRepresented === 'number'
        && reading.alreadyRepresented >= PRESERVE_DISCOVERY_MAX_ALREADY_REPRESENTED
      );
    return closed(
      represented ? 'already_represented' : 'below_threshold',
      reading,
      outcome.model,
    );
  }

  params.onStatus?.('Preserving the discovery…');

  const completionMessages = buildPreserveDiscoveryCompletionMessages({
    human,
    kip,
    held: heldLines(state.held),
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
  if (manuscriptRepresentsExchange({
    human: completion.survives,
    kip: completion.label ?? '',
    held: state.held,
  })) {
    return closed('already_represented', reading, outcome.model);
  }

  let manuscriptId: string;
  try {
    const manuscript = await ensureDialogDocumentManuscript({
      domainId: params.domainId,
      dialogId: params.dialogId,
      dialogTitle: document.title,
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
      proposedBy: PRESERVE_DISCOVERY_AGENCY,
    });
    results = results.map((result) => {
      if (result.type !== 'draft.update.propose' || result.status !== 'success') return result;
      return {
        ...result,
        message: preserveDiscoveryKeptMessage(hostTitleFromReceipt(result)),
      };
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
    holdReply: spoken.length > 0,
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
