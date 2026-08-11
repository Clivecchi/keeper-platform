import { describe, expect, it } from 'vitest';
import { parseDocumentComponentDeclarations } from './document.js';

describe('parseDocumentComponentDeclarations', () => {
  it('parses ordered unique draft membership', () => {
    const parsed = parseDocumentComponentDeclarations([
      { draftId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', order: 2, label: 'B' },
      { draftId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', order: 1 },
      { draftId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', order: 9 },
      { draftId: '  ' },
      null,
    ]);
    expect(parsed).toEqual([
      { draftId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', order: 1 },
      { draftId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', order: 2, label: 'B' },
    ]);
  });

  it('returns empty for non-arrays', () => {
    expect(parseDocumentComponentDeclarations(null)).toEqual([]);
    expect(parseDocumentComponentDeclarations({})).toEqual([]);
  });
});
