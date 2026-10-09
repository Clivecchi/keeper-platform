import { describe, expect, it } from 'vitest';
import {
  isReadableTextDocument,
  shouldReadUploadAsText,
  uploadContentTypeForFile,
} from './readableDocuments.js';

describe('readable documents', () => {
  it('treats markdown as text even when the upload type is generic', () => {
    expect(isReadableTextDocument('Keeper Operational Truth.md')).toBe(true);
    expect(isReadableTextDocument('notes.markdown')).toBe(true);
    expect(uploadContentTypeForFile('Keeper Operational Truth.md', '')).toBe('text/markdown');
    expect(shouldReadUploadAsText({
      contentType: 'application/octet-stream',
      sourceRef: 'https://blob.example/uploads/123-Keeper_Operational_Truth.md',
    })).toBe(true);
  });

  it('includes common text formats and leaves Word and Excel alone', () => {
    for (const name of ['a.txt', 'a.json', 'a.csv', 'a.tsv', 'a.yaml', 'a.yml', 'a.html', 'a.xml', 'a.log', 'a.rtf']) {
      expect(isReadableTextDocument(name)).toBe(true);
    }
    expect(isReadableTextDocument('brief.docx')).toBe(false);
    expect(isReadableTextDocument('sheet.xlsx')).toBe(false);
    expect(isReadableTextDocument('scan.pdf')).toBe(false);
  });

  it('reads unlabeled text and refuses a binary sample', () => {
    const text = new TextEncoder().encode('# Keeper Operational Truth\n\nThe register.');
    expect(shouldReadUploadAsText({
      contentType: 'application/octet-stream',
      sample: text,
    })).toBe(true);
    const binary = new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0x00]);
    expect(shouldReadUploadAsText({
      contentType: 'application/octet-stream',
      sample: binary,
    })).toBe(false);
  });
});
