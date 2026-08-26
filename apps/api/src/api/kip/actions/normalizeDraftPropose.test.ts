import { describe, expect, it } from 'vitest';
import {
  coerceProposePointAuthor,
  coerceProposePointContent,
  coercePointRewriteRef,
  expandDraftPointRewriteActions,
  assignMissingRewritePointIndexes,
  normalizeDraftPointIdPayload,
  normalizeDraftPointRewritePayload,
  normalizeDraftUpdateProposePayload,
} from './normalizeDraftPropose.js';

describe('coerceProposePointContent', () => {
  it('keeps a plain content string', () => {
    expect(coerceProposePointContent({ content: '  Hello  ' })).toBe('Hello');
  });

  it('reads nested content.text (author-bundled shape)', () => {
    expect(
      coerceProposePointContent({
        content: { text: 'Attached prose', author: 'Claude' },
      }),
    ).toBe('Attached prose');
  });

  it('reads body / narrative / text synonyms', () => {
    expect(coerceProposePointContent({ body: 'From body' })).toBe('From body');
    expect(coerceProposePointContent({ narrative: 'From narrative' })).toBe('From narrative');
    expect(coerceProposePointContent({ text: 'From text' })).toBe('From text');
  });

  it('reads first points[] entry', () => {
    expect(
      coerceProposePointContent({
        points: [{ content: 'Point one', author: 'Claude' }],
      }),
    ).toBe('Point one');
  });
});

describe('coerceProposePointAuthor', () => {
  it('reads author / proposedBy', () => {
    expect(coerceProposePointAuthor({ author: 'Claude' })).toBe('Claude');
    expect(coerceProposePointAuthor({ proposedBy: 'Cursor' })).toBe('Cursor');
  });

  it('reads author nested under content object', () => {
    expect(
      coerceProposePointAuthor({
        content: { text: 'Hi', author: 'Claude' },
      }),
    ).toBe('Claude');
  });
});

describe('normalizeDraftUpdateProposePayload', () => {
  it('maps draftId, nested content, and author', () => {
    const out = normalizeDraftUpdateProposePayload({
      draftId: '3f638fba-d84d-453f-9add-e6e288e0db03',
      content: { text: 'Becoming note', author: 'Claude' },
    });
    expect(out.id).toBe('3f638fba-d84d-453f-9add-e6e288e0db03');
    expect(out.content).toBe('Becoming note');
    expect(out.author).toBe('Claude');
    expect(out.proposedBy).toBe('Claude');
  });

  it('maps title onto prelude', () => {
    const out = normalizeDraftUpdateProposePayload({
      content: 'The write landed in Open.',
      title: 'Points Dump Into Open',
    });
    expect(out.prelude).toBe('Points Dump Into Open');
    expect(out.content).toBe('The write landed in Open.');
  });
});

describe('normalizeDraftPointIdPayload', () => {
  it('aliases draftId and point_id', () => {
    const out = normalizeDraftPointIdPayload({
      draftId: 'draft-1',
      point_id: 'point-1',
    });
    expect(out.id).toBe('draft-1');
    expect(out.pointId).toBe('point-1');
  });

  it('accepts a Point number and title alias', () => {
    const out = normalizeDraftPointIdPayload({
      point: 3,
      title: 'Agent Narrates, Doesn\'t Act',
    });
    expect(out.pointId).toBe('3');
    expect(out.prelude).toBe('Agent Narrates, Doesn\'t Act');
  });

  it('stringifies numeric pointId', () => {
    const out = normalizeDraftPointIdPayload({ pointId: 2 });
    expect(out.pointId).toBe('2');
  });
});

describe('normalizeDraftPointRewritePayload', () => {
  it('treats payload.id "1" as the Point, not the Draft', () => {
    const out = normalizeDraftPointRewritePayload(
      { id: '1', title: 'Platform Issues' },
      'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    );
    expect(out.pointId).toBe('1');
    expect(out.id).toBeUndefined();
    expect(out.prelude).toBe('Platform Issues');
  });

  it('reads numeric pointId and nested points[]', () => {
    expect(coercePointRewriteRef({ pointId: 4 })).toBe('4');
    expect(
      coercePointRewriteRef({
        points: [{ id: '2', title: 'Trust & Execution' }],
      }),
    ).toBe('2');
  });
});

describe('expandDraftPointRewriteActions', () => {
  it('splits payload.points into one rewrite per Point', () => {
    const expanded = expandDraftPointRewriteActions({
      type: 'draft.point.rewrite',
      payload: {
        points: [
          { pointId: 1, title: 'First' },
          { pointId: 2, title: 'Second' },
        ],
      },
    });
    expect(expanded).toHaveLength(2);
    expect((expanded[0].payload as { pointId: number }).pointId).toBe(1);
    expect((expanded[1].payload as { title: string }).title).toBe('Second');
  });
});

describe('assignMissingRewritePointIndexes', () => {
  it('zips a batch of untitled rewrites to 1–N', () => {
    const numbered = assignMissingRewritePointIndexes([
      { type: 'draft.point.rewrite', payload: { title: 'A' } },
      { type: 'draft.point.rewrite', payload: { title: 'B' } },
    ]);
    expect((numbered[0].payload as { pointId: string }).pointId).toBe('1');
    expect((numbered[1].payload as { pointId: string }).pointId).toBe('2');
  });

  it('does not guess when some rewrites already have identity', () => {
    const numbered = assignMissingRewritePointIndexes([
      { type: 'draft.point.rewrite', payload: { pointId: '7', title: 'A' } },
      { type: 'draft.point.rewrite', payload: { title: 'B' } },
    ]);
    expect((numbered[1].payload as { pointId?: string }).pointId).toBeUndefined();
  });
});
