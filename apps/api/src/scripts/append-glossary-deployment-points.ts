/**
 * Append the Object Glossary deployment planning Points (Batch 3) to the
 * existing Becoming Together manuscript (Chuck + Claude, August 2026).
 *
 * Additive only — see append-document-architecture-points.ts for the
 * pattern this follows. Uses the current schema field names (document_paths
 * / pathGroupId) — see append-object-glossary-points.ts for why: the
 * document_paths -> document_sections rename has not landed on this branch.
 *
 * Defaults to dry-run; writes only with --execute.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/append-glossary-deployment-points.ts
 *   npx tsx src/scripts/append-glossary-deployment-points.ts --execute
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
const PROPOSED_BY = 'Claude';

type NewPoint = {
  id: string;
  title: string;
  content: string;
  pathGroupId: 'architecture' | 'progress';
  type: 'decision' | 'context' | 'general' | 'moment';
};

const NEW_POINTS: NewPoint[] = [
  {
    id: 'doc-arch-glossary-rendering-document-gloss',
    title: 'Glossary rendering approach: Document/Chronicle + Gloss, not a new EntityKind',
    content:
      'Rejected a GlossaryTerm EntityKind in favor of using existing architecture: the glossary is a Library Item (source_type: github) whose structured content (individual term entries) needs to render in Chronicle as discrete, Gloss-addressable points, with edits flowing through the already-locked External Write-Back Model (Cloud, holding the GitHub write grant, commits directly — no Cursor hop, no EntityKind ceremony). Reasoning: universal pattern loyalty over feature accumulation — Document rendering, Gloss, and the write-back model already do this job; a new EntityKind would duplicate it.',
    pathGroupId: 'architecture',
    type: 'decision',
  },
  {
    id: 'doc-arch-gloss-already-deployed-correction',
    title: 'Correction: Gloss is already deployed, not locked-and-unbuilt',
    content:
      'Prior planning treated Gloss as "locked, unbuilt." Chuck confirms Gloss is already deployed and needs some work — status unconfirmed in detail. A diagnostic on Gloss\'s actual current state is needed before planning point-level glossary editing, rather than assuming it\'s starting from zero.',
    pathGroupId: 'architecture',
    type: 'context',
  },
  {
    id: 'doc-arch-agent-access-model-glossary',
    title: 'Agent access model for the glossary: universal read, scoped write',
    content:
      "Every agent can read the glossary with no external credential required, once it's ingested as a Library Item — content lives in Keeper's own storage via the durability/snapshot model, same as any other Library Item or Training Mode governance injection. Only writing back to the GitHub source requires GitHub access, and only the specific agent holding that capability grant (currently Cloud) needs it — not a platform-wide credential. This is the capability-grant model applied to agents: read is universal and Keeper-native; write is a scoped, single-agent grant. If another agent (e.g. Rendr, for Treatment-related docs) needs write access later, that's a separate grant, not a broadened one.",
    pathGroupId: 'architecture',
    type: 'decision',
  },
  {
    id: 'progress-glossary-ready-initial-deployment',
    title: 'Glossary: ready for initial deployment',
    content:
      'Draft v1 of the Keeper Object Glossary is complete and reviewed. Next: Cursor commits it to the repo, catalogs it as a Library Item, and wires agent-facing reference (Training Mode Governance injection for immediate read access). Chronicle structured-rendering and Gloss point-level editing are follow-on work, pending a diagnostic on Gloss\'s current build state.',
    pathGroupId: 'progress',
    type: 'general',
  },
];

function parseArgs(argv: string[]): { execute: boolean } {
  return { execute: argv.includes('--execute') };
}

function toNewDraftPoints(now: string): Record<string, unknown>[] {
  return NEW_POINTS.map((point) => ({
    id: point.id,
    content: point.content,
    status: 'proposed',
    type: point.type,
    proposedBy: PROPOSED_BY,
    createdAt: now,
    updatedAt: now,
    prelude: point.title,
    pathGroupId: point.pathGroupId,
    moments: [{ title: point.title, narrative: point.content }],
  }));
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`\n=== Append Glossary Deployment Points (${mode}) ===\n`);

  const domain = await prisma.domain.findFirst({
    where: { slug: DOMAIN_SLUG },
    select: { id: true, slug: true },
  });
  if (!domain) throw new Error(`No domain found with slug "${DOMAIN_SLUG}"`);

  const dialog = await prisma.dialog.findFirst({
    where: { id: DIALOG_ID, domain_id: domain.id },
    select: { id: true, title: true, document_paths: true },
  });
  if (!dialog) throw new Error(`Dialog ${DIALOG_ID} not found on ${DOMAIN_SLUG}.`);

  const manuscript = await prisma.kip_drafts.findFirst({
    where: { domain_id: domain.id, kind: MANUSCRIPT_KIND, key: MANUSCRIPT_KEY },
    select: { id: true, spec_json: true },
  });
  if (!manuscript) throw new Error('Manuscript draft not found — expected it to already exist.');

  const existingSpec = (manuscript.spec_json ?? {}) as { points?: Record<string, unknown>[] };
  const existingPoints = Array.isArray(existingSpec.points) ? existingSpec.points : [];
  const existingIds = new Set(existingPoints.map((p) => p.id));
  const colliding = NEW_POINTS.filter((p) => existingIds.has(p.id));
  if (colliding.length > 0) {
    throw new Error(`Refusing to run: id collision with existing points: ${colliding.map((p) => p.id).join(', ')}`);
  }

  const existingPaths = Array.isArray(dialog.document_paths)
    ? (dialog.document_paths as { id: string }[])
    : [];
  const requiredSections = Array.from(new Set(NEW_POINTS.map((p) => p.pathGroupId)));
  const missingSections = requiredSections.filter((id) => !existingPaths.some((p) => p.id === id));
  if (missingSections.length > 0) {
    throw new Error(`Refusing to run: expected sections missing from document_paths: ${missingSections.join(', ')}`);
  }

  console.log(`Dialog: ${dialog.title} (${dialog.id})`);
  console.log(`Manuscript: ${manuscript.id}`);
  console.log(`Existing points: ${existingPoints.length}`);
  console.log(`New points to append: ${NEW_POINTS.length}`);
  NEW_POINTS.forEach((p) => console.log(`  - [${p.pathGroupId}] ${p.id}`));

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to write.\n');
    return;
  }

  const now = new Date().toISOString();
  const mergedPoints = [...existingPoints, ...toNewDraftPoints(now)];

  await prisma.kip_drafts.update({
    where: { id: manuscript.id },
    data: {
      spec_json: { ...existingSpec, points: mergedPoints } as unknown as Prisma.InputJsonValue,
      updated_at: new Date(),
    },
  });

  console.log(`\nDone. Manuscript now has ${mergedPoints.length} points.\n`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
