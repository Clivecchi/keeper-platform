import { describe, expect, it } from 'vitest';
import {
  bindFramePerformanceCue,
  parseFramePerformance,
  turnPresentsFrame,
} from '@keeper/shared';

describe('frame performance contract', () => {
  const voices = [{ slug: 'ceox', line: 'You are asking for better editing.' }];

  it('keeps Document, Point, and beat titles distinct', () => {
    const parsed = parseFramePerformance({
      version: 1,
      title: 'One storyline. Not three.',
      context: { documentTitle: 'Finding the Plot', sectionTitle: 'Vision' },
      beats: [
        { title: 'The through-line', body: 'One telling.' },
        {
          title: 'A voice inside it',
          body: 'The line stays a line.',
          voice: { slug: 'ceox', attributedTo: 'Ceox', text: 'better editing' },
        },
      ],
    }, { selectedVoices: voices });
    expect(parsed?.context?.documentTitle).toBe('Finding the Plot');
    expect(parsed?.title).toBe('One storyline. Not three.');
    expect(parsed?.beats[0]?.title).toBe('The through-line');
    expect(turnPresentsFrame({ framePerformance: parsed })).toBe(true);
  });

  it('rejects markup and a fifth beat', () => {
    expect(parseFramePerformance({
      title: 'A point',
      beats: [{ title: 'Beat', body: '<div>no</div>' }],
    })).toBeNull();
    expect(parseFramePerformance({
      title: 'A point',
      beats: [1, 2, 3, 4, 5].map((n) => ({ title: `Beat ${n}`, body: 'Body' })),
    })).toBeNull();
  });

  it('does not offer Keep without a Point', () => {
    const parsed = parseFramePerformance({
      title: 'One storyline. Not three.',
      beats: [{ title: 'The telling', body: 'One plot.' }],
      cue: {
        prompt: 'Ready?',
        actions: [
          { kind: 'keep', label: 'Keep' },
          { kind: 'open_stage', label: 'Take to Stage' },
        ],
      },
    });
    expect(parsed).not.toBeNull();
    if (!parsed) return;
    const bound = bindFramePerformanceCue(parsed, { hasCastVoices: false });
    expect(bound.cue?.actions.map((action) => action.kind)).toEqual(['open_stage']);
  });
});
