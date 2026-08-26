import { describe, expect, it } from 'vitest';
import { displayDraftHostTitle } from './draftHostTitle.js';

describe('displayDraftHostTitle', () => {
  it('uses the Dialog title for a manuscript, not the storage suffix', () => {
    expect(
      displayDraftHostTitle({
        kind: 'document_manuscript',
        draftTitle: 'Document · manuscript',
        dialogTitle: 'Finding the plot',
      }),
    ).toBe('Finding the plot');
  });

  it('strips a manuscript suffix when the Dialog title is missing', () => {
    expect(
      displayDraftHostTitle({
        kind: 'document_manuscript',
        draftTitle: 'Touchdown! · manuscript',
      }),
    ).toBe('Touchdown!');
  });

  it('keeps a working Draft title as-is', () => {
    expect(
      displayDraftHostTitle({
        kind: 'draft',
        draftTitle: 'Stage notes',
        dialogTitle: 'Finding the plot',
      }),
    ).toBe('Stage notes');
  });
});
