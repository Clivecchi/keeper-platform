/**
 * Append first Agency / explicit Point-intent conclusions to Becoming Together.
 * Uses the same createDraftPoint + appendDraftPointToSpec path as draft.update.propose.
 * Dry-run default; --execute writes.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx src/scripts/append-agency-point-intent-points.ts
 *   pnpm exec tsx src/scripts/append-agency-point-intent-points.ts --execute
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { prisma } from '@keeper/database';
import type { Prisma } from '@prisma/client';
import {
  appendDraftPointToSpec,
  createDraftPoint,
  type DraftPoint,
} from '@keeper/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const DOMAIN_SLUG = 'ke3p';
const DIALOG_ID = 'cmrtyoraw0001ot0033p5wiwm';
const MANUSCRIPT_KIND = 'document_manuscript';
const MANUSCRIPT_KEY = 'becoming-together-manuscript';
const PATH_GROUP_ID = 'progress';
const PROPOSED_BY = 'Cursor';

const POINTS: Array<{ id: string; prelude: string; content: string }> = [
  {
    id: 'bt-point-agency-explicit-point-intent-2026-08-20',
    prelude: 'Explicit Point intent is a Keeper obligation',
    content: [
      'When the human explicitly asks to propose, add, capture, or put Points on a named Dialog Document, Keeper owns that a Point write must happen.',
      'This is not left to model discretion. The existing path is draft.update.propose on the Dialog’s document_manuscript — never a new working Draft, never Gloss as a substitute, never a Prisma Point table.',
    ].join('\n'),
  },
  {
    id: 'bt-point-agency-model-intelligence-keeper-agency-2026-08-20',
    prelude: 'The model supplies intelligence; Keeper supplies Agency',
    content: [
      'Keeper determines that a Point contribution is required. The model determines the wording and useful decomposition.',
      'Agency begins here: allowed capability (draft.update.propose exists) is not the same as a Turn obligation (explicit Point intent must complete the write before the Turn is done).',
    ].join('\n'),
  },
  {
    id: 'bt-point-agency-point-means-document-object-2026-08-20',
    prelude: 'Point means a Document manuscript object',
    content: [
      'When Point intent is active, Point is a Keeper Document/Draft beat stored in kip_drafts.spec_json.points — not a layout, spatial, or ordinary-language term.',
      'Cast consultations inherit the active Dialog Document and compact Point grounding so Rendr/Cloud do not replace the requested write with design vocabulary or a cold “what is this Dialog about?”',
    ].join('\n'),
  },
  {
    id: 'bt-point-agency-explicit-path-before-proactive-2026-08-20',
    prelude: 'Explicit intent first; proactive capture later',
    content: [
      'This first Agency behavior is the dependable explicit path: “make that a Point” must make a Point.',
      'Automatic capture of every substantive named-Dialog Turn is intentionally not on. Chatter / missing manuscript / failed write must say so — they must not claim success or mint an unrelated Draft.',
    ].join('\n'),
  },
];

async function main(): Promise<void> {
  const execute = process.argv.includes('--execute');
  const domain = await prisma.domain.findFirst({
    where: { slug: DOMAIN_SLUG },
    select: { id: true },
  });
  if (!domain) {
    throw new Error(`Domain ${DOMAIN_SLUG} not found`);
  }

  const manuscript = await prisma.kip_drafts.findFirst({
    where: {
      domain_id: domain.id,
      dialog_id: DIALOG_ID,
      kind: MANUSCRIPT_KIND,
      key: MANUSCRIPT_KEY,
      status: { notIn: ['promoted', 'archived'] },
    },
    select: { id: true, title: true, spec_json: true },
  });
  if (!manuscript) {
    throw new Error(`Becoming Together manuscript not found (${MANUSCRIPT_KEY})`);
  }

  const existing = Array.isArray((manuscript.spec_json as { points?: unknown[] } | null)?.points)
    ? ((manuscript.spec_json as { points: Array<{ id?: string }> }).points)
    : [];
  const existingIds = new Set(existing.map((point) => point.id).filter(Boolean));

  let spec: unknown = manuscript.spec_json;
  const created: DraftPoint[] = [];
  const skipped: string[] = [];

  for (const row of POINTS) {
    if (existingIds.has(row.id)) {
      skipped.push(row.id);
      continue;
    }
    const point = createDraftPoint({
      id: row.id,
      content: row.content,
      type: 'decision',
      proposedBy: PROPOSED_BY,
      status: 'accepted',
      prelude: row.prelude,
      pathGroupId: PATH_GROUP_ID,
    });
    spec = appendDraftPointToSpec(spec, point);
    created.push(point);
  }

  console.log(`Manuscript: ${manuscript.id} (${manuscript.title})`);
  console.log(`Existing points: ${existing.length}`);
  console.log(`New points: ${created.length}`);
  for (const point of created) {
    console.log(`  + ${point.prelude}`);
  }
  if (skipped.length) {
    console.log(`Already present (skipped): ${skipped.length}`);
  }

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to write.\n');
    return;
  }

  if (!created.length) {
    console.log('\nNothing to write.\n');
    return;
  }

  await prisma.kip_drafts.update({
    where: { id: manuscript.id },
    data: {
      spec_json: spec as Prisma.InputJsonValue,
      updated_at: new Date(),
    },
  });

  console.log('\nWrote Agency Point-intent conclusions to Becoming Together.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
