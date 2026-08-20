import { describe, expect, it } from 'vitest';
import {
  coerceWorkingDraftKind,
  mergeDraftCreateSpec,
} from './normalizeDraftCreate.js';

describe('coerceWorkingDraftKind', () => {
  it('remaps document_manuscript to a working draft', () => {
    expect(coerceWorkingDraftKind('document_manuscript')).toEqual({
      kind: 'draft',
      remappedFromManuscript: true,
    });
  });

  it('keeps an ordinary kind', () => {
    expect(coerceWorkingDraftKind('journey_spec')).toEqual({
      kind: 'journey_spec',
      remappedFromManuscript: false,
    });
  });
});

describe('mergeDraftCreateSpec', () => {
  it('keeps spec.points when they already exist', () => {
    const spec = mergeDraftCreateSpec({
      spec: {
        points: [{ id: '11111111-1111-4111-8111-111111111111', content: 'Existing', status: 'proposed' }],
      },
      content: 'Ignored because points exist',
      title: 'Touchdown',
      proposedBy: 'rendr',
    });
    expect(spec.points).toHaveLength(1);
    expect(spec.points[0]?.content).toBe('Existing');
  });

  it('turns markdown content into proposed Points', () => {
    const spec = mergeDraftCreateSpec({
      spec: {},
      content: '# Touchdown\n\n## Clean Surface Manifest\n\nComposer floats — it does not land.',
      title: 'Touchdown',
      proposedBy: 'rendr',
    });
    expect(spec.points.length).toBeGreaterThan(0);
    expect(spec.points.every((point) => point.status === 'proposed')).toBe(true);
    expect(spec.points.some((point) => /Clean Surface Manifest/i.test(point.prelude ?? '') || /Clean Surface Manifest/i.test(point.content))).toBe(true);
  });
});
