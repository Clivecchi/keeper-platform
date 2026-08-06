/**
 * Durable Cursor → Gloss runner.
 *
 * Default: ke3p · Becoming Together. Writes one agent Gloss turn via dialog_read → gloss_write_turn.
 * Does not create Points or mutate the Document.
 *
 * Usage (from apps/api):
 *   pnpm exec tsx src/scripts/gloss-cursor-to-dialog.ts --file ./gloss.md
 *   pnpm exec tsx src/scripts/gloss-cursor-to-dialog.ts --content "Cursor · …"
 *   echo "…" | pnpm exec tsx src/scripts/gloss-cursor-to-dialog.ts
 *
 * Optional:
 *   --domain ke3p
 *   --dialog "Becoming Together"
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { prisma } from '@keeper/database';
import { callTool } from '../mcp/tools.js';

type CliOptions = {
  domainSlug: string;
  dialogQuery: string;
  content: string;
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
  let dialogQuery = 'Becoming Together';
  let content = '';
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
    } else if (arg === '--content' && next) {
      content = next;
      i += 1;
    } else if (arg === '--file' && next) {
      filePath = next;
      i += 1;
    }
  }

  if (filePath) {
    content = readFileSync(filePath, 'utf8').trim();
  }
  if (!content) {
    content = (process.env.CURSOR_GLOSS_CONTENT ?? '').trim() || readStdin();
  }
  if (!content) {
    throw new Error(
      'Gloss content required: pass --file, --content, CURSOR_GLOSS_CONTENT, or stdin',
    );
  }

  return { domainSlug, dialogQuery, content };
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
    select: { id: true, slug: true, name: true },
  });
  if (!domain) throw new Error(`Domain not found: ${opts.domainSlug}`);

  const ctx = {
    domainId: domain.id,
    scopes: ['dialog.ro', 'gloss.rw', 'library.ro'],
    agentCapabilities: ['dialog.ro', 'gloss.rw', 'library.ro'],
  };

  const search = (await callTool(
    'dialog_search',
    { query: opts.dialogQuery, limit: 10 },
    ctx,
  )) as { items?: Array<{ id: string; title: string }> };

  const items = search.items ?? [];
  const needle = opts.dialogQuery.trim().toLowerCase();
  const hit =
    items.find((item) => item.title.trim().toLowerCase() === needle) ??
    items.find((item) => item.title.toLowerCase().includes(needle)) ??
    items[0];
  if (!hit) {
    throw new Error(`Dialog not found for query "${opts.dialogQuery}": ${JSON.stringify(search)}`);
  }

  const read = (await callTool('dialog_read', { entityId: hit.id, messageLimit: 4 }, ctx)) as {
    messageId?: string;
    suggestedAnchor?: Record<string, unknown>;
  };
  if (!read.messageId || !read.suggestedAnchor) {
    throw new Error(`dialog_read missing gloss carrier: ${JSON.stringify(read)}`);
  }

  const gloss = await callTool(
    'gloss_write_turn',
    {
      messageId: read.messageId,
      anchor: read.suggestedAnchor,
      content: opts.content,
      role: 'agent',
    },
    ctx,
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        domain: { id: domain.id, slug: domain.slug },
        dialog: hit,
        messageId: read.messageId,
        suggestedAnchor: read.suggestedAnchor,
        gloss,
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
