import { describe, expect, it } from 'vitest';
import { detectReorganizeDetection, detectReorganizeIntent } from './documentReorganizeIntent.js';
import {
  DOCUMENT_TURN_POSTURE_CORPUS,
  isFabricatedSystemOneUnavailableCard,
  parseDocumentTurnPostureAnswers,
  parseSystemOneOrientationView,
  shouldShadowDocumentTurnPosture,
  stripFabricatedSystemOneUnavailableLine,
} from './documentTurnPosture.js';

describe('document turn posture phrase signal', () => {
  it('keeps known false positives as mention, not established direction', () => {
    for (const row of DOCUMENT_TURN_POSTURE_CORPUS) {
      const detection = detectReorganizeDetection(row.text);
      expect(detection.mention, row.id).toBe(row.expectedMention);
      expect(detection.establishedDirection, row.id).toBe(row.expectedEstablishedDirection);
      expect(detectReorganizeIntent(row.text), row.id).toBe(
        row.expectedEstablishedDirection ? 'required' : row.expectedMention ? 'mentioned' : 'none',
      );
    }
  });

  it('does not treat "not the same thing" as Review & Reorganize direction', () => {
    const detection = detectReorganizeDetection(
      'Model and Provider are not the same thing.',
    );
    expect(detection.establishedDirection).toBe(false);
    expect(detection.blockedReason).toBe('not the same thing');
  });

  it('does not skip to required on a diagnostic question', () => {
    expect(
      detectReorganizeIntent(
        'What user instruction did you interpret as requesting Review & Reorganize?',
      ),
    ).toBe('mentioned');
  });

  it('still establishes a genuine reorganize ask', () => {
    expect(detectReorganizeIntent('Reorganize Finding the Plot.')).toBe('required');
    expect(
      detectReorganizeIntent('Review this Document and propose a better organization.'),
    ).toBe('required');
  });

  it('treats apply as mention, not a propose direction', () => {
    const detection = detectReorganizeDetection('Yes, apply that reorganization.');
    expect(detection.mention).toBe(true);
    expect(detection.establishedDirection).toBe(false);
    expect(detection.blockedReason).toBe('apply existing proposal');
  });

  it('shadows mention and established turns', () => {
    expect(shouldShadowDocumentTurnPosture(detectReorganizeDetection('Nothing changed.'))).toBe(true);
    expect(shouldShadowDocumentTurnPosture(detectReorganizeDetection('hello'))).toBe(false);
  });

  it('preserves TypeSafe Choice/Noul probabilities', () => {
    const parsed = parseDocumentTurnPostureAnswers({
      turnPosture: { type: 'choice', choice: 'diagnose', confidence: 0.91 },
      documentReorganizationRequested: { type: 'noul', noul: 0.04 },
      documentMutationRequested: { type: 'noul', noul: 0.02 },
    });
    expect(parsed.turnPosture).toEqual({ choice: 'diagnose', confidence: 0.91 });
    expect(parsed.documentReorganizationRequested.noul).toBe(0.04);
    expect(parsed.documentMutationRequested.noul).toBe(0.02);
  });

  it('prefers the Human Turn System One record over a top-level shadow', () => {
    const view = parseSystemOneOrientationView({
      turnPostureShadow: {
        ok: true,
        model: 'stale',
        answers: {
          turnPosture: { type: 'choice', choice: 'diagnose', confidence: 0.1 },
          documentReorganizationRequested: { type: 'noul', noul: 0.99 },
          documentMutationRequested: { type: 'noul', noul: 0.99 },
        },
      },
      humanTurn: {
        version: 'human-turn-v0',
        id: '11111111-1111-4111-8111-111111111111',
        systemOne: {
          evaluatedOnce: true,
          shadow: {
            ok: true,
            model: 'jev-1.13.0',
            answers: {
              turnPosture: {
                type: 'choice',
                choice: 'explore',
                confidence: 0.89,
                probabilities: { explore: 0.89 },
              },
              documentReorganizationRequested: { type: 'noul', noul: 0.07 },
              documentMutationRequested: { type: 'noul', noul: 0.09 },
            },
          },
          delivery: { suppliedToLead: true, suppliedToCast: false },
        },
      },
    });
    expect(view?.available).toBe(true);
    expect(view?.model).toBe('jev-1.13.0');
    expect(view?.turnPosture.choice).toBe('explore');
    expect(view?.turnPosture.confidence).toBe(0.89);
    expect(view?.documentReorganizationRequested.noul).toBe(0.07);
    expect(view?.documentMutationRequested.noul).toBe(0.09);
  });

  it('reads Jev values from persisted Lead orchestration, not Lead prose', () => {
    const view = parseSystemOneOrientationView({
      turnPostureShadow: {
        ok: true,
        model: 'jev-1.13.0',
        answers: {
          turnPosture: {
            type: 'choice',
            choice: 'diagnose',
            confidence: 0.63,
            probabilities: { diagnose: 0.7, explore: 0.12 },
          },
          documentReorganizationRequested: { type: 'noul', noul: 0.06 },
          documentMutationRequested: { type: 'noul', noul: 0.09 },
        },
      },
      systemOneOrientation: { suppliedToLead: false, suppliedToCast: false },
    });
    expect(view?.available).toBe(true);
    expect(view?.model).toBe('jev-1.13.0');
    expect(view?.turnPosture.choice).toBe('diagnose');
    expect(view?.turnPosture.probabilities?.diagnose).toBe(0.7);
    expect(view?.documentReorganizationRequested.noul).toBe(0.06);
    expect(isFabricatedSystemOneUnavailableCard({
      title: 'System One Orientation',
      body: 'No System One result was available to me for this Turn.',
    })).toBe(true);
    expect(
      stripFabricatedSystemOneUnavailableLine(
        'Cast spoke.\n\nNo System One result was available to me for this Turn.',
      ),
    ).toBe('Cast spoke.');
  });
});
