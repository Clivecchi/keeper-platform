import { describe, expect, it } from 'vitest';
import {
  createDraftPoint,
  isDraftPointRewritable,
  mergeDraftSpecPatch,
  rewriteDraftPointInSpec,
  summarizeDraftPointsForAgent,
} from './draftPoints.js';

describe('draft point rewrite', () => {
  const proposed = createDraftPoint({
    id: 'point-proposed',
    content: 'Original proposed text',
    proposedBy: 'kip',
    status: 'proposed',
  });
  const accepted = createDraftPoint({
    id: 'point-accepted',
    content: 'Kept anchor text',
    proposedBy: 'kip',
    status: 'accepted',
  });
  const spec = { points: [proposed, accepted] };

  it('marks accepted points as not rewritable', () => {
    expect(isDraftPointRewritable('proposed')).toBe(true);
    expect(isDraftPointRewritable('pending')).toBe(true);
    expect(isDraftPointRewritable('accepted')).toBe(false);
  });

  it('rewrites proposed point content in place', () => {
    const result = rewriteDraftPointInSpec(spec, 'point-proposed', 'Rewritten body');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.point.content).toBe('Rewritten body');
    expect(result.point.status).toBe('proposed');
  });

  it('blocks rewrite of accepted anchor points', () => {
    const result = rewriteDraftPointInSpec(spec, 'point-accepted', 'Try to overwrite');
    expect(result).toEqual({ ok: false, code: 'POINT_ANCHORED' });
  });

  it('preserves accepted anchors when draft.update merges points by id', () => {
    const patch = {
      points: [
        {
          ...accepted,
          content: 'Agent tried to overwrite anchor',
        },
        createDraftPoint({
          id: 'point-new',
          content: 'New proposed point',
          proposedBy: 'kip',
          status: 'proposed',
        }),
      ],
    };

    const merged = mergeDraftSpecPatch(spec, patch);
    const anchor = merged.points?.find((p) => p.id === 'point-accepted');
    expect(anchor?.content).toBe('Kept anchor text');
    expect(merged.points?.some((p) => p.id === 'point-new')).toBe(true);
  });

  it('summarizes points for agent environment', () => {
    const summary = summarizeDraftPointsForAgent(spec);
    expect(summary).toHaveLength(2);
    expect(summary[0]?.rewritable).toBe(true);
    expect(summary[1]?.rewritable).toBe(false);
  });
});
