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

  it('keeps plain planning conversational unless the user asks for a durable draft', () => {
    expect(detectDraftTrigger('Plan the implementation approach')).toEqual({
      triggered: false,
      bypassed: false,
    });

    expect(detectDraftTrigger('Create a draft of the implementation approach')).toEqual({
      triggered: true,
      bypassed: false,
    });
  });
});
