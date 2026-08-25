/**
 * Lightweight PDF text extract — FlateDecode streams + Tj / TJ / ' operators.
 * No Prisma column; used at ingest and on library.read / chat attachments.
 */

import { inflateRawSync, inflateSync } from 'zlib';

export const PDF_MAX_BYTES = 2_000_000;
export const PDF_MAX_EXTRACT_CHARS = 80_000;

export type PdfExtractResult = {
  text: string;
  method: 'pdf' | 'empty' | 'not-pdf';
};

export function isGoogleDocUrl(sourceRef: string): boolean {
  try {
    const url = new URL(sourceRef);
    return url.hostname === 'docs.google.com' && url.pathname.includes('/document');
  } catch {
    return false;
  }
}

export function isPdfBuffer(buffer: Buffer): boolean {
  if (buffer.length < 5) return false;
  return buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

export function extractPdfText(
  buffer: Buffer,
  maxChars: number = PDF_MAX_EXTRACT_CHARS,
): PdfExtractResult {
  if (!isPdfBuffer(buffer)) {
    return { text: '', method: 'not-pdf' };
  }

  const slice = buffer.length > PDF_MAX_BYTES ? buffer.subarray(0, PDF_MAX_BYTES) : buffer;
  const hay = slice.toString('latin1');
  const chunks: string[] = [];
  const streamMarker = /stream\r?\n/g;
  let match: RegExpExecArray | null;

  while ((match = streamMarker.exec(hay)) !== null) {
    const dataStart = match.index + match[0].length;
    const dict = hay.slice(Math.max(0, match.index - 900), match.index);
    if (/\/Type\s*\/(?:XRef|ObjStm|Metadata)/.test(dict)) continue;

    const indirectLength = /\/Length\s+\d+\s+\d+\s+R/.test(dict);
    const lengthRef = indirectLength ? null : dict.match(/\/Length\s+(\d+)/);
    const explicitLength = lengthRef ? Number(lengthRef[1]) : null;
    const flate = /\/Filter\s*\/FlateDecode/.test(dict) || /\/Filter\s*\[[^\]]*FlateDecode/.test(dict);

    let dataEnd = hay.indexOf('endstream', dataStart);
    if (dataEnd < 0) continue;
    if (explicitLength != null && Number.isFinite(explicitLength) && explicitLength >= 0) {
      const byLength = dataStart + explicitLength;
      if (byLength <= hay.length) dataEnd = byLength;
    }

    const raw = Buffer.from(hay.slice(dataStart, dataEnd), 'latin1');
    const decoded = flate ? inflatePdfStream(raw) : raw;
    if (!decoded) continue;
    const decodedText = decoded.toString('latin1');
    if (!looksLikeContentStream(decodedText)) continue;
    const extracted = extractTextFromContentStream(decodedText);
    if (extracted.trim()) chunks.push(extracted);
    if (chunks.join('\n').length >= maxChars) break;
  }

  const text = normalizeExtractedPdfText(chunks.join('\n')).slice(0, maxChars);
  return { text, method: text ? 'pdf' : 'empty' };
}

function inflatePdfStream(data: Buffer): Buffer | null {
  const trimmed = stripStreamNewlines(data);
  try {
    return inflateSync(trimmed);
  } catch {
    /* try raw deflate */
  }
  try {
    return inflateRawSync(trimmed);
  } catch {
    return null;
  }
}

function stripStreamNewlines(data: Buffer): Buffer {
  let start = 0;
  let end = data.length;
  while (start < end && (data[start] === 0x0d || data[start] === 0x0a)) start += 1;
  while (end > start && (data[end - 1] === 0x0d || data[end - 1] === 0x0a)) end -= 1;
  return start === 0 && end === data.length ? data : data.subarray(start, end);
}

function looksLikeContentStream(decoded: string): boolean {
  return /\bBT\b/.test(decoded) || /\bTj\b/.test(decoded) || /\bTJ\b/.test(decoded);
}

function extractTextFromContentStream(decoded: string): string {
  const parts: string[] = [];
  const token =
    /\((?:\\.|[^\\)])*\)\s*(?:Tj|'|")|<([0-9A-Fa-f \r\n\t]+)>\s*Tj|\[((?:\\.|[^\]])*)\]\s*TJ/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(decoded)) !== null) {
    const whole = match[0];
    if (whole.includes(' TJ')) {
      parts.push(extractFromTjArray(match[2] ?? ''));
      continue;
    }
    if (whole.startsWith('<')) {
      parts.push(decodePdfHex(match[1] ?? ''));
      continue;
    }
    const literal = whole.match(/^\((?:\\.|[^\\)])*\)/);
    if (literal) {
      parts.push(decodePdfLiteral(literal[0].slice(1, -1)));
    }
  }
  return parts.join(' ');
}

function extractFromTjArray(inner: string): string {
  const parts: string[] = [];
  const token = /\((?:\\.|[^\\)])*\)|<([0-9A-Fa-f \r\n\t]+)>/g;
  let match: RegExpExecArray | null;
  while ((match = token.exec(inner)) !== null) {
    if (match[0].startsWith('<')) {
      parts.push(decodePdfHex(match[1] ?? ''));
    } else {
      parts.push(decodePdfLiteral(match[0].slice(1, -1)));
    }
  }
  return parts.join('');
}

function decodePdfLiteral(inner: string): string {
  return inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\b/g, '\b')
    .replace(/\\f/g, '\f')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)));
}

function decodePdfHex(hex: string): string {
  const compact = hex.replace(/\s+/g, '');
  if (!compact) return '';
  const padded = compact.length % 2 === 1 ? `${compact}0` : compact;
  const bytes: number[] = [];
  for (let i = 0; i < padded.length; i += 2) {
    bytes.push(parseInt(padded.slice(i, i + 2), 16));
  }
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    const chars: string[] = [];
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      chars.push(String.fromCharCode((bytes[i] << 8) | bytes[i + 1]));
    }
    return chars.join('');
  }
  return Buffer.from(bytes).toString('latin1');
}

function normalizeExtractedPdfText(text: string): string {
  return text
    .replace(/\0/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}
