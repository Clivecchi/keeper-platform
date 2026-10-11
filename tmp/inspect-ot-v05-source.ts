/** Read-only: compare the stored v0.5 extract with the blob, and note what the import cut. */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });
const { prisma } = await import('@keeper/database');
const { fetchBlobWithAuth } = await import('../apps/api/src/services/LibraryItemIngestionService.js');

const outDir = path.join(root, 'tmp', 'ot-exchange-snapshot-2026-10-10');
mkdirSync(outDir, { recursive: true });

const message = await prisma.kip_messages.findUnique({
  where: { id: 'e6985829-d682-42c4-8edb-b65230f43a4b' },
  select: { metadata: true },
});
const meta = message?.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
  ? message.metadata as Record<string, unknown>
  : {};
const attachments = Array.isArray(meta.attachments) ? meta.attachments : [];
const file = attachments.find((row) => {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return false;
  return (row as Record<string, unknown>).name === 'Keeper_Operational_Truth_v0.5.md';
}) as Record<string, unknown> | undefined;
const url = typeof file?.url === 'string' ? file.url : '';
const stored = typeof file?.extractedText === 'string' ? file.extractedText : '';
const res = url ? await fetchBlobWithAuth(url) : null;
const full = res?.ok ? await res.text() : '';

writeFileSync(path.join(outDir, 'attachment-v0.5-stored-extract.md'), stored);
if (full) writeFileSync(path.join(outDir, 'attachment-v0.5-blob.md'), full);

const headings = ['## 17 ', '## 18 ', '## 19 ', '### D ', '### E ', '### F ', '### G ', 'Section 0', 'S20', 'S21'];
const present = Object.fromEntries(headings.map((heading) => [
  heading,
  { stored: stored.includes(heading), blob: full.includes(heading) },
]));

console.log(JSON.stringify({
  http: res?.status ?? null,
  storedChars: stored.length,
  blobChars: full.length,
  storedTail: stored.slice(-240),
  blobTail: full.slice(-180),
  present,
}, null, 2));

await prisma.$disconnect();
