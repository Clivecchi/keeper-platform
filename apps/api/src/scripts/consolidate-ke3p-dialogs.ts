/**
 * ke3p Becoming Together consolidation — production data migration.
 *
 * Creates the real "Becoming Together" Dialog, archives the domain's other
 * Dialogs (+ their attached drafts), and converts dialog-less drafts into
 * LibraryItem archive pointers (keeper://draft/{id}).
 *
 * Defaults to dry-run. Writes only with an explicit --execute flag.
 * Scoped to slug "ke3p" only. Nothing is permanently deleted.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/consolidate-ke3p-dialogs.ts
 *   npx tsx src/scripts/consolidate-ke3p-dialogs.ts --execute
 *
 * --execute requires the LibraryItem.category + source_type=draft migration
 * to already be applied (pnpm db:migrate / Railway migrate:deploy).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { prisma } from '@keeper/database';
import type { Prisma } from '@prisma/client';
import { resolveLibraryChronicleDefaults } from '@keeper/shared';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const DOMAIN_SLUG = 'ke3p';
const BECOMING_TOGETHER_TITLE = 'Becoming Together';
const ARCHIVE_CATEGORY = 'archive';
const DRAFT_SOURCE_TYPE = 'draft' as const;
const SAMPLE_LIMIT = 12;

type DraftRow = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  dialog_id: string | null;
};

type DialogRow = {
  id: string;
  title: string;
  user_id: string | null;
  available_to: string[];
  context: Prisma.JsonValue;
  is_archived: boolean;
  document_status: string;
};

function draftPointerRef(draftId: string): string {
  return `keeper://draft/${draftId}`;
}

function parseArgs(argv: string[]): { execute: boolean } {
  return { execute: argv.includes('--execute') };
}

function summarizeDialogContext(context: Prisma.JsonValue): string {
  if (!context || typeof context !== 'object' || Array.isArray(context)) {
    return '(no context)';
  }
  const c = context as Record<string, unknown>;
  const board = typeof c.board === 'string' ? c.board : '?';
  const frame = typeof c.frame === 'string' ? c.frame : '?';
  return `board=${board} frame=${frame}`;
}

async function assertSchemaReadyForExecute(): Promise<void> {
  // Probe new columns/enum via a no-op-shaped query. Fail clearly if migration not applied.
  try {
    await prisma.$queryRaw`
      SELECT 1
      FROM "LibraryItem"
      WHERE "category" IS NOT NULL
        AND "source_type" = CAST('draft' AS "LibraryItemSourceType")
      LIMIT 0
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Schema not ready for --execute. Apply migration 20260720120000_library_item_category_draft_source first.\n${message}`,
    );
  }
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));
  const mode = execute ? 'EXECUTE' : 'DRY-RUN';

  console.log(`\n=== ke3p Becoming Together consolidation (${mode}) ===\n`);

  const domain = await prisma.domain.findFirst({
    where: { slug: DOMAIN_SLUG },
    select: { id: true, slug: true, name: true, ownerId: true },
  });

  if (!domain) {
    throw new Error(`No domain found with slug "${DOMAIN_SLUG}"`);
  }

  console.log(`Domain: ${domain.slug} (${domain.name})`);
  console.log(`  id: ${domain.id}`);
  console.log(`  ownerId: ${domain.ownerId ?? '(null)'}`);

  const dialogs = (await prisma.dialog.findMany({
    where: { domain_id: domain.id },
    select: {
      id: true,
      title: true,
      user_id: true,
      available_to: true,
      context: true,
      is_archived: true,
      document_status: true,
    },
    orderBy: { created_at: 'asc' },
  })) as DialogRow[];

  const drafts = (await prisma.kip_drafts.findMany({
    where: { domain_id: domain.id },
    select: {
      id: true,
      title: true,
      summary: true,
      status: true,
      dialog_id: true,
    },
    orderBy: { created_at: 'asc' },
  })) as DraftRow[];

  const existingBecoming = dialogs.find(
    (d) => d.title.trim().toLowerCase() === BECOMING_TOGETHER_TITLE.toLowerCase(),
  );
  const dialogsToArchive = dialogs.filter(
    (d) =>
      d.title.trim().toLowerCase() !== BECOMING_TOGETHER_TITLE.toLowerCase() && !d.is_archived,
  );
  const alreadyArchivedOther = dialogs.filter(
    (d) =>
      d.title.trim().toLowerCase() !== BECOMING_TOGETHER_TITLE.toLowerCase() && d.is_archived,
  );

  const orphanDrafts = drafts.filter((d) => d.dialog_id == null);
  const orphanToConvert = orphanDrafts.filter((d) => d.status !== 'archived');
  const orphanAlreadyArchived = orphanDrafts.filter((d) => d.status === 'archived');

  const attachedToArchiveDialogs = drafts.filter(
    (d) =>
      d.dialog_id != null &&
      dialogsToArchive.some((dialog) => dialog.id === d.dialog_id) &&
      d.status !== 'archived',
  );
  const attachedAlreadyArchived = drafts.filter(
    (d) =>
      d.dialog_id != null &&
      dialogs.some(
        (dialog) =>
          dialog.id === d.dialog_id &&
          dialog.title.trim().toLowerCase() !== BECOMING_TOGETHER_TITLE.toLowerCase(),
      ) &&
      d.status === 'archived',
  );

  // user_id choice — documented from live data, not assumed.
  const withUser = dialogs.filter((d) => d.user_id != null).length;
  const withoutUser = dialogs.filter((d) => d.user_id == null).length;
  /**
   * Decision: user_id = null, available_to = ["admin"].
   * "Becoming Together" is a domain-scoped / cast-shared Document dialog, not a
   * per-keeper private container. Admin-scoped dialogs are visible to all members
   * with domain read (kip-dialogs list OR branch). Existing ke3p dialogs mix both
   * patterns; shared Realm premise wins over attaching Chuck's personal user_id.
   */
  const becomingUserId: string | null = null;
  const becomingAvailableTo = ['admin'] as string[];
  const becomingContext: Prisma.InputJsonValue = {
    board: 'realm',
    frame: 'cover',
    subject: 'becoming-together',
  };

  console.log('\n--- Dialog inventory ---');
  console.log(`Total Dialog rows: ${dialogs.length}`);
  console.log(`  already titled "${BECOMING_TOGETHER_TITLE}": ${existingBecoming ? 1 : 0}`);
  console.log(`  other active (will archive): ${dialogsToArchive.length}`);
  console.log(`  other already archived: ${alreadyArchivedOther.length}`);
  console.log(`  user_id populated: ${withUser} | user_id null: ${withoutUser}`);
  console.log(
    `  NEW Dialog user_id choice: ${becomingUserId === null ? 'null (domain-scoped)' : becomingUserId}`,
  );
  console.log(`  NEW Dialog available_to: ${JSON.stringify(becomingAvailableTo)}`);
  console.log(`  NEW Dialog context: ${JSON.stringify(becomingContext)}`);
  console.log(`  NEW Dialog document_status: drafts (default)`);

  if (dialogsToArchive.length > 0) {
    console.log('\nSample dialogs to archive:');
    for (const d of dialogsToArchive.slice(0, SAMPLE_LIMIT)) {
      console.log(
        `  - ${d.id} | "${d.title}" | user_id=${d.user_id ?? 'null'} | ${summarizeDialogContext(d.context)}`,
      );
    }
    if (dialogsToArchive.length > SAMPLE_LIMIT) {
      console.log(`  … +${dialogsToArchive.length - SAMPLE_LIMIT} more`);
    }
  }

  console.log('\n--- Draft inventory ---');
  console.log(`Total kip_drafts: ${drafts.length}`);
  console.log(`  dialog_id IS NULL (orphaned): ${orphanDrafts.length}`);
  console.log(`    → convert to LibraryItem + archive: ${orphanToConvert.length}`);
  console.log(`    → already archived (skip convert if pointer exists): ${orphanAlreadyArchived.length}`);
  console.log(`  attached to dialogs being archived: ${attachedToArchiveDialogs.length} (status→archived)`);
  console.log(`  attached + already archived: ${attachedAlreadyArchived.length}`);

  const defaults = resolveLibraryChronicleDefaults();
  const plannedLibraryItems = orphanToConvert.map((d) => ({
    draftId: d.id,
    source_ref: draftPointerRef(d.id),
    display_label: d.title,
    description: d.summary,
    source_type: DRAFT_SOURCE_TYPE,
    category: [ARCHIVE_CATEGORY],
    chronicle_blocks: defaults.chronicle_blocks,
    chronicle_actions: defaults.chronicle_actions,
  }));

  console.log('\n--- Planned LibraryItem creates (orphaned drafts) ---');
  console.log(`Count: ${plannedLibraryItems.length}`);
  console.log(`source_type: ${DRAFT_SOURCE_TYPE}`);
  console.log(`category: ${JSON.stringify([ARCHIVE_CATEGORY])}`);
  console.log(`source_ref pattern: keeper://draft/{draftId}`);
  console.log('\nSample mappings (draft → LibraryItem pointer):');
  for (const item of plannedLibraryItems.slice(0, SAMPLE_LIMIT)) {
    console.log(
      `  - draft ${item.draftId} "${item.display_label}" → ${item.source_ref} [category=${item.category.join(',')}]`,
    );
  }
  if (plannedLibraryItems.length > SAMPLE_LIMIT) {
    console.log(`  … +${plannedLibraryItems.length - SAMPLE_LIMIT} more`);
  }

  console.log('\n--- Nav filter confirmation (no new frontend code) ---');
  console.log(
    'kip-dialogs list: is_archived=false by default (include_archived=true required to see archived).',
  );
  console.log(
    "KipApi.listDrafts callers (boardNavDataCache, useRealmNavGrowth): excludeStatus=['promoted','archived'].",
  );
  console.log('After execute, archived dialogs/drafts drop out of Nav via those existing filters.');

  if (!execute) {
    console.log('\nDRY-RUN complete — no writes performed.');
    console.log('Re-run with --execute against this database only after reviewing this report.');
    console.log('Hard gate: do not invoke --execute unattended against production.\n');
    return;
  }

  await assertSchemaReadyForExecute();

  console.log('\n--- EXECUTE beginning ---');

  const result = await prisma.$transaction(async (tx) => {
    let becomingDialogId = existingBecoming?.id ?? null;
    let createdDialog = false;

    if (!becomingDialogId) {
      const created = await tx.dialog.create({
        data: {
          title: BECOMING_TOGETHER_TITLE,
          domain_id: domain.id,
          user_id: becomingUserId,
          available_to: becomingAvailableTo,
          context: becomingContext,
          document_status: 'drafts',
          is_archived: false,
        },
        select: { id: true },
      });
      becomingDialogId = created.id;
      createdDialog = true;
    }

    const archivedDialogIds: string[] = [];
    for (const d of dialogsToArchive) {
      await tx.dialog.update({
        where: { id: d.id },
        data: { is_archived: true },
      });
      archivedDialogIds.push(d.id);
    }

    const archivedAttachedDraftIds: string[] = [];
    if (attachedToArchiveDialogs.length > 0) {
      await tx.kip_drafts.updateMany({
        where: { id: { in: attachedToArchiveDialogs.map((d) => d.id) } },
        data: { status: 'archived' },
      });
      archivedAttachedDraftIds.push(...attachedToArchiveDialogs.map((d) => d.id));
    }

    const createdLibraryItemIds: string[] = [];
    const archivedOrphanDraftIds: string[] = [];
    const skippedExistingPointers: string[] = [];

    for (const planned of plannedLibraryItems) {
      const existingPointer = await tx.libraryItem.findFirst({
        where: {
          domain_id: domain.id,
          source_ref: planned.source_ref,
        },
        select: { id: true },
      });

      if (existingPointer) {
        skippedExistingPointers.push(planned.draftId);
      } else {
        const created = await tx.libraryItem.create({
          data: {
            domain_id: domain.id,
            source_type: planned.source_type,
            source_ref: planned.source_ref,
            display_label: planned.display_label,
            description: planned.description,
            category: planned.category,
            chronicle_blocks: planned.chronicle_blocks,
            chronicle_actions: planned.chronicle_actions,
          },
          select: { id: true },
        });
        createdLibraryItemIds.push(created.id);
      }

      await tx.kip_drafts.update({
        where: { id: planned.draftId },
        data: { status: 'archived' },
      });
      archivedOrphanDraftIds.push(planned.draftId);
    }

    return {
      becomingDialogId,
      createdDialog,
      archivedDialogIds,
      archivedAttachedDraftIds,
      createdLibraryItemIds,
      archivedOrphanDraftIds,
      skippedExistingPointers,
    };
  });

  console.log(`Becoming Together dialog id: ${result.becomingDialogId} (created=${result.createdDialog})`);
  console.log(`Dialogs archived: ${result.archivedDialogIds.length}`);
  console.log(`Attached drafts archived: ${result.archivedAttachedDraftIds.length}`);
  console.log(`LibraryItems created: ${result.createdLibraryItemIds.length}`);
  console.log(`Orphan drafts archived: ${result.archivedOrphanDraftIds.length}`);
  console.log(`Skipped existing pointers: ${result.skippedExistingPointers.length}`);
  console.log('\nEXECUTE complete — nothing permanently deleted.\n');
}

main()
  .catch((err) => {
    console.error('consolidate-ke3p-dialogs failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
