/**
 * Append Boards-as-lenses presentational lock Point to Becoming Together
 * and update Dialog Step tip. Dry-run default; --execute writes.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx src/scripts/append-boards-as-lenses-lock.ts
 *   pnpm exec tsx src/scripts/append-boards-as-lenses-lock.ts --execute
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

const POINT_ID = 'bt-point-boards-as-lenses-presentational';
const POINT_TITLE = 'Boards-as-lenses — presentational only';
const POINT_CONTENT =
  'Locked lean (cast-backed, Ceox + Cloud + Rendr consult): Boards act as lenses on one Dialog Document — they change emphasis and atmosphere, not ownership or source of truth. Strategy / Design / Build elevate different voices and treatment; the Document and Dialog stay singular. Binding agent prominence to boards is still open build work; choice-select UI is a later capability. Decision consults should surface Lock / Open / Next Step as keeper-cards, not essays.';
const PATH_GROUP_ID = 'progress';
const PROPOSED_BY = 'Cursor';

const STEP_TITLE = 'Boards-as-lenses — presentational';
const STEP_BODY =
  'Lock lean held: boards shift emphasis on one Document. Next — decision consults emit keeper-cards (Lock / Open / Next Step); Chronicle Document paths stay collapsed until opened.';

function parseArgs(argv: string[]): { execute: boolean } {
  return { execute: argv.includes('--execute') };
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`\n=== Boards-as-lenses presentational lock (${mode}) ===\n`);

  const domain = await prisma.domain.findFirst({
    where: { slug: DOMAIN_SLUG },
    select: { id: true },
  });
  if (!domain) throw new Error(`No domain found with slug "${DOMAIN_SLUG}"`);

  const manuscript = await prisma.kip_drafts.findFirst({
    where: {
      domain_id: domain.id,
      kind: MANUSCRIPT_KIND,
      key: MANUSCRIPT_KEY,
      dialog_id: DIALOG_ID,
    },
    select: { id: true, spec_json: true },
  });
  if (!manuscript) {
    throw new Error('Manuscript draft not found — run seed-becoming-together-document.ts first.');
  }

  const specJson = manuscript.spec_json as { points?: Array<{ id: string }> } | null;
  const existingPoints = Array.isArray(specJson?.points) ? [...specJson!.points!] : [];
  const alreadyHasPoint = existingPoints.some((p) => p.id === POINT_ID);

  const now = new Date().toISOString();
  const newPoint = {
    id: POINT_ID,
    content: POINT_CONTENT,
    status: 'accepted',
    type: 'decision',
    proposedBy: PROPOSED_BY,
    createdAt: now,
    updatedAt: now,
    prelude: POINT_TITLE,
    pathGroupId: PATH_GROUP_ID,
    moments: [{ title: POINT_TITLE, narrative: POINT_CONTENT }],
  };

  console.log(`Manuscript: ${manuscript.id}`);
  console.log(`Existing points: ${existingPoints.length}`);
  console.log(
    alreadyHasPoint
      ? `Point ${POINT_ID} already present — will refresh Step only.`
      : `New point: "${POINT_TITLE}" (accepted, path: ${PATH_GROUP_ID})`,
  );
  console.log(`Step tip → ${STEP_TITLE}: ${STEP_BODY}`);

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to write.\n');
    return;
  }

  if (!alreadyHasPoint) {
    const updatedPoints = [...existingPoints, newPoint] as unknown as Prisma.InputJsonValue;
    await prisma.kip_drafts.update({
      where: { id: manuscript.id },
      data: {
        spec_json: { ...(typeof specJson === 'object' && specJson ? specJson : {}), points: updatedPoints },
        updated_at: new Date(),
      },
    });
  }

  await prisma.dialog.update({
    where: { id: DIALOG_ID },
    data: {
      step_title: STEP_TITLE,
      step_body: STEP_BODY,
      updated_at: new Date(),
    },
  });

  console.log('\nDone. Point + Step updated.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
