/**
 * Link a kip_drafts row to the Dialog of the session that created or activated it.
 * Only sets dialog_id when the draft has no link yet (first session wins).
 *
 * Named Dialogs only (`title_source: user_set`). Chatter sessions stay conversations —
 * attaching a working draft must not promote them into Document-bearing Dialogs.
 */

import type { Prisma, PrismaClient } from '@keeper/database';
import { isDocumentBearingDialogTitleSource } from '@keeper/shared';

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

  const dialog = await db.dialog.findUnique({
    where: { id: session.dialog_id },
    select: { id: true, title_source: true },
  });
  if (!dialog || !isDocumentBearingDialogTitleSource(dialog.title_source)) {
    return null;
  }

  const draft = await db.kip_drafts.findUnique({
    where: { id: draftId },
    select: { dialog_id: true },
  });
  if (!draft) return null;

  if (!draft.dialog_id) {
    await db.kip_drafts.update({
      where: { id: draftId },
      data: { dialog_id: dialog.id, updated_at: new Date() },
    });
  }

  return draft.dialog_id ?? dialog.id;
}
