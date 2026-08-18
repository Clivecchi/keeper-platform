/**
 * Durable Cursor → Dialog ingest runner.
 *
 * Brings external markdown in as a Dialog-backed Document (Points + session).
 * Pass --dialog to attach to an existing Dialog; omit it to create a new one.
 * Does not create Library items. Distinct from gloss-cursor-to-dialog.ts (Gloss-only).
 *
 * Usage (from apps/api):
 *   pnpm exec tsx src/scripts/ingest-markdown-to-dialog.ts --file ./spec.md
 *   pnpm exec tsx src/scripts/ingest-markdown-to-dialog.ts --file ./spec.md --dialog "Becoming Together"
 *   pnpm exec tsx src/scripts/ingest-markdown-to-dialog.ts --content "…" --title "Board spec"
 *
 * Optional:
 *   --domain ke3p
 *   --source Cursor
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { prisma } from '@keeper/database';
import { ingestExternalDocument } from '../services/kip/ingestExternalDocument.js';

type CliOptions = {
  domainSlug: string;
  dialogQuery: string | null;
  title: string | null;
  source: string;
  markdown: string;
};

function readStdin(): string {
  try {
    return readFileSync(0, 'utf8').trim();
  } catch {
    return '';
  }
}

function parseArgs(argv: string[]): CliOptions {
  let domainSlug = 'ke3p';
  let dialogQuery: string | null = null;
  let title: string | null = null;
  let source = 'Cursor';
  let markdown = '';
  let filePath: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];
    if (arg === '--domain' && next) {
      domainSlug = next.trim();
      i += 1;
    } else if (arg === '--dialog' && next) {
      dialogQuery = next.trim();
      i += 1;
    } else if (arg === '--title' && next) {
      title = next.trim();
      i += 1;
    } else if (arg === '--source' && next) {
      source = next.trim();
      i += 1;
    } else if (arg === '--content' && next) {
      markdown = next;
      i += 1;
    } else if (arg === '--file' && next) {
      filePath = next;
      i += 1;
    }
  }

  if (filePath) {
    markdown = readFileSync(filePath, 'utf8').trim();
  }
  if (!markdown) {
    markdown = (process.env.CURSOR_INGEST_CONTENT ?? '').trim() || readStdin();
  }
  if (!markdown) {
    throw new Error(
      'Markdown required: pass --file, --content, CURSOR_INGEST_CONTENT, or stdin',
    );
  }

  return { domainSlug, dialogQuery, title, source, markdown };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));

  const domain = await prisma.domain.findFirst({
    where: {
      OR: [
        { slug: opts.domainSlug },
        { name: { equals: opts.domainSlug, mode: 'insensitive' } },
      ],
    },
    select: { id: true, slug: true, name: true, ownerId: true },
  });
  if (!domain) throw new Error(`Domain not found: ${opts.domainSlug}`);
  if (!domain.ownerId) throw new Error(`Domain ${opts.domainSlug} has no owner`);

  let dialogId: string | null = null;
  if (opts.dialogQuery) {
    const needle = opts.dialogQuery.trim().toLowerCase();
    const dialogs = await prisma.dialog.findMany({
      where: {
        domain_id: domain.id,
        is_archived: false,
        OR: [
          { title: { contains: opts.dialogQuery, mode: 'insensitive' } },
          { forward_title: { contains: opts.dialogQuery, mode: 'insensitive' } },
        ],
      },
      select: { id: true, title: true },
      orderBy: { updated_at: 'desc' },
      take: 10,
    });
    const hit =
      dialogs.find((row) => row.title.trim().toLowerCase() === needle) ??
      dialogs.find((row) => row.title.toLowerCase().includes(needle)) ??
      dialogs[0];
    if (!hit) {
      throw new Error(`Dialog not found for query "${opts.dialogQuery}"`);
    }
    dialogId = hit.id;
  }

  const result = await ingestExternalDocument({
    domainId: domain.id,
    userId: domain.ownerId,
    markdown: opts.markdown,
    title: opts.title,
    source: opts.source,
    dialogId,
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        domain: { id: domain.id, slug: domain.slug },
        ...result,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err: unknown) => {
    const message = err instanceof Error ? err.stack || err.message : String(err);
    console.error(message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
