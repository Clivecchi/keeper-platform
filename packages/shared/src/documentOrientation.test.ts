import { describe, expect, it } from 'vitest';
import {
  deriveOrientationLandmarks,
  formatOrientationForAgent,
} from './documentOrientation.js';

describe('deriveOrientationLandmarks', () => {
  const sections = [
    { id: 'cast', title: 'Cast & Orchestration' },
    { id: 'plot', title: 'The Plot' },
  ];
  const points = [
    { number: 1, title: 'The plot' },
    { number: 4, title: 'Lead decides' },
  ];

  it('matches Section titles and Point numbers named in the map', () => {
    const landmarks = deriveOrientationLandmarks({
      body: 'Start in The Plot, then Point 4 in Cast & Orchestration.',
      sections,
      points,
    });
    expect(landmarks.map((row) => row.label)).toEqual([
      'Cast & Orchestration',
      'The Plot',
      'Point 4 — Lead decides',
    ]);
  });

  it('ignores Point numbers that are not on the Document', () => {
    const landmarks = deriveOrientationLandmarks({
      body: 'See Point 9.',
      sections,
      points,
    });
    expect(landmarks).toEqual([]);
  });
});

describe('formatOrientationForAgent', () => {
  it('tells the Cast the slot is empty without inventing a map', () => {
    const lines = formatOrientationForAgent({ orientation: null });
    expect(lines.join('\n')).toContain('not written yet');
    expect(lines.join('\n')).toContain('not a turn summary');
  });

  it('includes the stored map and resolved landmarks', () => {
    const lines = formatOrientationForAgent({
      orientation: { body: 'Read Point 1 in The Plot.', updatedBy: 'Kip' },
      sections: [{ id: 'plot', title: 'The Plot' }],
      points: [{ number: 1, title: 'The plot' }],
    });
    const text = lines.join('\n');
    expect(text).toContain('Read Point 1 in The Plot.');
    expect(text).toContain('Point 1 — The plot');
    expect(text).toContain('The Plot');
    expect(text).toContain('last set by Kip');
    expect(text).toContain('not a turn summary');
  });
});
