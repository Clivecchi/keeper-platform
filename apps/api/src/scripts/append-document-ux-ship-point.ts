/**
 * Append Document UX ship Point to Becoming Together.
 * Dry-run default; --execute writes.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx src/scripts/append-document-ux-ship-point.ts
 *   pnpm exec tsx src/scripts/append-document-ux-ship-point.ts --execute
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

const POINT_ID = 'bt-point-document-ux-ship-2026-08-06';
const POINT_TITLE = 'Document UX ship — Gloss, Point cards, Style: Vibe';
const POINT_CONTENT = [
  'Cursor shipped a Document Chronicle health pass (2026-08-06) so polish can happen inside Keeper.',
  '',
  'Shipped in code:',
  '• Document Point Gloss — inline polish panel (stable gloss-carrier); no body replay; roomy Chronicle surface; rewrite honesty (status note if no draft.point.rewrite); Document reload + Updated cue; Glossed badge when a thread exists.',
  '• Point card UX — author/voice + type + status; title expands; More/Less instead of competing Open+Gloss text; Voices · N; Gloss pill with activity cue.',
  '• Document search — Search Points… in Chronicle Document.',
  '• Document/section media slots — Forward.imageUrl + Path imageUrl ready; cinematic Forward header.',
  '• Reading fonts — shared --theme-font-display / body scale so Dialog and Document feel like one book.',
  '• Screen capture — composer tool next to attach, with a divider before Send.',
  '• Dialog Style Vibe — dialogStyle separate from Cueing; Domain/Realm default Style: Vibe; Cast auto-cued; short-beat cast prompts. Vocabulary: Cast / Cueing / Dialog Style (Glossed earlier).',
  '',
  'Still open (not this ship): named leftover section curation Acts; full picture-book imagery generation by Lead/Rendr; attachment-follows-user-message; choice-select.',
  '',
  'Jive Builder note: Vibe is room rhythm — Lead carries; Cast adds short presence; Document Points surface when the jive earns them.',
].join('\n');
const PATH_GROUP_ID = 'progress';
const PROPOSED_BY = 'Cursor';

const STEP_TITLE = 'Document UX ship — live';
const STEP_BODY =
  'Document Gloss + Point card health + Style: Vibe + capture + search landed. Next tip: quieter curation / picture-book media generation when Lead mints imagery.';

function parseArgs(argv: string[]): { execute: boolean } {
  return { execute: argv.includes('--execute') };
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`\n=== Document UX ship Point (${mode}) ===\n`);

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
      ? `Point ${POINT_ID} already present — will refresh content + Step.`
      : `New point: "${POINT_TITLE}" (accepted, path: ${PATH_GROUP_ID})`,
  );

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to write.\n');
    return;
  }

  const updatedPoints = alreadyHasPoint
    ? existingPoints.map((p) => (p.id === POINT_ID ? { ...p, ...newPoint, createdAt: (p as { createdAt?: string }).createdAt ?? now } : p))
    : [...existingPoints, newPoint];

  await prisma.kip_drafts.update({
    where: { id: manuscript.id },
    data: {
      spec_json: {
        ...(typeof specJson === 'object' && specJson ? specJson : {}),
        points: updatedPoints as unknown as Prisma.InputJsonValue,
      } as Prisma.InputJsonValue,
      updated_at: new Date(),
    },
  });

  await prisma.dialog.update({
    where: { id: DIALOG_ID },
    data: {
      step_title: STEP_TITLE,
      step_body: STEP_BODY,
      updated_at: new Date(),
    },
  });

  console.log('\nWrote Point + Step tip.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
