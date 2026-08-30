import { describe, expect, it } from 'vitest';
import { createDraftPoint } from './draftPoints.js';
import {
  applyReorganizeToPoints,
  composeProposedDocument,
  formatReorganizeOverlaySummary,
  isDocumentReorganizeOpenDump,
  isDocumentReorganizeRestatement,
  isDocumentReorganizeSpineOnly,
  normalizeDocumentReorganizeProposal,
  summarizeReorganizeProposal,
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

  it('keeps current Section when sectionId is omitted', () => {
    const namedPoints = [
      createDraftPoint({
        id: 'p1',
        content: 'First finding about the plot.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'The plot',
        pathGroupId: 'plot',
      }),
      createDraftPoint({
        id: 'p2',
        content: 'UI notes that wandered in.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'UI notes',
        pathGroupId: 'stage',
      }),
    ];
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        sections: [
          { id: 'plot', title: 'The Plot' },
          { id: 'stage', title: 'Keeper Stage' },
        ],
        points: [
          { id: '1', change: 'refine', content: 'First finding, tightened.' },
          { id: '2', change: 'unchanged' },
        ],
      },
      currentPoints: namedPoints,
      currentSections: [
        { id: 'plot', title: 'The Plot' },
        { id: 'stage', title: 'Keeper Stage' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.openDumpRepaired).toBe(false);
    expect(result.proposal.points.find((p) => p.id === 'p1')?.sectionId).toBe('plot');
    expect(result.proposal.points.find((p) => p.id === 'p2')?.sectionId).toBe('stage');
  });

  it('does not dump named work into Open when the Lead lists every Point without a Section', () => {
    const namedPoints = [
      createDraftPoint({
        id: 'p1',
        content: 'First finding about the plot.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'The plot',
        pathGroupId: 'plot',
      }),
      createDraftPoint({
        id: 'p2',
        content: 'UI notes that wandered in.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'UI notes',
        pathGroupId: 'stage',
      }),
    ];
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        sections: [{ title: 'Open' }],
        points: [
          { id: 'The plot', change: 'move' },
          { id: 'UI notes', change: 'move' },
        ],
      },
      currentPoints: namedPoints,
      currentSections: [
        { id: 'plot', title: 'The Plot' },
        { id: 'stage', title: 'Keeper Stage' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.points.find((p) => p.id === 'p1')?.sectionId).toBe('plot');
    expect(result.proposal.points.find((p) => p.id === 'p2')?.sectionId).toBe('stage');
  });

  it('repairs an explicit dump of named-section Points into Open', () => {
    const namedPoints = [
      createDraftPoint({
        id: 'p1',
        content: 'First finding about the plot.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'The plot',
        pathGroupId: 'plot',
      }),
      createDraftPoint({
        id: 'p2',
        content: 'UI notes that wandered in.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'UI notes',
        pathGroupId: 'stage',
      }),
    ];
    const dumped = {
      rationale: 'Put everything in Open.',
      sections: [{ id: 'plot', title: 'The Plot' }],
      points: [
        { id: 'p1', change: 'move' as const, sectionId: 'open', content: 'First finding about the plot.' },
        { id: 'p2', change: 'move' as const, sectionId: 'open', content: 'UI notes that wandered in.' },
      ],
    };
    const parsed = parseDocumentReorganizeProposal(dumped);
    expect(parsed).not.toBeNull();
    expect(isDocumentReorganizeOpenDump(parsed!, namedPoints)).toBe(true);

    const result = normalizeDocumentReorganizeProposal({
      raw: dumped,
      currentPoints: namedPoints,
      currentSections: [
        { id: 'plot', title: 'The Plot' },
        { id: 'stage', title: 'Keeper Stage' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.openDumpRepaired).toBe(true);
    expect(result.proposal.points.find((p) => p.id === 'p1')?.sectionId).toBe('plot');
    expect(result.proposal.points.find((p) => p.id === 'p2')?.sectionId).toBe('stage');
    expect(isDocumentReorganizeOpenDump(result.proposal, namedPoints)).toBe(false);
  });

  it('accepts a better structure — new Section, move, refine, merge, retire, and new', () => {
    const namedPoints = [
      createDraftPoint({
        id: 'p1',
        content: 'First finding about the plot.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'The plot',
        pathGroupId: 'plot',
      }),
      createDraftPoint({
        id: 'p2',
        content: 'UI notes that wandered in.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'UI notes',
        pathGroupId: 'stage',
      }),
      createDraftPoint({
        id: 'p3',
        content: 'A second note on the same UI beat.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'More UI',
        pathGroupId: 'stage',
      }),
      createDraftPoint({
        id: 'p4',
        content: 'Superseded aside.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'Aside',
        pathGroupId: 'plot',
      }),
    ];
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        rationale: 'A clearer spine.',
        sections: [
          { title: 'The Story' },
          {
            title: 'Stage',
            points: [
              {
                id: 'UI notes',
                change: 'merge',
                prelude: 'UI notes',
                content: 'UI notes, gathered.',
                replacesPointIds: ['More UI'],
              },
            ],
          },
        ],
        points: [
          {
            id: 'The plot',
            change: 'refine',
            sectionId: 'The Story',
            content: 'The plot, tightened.',
          },
          { id: 'Aside', change: 'retire' },
          {
            change: 'new',
            prelude: 'What comes next',
            content: 'The next beat to find.',
            sectionId: 'The Story',
          },
        ],
      },
      currentPoints: namedPoints,
      currentSections: [
        { id: 'plot', title: 'The Plot' },
        { id: 'stage', title: 'Keeper Stage' },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.openDumpRepaired).toBe(false);
    expect(result.proposal.sections.map((section) => section.title)).toEqual([
      'The Story',
      'Stage',
    ]);
    const plot = result.proposal.points.find((p) => p.id === 'p1');
    expect(plot?.change).toBe('refine');
    expect(plot?.sectionId).toBe(result.proposal.sections[0]?.id);
    const merged = result.proposal.points.find((p) => p.id === 'p2');
    expect(merged?.change).toBe('merge');
    expect(merged?.replacesPointIds).toEqual(['p3']);
    expect(result.proposal.points.find((p) => p.id === 'p4')?.change).toBe('retire');
    expect(result.proposal.points.some((p) => p.change === 'new')).toBe(true);

    const composed = composeProposedDocument({
      currentPoints: namedPoints,
      currentSections: [
        { id: 'plot', title: 'The Plot' },
        { id: 'stage', title: 'Keeper Stage' },
      ],
      proposal: result.proposal,
    });
    expect(composed.marks.p1?.kind).toBe('refine');
    expect(composed.marks.p1?.fromSectionTitle).toBe('The Plot');
    expect(composed.marks.p2?.kind).toBe('merge');
    expect(composed.marks.p4?.kind).toBe('retire');
    const created = result.proposal.points.find((p) => p.change === 'new');
    expect(created && composed.marks[created.id]?.kind).toBe('new');
  });

  it('reuses current Section ids when the Lead restates the same titles', () => {
    const namedPoints = [
      createDraftPoint({
        id: 'p1',
        content: 'First finding about the plot.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'The plot',
        pathGroupId: 'plot-a1b2c',
      }),
    ];
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        sections: [{ title: 'The Plot' }],
        points: [{ id: '1', sectionId: 'The Plot', change: 'move' }],
      },
      currentPoints: namedPoints,
      currentSections: [{ id: 'plot-a1b2c', title: 'The Plot' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.proposal.sections[0]?.id).toBe('plot-a1b2c');
    expect(result.proposal.points.find((p) => p.id === 'p1')?.sectionId).toBe('plot-a1b2c');
  });

  it('names a restatement when Sections and Points are unchanged', () => {
    const namedPoints = [
      createDraftPoint({
        id: 'p1',
        content: 'First finding about the plot.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'The plot',
        pathGroupId: 'plot',
      }),
    ];
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        sections: [{ id: 'plot', title: 'The Plot' }],
        points: [{ id: '1', change: 'unchanged' }],
      },
      currentPoints: namedPoints,
      currentSections: [{ id: 'plot', title: 'The Plot' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const summary = summarizeReorganizeProposal({
      proposal: result.proposal,
      currentSections: [{ id: 'plot', title: 'The Plot' }],
    });
    expect(summary.restatement).toBe(true);
    expect(isDocumentReorganizeRestatement(result.proposal, [{ id: 'plot', title: 'The Plot' }])).toBe(
      true,
    );
    expect(formatReorganizeOverlaySummary(summary)).toContain('restates the current Document');
  });

  it('does not name a restatement when a Point is refined', () => {
    const namedPoints = [
      createDraftPoint({
        id: 'p1',
        content: 'First finding about the plot.',
        proposedBy: 'Chuck',
        status: 'accepted',
        prelude: 'The plot',
        pathGroupId: 'plot',
      }),
    ];
    const result = normalizeDocumentReorganizeProposal({
      raw: {
        sections: [{ id: 'plot', title: 'The Plot' }],
        points: [
          {
            id: '1',
            change: 'refine',
            content: 'The plot is the first agency, not a later feature.',
            prelude: 'The plot',
          },
        ],
      },
      currentPoints: namedPoints,
      currentSections: [{ id: 'plot', title: 'The Plot' }],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const summary = summarizeReorganizeProposal({
      proposal: result.proposal,
      currentSections: [{ id: 'plot', title: 'The Plot' }],
    });
    expect(summary.restatement).toBe(false);
    expect(summary.byKind.refine).toBe(1);
    expect(formatReorganizeOverlaySummary(summary)).toContain('1 refined');
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
