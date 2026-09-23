import { describe, expect, it } from 'vitest';
import { historyForEphemeralCast, recentDialogForCast } from '@keeper/shared';
import { resolveEphemeralSessionAccess } from '@keeper/shared';
import {
  buildCastConsultationsSynthesisPrompt,
  buildCastMemberDelegationPrompt,
  buildDirectorFallbackSynthesisPrompt,
  buildDirectorSynthesisPrompt,
} from './directorDialog.js';
import { ephemeralCastHistory, leadDialogContinuity } from './dialogContinuityHandoff.js';

const symptom = 'The Conversation Profile took a moment to change.';
const ask = 'Kip, you should have asked Cloud about that delay.';
const castDenial =
  'Prior conversational turns are unavailable unless captured as a Point, SOLE memory, or an Action Log entry.';

const loadedTurns = [
  { role: 'user', content: symptom },
  { role: 'agent', content: 'The toggle did lag for a moment.' },
];

function castMessages(turns: readonly { role: string; content: string }[], delegation: string) {
  return [
    ...turns,
    { role: 'user' as const, content: delegation },
  ];
}

function symptomPrecedesDelegation(
  messages: readonly { role: string; content: string }[],
  delegation: string,
) {
  const symptomIndex = messages.findIndex(
    (message) => message.role === 'user' && message.content === symptom,
  );
  const delegationIndex = messages.findIndex((message) => message.content === delegation);
  expect(symptomIndex).toBeGreaterThanOrEqual(0);
  expect(delegationIndex).toBeGreaterThan(symptomIndex);
  expect(delegation).not.toContain(symptom);
}

/**
 * A quoted Cast denial is not Lead adopting it.
 * A prohibition ("do not claim…") is not an instruction to deny the turn.
 */
function synthesisAdoptsUnavailableHistory(prompt: string, castReply: string): boolean {
  const withoutReply = prompt.split(castReply).join('');
  const withoutProhibition = withoutReply.replace(/do not claim[^\n]*/gi, '');
  return (
    /use ONLY these/i.test(withoutProhibition)
    || /earlier thread turns are unavailable/i.test(withoutProhibition)
    || /session starts cold/i.test(withoutProhibition)
    || /prior conversational turns are unavailable/i.test(withoutProhibition)
  );
}

describe('Dialog continuity across Cast handoff', () => {
  it('chip consult — Cloud receives the symptom as a prior Dialog turn', () => {
    const turns = recentDialogForCast({
      loadedTurns,
      currentHumanMessage: ask,
    });
    const delegation = [
      '[Director delegation — Cloud on the Build board]',
      'The user addressed Cloud (Cast member pinned on the Build board).',
      'Kip (Lead) relayed:',
      `"${ask}"`,
    ].join('\n');
    const messages = castMessages(turns, delegation);
    symptomPrecedesDelegation(messages, delegation);
    expect(turns[turns.length - 1]).toEqual({ role: 'user', content: ask });
    expect(historyForEphemeralCast(turns)).toEqual(turns);
  });

  it('pinned consult — Cloud receives the symptom as a prior Dialog turn', () => {
    const turns = recentDialogForCast({
      loadedTurns,
      currentHumanMessage: ask,
    });
    const delegation = buildCastMemberDelegationPrompt({
      userMessage: ask,
      castMemberLabel: 'Cloud',
      directorName: 'Kip',
    });
    symptomPrecedesDelegation(castMessages(turns, delegation), delegation);
  });

  it('delegate.consult — Cloud receives the Lead’s already-loaded turns', () => {
    const turns = leadDialogContinuity({
      loadedMessages: [
        { sender: 'user', content: symptom },
        { sender: 'agent', content: 'The toggle did lag for a moment.' },
      ],
      currentHumanMessage: ask,
    });
    const delegation = buildCastMemberDelegationPrompt({
      userMessage: 'What was that delay?',
      castMemberLabel: 'Cloud',
      directorName: 'Lead',
    });
    symptomPrecedesDelegation(castMessages(ephemeralCastHistory(turns), delegation), delegation);
    expect(turns.map((turn) => turn.content)).toContain(ask);
  });

  it('keeps Cast ephemeral — continuity is not a persisted Cast session', () => {
    expect(
      resolveEphemeralSessionAccess({ ephemeral: true, sessionId: 'dialog-session' }),
    ).toEqual({
      loadSessionId: 'dialog-session',
      persistSessionId: null,
    });
    expect(ephemeralCastHistory(undefined)).toEqual([]);
  });

  it('Lead synthesis keeps the symptom and does not adopt Cast’s denial', () => {
    const turns = leadDialogContinuity({
      loadedMessages: [{ sender: 'user', content: symptom }],
      currentHumanMessage: ask,
    });
    expect(turns.some((turn) => turn.role === 'user' && turn.content === symptom)).toBe(true);

    const multi = buildCastConsultationsSynthesisPrompt({
      userMessage: ask,
      directorName: 'Kip',
      consultations: [{ label: 'Cloud', reply: castDenial, status: 'ok' }],
    });
    const pinned = buildDirectorSynthesisPrompt({
      userMessage: ask,
      castMemberLabel: 'Cloud',
      castMemberReply: castDenial,
      directorName: 'Kip',
    });
    const empty = buildDirectorFallbackSynthesisPrompt({
      userMessage: ask,
      castMemberLabel: 'Cloud',
      directorName: 'Kip',
    });

    expect(synthesisAdoptsUnavailableHistory(multi, castDenial)).toBe(false);
    expect(synthesisAdoptsUnavailableHistory(pinned, castDenial)).toBe(false);
    expect(synthesisAdoptsUnavailableHistory(empty, castDenial)).toBe(false);
    expect(multi).not.toMatch(/use ONLY these/i);
  });
});
