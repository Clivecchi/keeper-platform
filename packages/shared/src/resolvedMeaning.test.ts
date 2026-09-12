import { describe, expect, it } from 'vitest';
import {
  parseResolvedMeaning,
  parseStageExpression,
  parseStageExpressionFromModelText,
  withPerformedByFallback,
} from './resolvedMeaning.js';

describe('parseResolvedMeaning', () => {
  it('requires meaning and keeps refs as references', () => {
    const parsed = parseResolvedMeaning({
      meaning: 'Finding the Plot is the Dialog, not a fiction outline.',
      because: 'Cast held the conversation as the story.',
      about: [
        { kind: 'dialog', id: 'dlg-1', title: 'Finding the Plot' },
        { kind: 'presence', id: 'p1' },
        { kind: 'unknown', id: 'x' },
      ],
      performedBy: ['Cloud', 'rendr', 'cloud'],
    });
    expect(parsed).toEqual({
      meaning: 'Finding the Plot is the Dialog, not a fiction outline.',
      because: 'Cast held the conversation as the story.',
      about: [
        { kind: 'dialog', id: 'dlg-1', title: 'Finding the Plot' },
        { kind: 'presence', id: 'p1' },
      ],
      performedBy: ['cloud', 'rendr'],
    });
  });

  it('rejects a missing meaning and does not accept claim as a substitute', () => {
    expect(parseResolvedMeaning({ claim: 'A lock.', performedBy: ['kip'] })).toBeNull();
    expect(parseResolvedMeaning({ meaning: '   ' })).toBeNull();
  });

  it('allows empty about and performedBy', () => {
    const parsed = parseResolvedMeaning({ meaning: 'A tension remains.' });
    expect(parsed).toEqual({ meaning: 'A tension remains.', about: [], performedBy: [] });
  });
});

describe('withPerformedByFallback', () => {
  it('stamps delivered slugs only when Lead omitted them', () => {
    const bare = parseResolvedMeaning({ meaning: 'An insight.' });
    expect(bare).not.toBeNull();
    expect(withPerformedByFallback(bare!, ['Cloud', 'rendr']).performedBy).toEqual([
      'cloud',
      'rendr',
    ]);
    const owned = parseResolvedMeaning({ meaning: 'An insight.', performedBy: ['ceox'] });
    expect(withPerformedByFallback(owned!, ['cloud']).performedBy).toEqual(['ceox']);
  });
});

describe('parseStageExpression', () => {
  it('accepts one beat and ignores extras', () => {
    const parsed = parseStageExpression({
      type: 'stage_expression',
      beats: [
        { title: 'The Dialog is the plot', body: 'Not a fiction outline.' },
        { title: 'Second', body: 'Must not land.' },
      ],
      rationale: 'Hold it as one beat.',
    });
    expect(parsed).toEqual({
      type: 'stage_expression',
      beat: { title: 'The Dialog is the plot', body: 'Not a fiction outline.' },
      rationale: 'Hold it as one beat.',
    });
  });

  it('prefers beat over beats', () => {
    const parsed = parseStageExpression({
      type: 'stage_expression',
      beat: { title: 'Chosen', body: 'One Frame.' },
      beats: [{ title: 'Other', body: 'No.' }],
    });
    expect(parsed?.beat.title).toBe('Chosen');
  });

  it('parses fenced model text', () => {
    const parsed = parseStageExpressionFromModelText(
      '```json\n{"type":"stage_expression","beat":{"title":"Now","body":"The room turned."}}\n```',
    );
    expect(parsed?.beat).toEqual({ title: 'Now', body: 'The room turned.' });
  });
});
