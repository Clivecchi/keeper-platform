import { describe, expect, it } from 'vitest';
import { buildDraftSummaryFromAcceptedPoints, createDraftPoint } from './draftPoints.js';
import {
  draftPointBeatLabel,
  parseDraftPointContent,
  resolveDraftPointStructure,
} from './draftPointStructure.js';

const PATH_ONE = `PATH 1: ESTABLISH — Claiming Your Realm The first path names who you are and what you are building toward. Moments: 1. The Declaration — A formal statement of intent. 2. North Star — The guiding principle.`;

const PATH_TWO = `PATH 2: BUILD — Living With Intention This is the ongoing work. Moments: 1. Weekly Signal — A short check-in. 2. The Drift Catch — Course correction.`;

describe('draft point structure', () => {
  it('parses journey_spec path header and moments', () => {
    const parsed = parseDraftPointContent(PATH_ONE);
    expect(parsed.isPathSpec).toBe(true);
    expect(parsed.pathName).toBe('ESTABLISH');
    expect(parsed.pathSubtitle).toBe('Claiming Your Realm');
    expect(parsed.moments).toHaveLength(2);
    expect(parsed.moments[0]?.title).toBe('The Declaration');
  });

  it('derives prelude from path subtitle when point.prelude is empty', () => {
    const point = createDraftPoint({
      content: PATH_ONE,
      proposedBy: 'kip',
      status: 'proposed',
    });
    const structure = resolveDraftPointStructure(point);
    expect(structure.prelude).toBe('Claiming Your Realm');
    expect(structure.moments).toHaveLength(2);
  });

  it('prefers stored prelude over parsed subtitle', () => {
    const point = createDraftPoint({
      content: PATH_ONE,
      proposedBy: 'kip',
      prelude: 'Custom beat',
    });
    expect(resolveDraftPointStructure(point).prelude).toBe('Custom beat');
  });

  it('builds a short summary arc instead of dumping content', () => {
    const spec = {
      points: [
        createDraftPoint({ id: 'a', content: PATH_ONE, proposedBy: 'kip', status: 'accepted' }),
        createDraftPoint({ id: 'b', content: PATH_TWO, proposedBy: 'kip', status: 'accepted' }),
      ],
    };
    const summary = buildDraftSummaryFromAcceptedPoints(spec);
    expect(summary).toBe('Claiming Your Realm → Living With Intention');
    expect(summary).not.toContain('Moments:');
  });

  it('uses beat label helper for display headlines', () => {
    const point = createDraftPoint({ content: PATH_TWO, proposedBy: 'kip' });
    expect(draftPointBeatLabel(point)).toBe('Living With Intention');
  });
});
