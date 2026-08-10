/**
 * Link a kip_drafts row to the Dialog of the session that created or activated it.
 * Only sets dialog_id when the draft has no link yet (first session wins).
 *
 * Draft attachment elevates Chatter-tier Dialogs (title_source=auto_generated)
 * to system_promoted so they surface in the Dialog nav bucket.
 */

import type { Prisma, PrismaClient } from '@keeper/database';

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function ensureDraftLinkedToSessionDialog(
  db: DbClient,
  params: { draftId: string; sessionId?: string | null },
): Promise<string | null> {
  const { draftId, sessionId } = params;
  if (!sessionId) return null;

  const session = await db.kip_sessions.findFirst({
    where: { id: sessionId },
    select: { dialog_id: true },
  });
  if (!session?.dialog_id) return null;

  const draft = await db.kip_drafts.findUnique({
    where: { id: draftId },
    select: { dialog_id: true },
  });
  if (!draft) return null;

  if (!draft.dialog_id) {
    await db.kip_drafts.update({
      where: { id: draftId },
      data: { dialog_id: session.dialog_id, updated_at: new Date() },
    });
  }

  const dialogId = draft.dialog_id ?? session.dialog_id;

  // Promote Chatter → Dialog when a Draft attaches (same Dialog row; tier change only).
  await db.dialog.updateMany({
    where: {
      id: dialogId,
      title_source: 'auto_generated',
      is_archived: false,
    },
    data: {
      title_source: 'system_promoted',
      updated_at: new Date(),
    },
  });

  return dialogId;
}
