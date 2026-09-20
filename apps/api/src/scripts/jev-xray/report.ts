/**
 * Aggregate Jev answers into a Keeper Code Map. Confidence is preserved.
 */

import { parseJevRawAnswer } from '../../services/jev/runJevProbe.js';
import type {
  XrayAnswer,
  XrayCodeMap,
  XrayCodeMapViewRow,
  XrayConfidenceBand,
  XrayEvaluationRow,
  XrayQuestionFamily,
  XrayRunSummary,
  XrayUnitResult,
} from './types.js';

export const HIGH_CONFIDENCE = 0.75;
export const MEDIUM_CONFIDENCE = 0.45;

export function confidenceBand(confidence: number | null): XrayConfidenceBand {
  if (confidence == null || Number.isNaN(confidence)) return 'unknown';
  if (confidence >= HIGH_CONFIDENCE) return 'high';
  if (confidence >= MEDIUM_CONFIDENCE) return 'medium';
  return 'low';
}

export function flattenEvaluations(units: XrayUnitResult[]): XrayEvaluationRow[] {
  const rows: XrayEvaluationRow[] = [];
  for (const unit of units) {
    for (const answer of unit.answers) {
      rows.push({
        question: answer.question,
        questionId: answer.questionId,
        family: answer.family,
        answer: answer.answer,
        confidence: answer.confidence,
        probabilities: answer.probabilities,
        path: unit.path,
        symbol: unit.symbol,
        unitType: unit.unitType,
      });
    }
  }
  return rows;
}

function byConfidenceDesc(a: XrayCodeMapViewRow, b: XrayCodeMapViewRow): number {
  return (b.confidence ?? -1) - (a.confidence ?? -1);
}

function viewRows(
  rows: XrayEvaluationRow[],
  questionId: string,
  answers: string[],
): XrayCodeMapViewRow[] {
  return rows
    .filter((row) => row.questionId === questionId && answers.includes(row.answer))
    .map((row) => ({
      path: row.path,
      symbol: row.symbol,
      unitType: row.unitType,
      answer: row.answer,
      confidence: row.confidence,
      questionId: row.questionId,
    }))
    .sort(byConfidenceDesc);
}

export function parseChoiceAnswer(raw: unknown): Omit<XrayAnswer, 'questionId' | 'question' | 'family'> | null {
  const parsed = parseJevRawAnswer(raw);
  if (!parsed || parsed.type !== 'choice' || typeof parsed.answer !== 'string') return null;
  return {
    answer: parsed.answer,
    confidence: parsed.confidence,
    probabilities: parsed.probabilities,
  };
}

export function answersFromTypeSafe(
  rawAnswers: Record<string, unknown> | null | undefined,
  questionMeta: Array<{ id: string; instructions: string; family: XrayQuestionFamily }>,
): XrayAnswer[] {
  if (!rawAnswers) return [];
  const parsed: XrayAnswer[] = [];
  for (const meta of questionMeta) {
    const choice = parseChoiceAnswer(rawAnswers[meta.id]);
    if (!choice) continue;
    parsed.push({
      questionId: meta.id,
      question: meta.instructions,
      family: meta.family,
      ...choice,
    });
  }
  return parsed;
}

export function buildCodeMap(params: {
  units: XrayUnitResult[];
  model: string;
  durationMs: number;
  keySource: string;
  generatedAt?: string;
  questionCount: number;
}): XrayCodeMap {
  const rows = flattenEvaluations(params.units);
  const bands = { high: 0, medium: 0, low: 0, unknown: 0 };
  for (const row of rows) {
    bands[confidenceBand(row.confidence)] += 1;
  }

  const tokenTotals = params.units.reduce(
    (acc, unit) => {
      const input = unit.usage?.input_tokens ?? unit.usage?.prompt_tokens ?? 0;
      const output = unit.usage?.output_tokens ?? unit.usage?.completion_tokens ?? 0;
      const total = unit.usage?.total_tokens ?? input + output;
      acc.input += input;
      acc.output += output;
      acc.total += total;
      return acc;
    },
    { input: 0, output: 0, total: 0 },
  );

  const summary: XrayRunSummary = {
    generatedAt: params.generatedAt ?? new Date().toISOString(),
    model: params.model,
    unitCount: params.units.length,
    questionCount: params.questionCount,
    evaluationCount: rows.length,
    okUnits: params.units.filter((unit) => unit.ok).length,
    failedUnits: params.units.filter((unit) => !unit.ok).length,
    durationMs: params.durationMs,
    keySource: params.keySource,
    tokenTotals,
    confidence: bands,
  };

  const capabilityLiteracy = rows
    .filter((row) => {
      if (row.questionId === 'grantAsKnowledge' && row.answer === 'likely') return true;
      if (row.questionId === 'llmInfersCapability' && row.answer === 'likely') return true;
      return false;
    })
    .map((row) => ({
      path: row.path,
      symbol: row.symbol,
      unitType: row.unitType,
      answer: row.answer,
      confidence: row.confidence,
      questionId: row.questionId,
    }))
    .sort(byConfidenceDesc);

  const ambiguity = rows
    .filter((row) => row.answer === 'unclear' || confidenceBand(row.confidence) === 'low')
    .map((row) => ({
      path: row.path,
      symbol: row.symbol,
      unitType: row.unitType,
      answer: row.answer,
      confidence: row.confidence,
      questionId: row.questionId,
    }))
    .sort((a, b) => (a.confidence ?? 1) - (b.confidence ?? 1));

  return {
    summary,
    views: {
      stage: viewRows(rows, 'participatesStage', ['yes']),
      dialog: viewRows(rows, 'participatesDialog', ['yes']),
      mutation: viewRows(rows, 'mutationKind', ['keeper-data', 'external-system']),
      agency: [
        ...viewRows(rows, 'agentExecution', ['yes']),
        ...viewRows(rows, 'capabilityRole', ['define', 'grant', 'resolve', 'invoke', 'verify', 'multiple']),
      ].sort(byConfidenceDesc),
      legacy: [
        ...viewRows(rows, 'architectureAlignment', ['legacy', 'transitional']),
        ...viewRows(rows, 'legacyUiDependent', ['yes']),
      ].sort(byConfidenceDesc),
      reliabilitySeams: viewRows(rows, 'silentSuccess', ['likely']),
      capabilityLiteracySeams: capabilityLiteracy,
      ambiguity: ambiguity.slice(0, 80),
    },
    discovery: rows.filter((row) => row.family === 'discovery'),
    units: params.units,
  };
}

function mdTable(rows: XrayCodeMapViewRow[], empty: string): string {
  if (rows.length === 0) return empty;
  const lines = [
    '| Path | Symbol | Answer | Confidence |',
    '|---|---|---|---|',
    ...rows.slice(0, 40).map((row) => {
      const conf = row.confidence == null ? '—' : row.confidence.toFixed(2);
      return `| \`${row.path}\` | \`${row.symbol}\` | ${row.answer} | ${conf} |`;
    }),
  ];
  if (rows.length > 40) lines.push(`| … | ${rows.length - 40} more | | |`);
  return lines.join('\n');
}

export function renderCodeMapMarkdown(map: XrayCodeMap): string {
  const s = map.summary;
  const seconds = (s.durationMs / 1000).toFixed(1);
  return [
    '# Keeper Code Map — Jev X-Ray',
    '',
    `Generated ${s.generatedAt}. Model \`${s.model}\`. Key source: ${s.keySource}.`,
    '',
    '## Run',
    '',
    `- Units: ${s.unitCount} (${s.okUnits} ok, ${s.failedUnits} failed)`,
    `- Questions per unit: ${s.questionCount}`,
    `- Evaluations: ${s.evaluationCount}`,
    `- Duration: ${seconds}s`,
    `- Tokens (reported): input ${s.tokenTotals.input}, output ${s.tokenTotals.output}, total ${s.tokenTotals.total}`,
    `- Confidence: high ${s.confidence.high} · medium ${s.confidence.medium} · low ${s.confidence.low} · unknown ${s.confidence.unknown}`,
    '',
    'Low confidence is information. Do not flatten these to booleans.',
    '',
    '## Stage-related code',
    '',
    mdTable(map.views.stage, '_Jev did not mark any unit as materially Stage-related._'),
    '',
    '## Dialog-related code',
    '',
    mdTable(map.views.dialog, '_Jev did not mark any unit as materially Dialog-related._'),
    '',
    '## State mutation',
    '',
    mdTable(map.views.mutation, '_Jev did not mark any unit as mutating Keeper or external state._'),
    '',
    '## Agency / capability infrastructure',
    '',
    mdTable(map.views.agency, '_Jev did not mark agency or capability roles._'),
    '',
    '## Possible legacy architecture',
    '',
    mdTable(map.views.legacy, '_Jev did not classify units as legacy or transitional._'),
    '',
    '## Reliability seams',
    '',
    mdTable(map.views.reliabilitySeams, '_Jev did not flag silent/unverified success._'),
    '',
    '## Capability-literacy seams',
    '',
    mdTable(map.views.capabilityLiteracySeams, '_Jev did not flag grant-without-knowledge or LLM-inferred capability._'),
    '',
    '## Architectural ambiguity',
    '',
    mdTable(map.views.ambiguity, '_No low-confidence or unclear answers._'),
    '',
    '## Discovery questions',
    '',
    'These were added after inspecting the repository, not only to confirm known beliefs.',
    '',
    mdTable(
      map.discovery
        .filter((row) => row.answer === 'likely' || row.answer === 'yes')
        .map((row) => ({
          path: row.path,
          symbol: row.symbol,
          unitType: row.unitType,
          answer: `${row.questionId}:${row.answer}`,
          confidence: row.confidence,
          questionId: row.questionId,
        }))
        .sort((a, b) => (b.confidence ?? -1) - (a.confidence ?? -1)),
      '_No discovery questions answered likely/yes._',
    ),
    '',
  ].join('\n');
}
