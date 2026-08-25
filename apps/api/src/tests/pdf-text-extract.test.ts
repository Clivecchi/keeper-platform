import { deflateSync } from 'zlib';
import { describe, expect, it } from 'vitest';
import { extractPdfText, isGoogleDocUrl, isPdfBuffer } from '../services/pdfTextExtract.js';

function uncompressedPdf(operators: string): Buffer {
  const body = `%PDF-1.4
1 0 obj
<< /Length ${operators.length} >>
stream
${operators}endstream
endobj
`;
  return Buffer.from(body, 'latin1');
}

function flatePdf(operators: string): Buffer {
  const compressed = deflateSync(Buffer.from(operators, 'latin1'));
  const header = `%PDF-1.4
1 0 obj
<< /Length ${compressed.length} /Filter /FlateDecode >>
stream
`;
  const footer = `
endstream
endobj
`;
  return Buffer.concat([
    Buffer.from(header, 'latin1'),
    compressed,
    Buffer.from(footer, 'latin1'),
  ]);
}

describe('extractPdfText', () => {
  it('reads uncompressed Tj literals', () => {
    const buffer = uncompressedPdf('BT /F1 12 Tf 72 720 Td (Community Commerce) Tj ET');
    expect(isPdfBuffer(buffer)).toBe(true);
    expect(extractPdfText(buffer).text).toContain('Community Commerce');
  });

  it('reads FlateDecode streams', () => {
    const buffer = flatePdf('BT /F1 12 Tf 72 720 Td (Community Commerce) Tj ET');
    expect(extractPdfText(buffer).text).toContain('Community Commerce');
  });

  it('joins TJ array fragments and escaped parens', () => {
    const buffer = uncompressedPdf(
      'BT [(Commu) -20 (nity Commerce)] TJ (No Udicci \\(product\\)) Tj ET',
    );
    const text = extractPdfText(buffer).text;
    expect(text).toContain('Community Commerce');
    expect(text).toContain('No Udicci (product)');
  });

  it('returns empty for non-PDF bytes', () => {
    const result = extractPdfText(Buffer.from('not a pdf', 'utf8'));
    expect(result.method).toBe('not-pdf');
    expect(result.text).toBe('');
  });
});

describe('isGoogleDocUrl', () => {
  it('recognizes Google Docs and ignores other hosts', () => {
    expect(isGoogleDocUrl('https://docs.google.com/document/d/abc/edit')).toBe(true);
    expect(isGoogleDocUrl('https://example.com/document.pdf')).toBe(false);
  });
});
