/**
 * Seed real Becoming Together Document content onto the existing Dialog.
 *
 * - Writes Forward / Step / document_paths onto Dialog cmrtyoraw0001ot0033p5wiwm
 * - Upserts one document_manuscript kip_draft with real Points (incl. Cursor credits)
 * - Defaults to dry-run; writes only with --execute
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/seed-becoming-together-document.ts
 *   npx tsx src/scripts/seed-becoming-together-document.ts --execute
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

const FORWARD_TITLE = 'Becoming Together';
const FORWARD_DESCRIPTION =
  'Kip, Cloud, Ceox, Cursor, Rendr, and Chuck share one Document — the same current truth, read and written the same way on every board. Capture what actually happened. Shape it into Paths. Keep what holds. Show it here.';

const STEP_TITLE = 'The Document is real — Forward, Step, and Points live on the Dialog';
const STEP_BODY =
  'Placeholder Forward/Step are gone. Cast members can be consulted for real minimal input, or Kip says plainly it got nothing back. Invite adds a second human. Cursor\'s shipped work appears as Points credited to Cursor.';

const DOCUMENT_PATHS = [
  {
    id: 'progress',
    title: 'Progress',
    prelude: 'What actually shipped and stuck.',
  },
  {
    id: 'known-issues',
    title: 'Known Issues',
    prelude: 'Honest gaps — named, not papered over.',
  },
  {
    id: 'development',
    title: 'Development',
    prelude: 'Build work that moved the platform.',
  },
  {
    id: 'cast',
    title: 'Cast & Orchestration',
    prelude: 'Who is in the room, and how they speak.',
  },
] as const;

type SeedPoint = {
  id: string;
  title: string;
  content: string;
  proposedBy: string;
  pathGroupId: string;
  type: 'decision' | 'context' | 'general' | 'moment';
  status: 'accepted' | 'proposed' | 'pending';
};

const POINTS: SeedPoint[] = [
  {
    id: 'bt-point-dialog-exists',
    title: 'Becoming Together Dialog exists',
    content:
      'ke3p has exactly one active Dialog — Becoming Together (cmrtyoraw0001ot0033p5wiwm). Other auto-titled board Dialogs were archived; orphan drafts moved to Library Archive pointers. document_status remains drafts until something is promoted.',
    proposedBy: 'Cloud',
    pathGroupId: 'progress',
    type: 'decision',
    status: 'accepted',
  },
  {
    id: 'bt-point-chronicle-universal',
    title: 'Chronicle shows the Document on every board',
    content:
      'Focused Dialog routes to DomainRealmStory / DocumentShell on Domain, Realm, IDE, and Designer — not Realm-only. Selecting Becoming Together in Nav shows the same Document shell everywhere.',
    proposedBy: 'Cloud',
    pathGroupId: 'progress',
    type: 'decision',
    status: 'accepted',
  },
  {
    id: 'bt-point-cross-domain-cast',
    title: 'Cross-domain cast membership is real',
    content:
      'Ceox can be added to ke3p\'s cast via the Cast Header Add flow. DialogCastMember persists; Admin on the home domain is re-checked server-side. Guest cast members are labeled Cast, not Lead.',
    proposedBy: 'Cloud',
    pathGroupId: 'cast',
    type: 'decision',
    status: 'accepted',
  },
  {
    id: 'bt-point-eager-dialogs-stopped',
    title: 'Eager Dialog/session creation stopped',
    content:
      'Board mount and prefetch are resume-only. Dialog + session create waits for the first real send. Two rounds of un-gated creation produced 36+ orphan echo sessions; archive path uses kip_sessions.is_archived.',
    proposedBy: 'Cursor',
    pathGroupId: 'development',
    type: 'context',
    status: 'accepted',
  },
  {
    id: 'bt-point-session-domain-scope',
    title: 'Agent recent sessions scoped by domain',
    content:
      'GET /api/agents/:id?domainId= filters via dialog.domain_id, excludes archived and dialog-less orphans. presenceEnrichment passes domainId it already has — stops cross-domain session leak in Chronicle.',
    proposedBy: 'Cursor',
    pathGroupId: 'development',
    type: 'context',
    status: 'accepted',
  },
  {
    id: 'bt-point-document-content',
    title: 'Document content attached to the Dialog',
    content:
      'Forward, Step, and path declarations live on Dialog columns. Points live in a document_manuscript draft under this Dialog. No Journey, no new top-level entity. Placeholder strings in DomainRealmStory are gone.',
    proposedBy: 'Cursor',
    pathGroupId: 'development',
    type: 'decision',
    status: 'accepted',
  },
  {
    id: 'bt-point-delegation',
    title: 'Lead-initiated cast consultation',
    content:
      'delegate.consult runs a real minimal sub-turn against an enabled cast member. Kip synthesizes only from returned text — or says plainly it got nothing back. Inventing another agent\'s quote is forbidden.',
    proposedBy: 'Cursor',
    pathGroupId: 'cast',
    type: 'decision',
    status: 'accepted',
  },
  {
    id: 'bt-point-invite',
    title: 'Invite a second human',
    content:
      'Cast Header Invite opens a real form against POST /connections/invite. Existing users get DomainPermission immediately; email invites return a copyable accept link. Accept route redeems the token.',
    proposedBy: 'Cursor',
    pathGroupId: 'cast',
    type: 'decision',
    status: 'accepted',
  },
  {
    id: 'bt-point-ceox-empty-seat',
    title: 'Ceox can sit in the cast — consultation is real, not filled in',
    content:
      'Ceox is enableable as a cast member. When consulted, Kip returns Ceox\'s real reply or reports empty honestly. An empty seat is information; dressing it up with invented quotes is not allowed.',
    proposedBy: 'Kip',
    pathGroupId: 'known-issues',
    type: 'context',
    status: 'proposed',
  },
  {
    id: 'bt-point-self-organizing-step',
    title: 'Self-organizing Step is still hand-maintained',
    content:
      'Step is honest current tip text stored on the Dialog — not a placeholder claiming it isn\'t. Layer 3 (auto-choosing the next Step from lineage) is not built; Back/Forward stay disabled until it is.',
    proposedBy: 'Chuck',
    pathGroupId: 'known-issues',
    type: 'context',
    status: 'pending',
  },
];

function parseArgs(argv: string[]): { execute: boolean } {
  return { execute: argv.includes('--execute') };
}

function toDraftPoints(now: string): Prisma.InputJsonValue {
  return POINTS.map((point) => ({
    id: point.id,
    content: point.content,
    status: point.status,
    type: point.type,
    proposedBy: point.proposedBy,
    createdAt: now,
    updatedAt: now,
    prelude: point.title,
    pathGroupId: point.pathGroupId,
    moments: [{ title: point.title, narrative: point.content }],
  })) as unknown as Prisma.InputJsonValue;
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';
  console.log(`\n=== Seed Becoming Together Document (${mode}) ===\n`);

  const domain = await prisma.domain.findFirst({
    where: { slug: DOMAIN_SLUG },
    select: { id: true, slug: true, ownerId: true },
  });
  if (!domain) throw new Error(`No domain found with slug "${DOMAIN_SLUG}"`);
  if (!domain.ownerId) throw new Error(`Domain ${DOMAIN_SLUG} has no ownerId`);

  const dialog = await prisma.dialog.findFirst({
    where: { id: DIALOG_ID, domain_id: domain.id },
  });
  if (!dialog) {
    throw new Error(
      `Dialog ${DIALOG_ID} not found on ${DOMAIN_SLUG}. Run consolidation first.`,
    );
  }

  console.log(`Dialog: ${dialog.title} (${dialog.id})`);
  console.log(`Forward: ${FORWARD_TITLE}`);
  console.log(`Step: ${STEP_TITLE}`);
  console.log(`Paths: ${DOCUMENT_PATHS.map((p) => p.title).join(', ')}`);
  console.log(`Points: ${POINTS.length} (Cursor: ${POINTS.filter((p) => p.proposedBy === 'Cursor').length})`);

  const existingManuscript = await prisma.kip_drafts.findFirst({
    where: {
      domain_id: domain.id,
      kind: MANUSCRIPT_KIND,
      key: MANUSCRIPT_KEY,
    },
    select: { id: true, title: true, dialog_id: true },
  });
  console.log(
    existingManuscript
      ? `Manuscript draft exists: ${existingManuscript.id}`
      : 'Manuscript draft will be created',
  );

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to write.\n');
    return;
  }

  const now = new Date().toISOString();

  await prisma.dialog.update({
    where: { id: DIALOG_ID },
    data: {
      forward_title: FORWARD_TITLE,
      forward_description: FORWARD_DESCRIPTION,
      step_title: STEP_TITLE,
      step_body: STEP_BODY,
      document_paths: [...DOCUMENT_PATHS],
    },
  });

  const specJson = {
    points: toDraftPoints(now),
  };

  if (existingManuscript) {
    await prisma.kip_drafts.update({
      where: { id: existingManuscript.id },
      data: {
        title: 'Becoming Together · manuscript',
        summary: 'Shared Document Points for Becoming Together — Kip, Cloud, Ceox, Cursor, Rendr, Chuck.',
        status: 'draft',
        dialog_id: DIALOG_ID,
        spec_json: specJson,
        updated_at: new Date(),
      },
    });
    console.log(`Updated manuscript ${existingManuscript.id}`);
  } else {
    const created = await prisma.kip_drafts.create({
      data: {
        domain_id: domain.id,
        owner_id: domain.ownerId,
        kind: MANUSCRIPT_KIND,
        key: MANUSCRIPT_KEY,
        title: 'Becoming Together · manuscript',
        summary: 'Shared Document Points for Becoming Together — Kip, Cloud, Ceox, Cursor, Rendr, Chuck.',
        status: 'draft',
        dialog_id: DIALOG_ID,
        spec_json: specJson,
      },
    });
    console.log(`Created manuscript ${created.id}`);
  }

  console.log('\nDone. Open /d/ke3p?board=domain, focus Becoming Together, read Chronicle.\n');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
