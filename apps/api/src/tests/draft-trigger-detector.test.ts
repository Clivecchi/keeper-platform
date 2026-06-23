import { describe, expect, it } from 'vitest';
import { detectDraftTrigger } from '../governance/draftTriggerDetector.js';

describe('detectDraftTrigger', () => {
  it('does not trigger drafts for read-only or no-change instructions', () => {
    const inputs = [
      'Cloud should have access to the code base. Coordinate with Cloud to learn, but do not attempt to make any changes.',
      'Read-only: inspect the repo and report back.',
      "Plan the approach, but don't make changes.",
      'Give me an outline without making changes.',
    ];

    for (const input of inputs) {
      expect(detectDraftTrigger(input)).toEqual({ triggered: false, bypassed: true });
    }
  });

  it('still triggers drafts for planning requests without a read-only escape hatch', () => {
    expect(detectDraftTrigger('Plan the implementation approach')).toEqual({
      triggered: true,
      bypassed: false,
    });
  });
});
