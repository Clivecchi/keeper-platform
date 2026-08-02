/**
 * Append the Object Glossary planning session Points to the existing
 * Becoming Together manuscript (Chuck + Claude, August 2026).
 *
 * Additive only — see append-document-architecture-points.ts for the pattern
 * this follows. Uses the CURRENT schema field names (document_paths /
 * pathGroupId): as of this script, schema.prisma, draftPoints.ts, and the
 * migrations directory all confirm the document_paths -> document_sections
 * rename has not landed on this branch, despite one Point in the source
 * material claiming otherwise. That Point is rewritten below to say so
 * honestly rather than assert a change that isn't verifiable here.
 *
 * Defaults to dry-run; writes only with --execute.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/append-object-glossary-points.ts
 *   npx tsx src/scripts/append-object-glossary-points.ts --execute
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
  pathGroupId: 'architecture' | 'known-issues' | 'progress';
  type: 'decision' | 'context' | 'general' | 'moment';
};

const NEW_POINTS: NewPoint[] = [
  {
    id: 'doc-arch-object-glossary-placement',
    title: 'Object Glossary placement',
    content:
      'The Keeper Object Glossary is a governing repo document (docs/), same tier as the EntityKind Recipe and Universal Board Constitution — not rendered through Chronicle directly. It will be cataloged as a Library Item (source_type: github) once Library ships, for in-platform discoverability without duplicating content. It is never called a "Document" in platform language — that word stays reserved for the Dialog-associated construct.',
    pathGroupId: 'architecture',
    type: 'decision',
  },
  {
    id: 'doc-arch-document-not-entitykind-locked',
    title: 'Document is Dialog state, not an independent EntityKind',
    content:
      "Confirmed by Chuck: Document is meant to be freeform, less-specific-shape workspace scaffolding for a Dialog — the opposite of what a fixed-schema EntityKind provides. State-on-Dialog is the correct structural match, not just the cheaper build. This retroactively ratifies code that had already shipped assuming this (migration comments, seed/append scripts). Rule going forward: \"Document\" must never appear in the EntityKind type union, enum, or Chronicle config. The Session → Dialog → Document progression Rendr/Kip floated remains rejected.",
    pathGroupId: 'architecture',
    type: 'decision',
  },
  {
    id: 'doc-arch-library-durability-model',
    title: 'Library durability model',
    content:
      "Library's existing principle — catalog and point to sources, don't duplicate — answers live-edit authority but not durability. Added: every Library Item, regardless of source_type, carries a Keeper-owned snapshot (content/hash/timestamp, or metadata+thumbnail for media) captured at ingestion and on an explicit sync action (manual/on-demand, not background polling). Keeper can reconstruct an Item's content and history even if the external source (GitHub, Drive, etc.) disappears, without becoming the live-edit surface. Target: Library build, per Recipe.",
    pathGroupId: 'architecture',
    type: 'decision',
  },
  {
    id: 'doc-arch-external-write-back-model',
    title: 'External write-back model',
    content:
      "Content-only changes to a governing doc (e.g. the glossary) don't need Cursor's codebase reasoning — the agent holding write capability for that source_type (e.g. Cloud, via its own GitHub MCP tools) executes directly. Code changes still route through Cursor. Generalized: write access to any source_type is a capability grant on an agent record, resolved at runtime — not a hardcoded agent-to-agent relationship. Same mechanism that will eventually let a personal agent act on a user's own external files, scoped per grant. Open: whether every external write-back requires explicit human approval before landing (recommended default: yes, mirroring Rendr-proposes/human-approves).",
    pathGroupId: 'architecture',
    type: 'decision',
  },
  {
    id: 'doc-arch-document-sections-rename-status',
    title: 'document_paths → document_sections rename — not yet landed on this branch',
    content:
      'A migration folder (20260802170000_dialog_document_sections_rename) and a DocumentSectionDeclaration naming intent exist, but as verified directly against chronicle-mobile-ui: schema.prisma still declares document_paths, the migration file is empty, and draftPoints.ts still uses pathGroupId — git diff HEAD is clean on all three. Either the rename landed on a different branch/session that hasn\'t merged here, or it stalled mid-attempt. Points and scripts in this Dialog should keep using document_paths/pathGroupId until the rename is confirmed and actually applied on this branch.',
    pathGroupId: 'architecture',
    type: 'context',
  },
  {
    id: 'doc-arch-id-namespace-safety-debt',
    title: 'Coincidental id-namespace safety',
    content:
      "Three code sites rely on Document pathGroupIds and Journey Path ids never colliding, without anything actually enforcing that: RealmNavEntry.pathId/pathName (live, low risk today), promoteDraftPoint's pathGroupId→Path lookup (reachable, unexercised on real data), draftManuscriptUtils clustering (live, functionally fine). All confirmed safe today by data shape, not by design. Principle to hold: Document pathGroupIds and Journey Path ids must never share an id-generation scheme or namespace — if either format changes, flag and disambiguate before shipping. Trigger conditions for the actual fix: Document Points become promotable without rejecting document_manuscript, or journey_spec points start carrying a pathGroupId, or Moments and Document sections need to render together more tightly in one shell.",
    pathGroupId: 'architecture',
    type: 'context',
  },
  {
    id: 'known-issue-stale-paths-copy',
    title: 'Stale copy referencing "Paths" instead of "Sections"',
    content:
      'The seed script\'s Forward text still reads "Shape it into Paths" — should read "Shape it into Sections," since it\'s user/agent-facing language describing the Document, not the Journey hierarchy. Low risk but worth fixing since Kip could echo the wrong term back in conversation.',
    pathGroupId: 'known-issues',
    type: 'context',
  },
  {
    id: 'known-issue-unclassified-code-objects',
    title: 'Unclassified code objects surfaced by Cursor diagnostic',
    content:
      'Cursor\'s code-derived EntityKind audit surfaced several objects with no locked definition anywhere in platform docs or prior conversation: SoleMemory, DomainAccessKey, a Topic/Task/Activity cluster, and a sharing suite — several with unmounted or stub APIs. Unlike known forward-design gaps (e.g. KeeperType), these are the reverse case: things that exist in code but were never named or decided in conversation. Needs Chuck\'s classification (keep and formalize / dead scaffolding to remove / real but undocumented direction) before the Object Glossary can include them.',
    pathGroupId: 'known-issues',
    type: 'context',
  },
  {
    id: 'progress-object-glossary-status',
    title: 'Object Glossary status',
    content:
      'In progress, not yet drafted. Blocked on: (1) classification of the unclassified code objects above, (2) confirmation of which forward-design-only concepts (KeeperType, possible Engagement templates) belong in the glossary as "designed, pending build" entries, (3) resolving the remaining EntityKind-status list from Cursor\'s diagnostic (fully wired: Key, Capability, LibraryItem, Keeper; partial: Integration/Service, Agent, Domain, Journey, Path, Moment, Draft, Dialog). Glossary will be structured in three tiers: code-confirmed, designed-pending-build, and named-but-undefined — rather than one flat list.',
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
  console.log(`\n=== Append Object Glossary Points (${mode}) ===\n`);

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
