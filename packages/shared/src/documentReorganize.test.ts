import { describe, expect, it } from 'vitest';
import { createDraftPoint } from './draftPoints.js';
import {
  applyReorganizeToPoints,
  composeProposedDocument,
  normalizeDocumentReorganizeProposal,
  parseDocumentReorganizeProposal,
} from './documentReorganize.js';

const currentPoints = [
  createDraftPoint({
    id: 'p1',
    content: 'First finding about the plot.',
    proposedBy: 'Chuck',
    status: 'accepted',
    prelude: 'The plot',
    pathGroupId: 'open',
  }),
  createDraftPoint({
    id: 'p2',
    content: 'UI notes that wandered in.',
    proposedBy: 'Chuck',
    status: 'accepted',
    prelude: 'UI notes',
    pathGroupId: 'open',
  }),
];

describe('normalizeDocumentReorganizeProposal', () => {
  it('fills unlisted Points as unchanged so Proposed is a full Document', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        rationale: 'Give the plot a Section.',
        sections: [{ id: 'plot', title: 'The Plot' }],
        points: [
          {
            id: 'p1',
            change: 'move',
            sectionId: 'plot',
            content: 'First finding about the plot.',
            prelude: 'The plot',
          },
        ],
      },
      currentPoints,
      currentSections: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.points).toHaveLength(2);
    expect(result.proposal.points.find((p) => p.id === 'p2')?.change).toBe('unchanged');
    expect(result.proposal.points.find((p) => p.id === 'p1')?.change).toBe('move');
  });

  it('rejects unknown Point ids', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        points: [{ id: 'ghost', change: 'refine', content: 'nope', prelude: 'Ghost' }],
      },
      currentPoints,
      currentSections: [],
    });
    expect(result.ok).toBe(false);
  });
});

describe('composeProposedDocument', () => {
  it('renders a moved Point in the proposed Section with a Moved mark', () => {
    const parsed = parseDocumentReorganizeProposal({
      sections: [{ id: 'plot', title: 'The Plot' }],
      points: [
        {
          id: 'p1',
          change: 'move',
          sectionId: 'plot',
          fromSectionId: 'open',
          content: 'First finding about the plot.',
          prelude: 'The plot',
        },
        {
          id: 'p2',
          change: 'unchanged',
          content: 'UI notes that wandered in.',
          prelude: 'UI notes',
        },
      ],
    });
    expect(parsed).not.toBeNull();
    const composed = composeProposedDocument({
      currentPoints,
      currentSections: [],
      proposal: parsed!,
    });
    expect(composed.marks.p1?.kind).toBe('move');
    expect(composed.marks.p1?.fromSectionTitle).toBe('Open');
    expect(composed.points[0]?.pathGroupId).toBe('plot');
    expect(composed.marks.p2).toBeUndefined();
  });
});

describe('applyReorganizeToPoints', () => {
  it('moves, keeps unchanged, and drops retired Points', () => {
    const parsed = parseDocumentReorganizeProposal({
      sections: [{ id: 'plot', title: 'The Plot' }],
      points: [
        {
          id: 'p1',
          change: 'move',
          sectionId: 'plot',
          content: 'First finding about the plot.',
          prelude: 'The plot',
        },
        {
          id: 'p2',
          change: 'retire',
          content: 'UI notes that wandered in.',
          prelude: 'UI notes',
        },
      ],
    });
    const next = applyReorganizeToPoints({
      currentPoints,
      proposal: parsed!,
    });
    expect(next.map((point) => point.id)).toEqual(['p1']);
    expect(next[0]?.pathGroupId).toBe('plot');
  });
});
