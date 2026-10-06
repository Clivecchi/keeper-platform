/**
 * Kip authorizes. Rendr composes the current Reading. Keeper applies or refuses.
 * A refusal leaves the previous arrangement on Stage.
 */

import { prisma, type ModelSettings } from '@keeper/database';
import {
  decideStageComposition,
  deterministicPassId,
  type StageCompositionDecision,
  type StageReading,
  type StageTruthKey,
} from '@keeper/shared';
import { executeRegisteredChat } from '../executeRegisteredChat.js';
import { loadKeeperStage, saveKeeperStage } from '../domains/keeperStageStore.js';
import {
  buildStageCompositionSystemPrompt,
  buildStageCompositionUserPrompt,
} from './composeStageComposition.js';
import { loadStageReading } from './loadStageReading.js';

const RENDR_COMPOSITION_TIMEOUT_MS = 20_000;

export type StageCompositionProposeReceipt = {
  type: 'stage.composition.propose';
  status: string;
  message: string;
  actionResult: {
    type: 'stage.composition.propose';
    status: 'success' | 'error';
    message: string;
    data: Record<string, unknown>;
  };
};

export type ExpressStageCompositionInput = {
  domainId: string;
  userId?: string;
  truth?: StageTruthKey;
  brief?: string;
  onStage: boolean;
};

function withDeadline<T>(promise: Promise<T>, ms: number): Promise<T | 'timeout'> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve('timeout'), ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        clearTimeout(timer);
        resolve('timeout');
      });
  });
}

function receipt(
  status: string,
  message: string,
  data: Record<string, unknown> = {},
): StageCompositionProposeReceipt {
  const cardStatus = status === 'applied' ? 'success' : 'error';
  return {
    type: 'stage.composition.propose',
    status,
    message,
    actionResult: {
      type: 'stage.composition.propose',
      status: cardStatus,
      message: `${status} — ${message}`,
      data: { compositionStatus: status, ...data },
    },
  };
}

function compositionFromModelText(content: string): unknown {
  const trimmed = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as unknown;
    } catch {
      return null;
    }
  }
}

function decisionMessage(decision: StageCompositionDecision, truth: StageTruthKey): string {
  if (decision.status === 'applied') {
    const dropped = decision.droppedIds.length ? ` · dropped ${decision.droppedIds.length}` : '';
    return `${truth} · ${decision.summary} · replaced ${decision.replacedId}${dropped}`;
  }
  if (decision.status === 'needs-grammar') return `${truth} · ${decision.token}`;
  if (decision.status === 'unsourced') return `${truth} · cited nothing in the Reading`;
  return `${truth} · empty arrangement`;
}

export async function expressStageComposition(
  input: ExpressStageCompositionInput,
): Promise<StageCompositionProposeReceipt> {
  if (!input.onStage) {
    return receipt('offstage', 'Stage is not the room for this turn');
  }
  if (!input.truth) {
    return receipt('no-reading', 'Stage did not report which presentation is up');
  }
  const truth = input.truth;

  let reading: StageReading | null = null;
  try {
    reading = await loadStageReading({
      domainId: input.domainId,
      truth,
      userId: input.userId,
    });
  } catch (error) {
    return receipt('no-reading', error instanceof Error ? error.message : 'The Reading could not be loaded');
  }
  if (!reading || reading.items.length === 0) {
    return receipt('no-reading', `${input.truth} has nothing to arrange`, { truth: input.truth });
  }

  const stage = await loadKeeperStage(input.domainId);
  const previousId = stage.arrangements?.[input.truth]?.id ?? deterministicPassId(input.truth);

  const rendr = await prisma.kip_agents.findUnique({
    where: { slug: 'rendr' },
    select: { id: true, model: true, model_provider: true, model_settings: true },
  });
  if (!rendr) return receipt('rendr_missing', 'Rendr is not available');

  const settings = {
    ...((rendr.model_settings && typeof rendr.model_settings === 'object' && !Array.isArray(rendr.model_settings)
      ? rendr.model_settings
      : {}) as ModelSettings),
    model: rendr.model || 'claude-sonnet-4-6',
    temperature: 0.3,
    max_tokens: 1400,
  };
  const provider = (rendr.model_provider || 'anthropic').trim() || 'anthropic';
  const model = (rendr.model || 'claude-sonnet-4-6').trim() || 'claude-sonnet-4-6';

  const modelPromise = executeRegisteredChat({
    preference: { provider, model, source: 'agent_preference' },
    messages: [
      { role: 'system', content: buildStageCompositionSystemPrompt() },
      {
        role: 'user',
        content: buildStageCompositionUserPrompt({ reading, brief: input.brief }),
      },
    ],
    settings,
    userId: input.userId,
    domainId: input.domainId,
    jsonMode: true,
    purpose: 'rendr_expression',
    caller: { kind: 'agent', id: rendr.id, slug: 'rendr' },
    fallbackPolicy: 'none',
    offeringSelection: 'stated',
  }).then((executed) => executed.response);

  const raced = await withDeadline(modelPromise, RENDR_COMPOSITION_TIMEOUT_MS);
  if (raced === 'timeout') {
    return receipt('timeout', `${input.truth} · Rendr timed out`, { truth: input.truth, replacedId: previousId });
  }
  if (!raced.success || !raced.content.trim()) {
    return receipt('model_failed', raced.error || 'Rendr did not compose', { truth: input.truth });
  }
  const raw = compositionFromModelText(raced.content);
  if (raw == null) {
    return receipt('no_expression', `${input.truth} · Rendr returned no composition`, { truth: input.truth });
  }

  const decision = decideStageComposition({
    raw,
    reading,
    truth: input.truth,
    previousId,
    id: `comp-${Date.now().toString(36)}`,
  });
  const message = decisionMessage(decision, input.truth);
  if (decision.status !== 'applied') {
    return receipt(decision.status, message, {
      truth,
      replacedId: previousId,
      ...(decision.status === 'needs-grammar' ? { token: decision.token } : {}),
    });
  }

  const at = new Date().toISOString();
  await saveKeeperStage(input.domainId, {
    arrangements: {
      [input.truth]: {
        id: decision.composition.id,
        truth,
        composition: decision.composition,
        replacedId: decision.replacedId,
        at,
        ...(input.brief?.trim() ? { brief: input.brief.trim().slice(0, 400) } : {}),
      },
    },
  });

  return receipt('applied', message, {
    truth: input.truth,
    compositionId: decision.composition.id,
    replacedId: decision.replacedId,
    summary: decision.summary,
    droppedIds: decision.droppedIds,
    strippedKeys: decision.strippedKeys,
  });
}
