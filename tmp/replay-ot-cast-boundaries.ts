/**
 * Replay the stored Cast-gap payloads through the repaired formatters.
 * Read-only. Does not write Points, Gloss, or messages.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });

const { readDialogGlossByPointId } = await import('../apps/api/src/services/kip/ensureDialogGlossCarrier.ts');
const { loadDialogPointContents } = await import('../apps/api/src/services/kip/loadDialogDocumentForAgent.ts');
const { packPointReadBody, formatDialogPointPageLines, formatSpecialistActionDigest } = await import('../apps/api/src/services/kip/actionFollowUp.ts');
const { prisma } = await import('@keeper/database');

const dialogId = 'cmv04yrn50001otb8mwjrj0as';
const domainId = '9b0989f6-2fe4-4aa6-9c8a-f49a2516e7f9';
const point33 = '64b7e0c3-7607-45c4-a595-64c5c256b883';

const [contents, gloss] = await Promise.all([
  loadDialogPointContents(dialogId, domainId),
  readDialogGlossByPointId(dialogId),
]);
const body = packPointReadBody(contents.get(point33) ?? '', true);
const glossRow = gloss.get(point33) ?? null;
const page = formatDialogPointPageLines({
  pointTotal: 162,
  pointOffset: 32,
  document: {
    points: [{
      number: 33,
      id: point33,
      prelude: 'Active evidence and development records',
      type: 'general',
      body: body.body,
      bodyTruncated: body.bodyTruncated,
      gloss: glossRow,
    }],
  },
});
const digest = formatSpecialistActionDigest([
  {
    type: 'mcp.call',
    status: 'error',
    errorCode: 'EXECUTION_ERROR',
    message: 'github_repo_read: GitHub file not found: apps/api/src/lib/castRoom in Clivecchi/keeper-platform. Nearby in apps/api/src/lib: env.ts.',
    data: { tool: 'github_repo_read' },
  },
  {
    type: 'dialog.read',
    status: 'success',
    message: 'page',
    data: {
      pointTotal: 162,
      pointOffset: 32,
      document: {
        points: [{
          number: 33,
          id: point33,
          prelude: 'Active evidence and development records',
          type: 'general',
          body: body.body,
          bodyTruncated: body.bodyTruncated,
          gloss: glossRow,
        }],
      },
    },
  },
]);

console.log(JSON.stringify({
  point33BodyChars: body.body.length,
  bodyTruncated: body.bodyTruncated,
  glossThread: glossRow?.threadId ?? null,
  glossChars: glossRow?.body.length ?? 0,
  pageHasGloss: page.some((line) => line.includes('917a6626')),
  digestHasNearby: digest.includes('Nearby in apps/api/src/lib'),
  digestHasPointId: digest.includes(point33),
  digestHasBareTool: digest.includes('"tool": "github_repo_read"'),
}, null, 2));

await prisma.$disconnect();
