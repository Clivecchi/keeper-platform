import { describe, expect, it } from 'vitest';
import { isGuidedArrivalPending } from './guidedArrival.js';

describe('isGuidedArrivalPending', () => {
  it('returns true when settings.arrivalCompleted is false', () => {
    expect(isGuidedArrivalPending({ arrivalCompleted: false }, null)).toBe(true);
  });

  it('returns true when frame_json arrival.completed is false', () => {
    expect(isGuidedArrivalPending({}, { arrival: { completed: false } })).toBe(true);
  });

  it('returns false when settings.arrivalCompleted is true', () => {
    expect(
      isGuidedArrivalPending({ arrivalCompleted: true }, { arrival: { completed: false } }),
    ).toBe(false);
  });

  it('returns false for legacy domains without flags', () => {
    expect(isGuidedArrivalPending({}, {})).toBe(false);
    expect(isGuidedArrivalPending(undefined, undefined)).toBe(false);
  });
});
