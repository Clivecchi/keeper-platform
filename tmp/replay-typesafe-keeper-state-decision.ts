/**
 * Offline game-state decision replay. Not production. Not a live-path change.
 * Does not name Keeper capabilities, schemas, or intent detectors.
 * Writes tmp/typesafe-signal-replay/keeper-state-decision.json
 */
import 'dotenv/config';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runTypeSafeEvaluateAction } from '../apps/api/src/services/TypeSafeEvaluateService.js';
import {
  TYPESAFE_DEFAULT_MODEL,
  type TypeSafeQuestions,
} from '../apps/api/src/services/TypeSafeProvider.js';

const REPEATS = 3;

const OBJECTIVE =
  'Preserve meaningful human discoveries without unnecessarily interrupting natural conversation or preserving ordinary chatter.';

const MOVE_DEFINITIONS = {
  CONTINUE: 'conversation should simply continue',
  PRESERVE_DISCOVERY: 'something meaningful should survive this exchange',
  RECONSIDER_ORIENTATION: "the conversation's direction may no longer be represented accurately",
  ASK_HUMAN: 'the correct next responsibility genuinely requires clarification',
} as const;

type MoveName = keyof typeof MOVE_DEFINITIONS;

/** Same definitions, names that do not contain the cue words. Order is scrambled. */
const ABSTRACT_KEY: Record<MoveName, string> = {
  ASK_HUMAN: 'MOVE_A',
  CONTINUE: 'MOVE_B',
  PRESERVE_DISCOVERY: 'MOVE_C',
  RECONSIDER_ORIENTATION: 'MOVE_D',
};

const QUESTION =
  'Which semantic move should be chosen? Use the authoritative state and the objective. Choose one.';

function questionsFor(formulation: 'named' | 'abstract'): TypeSafeQuestions {
  const criteria: Record<string, string> = {};
  for (const name of Object.keys(MOVE_DEFINITIONS) as MoveName[]) {
    const key = formulation === 'named' ? name : ABSTRACT_KEY[name];
    criteria[key] = MOVE_DEFINITIONS[name];
  }
  return {
    move: {
      type: 'choice',
      instructions: QUESTION,
      criteria,
    },
  };
}

const NAMED_QUESTIONS = questionsFor('named');
const ABSTRACT_QUESTIONS = questionsFor('abstract');

const CLEAN_KIP =
  'The two styles do feel different. The first one wandered, and this one got more direct. That difference is what this test turned up.';

const PRIMARY_HUMAN =
  'I am testing Conversation Profiles. That seems like something worth keeping.';

const DIRECTION_TEST = 'The human is testing conversation profiles.';

const DIRECTION_DEVELOPED =
  'This began as casual testing. It is now an investigation of conversation profiles and how agency should work.';

const ORIENT_EXCHANGE = {
  human: 'This stopped being a casual test. We are looking at conversation profiles and how agency should work.',
  kip: 'The opening was only a hello. The subject now is how those profiles behave, and what agency requires of us.',
};

const ORIENT_ACCURATE =
  'Read this as an investigation of conversation profiles and how agency should work. The early testing was only the opening.';

const ORIENT_OBSOLETE =
  'This is a quick hello to see if anyone is listening. There is no subject yet.';

type DecisionState = {
  objective: string;
  human: string;
  kip: string;
  hasDurableResidue: boolean;
  existingDurableItemRepresentsWhatWasJustFound: boolean;
  direction: string | null;
  orientationText: string | null;
};

type Specimen = {
  id: string;
  group: 'primary' | 'chatter' | 'paraphrase' | 'false_positive' | 'orientation' | 'label_echo';
  state: DecisionState;
  abstract: boolean;
};

function state(partial: Omit<DecisionState, 'objective'>): DecisionState {
  return { objective: OBJECTIVE, ...partial };
}

const baseFound = {
  hasDurableResidue: false,
  existingDurableItemRepresentsWhatWasJustFound: false,
  direction: DIRECTION_TEST,
  orientationText: null as string | null,
};

const SPECIMENS: Specimen[] = [
  {
    id: 'primary-unrepresented',
    group: 'primary',
    abstract: true,
    state: state({ ...baseFound, human: PRIMARY_HUMAN, kip: CLEAN_KIP }),
  },
  {
    id: 'primary-represented',
    group: 'primary',
    abstract: true,
    state: state({
      ...baseFound,
      human: PRIMARY_HUMAN,
      kip: CLEAN_KIP,
      hasDurableResidue: true,
      existingDurableItemRepresentsWhatWasJustFound: true,
    }),
  },
  {
    id: 'chatter',
    group: 'chatter',
    abstract: true,
    state: state({
      human: 'Well, what do you know?',
      kip: 'Hello. I am here.',
      hasDurableResidue: false,
      existingDurableItemRepresentsWhatWasJustFound: false,
      direction: null,
      orientationText: null,
    }),
  },
  {
    id: 'para-worth-keeping',
    group: 'paraphrase',
    abstract: false,
    state: state({ ...baseFound, human: 'That seems worth keeping.', kip: CLEAN_KIP }),
  },
  {
    id: 'para-lose-thought',
    group: 'paraphrase',
    abstract: true,
    state: state({ ...baseFound, human: "I don't want to lose that thought.", kip: CLEAN_KIP }),
  },
  {
    id: 'para-hang-onto',
    group: 'paraphrase',
    abstract: false,
    state: state({ ...baseFound, human: 'We should hang onto that.', kip: CLEAN_KIP }),
  },
  {
    id: 'para-tomorrow',
    group: 'paraphrase',
    abstract: false,
    state: state({
      ...baseFound,
      human: "I'd like that to still be here tomorrow.",
      kip: CLEAN_KIP,
    }),
  },
  {
    id: 'para-important',
    group: 'paraphrase',
    abstract: false,
    state: state({
      ...baseFound,
      human: "There's something important in what we just figured out.",
      kip: CLEAN_KIP,
    }),
  },
  {
    id: 'fp-keep-going',
    group: 'false_positive',
    abstract: true,
    state: state({
      human: 'Keep going.',
      kip: 'Okay. Continuing.',
      hasDurableResidue: false,
      existingDurableItemRepresentsWhatWasJustFound: false,
      direction: null,
      orientationText: null,
    }),
  },
  {
    id: 'fp-save-joke',
    group: 'false_positive',
    abstract: false,
    state: state({
      human: 'Save that joke for later.',
      kip: 'That was a light moment. We can leave it there.',
      hasDurableResidue: false,
      existingDurableItemRepresentsWhatWasJustFound: false,
      direction: null,
      orientationText: null,
    }),
  },
  {
    id: 'fp-i-remember',
    group: 'false_positive',
    abstract: false,
    state: state({
      human: 'I remember what we were talking about.',
      kip: 'Yes. We had been talking about how this conversation feels.',
      hasDurableResidue: false,
      existingDurableItemRepresentsWhatWasJustFound: false,
      direction: null,
      orientationText: null,
    }),
  },
  {
    id: 'fp-only-testing',
    group: 'false_positive',
    abstract: false,
    state: state({
      human: 'Remember, we are only testing.',
      kip: 'Understood. This is only a test.',
      hasDurableResidue: false,
      existingDurableItemRepresentsWhatWasJustFound: false,
      direction: null,
      orientationText: null,
    }),
  },
  {
    id: 'orient-null',
    group: 'orientation',
    abstract: true,
    state: state({
      human: ORIENT_EXCHANGE.human,
      kip: ORIENT_EXCHANGE.kip,
      hasDurableResidue: false,
      existingDurableItemRepresentsWhatWasJustFound: false,
      direction: DIRECTION_DEVELOPED,
      orientationText: null,
    }),
  },
  {
    id: 'orient-accurate',
    group: 'orientation',
    abstract: true,
    state: state({
      human: ORIENT_EXCHANGE.human,
      kip: ORIENT_EXCHANGE.kip,
      hasDurableResidue: false,
      existingDurableItemRepresentsWhatWasJustFound: false,
      direction: DIRECTION_DEVELOPED,
      orientationText: ORIENT_ACCURATE,
    }),
  },
  {
    id: 'orient-obsolete',
    group: 'orientation',
    abstract: true,
    state: state({
      human: ORIENT_EXCHANGE.human,
      kip: ORIENT_EXCHANGE.kip,
      hasDurableResidue: false,
      existingDurableItemRepresentsWhatWasJustFound: false,
      direction: DIRECTION_DEVELOPED,
      orientationText: ORIENT_OBSOLETE,
    }),
  },
  {
    id: 'echo-unrepresented',
    group: 'label_echo',
    abstract: true,
    state: state({
      ...baseFound,
      human: "Let's preserve this discovery.",
      kip: 'Okay.',
    }),
  },
  {
    id: 'echo-represented',
    group: 'label_echo',
    abstract: true,
    state: state({
      ...baseFound,
      human: "Let's preserve this discovery.",
      kip: 'Okay.',
      hasDurableResidue: true,
      existingDurableItemRepresentsWhatWasJustFound: true,
    }),
  },
];

const BANNED =
  /\b(draft\.update\.propose|document\.orientation\.update|sole\.save|schemas?|point intent)\b/i;

function assertClean(value: unknown): void {
  const text = JSON.stringify(value);
  if (BANNED.test(text)) throw new Error(`Implementation vocabulary leaked into a packet: ${text.slice(0, 180)}`);
}

type Row = {
  id: string;
  group: Specimen['group'];
  formulation: 'named' | 'abstract';
  repeat: number;
  ok: boolean;
  model: string | null;
  latencyMs: number;
  error?: string;
  choice: string | null;
  semantic: MoveName | null;
  confidence: number | null;
  probabilities: Record<string, number> | null;
  semanticProbabilities: Record<MoveName, number> | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function semanticOf(formulation: 'named' | 'abstract', key: string | null): MoveName | null {
  if (!key) return null;
  if (formulation === 'named' && key in MOVE_DEFINITIONS) return key as MoveName;
  const found = (Object.keys(ABSTRACT_KEY) as MoveName[]).find((name) => ABSTRACT_KEY[name] === key);
  return found ?? null;
}

function semanticProbabilities(
  formulation: 'named' | 'abstract',
  probabilities: Record<string, number> | null,
): Record<MoveName, number> | null {
  if (!probabilities) return null;
  const out = {} as Record<MoveName, number>;
  for (const name of Object.keys(MOVE_DEFINITIONS) as MoveName[]) {
    const key = formulation === 'named' ? name : ABSTRACT_KEY[name];
    out[name] = typeof probabilities[key] === 'number' ? probabilities[key] : 0;
  }
  return out;
}

function mean(values: number[]): number | null {
  if (!values.length) return null;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4));
}

async function main(): Promise<void> {
  for (const specimen of SPECIMENS) assertClean(specimen.state);
  assertClean(NAMED_QUESTIONS);
  assertClean(ABSTRACT_QUESTIONS);
  if (OBJECTIVE !== SPECIMENS[0].state.objective) throw new Error('Objective drifted');

  const rows: Row[] = [];
  const jobs: Array<{ specimen: Specimen; formulation: 'named' | 'abstract' }> = [];
  for (const specimen of SPECIMENS) {
    jobs.push({ specimen, formulation: 'named' });
    if (specimen.abstract) jobs.push({ specimen, formulation: 'abstract' });
  }

  for (const job of jobs) {
    for (let repeat = 1; repeat <= REPEATS; repeat += 1) {
      const started = Date.now();
      const outcome = await runTypeSafeEvaluateAction({
        payload: {
          state: job.specimen.state,
          questions: job.formulation === 'named' ? NAMED_QUESTIONS : ABSTRACT_QUESTIONS,
          model: TYPESAFE_DEFAULT_MODEL,
        },
      });
      const latencyMs = Date.now() - started;
      if (outcome.ok === false) {
        rows.push({
          id: job.specimen.id,
          group: job.specimen.group,
          formulation: job.formulation,
          repeat,
          ok: false,
          model: null,
          latencyMs,
          error: outcome.message,
          choice: null,
          semantic: null,
          confidence: null,
          probabilities: null,
          semanticProbabilities: null,
        });
        console.error(`[state] ${job.specimen.id} ${job.formulation} #${repeat} ${outcome.message}`);
        continue;
      }
      const raw = asRecord(outcome.answers.move);
      const choice = typeof raw?.choice === 'string' ? raw.choice : null;
      const confidence = typeof raw?.confidence === 'number' ? raw.confidence : null;
      const probabilities =
        raw?.probabilities && typeof raw.probabilities === 'object' && !Array.isArray(raw.probabilities)
          ? Object.fromEntries(
              Object.entries(raw.probabilities as Record<string, unknown>).filter(
                (entry): entry is [string, number] => typeof entry[1] === 'number',
              ),
            )
          : null;
      const semantic = semanticOf(job.formulation, choice);
      rows.push({
        id: job.specimen.id,
        group: job.specimen.group,
        formulation: job.formulation,
        repeat,
        ok: true,
        model: outcome.model,
        latencyMs,
        choice,
        semantic,
        confidence,
        probabilities,
        semanticProbabilities: semanticProbabilities(job.formulation, probabilities),
      });
      console.log(
        `[state] ${job.specimen.id} ${job.formulation} #${repeat} ${latencyMs}ms ${semantic} conf=${confidence} ${JSON.stringify(semanticProbabilities(job.formulation, probabilities))}`,
      );
    }
  }

  const summary = [...new Set(rows.map((row) => `${row.formulation}:${row.id}`))].map((key) => {
    const [formulation, id] = key.split(':') as ['named' | 'abstract', string];
    const matching = rows.filter((row) => row.id === id && row.formulation === formulation && row.ok);
    const winners = matching.map((row) => row.semantic);
    const unique = [...new Set(winners.filter((value): value is MoveName => value != null))];
    const probs = {} as Record<MoveName, { values: number[]; mean: number | null; min: number | null; max: number | null }>;
    for (const name of Object.keys(MOVE_DEFINITIONS) as MoveName[]) {
      const values = matching.map((row) => row.semanticProbabilities?.[name] ?? 0);
      probs[name] = {
        values,
        mean: mean(values),
        min: values.length ? Math.min(...values) : null,
        max: values.length ? Math.max(...values) : null,
      };
    }
    return {
      id,
      formulation,
      group: matching[0]?.group ?? SPECIMENS.find((specimen) => specimen.id === id)?.group,
      winners,
      winnerStable: unique.length === 1 && winners.length === REPEATS,
      winner: unique.length === 1 ? unique[0] : null,
      confidence: matching.map((row) => row.confidence),
      probabilities: probs,
    };
  });

  function pairDelta(formulation: 'named' | 'abstract', leftId: string, rightId: string) {
    const left = summary.find((row) => row.formulation === formulation && row.id === leftId);
    const right = summary.find((row) => row.formulation === formulation && row.id === rightId);
    const moves = {} as Record<MoveName, { left: number | null; right: number | null; delta: number | null }>;
    for (const name of Object.keys(MOVE_DEFINITIONS) as MoveName[]) {
      const a = left?.probabilities[name].mean ?? null;
      const b = right?.probabilities[name].mean ?? null;
      moves[name] = {
        left: a,
        right: b,
        delta: a != null && b != null ? Number((b - a).toFixed(4)) : null,
      };
    }
    return { formulation, leftId, rightId, moves };
  }

  const report = {
    experiment: 'typesafe-keeper-state-decision',
    frozenAt: '2026-09-22',
    modelRequested: TYPESAFE_DEFAULT_MODEL,
    repeats: REPEATS,
    livePathMutated: false,
    objective: OBJECTIVE,
    moveDefinitions: MOVE_DEFINITIONS,
    abstractKey: ABSTRACT_KEY,
    question: QUESTION,
    stateSchema: [
      'objective',
      'human',
      'kip',
      'hasDurableResidue',
      'existingDurableItemRepresentsWhatWasJustFound',
      'direction',
      'orientationText',
    ],
    note: 'Semantic moves only. No capability mapping. Objective text itself contains the verb Preserve; abstract labels remove that verb from the option names.',
    pairs: [
      pairDelta('named', 'primary-unrepresented', 'primary-represented'),
      pairDelta('abstract', 'primary-unrepresented', 'primary-represented'),
      pairDelta('named', 'orient-accurate', 'orient-obsolete'),
      pairDelta('abstract', 'orient-accurate', 'orient-obsolete'),
      pairDelta('named', 'echo-unrepresented', 'echo-represented'),
      pairDelta('abstract', 'echo-unrepresented', 'echo-represented'),
    ],
    summary,
    specimens: SPECIMENS.map((specimen) => ({
      id: specimen.id,
      group: specimen.group,
      abstract: specimen.abstract,
      state: specimen.state,
    })),
    rows,
  };

  const outPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    'typesafe-signal-replay/keeper-state-decision.json',
  );
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[state] wrote ${outPath}`);
  console.log(JSON.stringify({ pairs: report.pairs, summary }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
