import { describe, expect, it } from 'vitest';
import { createDraftPoint } from './draftPoints.js';
import {
  applyReorganizeToPoints,
  composeProposedDocument,
  isDocumentReorganizeSpineOnly,
  normalizeDocumentReorganizeProposal,
  parseDocumentReorganizeProposal,
  resolveDraftPointRef,
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

describe('resolveDraftPointRef', () => {
  it('resolves UUID, 1-based number, and title', () => {
    expect(resolveDraftPointRef('p1', currentPoints)).toBe('p1');
    expect(resolveDraftPointRef('2', currentPoints)).toBe('p2');
    expect(resolveDraftPointRef('The plot', currentPoints)).toBe('p1');
  });
});

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

  it('resolves 1-based Point numbers to real ids', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        sections: [{ id: 'plot', title: 'The Plot' }],
        points: [
          {
            id: '1',
            change: 'move',
            sectionId: 'The Plot',
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
    expect(result.proposal.points.find((p) => p.id === 'p1')?.change).toBe('move');
    expect(result.proposal.points.find((p) => p.id === 'p1')?.sectionId).toBe('plot');
  });

  it('prefers a title match over a Point number', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        points: [
          {
            id: '1',
            change: 'refine',
            prelude: 'UI notes',
            content: 'UI notes, tightened.',
          },
        ],
      },
      currentPoints,
      currentSections: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.points.find((p) => p.id === 'p2')?.change).toBe('refine');
    expect(result.proposal.points.find((p) => p.id === 'p1')?.change).toBe('unchanged');
  });

  it('accepts a Sections-only proposal and keeps every current Point', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        rationale: 'Give the plot a spine.',
        sections: [
          { title: 'Introduction to the Plot' },
          { title: 'Keeper Stage' },
        ],
      },
      currentPoints,
      currentSections: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.sections.map((section) => section.title)).toEqual([
      'Introduction to the Plot',
      'Keeper Stage',
    ]);
    expect(result.proposal.points).toHaveLength(2);
    expect(result.proposal.points.every((point) => point.change === 'unchanged')).toBe(true);
    expect(isDocumentReorganizeSpineOnly(result.proposal)).toBe(true);
  });

  it('accepts a title and Forward without treating them as Points or spine-only', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        title: 'The Founding Realm',
        forward: {
          title: 'A family seed',
          description: 'Planted for generations.',
        },
      },
      currentPoints,
      currentSections: [{ id: 'plot', title: 'The Plot' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.title).toBe('The Founding Realm');
    expect(result.proposal.forward?.title).toBe('A family seed');
    expect(result.proposal.forward?.description).toBe('Planted for generations.');
    expect(result.proposal.leadNamedSections).toBe(false);
    expect(result.proposal.points.every((point) => point.change === 'unchanged')).toBe(true);
    expect(isDocumentReorganizeSpineOnly(result.proposal)).toBe(false);

    const stored = parseDocumentReorganizeProposal(result.proposal);
    expect(stored?.leadNamedSections).toBe(false);
    expect(isDocumentReorganizeSpineOnly(stored!)).toBe(false);
  });

  it('lifts Points nested under Sections by title', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        sections: [
          {
            title: 'The Plot',
            points: ['The plot', { title: 'UI notes' }],
          },
        ],
      },
      currentPoints,
      currentSections: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.points.find((p) => p.id === 'p1')?.change).toBe('move');
    expect(result.proposal.points.find((p) => p.id === 'p2')?.change).toBe('move');
    expect(result.proposal.points.find((p) => p.id === 'p1')?.sectionId).toBe('the-plot');
  });

  it('keeps a move that names a Point number and Section without repeating the body', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        sections: [{ title: 'The Plot' }],
        points: [{ id: '1', sectionId: 'The Plot' }],
      },
      currentPoints,
      currentSections: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.points.find((p) => p.id === 'p1')?.change).toBe('move');
    expect(result.proposal.points.find((p) => p.id === 'p1')?.content).toBe(
      'First finding about the plot.',
    );
  });

  it('treats unknown ids as New instead of failing the proposal', () => {
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        points: [{ id: 'ghost', change: 'refine', content: 'A new beat.', prelude: 'Ghost' }],
      },
      currentPoints,
      currentSections: [],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const created = result.proposal.points.find((p) => p.change === 'new');
    expect(created?.prelude).toBe('Ghost');
    expect(result.proposal.points.some((p) => p.id === 'p1')).toBe(true);
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

  it('carries proposed Document title and Forward into the composed Document', () => {
    const parsed = parseDocumentReorganizeProposal({
      title: 'The Founding Realm',
      forward: {
        title: 'A family seed, planted for generations',
        description: 'For those whose faces we may never see.',
      },
    });
    expect(parsed).not.toBeNull();
    const composed = composeProposedDocument({
      currentPoints,
      currentSections: [],
      proposal: parsed!,
    });
    expect(composed.title).toBe('The Founding Realm');
    expect(composed.forward?.title).toBe('A family seed, planted for generations');
    expect(composed.forward?.description).toBe('For those whose faces we may never see.');
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
