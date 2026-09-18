/**
 * Post-Lead Rendr handoff — meaning + Set → one Stage Frame.
 * Honest miss: any failure leaves Stage unchanged.
 */

import { ModelSettings, type ModelProvider } from '@keeper/database';
import {
  parseStageExpressionFromModelText,
  withPerformedByFallback,
  type ResolvedMeaning,
  type StageExpressionStamp,
  type StageStorySlide,
} from '@keeper/shared';
import { prisma } from '@keeper/database';
import { ModelProviderService } from '../ModelProviderService.js';
import { appendStageExpressionBeat } from '../kip/layoutStageStory.js';
import {
  buildStageExpressionSystemPrompt,
  buildStageExpressionUserPrompt,
  compactPerformanceSetFromEnvironment,
} from './composeStageExpression.js';

const RENDR_EXPRESSION_TIMEOUT_MS = 20_000;

export type ExpressResolvedMeaningInput = {
  domainId: string;
  userId?: string;
  leadMessageId: string;
  resolvedMeaning: ResolvedMeaning;
  deliveredCastSlugs?: string[];
  environment?: unknown;
};

export type ExpressResolvedMeaningSuccess = {
  ok: true;
  stamp: StageExpressionStamp;
  slide: StageStorySlide;
  alreadyPresent: boolean;
};

export type ExpressResolvedMeaningSkip = {
  ok: false;
  reason:
    | 'no_expression'
    | 'timeout'
    | 'model_failed'
    | 'append_failed'
    | 'rendr_missing';
  message: string;
};

export type ExpressResolvedMeaningResult =
  | ExpressResolvedMeaningSuccess
  | ExpressResolvedMeaningSkip;

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

export async function expressResolvedMeaningOnStage(
  input: ExpressResolvedMeaningInput,
): Promise<ExpressResolvedMeaningResult> {
  const rendr = await prisma.kip_agents.findUnique({
    where: { slug: 'rendr' },
    select: {
      model: true,
      model_provider: true,
      model_settings: true,
    },
  });
  if (!rendr) {
    return { ok: false, reason: 'rendr_missing', message: 'Rendr is not available.' };
  }

  const resolved = withPerformedByFallback(
    input.resolvedMeaning,
    input.deliveredCastSlugs ?? [],
  );
  const set = compactPerformanceSetFromEnvironment(input.environment);
  const settings = {
    ...((rendr.model_settings && typeof rendr.model_settings === 'object' && !Array.isArray(rendr.model_settings)
      ? rendr.model_settings
      : {}) as ModelSettings),
    model: rendr.model || 'claude-sonnet-4-6',
    temperature: 0.3,
    max_tokens: 600,
  };

  const modelPromise = ModelProviderService.callModel({
    messages: [
      { role: 'system', content: buildStageExpressionSystemPrompt() },
      { role: 'user', content: buildStageExpressionUserPrompt({ resolvedMeaning: resolved, set }) },
    ],
    settings,
    provider: (rendr.model_provider || 'anthropic') as ModelProvider,
    userId: input.userId,
    domainId: input.domainId,
    jsonMode: true,
  });

  const raced = await withDeadline(modelPromise, RENDR_EXPRESSION_TIMEOUT_MS);
  if (raced === 'timeout') {
    return { ok: false, reason: 'timeout', message: 'Rendr timed out. Stage is unchanged.' };
  }
  if (!raced.success || !raced.content.trim()) {
    return {
      ok: false,
      reason: 'model_failed',
      message: raced.error || 'Rendr did not compose a Frame.',
    };
  }

  const expression = parseStageExpressionFromModelText(raced.content);
  if (!expression) {
    return { ok: false, reason: 'no_expression', message: 'Rendr returned no Stage expression.' };
  }

  const appended = await appendStageExpressionBeat({
    domainId: input.domainId,
    leadMessageId: input.leadMessageId,
    title: expression.beat.title,
    body: expression.beat.body,
    rationale: expression.rationale,
  });
  if (appended.ok === false) {
    return { ok: false, reason: 'append_failed', message: appended.message };
  }

  return {
    ok: true,
    alreadyPresent: appended.alreadyPresent,
    slide: appended.slide,
    stamp: {
      slideId: appended.slide.id,
      title: appended.slide.title,
      at: new Date().toISOString(),
      ...(expression.rationale ? { rationale: expression.rationale } : {}),
    },
  };
}
