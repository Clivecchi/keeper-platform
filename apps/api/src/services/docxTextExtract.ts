/**
 * Read paragraph text from a .docx (Office Open XML) without a new dependency.
 * Word and Excel workbooks are still unread.
 */
import { inflateRawSync } from 'node:zlib';

function readZipEntry(buffer: Buffer, entryName: string): string | null {
  let offset = 0;
  while (offset + 30 <= buffer.length) {
    if (buffer.readUInt32LE(offset) !== 0x04034b50) break;
    const flags = buffer.readUInt16LE(offset + 6);
    const method = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const nameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const nameStart = offset + 30;
    const name = buffer.toString('utf8', nameStart, nameStart + nameLength);
    const dataStart = nameStart + nameLength + extraLength;
    if (flags & 0x8 || compressedSize === 0) break;
    if (dataStart + compressedSize > buffer.length) break;
    if (name === entryName) {
      const slice = buffer.subarray(dataStart, dataStart + compressedSize);
      const raw = method === 0 ? slice : method === 8 ? inflateRawSync(slice) : null;
      return raw ? raw.toString('utf8') : null;
    }
    offset = dataStart + compressedSize;
  }
  return null;
}

export function extractDocxText(buffer: Buffer, maxChars: number): string {
  const xml = readZipEntry(buffer, 'word/document.xml');
  if (!xml) return '';
  const text = xml
    .replace(/<w:p[ >]/g, '\n')
    .replace(/<w:tab\/>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text.slice(0, maxChars);
}
