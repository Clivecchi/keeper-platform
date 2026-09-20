/**
 * Jev Codebase X-Ray — typed records for one evaluation of one code unit.
 * Experiment harness. Does not authorize or mutate Keeper state.
 */

export const XRAY_UNIT_TYPES = [
  'file',
  'function',
  'component',
  'service',
  'route',
  'capability',
  'type',
  'resolver',
] as const;

export type XrayUnitType = (typeof XRAY_UNIT_TYPES)[number];

export const XRAY_QUESTION_FAMILIES = [
  'architecture',
  'object',
  'mutation',
  'agency',
  'drift',
  'risk',
  'discovery',
] as const;

export type XrayQuestionFamily = (typeof XRAY_QUESTION_FAMILIES)[number];

export type XrayExtractSpec =
  | { kind: 'file' }
  | { kind: 'export'; name: string }
  | { kind: 'marker'; needle: string; before?: number; after?: number };

export type XrayUnitSpec = {
  path: string;
  symbol: string;
  unitType: XrayUnitType;
  extract?: XrayExtractSpec;
  note?: string;
};

export type XrayPreparedUnit = {
  path: string;
  symbol: string;
  unitType: XrayUnitType;
  note?: string;
  code: string;
  truncated: boolean;
  charCount: number;
};

export type XrayQuestionDef = {
  id: string;
  family: XrayQuestionFamily;
  type: 'choice';
  instructions: string;
  criteria: Record<string, string>;
};

export type XrayAnswer = {
  questionId: string;
  question: string;
  family: XrayQuestionFamily;
  answer: string;
  confidence: number | null;
  probabilities: Record<string, number> | null;
};

export type XrayUnitResult = {
  path: string;
  symbol: string;
  unitType: XrayUnitType;
  note?: string;
  truncated: boolean;
  charCount: number;
  ok: boolean;
  model: string | null;
  errorCode?: string;
  message?: string;
  durationMs: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  answers: XrayAnswer[];
};

export type XrayEvaluationRow = {
  question: string;
  questionId: string;
  family: XrayQuestionFamily;
  answer: string;
  confidence: number | null;
  probabilities: Record<string, number> | null;
  path: string;
  symbol: string;
  unitType: XrayUnitType;
};

export type XrayConfidenceBand = 'high' | 'medium' | 'low' | 'unknown';

export type XrayRunSummary = {
  generatedAt: string;
  model: string;
  unitCount: number;
  questionCount: number;
  evaluationCount: number;
  okUnits: number;
  failedUnits: number;
  durationMs: number;
  keySource: string;
  tokenTotals: {
    input: number;
    output: number;
    total: number;
  };
  confidence: {
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
};

export type XrayCodeMapViewRow = {
  path: string;
  symbol: string;
  unitType: XrayUnitType;
  answer: string;
  confidence: number | null;
  questionId: string;
};

export type XrayCodeMap = {
  summary: XrayRunSummary;
  views: {
    stage: XrayCodeMapViewRow[];
    dialog: XrayCodeMapViewRow[];
    mutation: XrayCodeMapViewRow[];
    agency: XrayCodeMapViewRow[];
    legacy: XrayCodeMapViewRow[];
    reliabilitySeams: XrayCodeMapViewRow[];
    capabilityLiteracySeams: XrayCodeMapViewRow[];
    ambiguity: XrayCodeMapViewRow[];
  };
  discovery: XrayEvaluationRow[];
  units: XrayUnitResult[];
};
