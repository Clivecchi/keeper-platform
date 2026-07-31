/**
 * Append the Document Architecture — Draft Hierarchy Capture Points to the
 * existing Becoming Together manuscript.
 *
 * Additive only: reads the current spec_json.points and document_paths,
 * appends new entries, and writes back the merged result. Never replaces
 * existing points (unlike seed-becoming-together-document.ts, which is a
 * full overwrite and must not be re-run against live content).
 *
 * Defaults to dry-run; writes only with --execute.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/append-document-architecture-points.ts
 *   npx tsx src/scripts/append-document-architecture-points.ts --execute
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

const NEW_PATH = {
  id: 'architecture',
  title: 'Document Architecture',
  prelude: 'Foundational decisions about how the Document system itself is structured.',
} as const;

type NewPoint = {
  id: string;
  title: string;
  content: string;
  type: 'decision' | 'context' | 'general' | 'moment';
};

const NEW_POINTS: NewPoint[] = [
  {
    id: 'doc-arch-document-is-dialog-state',
    title: 'Document is a state of Dialog',
    content:
      "Document is not a separate EntityKind — it's a state a Dialog enters, the same pattern already locked for Draft. The diagnostic confirms Document content is already stored as a kip_drafts row (document_manuscript) linked via dialog_id, not a separate model. What's missing is Document's presence in the EntityKind-adjacent type unions and a proper cover schema — not a new table.",
  },
  {
    id: 'doc-arch-one-manuscript-per-dialog',
    title: 'One draft manuscript per Dialog, not many',
    content:
      "A Dialog has one linked document_manuscript draft, edited in place across sessions — not a new draft per session. Multiplicity shows up as versions of that one draft (kip_draft_versions), not parallel drafts. Open sub-question: should individual Points become real, independently promotable Draft rows through the same accept/promote flow, or stay status-tagged entries inside one JSON blob? Not resolved — needs its own pass before build.",
  },
  {
    id: 'doc-arch-draft-hierarchy-shape',
    title: "Document's shape is a draft hierarchy, not a flat list",
    content:
      "Document doesn't self-organize into an arbitrary shape, and it isn't a flat list either. It proposes a provisional structure — Points arranged the way a Journey/Path/Moment hierarchy would look, before any of it is real. Self-organization lives in the proposed arrangement, not in inventing arbitrary categories, and not in a flat inventory.",
  },
  {
    id: 'doc-arch-promoted-becomes-anchor',
    title: 'Promoted content becomes a fixed anchor',
    content:
      'When a Point promotes, it stops being draft content and becomes a real EntityKind reference (an actual Moment/Path/Journey id) — but stays visible in the Document as a fixed anchor. Still-provisional content aligns relative to that anchor instead of guessing at structure from a blank state. Rendering must visually distinguish anchored vs. still-shaping content, not present both as one undifferentiated list.',
  },
  {
    id: 'doc-arch-three-context-tiers',
    title: 'Three context tiers, outer to inner',
    content:
      'Document context resolves in three tiers, outer to inner: Domain anchors (structure that pre-existed in the Domain — a direct use case for the Domain Graph concept), Document anchors (structure promoted from this Dialog), and draft content (still shaping, not yet promoted). A Document should check Domain anchors before inventing new structure — the same seek-existing-structure-first discipline as promotion, one level up.',
  },
  {
    id: 'doc-arch-anchors-ai-context-priority',
    title: 'Anchors as AI context priority (open)',
    content:
      'Anchors (Domain and Document tier) are compact, stable, and durable — an id, a name, a relation. Draft content is verbose and shifting. Agents working within a Document should be able to load the anchor map first and pull in draft content only where relevant to the current turn — a context-window efficiency concern, not yet solved. Worth its own future pass, possibly under Dialog Verbs or its own capture.',
    type: 'context' as const,
  },
  {
    id: 'doc-arch-rejected-session-dialog-doc-framing',
    title: 'Rejected: Session → Dialog → Document progression',
    content:
      "The Session → Dialog (when it earns it) → Document (when it's ready) progression proposed in an earlier Rendr/Kip exchange doesn't match the platform's actual architecture and isn't carried forward. kip_sessions is already a distinct, permanent concept; Dialog is already a distinct, permanent container grouping multiple sessions — a Dialog isn't something a session earns its way into. What's self-organizing is what happens once a Dialog starts producing content worth keeping (the promotion moment), not the Dialog's existence.",
    type: 'context' as const,
  },
].map((p) => ({ ...p, type: p.type ?? 'decision' })) as NewPoint[];

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
    pathGroupId: NEW_PATH.id,
    moments: [{ title: point.title, narrative: point.content }],
  }));
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`\n=== Append Document Architecture Points (${mode}) ===\n`);

  const domain = await prisma.domain.findFirst({
    where: { slug: DOMAIN_SLUG },
    select: { id: true, slug: true, ownerId: true },
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
  const pathExists = existingPaths.some((p) => p.id === NEW_PATH.id);

  console.log(`Dialog: ${dialog.title} (${dialog.id})`);
  console.log(`Manuscript: ${manuscript.id}`);
  console.log(`Existing points: ${existingPoints.length}`);
  console.log(`New points to append: ${NEW_POINTS.length} (${NEW_POINTS.map((p) => p.id).join(', ')})`);
  console.log(pathExists ? `Path "${NEW_PATH.id}" already exists — will not duplicate` : `New path to add: ${NEW_PATH.id}`);

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to write.\n');
    return;
  }

  const now = new Date().toISOString();
  const mergedPoints = [...existingPoints, ...toNewDraftPoints(now)];
  const mergedPaths = pathExists ? existingPaths : [...existingPaths, NEW_PATH];

  if (!pathExists) {
    await prisma.dialog.update({
      where: { id: DIALOG_ID },
      data: { document_paths: mergedPaths as unknown as Prisma.InputJsonValue },
    });
  }

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
