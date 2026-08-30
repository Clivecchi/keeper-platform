import { describe, expect, it } from 'vitest';
import {
  composeAuthoredPoint,
  createDocumentSection,
  cycleDocumentLifecycleStatus,
  isOpenSectionId,
  planIngestAttachSection,
  moveDocumentSection,
  moveIdInOrder,
  removeDocumentSection,
  renameDocumentSection,
} from './documentAuthoring.js';
import { DOCUMENT_OPEN_SECTION } from './document.js';

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
