/**
 * Prune Chronicle History noise written under the old per-turn model.
 *
 * Document, Dialog, sessions, and messages are untouched. Only `chronicle_events`
 * rows are removed so History can refill as session chapters + Document keeps.
 *
 * Defaults to dry-run. Deletes only with an explicit --execute flag.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/prune-chronicle-history-noise.ts
 *   npx tsx src/scripts/prune-chronicle-history-noise.ts --execute
 *   npx tsx src/scripts/prune-chronicle-history-noise.ts --dialog-id=cmrtyoraw0001ot0033p5wiwm --execute
 *   npx tsx src/scripts/prune-chronicle-history-noise.ts --domain-slug=ke3p --execute
 *   npx tsx src/scripts/prune-chronicle-history-noise.ts --all --execute
 *
 * Default scope (no flags): Becoming Together Dialog on ke3p.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { prisma } from '@keeper/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../.env') });

/** Canonical Becoming Together Dialog on ke3p. */
const BECOMING_TOGETHER_DIALOG_ID = 'cmrtyoraw0001ot0033p5wiwm';
const SAMPLE_LIMIT = 16;

type Scope =
  | { kind: 'dialog'; dialogId: string }
  | { kind: 'domain'; domainSlug: string }
  | { kind: 'all' };

function parseArgs(argv: string[]): { execute: boolean; scope: Scope } {
  const execute = argv.includes('--execute');
  const all = argv.includes('--all');
  const dialogFlag = argv.find((arg) => arg.startsWith('--dialog-id='));
  const domainFlag = argv.find((arg) => arg.startsWith('--domain-slug='));

  if (all) {
    return { execute, scope: { kind: 'all' } };
  }
  if (dialogFlag) {
    const dialogId = dialogFlag.slice('--dialog-id='.length).trim();
    if (!dialogId) throw new Error('--dialog-id= requires a value');
    return { execute, scope: { kind: 'dialog', dialogId } };
  }
  if (domainFlag) {
    const domainSlug = domainFlag.slice('--domain-slug='.length).trim();
    if (!domainSlug) throw new Error('--domain-slug= requires a value');
    return { execute, scope: { kind: 'domain', domainSlug } };
  }
  return { execute, scope: { kind: 'dialog', dialogId: BECOMING_TOGETHER_DIALOG_ID } };
}

function describeScope(scope: Scope): string {
  if (scope.kind === 'all') return 'ALL chronicle_events (every domain)';
  if (scope.kind === 'domain') return `domain slug=${scope.domainSlug}`;
  return `dialogId=${scope.dialogId}` + (scope.dialogId === BECOMING_TOGETHER_DIALOG_ID ? ' (Becoming Together default)' : '');
}

async function resolveWhere(scope: Scope): Promise<{
  where: { dialogId?: string; domainId?: string };
  label: string;
}> {
  if (scope.kind === 'all') {
    return { where: {}, label: 'all domains' };
  }
  if (scope.kind === 'dialog') {
    const dialog = await prisma.dialog.findUnique({
      where: { id: scope.dialogId },
      select: { id: true, title: true, domain_id: true },
    });
    if (!dialog) {
      throw new Error(`Dialog not found: ${scope.dialogId}`);
    }
    return {
      where: { dialogId: dialog.id },
      label: `dialog "${dialog.title}" (${dialog.id})`,
    };
  }
  const domain = await prisma.domain.findFirst({
    where: { slug: scope.domainSlug },
    select: { id: true, slug: true, name: true },
  });
  if (!domain) {
    throw new Error(`Domain not found for slug: ${scope.domainSlug}`);
  }
  return {
    where: { domainId: domain.id },
    label: `domain ${domain.slug} (${domain.name})`,
  };
}

async function main(): Promise<void> {
  const { execute, scope } = parseArgs(process.argv.slice(2));
  const { where, label } = await resolveWhere(scope);

  const events = await prisma.chronicleEvent.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      dialogId: true,
      domainId: true,
      actor: true,
      eventType: true,
      title: true,
      summary: true,
      parentEventId: true,
      createdAt: true,
    },
  });

  const byType = events.reduce<Record<string, number>>((acc, row) => {
    acc[row.eventType] = (acc[row.eventType] ?? 0) + 1;
    return acc;
  }, {});
  const childCount = events.filter((row) => row.parentEventId).length;

  console.log('=== prune-chronicle-history-noise ===');
  console.log(`mode: ${execute ? 'EXECUTE (DELETE)' : 'DRY-RUN'}`);
  console.log(`scope flag: ${describeScope(scope)}`);
  console.log(`resolved: ${label}`);
  console.log(`matching rows: ${events.length}`);
  console.log(`by eventType: ${JSON.stringify(byType)}`);
  console.log(`children (parentEventId set): ${childCount}`);
  console.log('sample:');
  for (const row of events.slice(0, SAMPLE_LIMIT)) {
    const title = row.title.length > 64 ? `${row.title.slice(0, 61)}…` : row.title;
    console.log(
      `  ${row.createdAt.toISOString()}  ${row.eventType.padEnd(10)}  ${row.actor.padEnd(8)}  ${title}`,
    );
  }
  if (events.length > SAMPLE_LIMIT) {
    console.log(`  … +${events.length - SAMPLE_LIMIT} more`);
  }

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to DELETE these chronicle_events.');
    console.log('Document / Dialog / sessions / messages are never modified.');
    return;
  }

  if (events.length === 0) {
    console.log('\nNothing to prune.');
    return;
  }

  // Self-relation: remove children first, then roots (and any remaining).
  const childDelete = await prisma.chronicleEvent.deleteMany({
    where: { ...where, parentEventId: { not: null } },
  });
  const rootDelete = await prisma.chronicleEvent.deleteMany({
    where,
  });

  console.log(`\nDeleted ${childDelete.count} child event(s), then ${rootDelete.count} remaining event(s).`);
  console.log('History will refill from new session chapters + Document keeps only.');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
