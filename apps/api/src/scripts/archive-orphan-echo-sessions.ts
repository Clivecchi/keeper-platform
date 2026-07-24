/**
 * Archive orphaned Kip "echo" sessions created by the Domain Lead Collaboration /
 * Agent Board Echo mount path (dialog_id null — never linked to a Dialog).
 *
 * Defaults to dry-run. Writes only with an explicit --execute flag.
 * Nothing is permanently deleted.
 *
 * Usage (from apps/api):
 *   npx tsx src/scripts/archive-orphan-echo-sessions.ts
 *   npx tsx src/scripts/archive-orphan-echo-sessions.ts --execute
 *
 * --execute requires kip_sessions.is_archived (migration 20260723200000) applied.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { prisma } from '@keeper/database';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv({ path: path.resolve(__dirname, '../../.env') });

const ORPHAN_ECHO_NAMES = ['Domain Lead Collaboration', 'Agent Board Echo'] as const;
const SAMPLE_LIMIT = 12;

function parseArgs(argv: string[]): { execute: boolean } {
  return { execute: argv.includes('--execute') };
}

async function assertSchemaReadyForExecute(): Promise<void> {
  try {
    await prisma.$queryRaw`
      SELECT 1
      FROM "kip_sessions"
      WHERE "is_archived" = false
      LIMIT 0
    `;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(
      `kip_sessions.is_archived is not available — apply migration 20260723200000 first.\n${message}`,
    );
  }
}

async function main(): Promise<void> {
  const { execute } = parseArgs(process.argv.slice(2));

  const orphans = await prisma.kip_sessions.findMany({
    where: {
      dialog_id: null,
      is_archived: false,
      session_name: { in: [...ORPHAN_ECHO_NAMES] },
    },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      session_name: true,
      agent_id: true,
      user_id: true,
      created_at: true,
    },
  });

  console.log('=== archive-orphan-echo-sessions ===');
  console.log(`mode: ${execute ? 'EXECUTE' : 'DRY-RUN'}`);
  console.log(`matching orphan rows (dialog_id null, not archived): ${orphans.length}`);
  console.log(`names: ${ORPHAN_ECHO_NAMES.join(', ')}`);
  console.log('sample:');
  for (const row of orphans.slice(0, SAMPLE_LIMIT)) {
    console.log(
      `  ${row.id}  name=${JSON.stringify(row.session_name)}  agent=${row.agent_id}  user=${row.user_id ?? 'null'}  created=${row.created_at.toISOString()}`,
    );
  }
  if (orphans.length > SAMPLE_LIMIT) {
    console.log(`  … +${orphans.length - SAMPLE_LIMIT} more`);
  }

  if (!execute) {
    console.log('\nDry-run only. Re-run with --execute to set is_archived=true on these rows.');
    return;
  }

  await assertSchemaReadyForExecute();

  if (orphans.length === 0) {
    console.log('\nNothing to archive.');
    return;
  }

  const result = await prisma.kip_sessions.updateMany({
    where: {
      id: { in: orphans.map((row) => row.id) },
      dialog_id: null,
      is_archived: false,
    },
    data: { is_archived: true },
  });

  console.log(`\nArchived ${result.count} orphan echo session(s).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
