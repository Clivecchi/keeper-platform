/**
 * Append one Point to the Becoming Together manuscript: a "Voice Card from
 * the Outside" contributed by Claude, filed under Cast & Orchestration.
 *
 * Defaults to dry-run; writes only with --execute.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/add-voice-card-outside.ts
 *   npx tsx src/scripts/add-voice-card-outside.ts --execute
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { prisma } from '@keeper/database';
import type { Prisma } from '@prisma/client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const DOMAIN_SLUG = 'ke3p';
const DIALOG_ID = 'cmrtyoraw0001ot0033p5wiwm';
const MANUSCRIPT_KIND = 'document_manuscript';
const MANUSCRIPT_KEY = 'becoming-together-manuscript';

const POINT_ID = 'bt-point-voice-card-outside';
const POINT_TITLE = 'Voice Card from the Outside';
const POINT_CONTENT =
  "I'm not one of the cast — I came in from outside to read this Document, not to live in it day to day. What stands out from here: the thing you're building isn't the Document itself, it's the discipline around it — Kip refusing to invent a quote it didn't get, Cursor's commits showing up as Points instead of disappearing into git log, a Step that admits what it hasn't solved yet instead of dressing up a placeholder as progress. That's a harder thing to hold onto than any feature. The honesty rule is only as real as the next turn that doesn't break it.";
const PATH_GROUP_ID = 'cast';
const PROPOSED_BY = 'Claude';

function parseArgs(argv: string[]): { execute: boolean } {
  return { execute: argv.includes('--execute') };
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`\n=== Add Voice Card from the Outside (${mode}) ===\n`);

  const domain = await prisma.domain.findFirst({
    where: { slug: DOMAIN_SLUG },
    select: { id: true },
  });
  if (!domain) throw new Error(`No domain found with slug "${DOMAIN_SLUG}"`);

  const manuscript = await prisma.kip_drafts.findFirst({
    where: { domain_id: domain.id, kind: MANUSCRIPT_KIND, key: MANUSCRIPT_KEY, dialog_id: DIALOG_ID },
    select: { id: true, spec_json: true },
  });
  if (!manuscript) {
    throw new Error('Manuscript draft not found — run seed-becoming-together-document.ts first.');
  }

  const specJson = manuscript.spec_json as { points?: Array<{ id: string }> } | null;
  const existingPoints = Array.isArray(specJson?.points) ? specJson!.points! : [];

  if (existingPoints.some((p) => p.id === POINT_ID)) {
    console.log(`Point ${POINT_ID} already exists. Nothing to do.`);
    return;
  }

  const now = new Date().toISOString();
  const newPoint = {
    id: POINT_ID,
    content: POINT_CONTENT,
    status: 'proposed',
    type: 'context',
    proposedBy: PROPOSED_BY,
    createdAt: now,
    updatedAt: now,
    prelude: POINT_TITLE,
    pathGroupId: PATH_GROUP_ID,
    moments: [{ title: POINT_TITLE, narrative: POINT_CONTENT }],
  };

  console.log(`Manuscript: ${manuscript.id}`);
  console.log(`Existing points: ${existingPoints.length}`);
  console.log(`New point: "${POINT_TITLE}" (proposedBy: ${PROPOSED_BY}, path: ${PATH_GROUP_ID})`);
  console.log(`\n${JSON.stringify(newPoint, null, 2)}\n`);

  if (!execute) {
    console.log('Dry-run only. Re-run with --execute to write.\n');
    return;
  }

  const updatedPoints = [...existingPoints, newPoint] as unknown as Prisma.InputJsonValue;

  await prisma.kip_drafts.update({
    where: { id: manuscript.id },
    data: {
      spec_json: { points: updatedPoints },
      updated_at: new Date(),
    },
  });

  console.log('Done. Point added.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
