/**
 * Post-Lead Rendr handoff — resolved meaning → a composition on the Lead message.
 * A beat becomes a Frame only when the Lead set presentFrame, or the human asked for one.
 * Rendr composes the Frame and may recommend presentation. Rendr does not decide.
 * Honest miss: any failure leaves the turn as ordinary text.
 * A Stage cell, when written, points at the Lead message. It does not store the beats.
 */

import { ModelSettings, type ModelProvider } from '@keeper/database';
import {
  applyDialogFrameAuthority,
  bindFramePerformanceCue,
  parseFramePerformanceFromModelText,
  promotedDialogFrame,
  parseStageExpressionFromModelText,
  withPerformanceContext,
  withPerformedByFallback,
  type FramePerformance,
  type ResolvedMeaning,
  type SelectedVoice,
  type StageExpressionStamp,
  type StageStorySlide,
} from '@keeper/shared';
import { prisma } from '@keeper/database';
import { ModelProviderService } from '../ModelProviderService.js';
import { appendStageExpressionBeat } from '../kip/layoutStageStory.js';
import { compactPerformanceSetFromEnvironment } from './composeStageExpression.js';
import {
  buildFramePerformanceSystemPrompt,
  buildFramePerformanceUserPrompt,
  performanceContextFromEnvironment,
  pointBindingFromTurn,
} from './composeFramePerformance.js';

const RENDR_EXPRESSION_TIMEOUT_MS = 20_000;

export type ExpressResolvedMeaningInput = {
  domainId: string;
  userId?: string;
  leadMessageId: string;
  resolvedMeaning: ResolvedMeaning;
  selectedVoices?: readonly SelectedVoice[];
  deliveredCastSlugs?: string[];
  voiceLabels?: Readonly<Record<string, string>>;
  environment?: unknown;
  actionResults?: ReadonlyArray<Record<string, unknown>>;
  hasCastVoices?: boolean;
  /** When true, append one live-sourced filmstrip cell. Dialog turns leave the story alone. */
  placeOnStage?: boolean;
  /** Human explicitly asked for a Dialog Frame. Authorizes presentation without the Lead's flag. */
  humanRequestedFrame?: boolean;
};

export type ExpressResolvedMeaningSuccess = {
  ok: true;
  performance: FramePerformance;
  stamp?: StageExpressionStamp;
  slide?: StageStorySlide;
  alreadyPresent?: boolean;
};

export type ExpressResolvedMeaningSkip = {
  ok: false;
  reason:
    | 'no_expression'
    | 'timeout'
    | 'model_failed'
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

function performanceFromModelText(
  content: string,
  selectedVoices: readonly SelectedVoice[],
): FramePerformance | null {
  const parsed = parseFramePerformanceFromModelText(content, { selectedVoices });
  if (parsed) return parsed;
  const legacy = parseStageExpressionFromModelText(content);
  if (!legacy) return null;
  return parseFramePerformanceFromModelText(JSON.stringify({
    version: 1,
    title: legacy.beat.title,
    beats: [{ title: legacy.beat.title, body: legacy.beat.body || legacy.beat.title }],
  }), { selectedVoices });
}

function stampVoiceLabels(
  performance: FramePerformance,
  voiceLabels: Readonly<Record<string, string>> | undefined,
): FramePerformance {
  if (!voiceLabels) return performance;
  return {
    ...performance,
    beats: performance.beats.map((beat) => {
      if (!beat.voice) return beat;
      const label = voiceLabels[beat.voice.slug]?.trim();
      if (!label) return beat;
      return { ...beat, voice: { ...beat.voice, attributedTo: label } };
    }),
  };
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
  const selectedVoices = input.selectedVoices ?? [];
  const set = compactPerformanceSetFromEnvironment(input.environment);
  const settings = {
    ...((rendr.model_settings && typeof rendr.model_settings === 'object' && !Array.isArray(rendr.model_settings)
      ? rendr.model_settings
      : {}) as ModelSettings),
    model: rendr.model || 'claude-sonnet-4-6',
    temperature: 0.3,
    max_tokens: 1400,
  };

  const modelPromise = ModelProviderService.callModel({
    messages: [
      { role: 'system', content: buildFramePerformanceSystemPrompt() },
      {
        role: 'user',
        content: buildFramePerformanceUserPrompt({
          resolvedMeaning: resolved,
          selectedVoices,
          set,
        }),
      },
    ],
    settings,
    provider: (rendr.model_provider || 'anthropic') as ModelProvider,
    userId: input.userId,
    domainId: input.domainId,
    jsonMode: true,
  });

  const raced = await withDeadline(modelPromise, RENDR_EXPRESSION_TIMEOUT_MS);
  if (raced === 'timeout') {
    return { ok: false, reason: 'timeout', message: 'Rendr timed out. The turn stays text.' };
  }
  if (!raced.success || !raced.content.trim()) {
    return {
      ok: false,
      reason: 'model_failed',
      message: raced.error || 'Rendr did not compose a Frame.',
    };
  }

  const composed = performanceFromModelText(raced.content, selectedVoices);
  if (!composed) {
    return { ok: false, reason: 'no_expression', message: 'Rendr returned no Frame Performance.' };
  }

  const stamped = withPerformanceContext(
    stampVoiceLabels(composed, input.voiceLabels),
    performanceContextFromEnvironment(input.environment, resolved),
  );
  if (!stamped) {
    return { ok: false, reason: 'no_expression', message: 'The composition collapsed Document and Point.' };
  }

  const binding = pointBindingFromTurn({
    resolvedMeaning: resolved,
    environment: input.environment,
    actionResults: input.actionResults,
  });
  const bound = bindFramePerformanceCue(stamped, {
    ...binding,
    hasCastVoices: input.hasCastVoices === true,
  });
  const authorized = resolved.presentFrame === true || input.humanRequestedFrame === true;
  const performance = applyDialogFrameAuthority(bound, authorized);

  const presented = promotedDialogFrame(performance);
  if (!input.placeOnStage || !presented) {
    return { ok: true, performance };
  }

  const beat = presented.beats[0];
  const appended = await appendStageExpressionBeat({
    domainId: input.domainId,
    leadMessageId: input.leadMessageId,
    title: beat?.title ?? performance.title,
    body: beat?.body ?? '',
  });
  if (appended.ok === false) {
    return { ok: true, performance };
  }

  return {
    ok: true,
    performance,
    alreadyPresent: appended.alreadyPresent,
    slide: appended.slide,
    stamp: {
      slideId: appended.slide.id,
      title: appended.slide.title,
      at: new Date().toISOString(),
    },
  };
}
