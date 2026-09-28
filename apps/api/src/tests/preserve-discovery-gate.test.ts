import { describe, expect, it } from 'vitest';
import {
  PRESERVE_DISCOVERY_AGENCY,
  PRESERVE_DISCOVERY_MAX_ALREADY_REPRESENTED,
  PRESERVE_DISCOVERY_MAX_RECONSIDER,
  PRESERVE_DISCOVERY_MIN_PROBABILITY,
  PRESERVE_DISCOVERY_MOVES,
  PRESERVE_DISCOVERY_OBJECTIVE,
  PRESERVE_DISCOVERY_QUESTION,
  buildPreserveDiscoveryCompletionMessages,
  buildPreserveDiscoveryState,
  confirmPreserveDiscoveryPoint,
  heldItemsFromDocumentPoints,
  manuscriptRepresentsExchange,
  parsePreserveDiscoveryCompletion,
  preserveDiscoveryChoiceOpens,
  preserveDiscoveryKeptMessage,
  preserveDiscoveryPoint,
  preserveDiscoveryProposePayload,
  preserveDiscoveryShouldKeep,
  readPreserveDiscoveryChoice,
  type PreserveDiscoveryHeldItem,
  type PreserveMoveProbabilities,
} from '../services/kip/preserveDiscoveryGate.js';

const BANNED =
  /\b(draft\.update\.propose|document\.orientation\.update|sole\.save|schemas?|point intent|memory)\b/i;

const NEW_DISCOVERY =
  'A proposed Point is already kept by the Agency that recognized it.';
const HELD_API =
  'Railway hosts the API and the web app talks to it through the existing routes.';

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

function held(preview: string, title = 'Held'): PreserveDiscoveryHeldItem {
  return { number: 1, status: 'accepted', title, preview };
}

describe('preserve-discovery@1', () => {
  it('keeps the objective and the comparison move', () => {
    expect(PRESERVE_DISCOVERY_OBJECTIVE).toBe(
      'Preserve meaningful human discoveries without unnecessarily interrupting natural conversation or preserving ordinary chatter.',
    );
    expect(PRESERVE_DISCOVERY_QUESTION).toContain('living Document');
    expect(PRESERVE_DISCOVERY_MOVES.PRESERVE_DISCOVERY).toBe(
      'something meaningful was earned that the living Document does not already hold',
    );
    expect(PRESERVE_DISCOVERY_MIN_PROBABILITY).toBe(0.85);
    expect(PRESERVE_DISCOVERY_MAX_RECONSIDER).toBe(0.1);
    expect(PRESERVE_DISCOVERY_MAX_ALREADY_REPRESENTED).toBe(0.85);
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

  it('reads the choice distribution and the already-held score', () => {
    const reading = readPreserveDiscoveryChoice({
      move: {
        choice: 'PRESERVE_DISCOVERY',
        confidence: 0.2,
        probabilities: probabilities(0.9, 0.01, 0.09, 0),
      },
      alreadyRepresented: { type: 'noul', noul: 0.04 },
    });
    expect(reading.confidence).toBe(0.2);
    expect(reading.alreadyRepresented).toBe(0.04);
    expect(preserveDiscoveryChoiceOpens(reading.probabilities)).toBe(true);
  });

  it('lets an empty Document earn its first Point', () => {
    const state = buildPreserveDiscoveryState({
      human: NEW_DISCOVERY,
      kip: 'That is the distinction worth keeping.',
      orientationText: '  ',
    });
    expect(state.hasDurableResidue).toBe(false);
    expect(state.existingDurableItemRepresentsWhatWasJustFound).toBe(false);
    expect(state.held).toEqual([]);
    expect(state.direction).toBeNull();
    expect(state.orientationText).toBeNull();
    expect(preserveDiscoveryShouldKeep({
      probabilities: probabilities(0.9, 0.01),
      alreadyRepresented: 0.02,
      existingDurableItemRepresentsWhatWasJustFound:
        state.existingDurableItemRepresentsWhatWasJustFound,
    })).toBe(true);
  });

  it('lets a Document that already has Points earn a different one', () => {
    const items = heldItemsFromDocumentPoints([
      {
        status: 'accepted',
        prelude: 'Railway hosts the API',
        preview: HELD_API,
      },
      {
        status: 'proposed',
        prelude: 'Cast note',
        preview: 'A cast aside.',
        referencesPointId: 'host-point',
      },
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]?.status).toBe('accepted');
    const state = buildPreserveDiscoveryState({
      human: NEW_DISCOVERY,
      kip: 'Accept is confirmation after the Point is already in the manuscript.',
      direction: 'Keep what is earned: the story in progress',
      documentTitle: 'Becoming Together',
      held: items,
    });
    expect(state.hasDurableResidue).toBe(true);
    expect(state.existingDurableItemRepresentsWhatWasJustFound).toBe(false);
    expect(state.documentTitle).toBe('Becoming Together');
    expect(state.direction).toContain('Keep what is earned');
    expect(preserveDiscoveryShouldKeep({
      probabilities: probabilities(0.91, 0.02),
      alreadyRepresented: 0.08,
      existingDurableItemRepresentsWhatWasJustFound:
        state.existingDurableItemRepresentsWhatWasJustFound,
    })).toBe(true);
  });

  it('does not keep an exchange the Document already holds', () => {
    const items = [held(NEW_DISCOVERY, 'Agency keeps')];
    expect(manuscriptRepresentsExchange({
      human: NEW_DISCOVERY,
      kip: 'Yes — that is already in the Document.',
      held: items,
    })).toBe(true);
    const state = buildPreserveDiscoveryState({
      human: NEW_DISCOVERY,
      kip: 'Yes — that is already in the Document.',
      held: items,
    });
    expect(state.existingDurableItemRepresentsWhatWasJustFound).toBe(true);
    expect(preserveDiscoveryShouldKeep({
      probabilities: probabilities(0.96, 0),
      alreadyRepresented: 0.1,
      existingDurableItemRepresentsWhatWasJustFound: true,
    })).toBe(false);
    expect(preserveDiscoveryShouldKeep({
      probabilities: probabilities(0.96, 0),
      alreadyRepresented: 0.9,
      existingDurableItemRepresentsWhatWasJustFound: false,
    })).toBe(false);
  });

  it('creates nothing when the exchange earns nothing', () => {
    expect(preserveDiscoveryShouldKeep({
      probabilities: probabilities(0.06, 0.02, 0.9, 0.02),
      alreadyRepresented: 0.04,
      existingDurableItemRepresentsWhatWasJustFound: false,
    })).toBe(false);
  });

  it('stamps the kept Point as proposed by Jev and still accepts confirmation', () => {
    const point = preserveDiscoveryPoint({
      content: NEW_DISCOVERY,
      label: 'Agency keeps',
    });
    expect(point.status).toBe('proposed');
    expect(point.proposedBy).toBe(PRESERVE_DISCOVERY_AGENCY);
    expect(point.prelude).toBe('Agency keeps');

    const payload = preserveDiscoveryProposePayload({
      content: point.content,
      label: 'Agency keeps',
      manuscriptDraftId: '3861059e-09b0-453d-9bdd-16ad8c02bb12',
    });
    expect(payload.proposedBy).toBe('Jev');
    expect(payload.author).toBe('Jev');
    expect(payload.prelude).toBe('Agency keeps');

    const message = preserveDiscoveryKeptMessage('Becoming Together');
    expect(message).toMatch(/Jev recommended/);
    expect(message).not.toMatch(/accept to keep/i);

    const confirmed = confirmPreserveDiscoveryPoint(point);
    expect(confirmed?.status).toBe('accepted');
    expect(confirmed?.proposedBy).toBe('Jev');
    expect(confirmed?.content).toBe(NEW_DISCOVERY);
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
      human: 'That seems worth keeping.',
      kip: 'The difference is what this test turned up.',
      held: ['Railway hosts the API — the web app talks to existing routes.'],
    });
    const text = JSON.stringify(messages);
    expect(BANNED.test(text)).toBe(false);
    expect(text).not.toMatch(/draft\.|sole\.|Point|Orientation|schema/i);
    expect(text).toContain('survives');
    expect(text).toContain('You are Jev.');
    expect(text).toContain('Already held:');
  });
});
