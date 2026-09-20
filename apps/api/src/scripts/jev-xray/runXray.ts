/**
 * Evaluate curated Keeper units with the existing TypeSafe/Jev client.
 */

import { evaluateTypeSafe, TYPESAFE_DEFAULT_MODEL, type TypeSafeUsage } from '../../services/TypeSafeProvider.js';
import { KEEPER_XRAY_ARCHITECTURE_CONTEXT } from './architectureContext.js';
import { KEEPER_XRAY_QUESTIONS, toTypeSafeQuestions } from './questions.js';
import { answersFromTypeSafe } from './report.js';
import type { XrayPreparedUnit, XrayUnitResult } from './types.js';

export type XrayRunOptions = {
  apiKey: string;
  model?: string;
  concurrency?: number;
  onUnit?: (index: number, total: number, unit: XrayPreparedUnit) => void;
};

function buildState(unit: XrayPreparedUnit): Record<string, unknown> {
  return {
    architecture: KEEPER_XRAY_ARCHITECTURE_CONTEXT,
    unit: {
      path: unit.path,
      symbol: unit.symbol,
      unitType: unit.unitType,
      note: unit.note ?? null,
      truncated: unit.truncated,
    },
    code: unit.code,
  };
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker(): Promise<void> {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
    }
  }
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function evaluateUnit(
  unit: XrayPreparedUnit,
  apiKey: string,
  model: string,
): Promise<XrayUnitResult> {
  const started = Date.now();
  const outcome = await evaluateTypeSafe({
    state: buildState(unit),
    questions: toTypeSafeQuestions(),
    model,
    apiKey,
  });
  const durationMs = Date.now() - started;

  if (outcome.ok === false) {
    return {
      path: unit.path,
      symbol: unit.symbol,
      unitType: unit.unitType,
      note: unit.note,
      truncated: unit.truncated,
      charCount: unit.charCount,
      ok: false,
      model,
      errorCode: outcome.errorCode,
      message: outcome.message,
      durationMs,
      answers: [],
    };
  }

  return {
    path: unit.path,
    symbol: unit.symbol,
    unitType: unit.unitType,
    note: unit.note,
    truncated: unit.truncated,
    charCount: unit.charCount,
    ok: true,
    model: outcome.model,
    durationMs,
    usage: outcome.usage,
    answers: answersFromTypeSafe(
      outcome.answers,
      KEEPER_XRAY_QUESTIONS.map((question) => ({
        id: question.id,
        instructions: question.instructions,
        family: question.family,
      })),
    ),
  };
}

export async function runXray(
  units: XrayPreparedUnit[],
  options: XrayRunOptions,
): Promise<{ results: XrayUnitResult[]; usage: TypeSafeUsage }> {
  const model = options.model?.trim() || TYPESAFE_DEFAULT_MODEL;
  const concurrency = Math.max(1, options.concurrency ?? 4);
  const results = await mapPool(units, concurrency, async (unit, index) => {
    options.onUnit?.(index + 1, units.length, unit);
    return evaluateUnit(unit, options.apiKey, model);
  });

  const usage = results.reduce<TypeSafeUsage>(
    (acc, unit) => {
      const input = unit.usage?.input_tokens ?? unit.usage?.prompt_tokens ?? 0;
      const output = unit.usage?.output_tokens ?? unit.usage?.completion_tokens ?? 0;
      acc.input_tokens = (acc.input_tokens ?? 0) + input;
      acc.output_tokens = (acc.output_tokens ?? 0) + output;
      acc.total_tokens = (acc.total_tokens ?? 0) + (unit.usage?.total_tokens ?? input + output);
      return acc;
    },
    { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
  );

  return { results, usage };
}
