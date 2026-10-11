import { describe, expect, it } from 'vitest';
import { createDraftPoint } from './draftPoints.js';
import { normalizeDocumentReorganizeProposal } from './documentReorganize.js';
import {
  buildIngestReconcileProposal,
  reconcileIncomingWriting,
} from './ingestReconcile.js';
import { markdownToDraftPoints } from './markdownToDraftPoints.js';

function point(id: string, prelude: string, content: string) {
  return createDraftPoint({
    id,
    prelude,
    content,
    proposedBy: 'import',
    status: 'accepted',
  });
}

describe('reconcileIncomingWriting', () => {
  it('keeps the earliest identity and does not append a matching copy', () => {
    const existing = [
      point('p1', 'Purpose', 'The same body.'),
      point('p2', 'Purpose', 'The same body.'),
    ];
    const parsed = markdownToDraftPoints('# Doc\n\n## Purpose\n\nThe same body.', { proposedBy: 'file' });
    const plan = reconcileIncomingWriting({ existing, blocks: parsed.blocks });
    expect(plan.matched).toEqual([{ id: 'p1', number: 1, prelude: 'Purpose' }]);
    expect(plan.refinements).toHaveLength(0);
    expect(plan.additions).toHaveLength(0);
    expect(plan.duplicateCopiesLeft).toBe(1);
  });

  it('proposes a refinement on the existing id and a new section without retiring the rest', () => {
    const existing = [point('p1', 'Purpose', 'Old body.')];
    const parsed = markdownToDraftPoints(
      ['# Doc', '', '## Purpose', '', 'New body.', '', '## Section 0', '', 'Capability index.'].join('\n'),
      { proposedBy: 'file' },
    );
    const plan = reconcileIncomingWriting({ existing, blocks: parsed.blocks });
    expect(plan.matched).toHaveLength(0);
    expect(plan.refinements).toEqual([
      expect.objectContaining({ id: 'p1', number: 1, content: 'New body.', originalContent: 'Old body.' }),
    ]);
    expect(plan.additions.map((row) => row.prelude)).toContain('Section 0');
    const proposal = buildIngestReconcileProposal({
      plan,
      currentSections: [{ id: 'purpose', title: 'Purpose' }],
      sourceName: 'Keeper_Operational_Truth_v0.5.md',
      sourceTruncated: true,
    });
    expect(proposal?.points.find((row) => row.change === 'refine')?.id).toBe('p1');
    expect(proposal?.sections.map((section) => section.title)).toEqual(
      expect.arrayContaining(['Purpose', 'Section 0']),
    );
    expect(proposal?.rationale).toContain('not the whole source');
    expect(proposal?.rationale).toContain('Nothing was appended');
    const normalized = normalizeDocumentReorganizeProposal({
      raw: proposal,
      currentPoints: [
        ...existing,
        point('p-extra', 'Left alone', 'This copy stays.'),
      ],
      currentSections: [{ id: 'purpose', title: 'Purpose' }],
    });
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    expect(normalized.proposal.points.find((row) => row.id === 'p1')?.change).toBe('refine');
    expect(normalized.proposal.points.find((row) => row.prelude === 'Section 0')?.change).toBe('new');
    expect(normalized.proposal.points.find((row) => row.id === 'p-extra')?.change).toBe('unchanged');
    expect(normalized.proposal.points.some((row) => row.change === 'retire')).toBe(false);
  });

  it('reuses an existing brought-in section instead of proposing a second title', () => {
    const existing = [point('p1', 'Purpose', 'Old body.')];
    const parsed = markdownToDraftPoints(
      ['# Doc', '', '## Notes', '', 'A new note.'].join('\n'),
      { proposedBy: 'file' },
    );
    const plan = reconcileIncomingWriting({ existing, blocks: parsed.blocks });
    const proposal = buildIngestReconcileProposal({
      plan,
      currentSections: [{ id: 'notes-brought', title: 'Notes · brought in' }],
      sourceName: 'file.md',
      sourceTruncated: false,
    });
    expect(proposal?.sections.map((section) => section.title)).toEqual(['Notes · brought in']);
    const normalized = normalizeDocumentReorganizeProposal({
      raw: proposal,
      currentPoints: existing,
      currentSections: [{ id: 'notes-brought', title: 'Notes · brought in' }],
    });
    expect(normalized.ok).toBe(true);
    if (!normalized.ok) return;
    const added = normalized.proposal.points.find((row) => row.change === 'new');
    expect(added?.sectionId).toBe('notes-brought');
    expect(normalized.proposal.points.find((row) => row.id === 'p1')?.change).toBe('unchanged');
  });
});
