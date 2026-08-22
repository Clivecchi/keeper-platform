import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_OPEN_SECTION,
  isAuthoredDocumentForward,
  resolveDocumentForward,
} from './document.js';

describe('resolveDocumentForward', () => {
  it('uses authored Forward when present', () => {
    expect(
      resolveDocumentForward({
        forwardTitle: 'Hold the plot',
        forwardDescription: 'Make the story bloom.',
        dialogTitle: 'Finding the plot',
      }),
    ).toEqual({
      title: 'Hold the plot',
      description: 'Make the story bloom.',
    });
  });

  it('holds the Dialog title when Forward is not yet written', () => {
    expect(
      resolveDocumentForward({
        dialogTitle: 'Finding the plot',
      }),
    ).toEqual({
      title: 'Finding the plot',
      description: '',
    });
    expect(
      isAuthoredDocumentForward({ dialogTitle: 'Finding the plot' }),
    ).toBe(false);
  });

  it('does not require a description to resolve a Forward', () => {
    expect(
      resolveDocumentForward({
        forwardTitle: 'Toward a living Document',
        dialogTitle: 'Becoming Together',
      }),
    ).toEqual({
      title: 'Toward a living Document',
      description: '',
    });
    expect(
      isAuthoredDocumentForward({
        forwardTitle: 'Toward a living Document',
      }),
    ).toBe(true);
  });
});

describe('DOCUMENT_OPEN_SECTION', () => {
  it('names the quieter Section for unplaced Points', () => {
    expect(DOCUMENT_OPEN_SECTION.id).toBe('open');
    expect(DOCUMENT_OPEN_SECTION.title).toBe('Open');
  });
});
