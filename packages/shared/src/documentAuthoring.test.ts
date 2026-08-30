import { describe, expect, it } from 'vitest';
import {
  composeAuthoredPoint,
  createDocumentSection,
  cycleDocumentLifecycleStatus,
  isOpenSectionId,
  planIngestAttachSection,
  planIngestHeadingSections,
  moveDocumentSection,
  moveIdInOrder,
  removeDocumentSection,
  renameDocumentSection,
} from './documentAuthoring.js';
import { DOCUMENT_OPEN_SECTION } from './document.js';
import { markdownToDraftPoints } from './markdownToDraftPoints.js';

describe('document authoring', () => {
  it('cycles Document stage drafts → kept → presented → drafts', () => {
    expect(cycleDocumentLifecycleStatus(null)).toBe('kept');
    expect(cycleDocumentLifecycleStatus('drafts')).toBe('kept');
    expect(cycleDocumentLifecycleStatus('kept')).toBe('presented');
    expect(cycleDocumentLifecycleStatus('presented')).toBe('drafts');
  });

  it('adds, renames, moves, and removes a Section without touching Open', () => {
    const first = createDocumentSection([], 'Insights');
    expect(first.section.title).toBe('Insights');
    expect(first.section.id).not.toBe(DOCUMENT_OPEN_SECTION.id);

    const renamed = renameDocumentSection(first.paths, first.section.id, 'Keeper UI Insights');
    expect(renamed[0]?.title).toBe('Keeper UI Insights');

    const second = createDocumentSection(renamed, 'Re-Center');
    const moved = moveDocumentSection(second.paths, second.section.id, 'up');
    expect(moved.map((row) => row.title)).toEqual(['Re-Center', 'Keeper UI Insights']);

    const removed = removeDocumentSection(moved, first.section.id);
    expect(removed).toHaveLength(1);
    expect(removed[0]?.title).toBe('Re-Center');
  });

  it('treats missing and Open ids as the quieter Section', () => {
    expect(isOpenSectionId(null)).toBe(true);
    expect(isOpenSectionId(DOCUMENT_OPEN_SECTION.id)).toBe(true);
    expect(isOpenSectionId('insights')).toBe(false);
  });

  it('moves a Point id inside its Section order', () => {
    expect(moveIdInOrder(['a', 'b', 'c'], 'c', 'up')).toEqual(['a', 'c', 'b']);
    expect(moveIdInOrder(['a', 'b', 'c'], 'a', 'up')).toEqual(['a', 'b', 'c']);
  });

  it('stores Point title as prelude when a body is present', () => {
    expect(composeAuthoredPoint('Hold the plot', 'The story blooms here.')).toEqual({
      content: 'The story blooms here.',
      prelude: 'Hold the plot',
    });
    expect(composeAuthoredPoint('A lone idea', '')).toEqual({
      content: 'A lone idea',
      prelude: 'A lone idea',
    });
  });

  it('gives attached writing its own Section and does not merge a same-named one', () => {
    const fresh = planIngestAttachSection([], 'Stage', 'Brought in from Member.');
    expect(fresh.section.title).toBe('Stage');
    expect(fresh.section.prelude).toBe('Brought in from Member.');

    const existing = createDocumentSection([], 'Keeper Stage');
    const collision = planIngestAttachSection(existing.paths, 'Keeper Stage');
    expect(collision.section.title).toBe('Keeper Stage · brought in');
    expect(collision.paths).toHaveLength(2);
  });
});

function planFromMarkdown(
  markdown: string,
  options?: { paths?: ReturnType<typeof createDocumentSection>['paths']; requireSection?: boolean },
) {
  const parsed = markdownToDraftPoints(markdown, { proposedBy: 'ingest' });
  return {
    parsed,
    planned: planIngestHeadingSections({
      paths: options?.paths ?? [],
      blocks: parsed.blocks,
      fallbackTitle: parsed.title,
      fallbackPrelude: 'Brought in from External.',
      requireSection: options?.requireSection,
    }),
  };
}

describe('planIngestHeadingSections', () => {
  it('turns ## into Sections and places ### Points inside them', () => {
    const { planned } = planFromMarkdown(
      [
        '# Keeper Stage Build',
        '',
        'A short intro.',
        '',
        '## Keeper Stage',
        '',
        'Stage is presence.',
        '',
        '### Curtains',
        '',
        'The reveal.',
        '',
        '## Identifying Key Characters',
        '',
        '### Kip',
        '',
        'Lead voice.',
      ].join('\n'),
    );

    expect(planned.createdSections.map((section) => section.title)).toEqual([
      'Keeper Stage',
      'Identifying Key Characters',
    ]);

    const byPrelude = Object.fromEntries(
      planned.points.map((point) => [point.prelude, point.pathGroupId ?? 'open']),
    );
    expect(byPrelude['Keeper Stage Build']).toBe('open');
    expect(byPrelude['Keeper Stage']).toBe(planned.createdSections[0]?.id);
    expect(byPrelude.Curtains).toBe(planned.createdSections[0]?.id);
    expect(byPrelude.Kip).toBe(planned.createdSections[1]?.id);
    expect(planned.points.find((point) => point.prelude === 'Identifying Key Characters')).toBeUndefined();
  });

  it('does not merge a heading Section into a same-named existing one', () => {
    const existing = createDocumentSection([], 'Keeper Stage');
    const { planned } = planFromMarkdown(
      '# Title\n\n## Keeper Stage\n\nBody of the upload.',
      { paths: existing.paths },
    );
    expect(planned.createdSections[0]?.title).toBe('Keeper Stage · brought in');
    expect(planned.paths).toHaveLength(2);
    expect(planned.points[0]?.pathGroupId).toBe(planned.createdSections[0]?.id);
  });

  it('uses later # headings as Sections when there is no ##', () => {
    const { planned } = planFromMarkdown(
      [
        '# Finding the Plot',
        '',
        'Intro.',
        '',
        '# The Stage',
        '',
        'Stage writing.',
        '',
        '### Curtains',
        '',
        'A beat.',
      ].join('\n'),
    );
    expect(planned.createdSections.map((section) => section.title)).toEqual(['The Stage']);
    expect(planned.points.find((point) => point.prelude === 'Finding the Plot')?.pathGroupId).toBeUndefined();
    expect(planned.points.find((point) => point.prelude === 'The Stage')?.pathGroupId).toBe(
      planned.createdSections[0]?.id,
    );
    expect(planned.points.find((point) => point.prelude === 'Curtains')?.pathGroupId).toBe(
      planned.createdSections[0]?.id,
    );
  });

  it('falls back to a file-title Section when attach requires one', () => {
    const { parsed, planned } = planFromMarkdown(
      '### Only a child heading\n\nNotes.',
      { requireSection: true },
    );
    expect(planned.createdSections).toHaveLength(1);
    expect(planned.createdSections[0]?.title).toBe(parsed.title);
    expect(planned.points.every((point) => point.pathGroupId === planned.createdSections[0]?.id)).toBe(true);
  });

  it('leaves unstructured writing in Open when creating a Document', () => {
    const { planned } = planFromMarkdown('Just a note from an outside session.', {
      requireSection: false,
    });
    expect(planned.createdSections).toHaveLength(0);
    expect(planned.points).toHaveLength(1);
    expect(planned.points[0]?.pathGroupId).toBeUndefined();
  });

  it('skips a title-only # when ## headings establish Sections', () => {
    const { planned } = planFromMarkdown('# Title\n\n## Task 1\n\nDo the thing.');
    expect(planned.points.find((point) => point.prelude === 'Title')).toBeUndefined();
    expect(planned.createdSections[0]?.title).toBe('Task 1');
    expect(planned.points).toHaveLength(1);
    expect(planned.points[0]?.prelude).toBe('Task 1');
  });
});
