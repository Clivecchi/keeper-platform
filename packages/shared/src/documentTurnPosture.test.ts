import { describe, expect, it } from 'vitest';
import { detectReorganizeDetection, detectReorganizeIntent } from './documentReorganizeIntent.js';
import {
  DOCUMENT_TURN_POSTURE_CORPUS,
  parseDocumentTurnPostureAnswers,
  shouldShadowDocumentTurnPosture,
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
});
