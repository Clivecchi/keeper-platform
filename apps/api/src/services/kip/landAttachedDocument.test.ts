import { describe, expect, it } from 'vitest';
import { keepLandedDocumentReceipt } from './landAttachedDocument.js';

describe('keepLandedDocumentReceipt', () => {
  it('keeps the compare receipt when later actions replace the list', () => {
    const landed = { type: 'document.ingest', status: 'success', message: 'Compared. Nothing was appended.' };
    const next = keepLandedDocumentReceipt(
      [{ type: 'dialog.read', status: 'success', message: '162 points' }],
      landed,
    );
    expect(next.map((row) => row.type)).toEqual(['document.ingest', 'dialog.read']);
  });

  it('does not duplicate a receipt that is already present', () => {
    const landed = { type: 'document.ingest', status: 'success', message: 'Compared.' };
    const next = keepLandedDocumentReceipt([landed], landed);
    expect(next).toHaveLength(1);
  });
});
