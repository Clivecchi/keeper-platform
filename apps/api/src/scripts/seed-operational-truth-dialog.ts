/**
 * Keeper Operational Truth — private KE3P Dialog.
 * available_to is keeper and user_id is the Domain owner.
 * Points are proposed. Accepting one does not verify the requirement.
 * Refuses to write Points if another user can see the Dialog.
 * Point bodies stay out unless OT_IMPORT_POINTS=1. The deployed catalog and
 * dialog.read do not use this filter yet, so a Point written now is readable
 * by any agent on the running API.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx src/scripts/seed-operational-truth-dialog.ts
 */
import 'dotenv/config';
import { prisma, type Prisma } from '@keeper/database';
import { createDraftPoint, type DraftPoint } from '@keeper/shared';
import { dialogAudienceWhere } from '../services/kip/dialogVisibility.js';
import { ensureDialogDocumentManuscript } from '../services/kip/ensureDialogDocumentManuscript.js';

const TITLE = 'Keeper Operational Truth';

const POINTS: Array<{ prelude: string; content: string }> = [
  {
    prelude: 'Decisions 2026-10-08',
    content: 'Chuck approved product intent, separate from implementation evidence. KE3P is the acceptance Domain. Frogmore stays the Living Discovery case. Domain Config stays on the Board Chronicle as a provisional refinement of the Blueprint Config Frame. A written handoff is enough ownership for this slice and does not resume work by itself. Ceox has an Agency Core and no new permissions. This Dialog is keeper-scoped to the Domain owner. Accepting a Point does not verify the requirement.',
  },
  {
    prelude: 'Handoff',
    content: 'Objective: finish MVP continuity on KE3P without a new work system. Owner: Cursor implements; Chuck confirms meaning. Status: in progress on commit cf16e1e8 plus the uncommitted access and claim fixes in this working tree. Blocker: production web and API SHAs are unknown, so a live screen is not that commit. Claim of an anonymous Moment requires Chuck\'s session. Finding the Plot was not replayed because no local server was running. Next action: replay Dialog and Stage on a named commit, then claim one anonymous Moment while signed in. Completion evidence: reload of the same Place and Work, and a kept Moment whose anonymous key can no longer write it.',
  },
  {
    prelude: 'OT01',
    content: 'Guest /d/ke3p opens Cover. Members use the Board. Diagnostics remains a guest Frame. Domain Config is Chronicle, not ?frame=config. That placement is a provisional refinement, not a dropped requirement. Discoverability of Config still needs a signed-in check.',
  },
  {
    prelude: 'OT03',
    content: 'Anonymous create, update, and keep succeeded on KE3P for Moment cmv04wg0l0006mr01u06qrove at 2026-10-08T22:54:55.202Z. The row was unclaimed. Unauthenticated claim returned 401. The unclaimed row was deleted so it would not stay on the public feed. The diagnostic now treats kept plus matching id and Domain as success, then checks that the anonymous key lost write access.',
  },
  {
    prelude: 'OT16',
    content: 'Commit cf16e1e8 forwards a specialist receipt to the Lead when the reply has no prose. Unit tests passed. No live model turn was replayed. Not deployed.',
  },
  {
    prelude: 'OT17',
    content: 'Ceox platform core lists catalog.read, dialog.read, draft.read, library.read, and glossary.read. It does not add draft.update.propose, treatment.propose, stage.story.layout, or mcp.call. The core is in the working tree after cf16e1e8 and is not deployed.',
  },
  {
    prelude: 'OT26',
    content: 'Present is ?frame=present. With journeyId it reads a public journey. Without it, it renders the presentation board. There is no share, destination, or release control. Do not extend Present until that contract is the one being built.',
  },
  {
    prelude: 'OT28',
    content: 'This Dialog holds proposed records. The full audit is docs/keeper-operational-truth.md in the repository. Library has no private flag, so the full document was not copied there. Catalog dialog titles now follow the same audience rule as the Dialog list.',
  },
];

async function main(): Promise<void> {
  const domain = await prisma.domain.findFirst({
    where: { slug: 'ke3p' },
    select: { id: true, ownerId: true },
  });
  if (!domain?.ownerId) throw new Error('KE3P domain or owner missing');

  const other = await prisma.users.findFirst({
    where: { id: { not: domain.ownerId } },
    select: { id: true },
  });
  if (!other?.id) throw new Error('No second user available to test the access boundary');

  let dialog = await prisma.dialog.findFirst({
    where: { domain_id: domain.id, title: TITLE, is_archived: false },
  });
  if (!dialog) {
    dialog = await prisma.dialog.create({
      data: {
        title: TITLE,
        title_source: 'user_set',
        domain_id: domain.id,
        user_id: domain.ownerId,
        available_to: ['keeper'],
        context: { board: 'realm', subject: 'operational-truth' },
        document_status: 'drafts',
        forward_title: 'Operational Truth',
        forward_description: 'Proposed records. Accepting a Point does not verify the requirement.',
      },
    });
  }

  const ownerSees = await prisma.dialog.findFirst({
    where: { id: dialog.id, AND: [dialogAudienceWhere(domain.ownerId)] },
    select: { id: true },
  });
  const otherSees = await prisma.dialog.findFirst({
    where: { id: dialog.id, AND: [dialogAudienceWhere(other.id)] },
    select: { id: true },
  });
  const anonymousSees = await prisma.dialog.findFirst({
    where: { id: dialog.id, AND: [dialogAudienceWhere(null)] },
    select: { id: true },
  });

  const boundaryOk = Boolean(ownerSees) && !otherSees && !anonymousSees
    && dialog.available_to.length === 1
    && dialog.available_to[0] === 'keeper'
    && dialog.user_id === domain.ownerId;

  console.log(JSON.stringify({
    dialogId: dialog.id,
    ownerSees: Boolean(ownerSees),
    otherSees: Boolean(otherSees),
    anonymousSees: Boolean(anonymousSees),
    boundaryOk,
  }));

  if (!boundaryOk) {
    throw new Error('Access boundary failed. Points were not written.');
  }

  if (process.env.OT_IMPORT_POINTS !== '1') {
    console.log(JSON.stringify({
      points: 'withheld',
      reason: 'Deployed dialog.read and catalog do not use dialogAudienceWhere yet.',
    }));
    return;
  }

  const manuscript = await ensureDialogDocumentManuscript({
    domainId: domain.id,
    dialogId: dialog.id,
    dialogTitle: TITLE,
    userId: domain.ownerId,
  });
  if (!manuscript) throw new Error('Manuscript was not created');

  const draft = await prisma.kip_drafts.findUnique({
    where: { id: manuscript.id },
    select: { spec_json: true },
  });
  const spec = draft?.spec_json && typeof draft.spec_json === 'object' && !Array.isArray(draft.spec_json)
    ? draft.spec_json as Record<string, unknown>
    : {};
  const existing = Array.isArray(spec.points) ? spec.points as DraftPoint[] : [];
  const have = new Set(existing.map((point) => point.prelude).filter(Boolean));
  const added = POINTS
    .filter((point) => !have.has(point.prelude))
    .map((point) => createDraftPoint({
      prelude: point.prelude,
      content: point.content,
      proposedBy: 'Cursor',
      status: 'proposed',
      type: 'decision',
    }));
  if (added.length) {
    await prisma.kip_drafts.update({
      where: { id: manuscript.id },
      data: {
        spec_json: { ...spec, points: [...existing, ...added] } as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });
  }
  console.log(JSON.stringify({
    manuscriptId: manuscript.id,
    added: added.map((point) => point.prelude),
    total: existing.length + added.length,
  }));
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
