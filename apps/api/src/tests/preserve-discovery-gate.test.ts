import { describe, expect, it } from 'vitest';
import {
  PRESERVE_DISCOVERY_MAX_RECONSIDER,
  PRESERVE_DISCOVERY_MIN_PROBABILITY,
  PRESERVE_DISCOVERY_MOVES,
  PRESERVE_DISCOVERY_OBJECTIVE,
  PRESERVE_DISCOVERY_QUESTION,
  buildPreserveDiscoveryCompletionMessages,
  buildPreserveDiscoveryState,
  parsePreserveDiscoveryCompletion,
  preserveDiscoveryChoiceOpens,
  preserveDiscoveryResidueVeto,
  readPreserveDiscoveryChoice,
  type PreserveMoveProbabilities,
} from '../services/kip/preserveDiscoveryGate.js';

const BANNED =
  /\b(draft\.update\.propose|document\.orientation\.update|sole\.save|schemas?|point intent|memory)\b/i;

function probabilities(
  preserve: number,
  reconsider: number,
  continueP = 0,
  ask = 0,
): PreserveMoveProbabilities {
  return {
    CONTINUE: continueP,
    PRESERVE_DISCOVERY: preserve,
    RECONSIDER_ORIENTATION: reconsider,
    ASK_HUMAN: ask,
  };
}

describe('preserve-discovery@1', () => {
  it('keeps the frozen objective, question, and move definitions', () => {
    expect(PRESERVE_DISCOVERY_OBJECTIVE).toBe(
      'Preserve meaningful human discoveries without unnecessarily interrupting natural conversation or preserving ordinary chatter.',
    );
    expect(PRESERVE_DISCOVERY_QUESTION).toBe(
      'Which semantic move should be chosen? Use the authoritative state and the objective. Choose one.',
    );
    expect(PRESERVE_DISCOVERY_MOVES.PRESERVE_DISCOVERY).toBe(
      'something meaningful should survive this exchange',
    );
    expect(PRESERVE_DISCOVERY_MIN_PROBABILITY).toBe(0.85);
    expect(PRESERVE_DISCOVERY_MAX_RECONSIDER).toBe(0.1);
    expect(BANNED.test(JSON.stringify(PRESERVE_DISCOVERY_MOVES))).toBe(false);
  });

  it('opens only inside the measured gap', () => {
    expect(preserveDiscoveryChoiceOpens(probabilities(0.88, 0))).toBe(true);
    expect(preserveDiscoveryChoiceOpens(probabilities(0.85, 0.09))).toBe(true);
    expect(preserveDiscoveryChoiceOpens(probabilities(0.98, 0))).toBe(true);
    expect(preserveDiscoveryChoiceOpens(probabilities(0.849, 0))).toBe(false);
    expect(preserveDiscoveryChoiceOpens(probabilities(0.98, 0.1))).toBe(false);
    expect(preserveDiscoveryChoiceOpens(probabilities(0.72, 0.25))).toBe(false);
    expect(preserveDiscoveryChoiceOpens(probabilities(0.06, 0))).toBe(false);
    expect(preserveDiscoveryChoiceOpens(null)).toBe(false);
  });

  it('reads the choice distribution and ignores confidence as a gate', () => {
    const reading = readPreserveDiscoveryChoice({
      move: {
        choice: 'PRESERVE_DISCOVERY',
        confidence: 0.2,
        probabilities: probabilities(0.9, 0.01, 0.09, 0),
      },
    });
    expect(reading.confidence).toBe(0.2);
    expect(preserveDiscoveryChoiceOpens(reading.probabilities)).toBe(true);
  });

  it('treats any durable item as a veto, including an empty manuscript', () => {
    expect(preserveDiscoveryResidueVeto([])).toBeNull();
    expect(
      preserveDiscoveryResidueVeto([{ kind: 'document_manuscript', pointCount: 1 }]),
    ).toBe('manuscript_points');
    expect(
      preserveDiscoveryResidueVeto([{ kind: 'document_manuscript', pointCount: 0 }]),
    ).toBe('durable_draft');
    expect(
      preserveDiscoveryResidueVeto([{ kind: 'working', pointCount: 0 }]),
    ).toBe('durable_draft');
  });

  it('builds the empty-residue snapshot without inventing a direction', () => {
    const state = buildPreserveDiscoveryState({
      human: 'That seems worth keeping.',
      kip: 'The two styles do feel different.',
      orientationText: '  ',
    });
    expect(state.objective).toBe(PRESERVE_DISCOVERY_OBJECTIVE);
    expect(state.hasDurableResidue).toBe(false);
    expect(state.existingDurableItemRepresentsWhatWasJustFound).toBe(false);
    expect(state.direction).toBeNull();
    expect(state.orientationText).toBeNull();
  });

  it('accepts survives and an optional label, and drops anything else', () => {
    expect(
      parsePreserveDiscoveryCompletion(
        '```json\n{"survives":"Profiles change the turn.","label":"Conversation profiles","type":"draft.update.propose"}\n```',
      ),
    ).toEqual({
      survives: 'Profiles change the turn.',
      label: 'Conversation profiles',
    });
    expect(parsePreserveDiscoveryCompletion('{"label":"only a name"}')).toBeNull();
    expect(parsePreserveDiscoveryCompletion('not json')).toBeNull();
  });

  it('does not teach storage in the completion', () => {
    const messages = buildPreserveDiscoveryCompletionMessages({
      agentName: 'Kip',
      human: 'That seems worth keeping.',
      kip: 'The difference is what this test turned up.',
    });
    const text = JSON.stringify(messages);
    expect(BANNED.test(text)).toBe(false);
    expect(text).not.toMatch(/draft\.|sole\.|Point|Orientation|schema/i);
    expect(text).toContain('survives');
  });
});
