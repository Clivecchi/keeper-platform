import { describe, expect, it } from 'vitest';
import { resolveSectionChangeCues, resolveSectionIntro } from './document.js';

describe('resolveSectionIntro', () => {
  it('prefers an authored prelude', () => {
    expect(
      resolveSectionIntro({
        prelude: 'Why this conversation exists.',
        pointTitles: ['Establish the main theme'],
      }),
    ).toBe('Why this conversation exists.');
  });

  it('derives a short spine from Point titles when there is no prelude', () => {
    expect(
      resolveSectionIntro({
        pointTitles: [
          'Establish the main theme and purpose of the conversation',
          'A second beat',
        ],
      }),
    ).toBe('Establish the main theme and purpose of the conversation · A second beat');
  });
});

describe('resolveSectionChangeCues', () => {
  it('counts Proposed marks without listing unchanged', () => {
    expect(resolveSectionChangeCues(['move', 'move', 'refine', 'unchanged'])).toEqual([
      { kind: 'refine', count: 1 },
      { kind: 'move', count: 2 },
    ]);
  });
});
