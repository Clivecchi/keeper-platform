import 'dotenv/config';
import { prisma } from '@keeper/database';

const dialog = await prisma.dialog.findFirst({
  where: { title: 'Keeper Operational Truth', is_archived: false },
  select: { id: true, domain_id: true },
});
if (!dialog) throw new Error('dialog missing');

const sessions = await prisma.kip_sessions.findMany({
  where: { dialog_id: dialog.id, is_archived: false },
  select: { id: true, created_at: true },
  orderBy: { created_at: 'desc' },
  take: 5,
});

const messages = await prisma.kip_messages.findMany({
  where: { session_id: { in: sessions.map((row) => row.id) } },
  orderBy: { created_at: 'asc' },
  select: { id: true, role: true, sender: true, content: true, metadata: true, created_at: true, session_id: true },
});

const rows = messages.map((message) => {
  const meta = message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
    ? message.metadata as Record<string, unknown>
    : {};
  const attachments = Array.isArray(meta.attachments) ? meta.attachments : [];
  const names = attachments.map((row) => {
    if (!row || typeof row !== 'object') return 'unknown';
    const record = row as Record<string, unknown>;
    return {
      name: typeof record.name === 'string' ? record.name : '',
      type: typeof record.type === 'string' ? record.type : '',
      hasUrl: typeof record.url === 'string' && record.url.length > 0,
      extractedChars: typeof record.extractedText === 'string' ? record.extractedText.length : 0,
    };
  });
  const trace = Array.isArray(meta.trace) ? meta.trace : [];
  const traceLines = trace.map((event) => {
    if (!event || typeof event !== 'object') return '';
    const record = event as Record<string, unknown>;
    const actor = record.actor && typeof record.actor === 'object'
      ? (record.actor as Record<string, unknown>).slug || (record.actor as Record<string, unknown>).kind
      : '';
    return `${String(actor)} ${String(record.what)} ${typeof record.label === 'string' ? record.label : ''}`.trim();
  });
  const content = message.content ?? '';
  return {
    at: message.created_at.toISOString(),
    role: message.role,
    sender: message.sender,
    contentChars: content.length,
    contentHead: content.slice(0, 180).replace(/\s+/g, ' '),
    mentionsCannotRead: /cannot read|can't read|unable to (read|access)|do not have access/i.test(content),
    mentionsOt01: /OT01/.test(content),
    mentionsVersion: /0\.3/.test(content),
    attachmentCount: names.length,
    attachments: names,
    trace: traceLines,
  };
});

const fileTurn = messages.find((message) => {
  const meta = message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
    ? message.metadata as Record<string, unknown>
    : {};
  return Array.isArray(meta.attachments) && meta.attachments.length > 0;
});
let storedFile: Record<string, unknown> | null = null;
if (fileTurn?.metadata && typeof fileTurn.metadata === 'object' && !Array.isArray(fileTurn.metadata)) {
  const attachments = (fileTurn.metadata as Record<string, unknown>).attachments;
  const first = Array.isArray(attachments) ? attachments[0] as Record<string, unknown> : null;
  const url = typeof first?.url === 'string' ? first.url : '';
  if (url) {
    const { fetchBlobWithAuth } = await import('../apps/api/src/services/LibraryItemIngestionService.js');
    const res = await fetchBlobWithAuth(url);
    const text = res.ok ? await res.text() : '';
    storedFile = {
      http: res.status,
      contentType: res.headers.get('content-type'),
      chars: text.length,
      hasVersion: text.includes('Version 0.3') || text.includes('version 0.3'),
      hasOt01: text.includes('OT01'),
      ot01Index: text.indexOf('OT01'),
    };
  }
}

console.log(JSON.stringify({ dialogId: dialog.id, sessions: sessions.length, turns: rows, storedFile }, null, 2));
await prisma.$disconnect();
