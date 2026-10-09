/**
 * Documents shared in a Dialog stay on the message that brought them in.
 * Later turns read that stored text. They do not require a new upload.
 */
import { prisma, type Prisma } from '@keeper/database';
import { isReadableTextDocument } from '@keeper/shared';
import { fetchBlobWithAuth } from '../LibraryItemIngestionService.js';
import { extractDocxText } from '../docxTextExtract.js';
import { extractPdfText, isPdfBuffer } from '../pdfTextExtract.js';

const MAX_FILE_CHARS = 80_000;
const MAX_PROMPT_CHARS = 100_000;
const MAX_FILES = 3;

export type DialogAttachmentRecord = {
  url: string;
  name: string;
  type: 'image' | 'file';
  extractedText?: string;
  extractNote?: string;
};

type MessageWithMeta = {
  id?: string;
  metadata?: unknown;
};

function isDocxName(name: string): boolean {
  return /\.docx(\?|$)/i.test(name);
}

function isPdfName(name: string): boolean {
  return /\.pdf(\?|$)/i.test(name);
}

export function attachmentsFromMetadata(metadata: unknown): DialogAttachmentRecord[] {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return [];
  const rows = (metadata as Record<string, unknown>).attachments;
  if (!Array.isArray(rows)) return [];
  const parsed: DialogAttachmentRecord[] = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    const record = row as Record<string, unknown>;
    const url = typeof record.url === 'string' ? record.url.trim() : '';
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    const type = record.type === 'image' ? 'image' : 'file';
    if (!url || !name || type !== 'file') continue;
    const extractedText = typeof record.extractedText === 'string' ? record.extractedText : '';
    const extractNote = typeof record.extractNote === 'string' ? record.extractNote : '';
    parsed.push({
      url,
      name,
      type,
      ...(extractedText ? { extractedText } : {}),
      ...(extractNote ? { extractNote } : {}),
    });
  }
  return parsed;
}

export async function readDialogAttachment(
  attachment: { url: string; name: string },
): Promise<{ extractedText?: string; extractNote?: string }> {
  try {
    const res = await fetchBlobWithAuth(attachment.url);
    if (!res.ok) {
      return { extractNote: `The file could not be fetched (${res.status}).` };
    }
    const name = attachment.name || attachment.url;
    if (isDocxName(name) || isDocxName(attachment.url)) {
      const buffer = Buffer.from(await res.arrayBuffer());
      const text = extractDocxText(buffer, MAX_FILE_CHARS);
      return text
        ? { extractedText: text }
        : { extractNote: 'This Word file had no readable paragraph text.' };
    }
    if (isPdfName(name) || isPdfName(attachment.url)) {
      const buffer = Buffer.from(await res.arrayBuffer());
      if (isPdfBuffer(buffer) || isPdfName(name)) {
        const extracted = extractPdfText(buffer, MAX_FILE_CHARS);
        return extracted.text.trim()
          ? { extractedText: extracted.text.trim() }
          : { extractNote: 'This PDF has no extractable text. It may be scanned images.' };
      }
    }
    if (isReadableTextDocument(name) || isReadableTextDocument(attachment.url)) {
      const text = (await res.text()).trim().slice(0, MAX_FILE_CHARS);
      return text
        ? { extractedText: text }
        : { extractNote: 'This text file was empty.' };
    }
    return { extractNote: 'This file type is stored, but its text is not read yet.' };
  } catch (error) {
    return {
      extractNote: error instanceof Error ? error.message : 'The file could not be read.',
    };
  }
}

export async function enrichDialogAttachments(
  attachments: Array<{ url: string; name: string; type: 'image' | 'file' }>,
): Promise<DialogAttachmentRecord[]> {
  const enriched: DialogAttachmentRecord[] = [];
  for (const attachment of attachments) {
    if (attachment.type !== 'file' || !attachment.url?.trim()) continue;
    const read = await readDialogAttachment(attachment);
    enriched.push({
      url: attachment.url.trim(),
      name: attachment.name,
      type: 'file',
      ...read,
    });
  }
  return enriched;
}

function formatOne(attachment: DialogAttachmentRecord): string {
  if (attachment.extractedText?.trim()) {
    return `[Document: ${attachment.name}]\n${attachment.extractedText.trim()}`;
  }
  return `[Document: ${attachment.name}]\n${attachment.extractNote || 'No text was stored for this file.'}`;
}

export function formatDialogDocumentPrompt(attachments: readonly DialogAttachmentRecord[]): string {
  if (!attachments.length) return '';
  const blocks: string[] = [];
  let used = 0;
  for (const attachment of [...attachments].reverse()) {
    if (blocks.length >= MAX_FILES) break;
    const block = formatOne(attachment);
    if (used + block.length > MAX_PROMPT_CHARS) {
      const room = MAX_PROMPT_CHARS - used;
      if (room < 400) break;
      blocks.push(block.slice(0, room));
      break;
    }
    blocks.push(block);
    used += block.length;
  }
  return [
    'Documents already shared in this Dialog. Read them from this context.',
    'Do not ask the human to re-upload or paste a document that is included here.',
    'A file name without text below was not extracted. Say that plainly.',
    '',
    blocks.reverse().join('\n\n'),
  ].join('\n');
}

export async function buildDialogDocumentPrompt(messages: readonly MessageWithMeta[]): Promise<string> {
  const newestFirst = [...messages].reverse();
  const chosen: Array<{ message: MessageWithMeta; attachment: DialogAttachmentRecord }> = [];
  const seen = new Set<string>();
  for (const message of newestFirst) {
    for (const attachment of attachmentsFromMetadata(message.metadata)) {
      if (seen.has(attachment.url) || chosen.length >= MAX_FILES) continue;
      seen.add(attachment.url);
      chosen.push({ message, attachment });
    }
    if (chosen.length >= MAX_FILES) break;
  }
  const ready: DialogAttachmentRecord[] = [];
  for (const row of chosen.reverse()) {
    if (row.attachment.extractedText || row.attachment.extractNote) {
      ready.push(row.attachment);
      continue;
    }
    const read = await readDialogAttachment(row.attachment);
    const next = { ...row.attachment, ...read };
    ready.push(next);
    if (row.message.id) {
      await rememberAttachmentExtract(row.message, next).catch(() => undefined);
    }
  }
  return formatDialogDocumentPrompt(ready);
}

async function rememberAttachmentExtract(
  message: MessageWithMeta,
  attachment: DialogAttachmentRecord,
): Promise<void> {
  if (!message.id || !message.metadata || typeof message.metadata !== 'object' || Array.isArray(message.metadata)) {
    return;
  }
  const metadata = { ...(message.metadata as Record<string, unknown>) };
  const rows = Array.isArray(metadata.attachments) ? [...metadata.attachments] : [];
  const index = rows.findIndex((row) => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
    return (row as Record<string, unknown>).url === attachment.url;
  });
  if (index < 0) return;
  const current = rows[index];
  if (!current || typeof current !== 'object' || Array.isArray(current)) return;
  rows[index] = {
    ...(current as Record<string, unknown>),
    ...(attachment.extractedText ? { extractedText: attachment.extractedText } : {}),
    ...(attachment.extractNote ? { extractNote: attachment.extractNote } : {}),
  };
  metadata.attachments = rows;
  await prisma.kip_messages.update({
    where: { id: message.id },
    data: { metadata: metadata as unknown as Prisma.InputJsonValue },
  });
}
