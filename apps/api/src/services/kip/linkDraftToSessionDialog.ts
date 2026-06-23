/**
 * Link a kip_drafts row to the Dialog of the session that created or activated it.
 * Only sets dialog_id when the draft has no link yet (first session wins).
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
  if (!draft || draft.dialog_id) return draft?.dialog_id ?? null;

  await db.kip_drafts.update({
    where: { id: draftId },
    data: { dialog_id: session.dialog_id, updated_at: new Date() },
  });

  return session.dialog_id;
}
