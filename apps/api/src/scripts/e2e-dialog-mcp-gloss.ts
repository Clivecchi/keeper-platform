/**
 * E2E: dialog_list → dialog_read → gloss_write_turn against a live Dialog with messages.
 * Usage (from apps/api): pnpm exec tsx src/scripts/e2e-dialog-mcp-gloss.ts
 */
import 'dotenv/config';
import { prisma } from '@keeper/database';
import { callTool } from '../mcp/tools.js';

async function main() {
  const withMessages = await prisma.kip_messages.findFirst({
    where: {
      kip_sessions: {
        is_archived: false,
        dialog_id: { not: null },
        dialog: { is_archived: false },
      },
    },
    select: {
      id: true,
      kip_sessions: {
        select: {
          dialog_id: true,
          dialog: { select: { id: true, title: true, domain_id: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const dialog = withMessages?.kip_sessions.dialog;
  if (!dialog) {
    throw new Error('No live Dialog with kip_messages found — open a Dialog and send a message first');
  }

  const domainId = dialog.domain_id;
  const ctx = {
    domainId,
    scopes: ['dialog.ro', 'gloss.rw', 'library.ro'],
    agentCapabilities: ['dialog.ro', 'gloss.rw', 'library.ro'],
  };

  console.log(
    JSON.stringify({
      step: 'seed',
      domainId,
      dialogId: dialog.id,
      title: dialog.title,
    }),
  );

  const listed = (await callTool('dialog_list', { limit: 50 }, ctx)) as {
    items: Array<{ id: string; title: string; entityKind: string }>;
  };
  const hit = listed.items.find((i) => i.id === dialog.id);
  if (!hit) {
    throw new Error(`dialog_list did not include live Dialog ${dialog.id}`);
  }
  console.log(JSON.stringify({ step: 'dialog_list', ok: true, item: hit, count: listed.items.length }));

  const read = (await callTool('dialog_read', { entityId: dialog.id }, ctx)) as {
    messageId: string;
    suggestedAnchor: Record<string, unknown>;
    messages: unknown[];
  };
  if (!read.messageId || !read.suggestedAnchor) {
    throw new Error('dialog_read missing messageId or suggestedAnchor');
  }
  console.log(
    JSON.stringify({
      step: 'dialog_read',
      ok: true,
      messageId: read.messageId,
      suggestedAnchor: read.suggestedAnchor,
      messagePreviewCount: read.messages?.length ?? 0,
    }),
  );

  const content = `MCP e2e gloss ${new Date().toISOString()}`;
  const gloss = (await callTool(
    'gloss_write_turn',
    {
      messageId: read.messageId,
      anchor: read.suggestedAnchor,
      content,
      role: 'user',
    },
    ctx,
  )) as { ok?: boolean; threadId?: string; messageId?: string };

  if (!gloss.ok) {
    throw new Error(`gloss_write_turn failed: ${JSON.stringify(gloss)}`);
  }

  console.log(
    JSON.stringify({
      step: 'gloss_write_turn',
      ok: true,
      messageId: gloss.messageId,
      threadId: gloss.threadId,
      content,
    }),
  );
  console.log(JSON.stringify({ step: 'done', ok: true }));
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ step: 'error', ok: false, error: String(err?.message || err) }));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect().catch(() => undefined);
  });
