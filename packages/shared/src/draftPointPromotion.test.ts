import { describe, expect, it } from 'vitest';
import { createDraftPoint } from './draftPoints.js';
import {
  buildDraftPointPromotionPlan,
  MAX_PATH_PRELUDE_LENGTH,
} from './draftPointPromotion.js';

const PATH_ONE = `PATH 1: ESTABLISH — Claiming Your Realm The first path names who you are. Moments: 1. The Declaration — A formal statement. 2. North Star — The guiding principle.`;

describe('buildDraftPointPromotionPlan', () => {
  it('requires journeyId', () => {
    const point = createDraftPoint({
      content: PATH_ONE,
      proposedBy: 'kip',
      status: 'accepted',
    });
    const result = buildDraftPointPromotionPlan({
      point,
      draftKind: 'journey_spec',
      journeyId: '',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('MISSING_JOURNEY_ID');
  });

  it('rejects non journey_spec drafts', () => {
    const point = createDraftPoint({
      content: PATH_ONE,
      proposedBy: 'kip',
      status: 'accepted',
    });
    const result = buildDraftPointPromotionPlan({
      point,
      draftKind: 'vehicle_template',
      journeyId: 'journey-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('INVALID_DRAFT_KIND');
  });

  it('rejects proposed points', () => {
    const point = createDraftPoint({
      content: PATH_ONE,
      proposedBy: 'kip',
      status: 'proposed',
    });
    const result = buildDraftPointPromotionPlan({
      point,
      draftKind: 'journey_spec',
      journeyId: 'journey-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('POINT_NOT_ACCEPTED');
  });

  it('maps accepted journey_spec point to path and moments', () => {
    const point = createDraftPoint({
      content: PATH_ONE,
      proposedBy: 'kip',
      status: 'accepted',
      prelude: 'Custom prelude',
    });
    const result = buildDraftPointPromotionPlan({
      point,
      draftKind: 'journey_spec',
      journeyId: 'journey-abc',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.journeyId).toBe('journey-abc');
    expect(result.path.name).toBe('ESTABLISH');
    expect(result.path.prelude).toBe('Custom prelude');
    expect(result.moments).toHaveLength(2);
    expect(result.moments[0]?.title).toBe('The Declaration');
    expect(result.moments[0]?.narrative).toBe('A formal statement.');
  });

  it('truncates prelude at max length', () => {
    const point = createDraftPoint({
      content: PATH_ONE,
      proposedBy: 'kip',
      status: 'accepted',
      prelude: 'x'.repeat(MAX_PATH_PRELUDE_LENGTH + 50),
    });
    const result = buildDraftPointPromotionPlan({
      point,
      draftKind: 'journey_spec',
      journeyId: 'journey-abc',
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.path.prelude).toHaveLength(MAX_PATH_PRELUDE_LENGTH);
  });
});
