import { deflateRawSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { extractDocxText } from './docxTextExtract.js';

function localZip(name: string, payload: Buffer): Buffer {
  const compressed = deflateRawSync(payload);
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(8, 8);
  header.writeUInt32LE(compressed.length, 18);
  header.writeUInt32LE(payload.length, 22);
  header.writeUInt16LE(Buffer.byteLength(name), 26);
  return Buffer.concat([header, Buffer.from(name), compressed]);
}

describe('docx text', () => {
  it('reads paragraph text from document.xml', () => {
    const xml = Buffer.from(
      '<?xml version="1.0"?><w:document><w:p><w:r><w:t>OT01 Public route</w:t></w:r></w:p></w:document>',
    );
    const docx = localZip('word/document.xml', xml);
    expect(extractDocxText(docx, 200)).toContain('OT01 Public route');
  });
});
