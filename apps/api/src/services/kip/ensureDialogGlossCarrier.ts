/**
 * Ensure a Dialog has a kip_message that can carry glossThreads metadata.
 * Used by Document Chronicle Gloss (Point-anchored polish in Keeper).
 */
import { prisma, type Prisma } from '@keeper/database';
import { parseGlossThreads, type GlossThread } from '@keeper/shared';

const CARRIER_CONTENT = 'Document Gloss · polish carrier';
const CARRIER_SESSION_NAME = 'Document Gloss';

export type DialogGlossCarrier = {
  messageId: string;
  sessionId: string;
  glossThreads: GlossThread[];
  created: boolean;
};

async function authorizeDialog(
  domainId: string,
  dialogId: string,
  userId: string,
): Promise<boolean> {
  const dialog = await prisma.dialog.findFirst({
    where: {
      id: dialogId,
      domain_id: domainId,
      is_archived: false,
      OR: [
        { available_to: { has: 'admin' } },
        { user_id: userId, available_to: { has: 'keeper' } },
      ],
    },
    select: { id: true },
  });
  return Boolean(dialog);
}

export async function ensureDialogGlossCarrier(params: {
  domainId: string;
  dialogId: string;
  userId: string;
  agentId?: string | null;
}): Promise<DialogGlossCarrier> {
  const { domainId, dialogId, userId, agentId } = params;
  const ok = await authorizeDialog(domainId, dialogId, userId);
  if (!ok) {
    throw Object.assign(new Error('DIALOG_NOT_FOUND'), { code: 'DIALOG_NOT_FOUND' });
  }

  // Prefer a dedicated Document Gloss carrier — never hitch onto the latest chat turn
  // (that fragments threads as Dialog keeps moving).
  const dedicated = await prisma.kip_messages.findFirst({
    where: {
      kip_sessions: {
        dialog_id: dialogId,
        is_archived: false,
      },
      metadata: {
        path: ['glossCarrier'],
        equals: true,
      },
    },
    orderBy: { created_at: 'asc' },
    select: { id: true, session_id: true, metadata: true },
  });

  if (dedicated) {
    const meta =
      dedicated.metadata && typeof dedicated.metadata === 'object' && !Array.isArray(dedicated.metadata)
        ? (dedicated.metadata as Record<string, unknown>)
        : {};
    return {
      messageId: dedicated.id,
      sessionId: dedicated.session_id,
      glossThreads: parseGlossThreads(meta.glossThreads),
      created: false,
    };
  }

  let session = await prisma.kip_sessions.findFirst({
    where: {
      dialog_id: dialogId,
      is_archived: false,
      ...(agentId ? { agent_id: agentId } : {}),
    },
    orderBy: { updated_at: 'desc' },
    select: { id: true },
  });

  if (!session) {
    session = await prisma.kip_sessions.findFirst({
      where: { dialog_id: dialogId, is_archived: false },
      orderBy: { updated_at: 'desc' },
      select: { id: true },
    });
  }

  if (!session) {
    if (!agentId) {
      throw Object.assign(new Error('AGENT_REQUIRED_FOR_GLOSS_CARRIER'), {
        code: 'AGENT_REQUIRED_FOR_GLOSS_CARRIER',
      });
    }
    session = await prisma.kip_sessions.create({
      data: {
        agent_id: agentId,
        user_id: userId,
        dialog_id: dialogId,
        session_name: CARRIER_SESSION_NAME,
      },
      select: { id: true },
    });
  }

  const message = await prisma.kip_messages.create({
    data: {
      session_id: session.id,
      sender: 'user',
      role: 'user',
      content: CARRIER_CONTENT,
      metadata: {
        glossCarrier: true,
        glossThreads: [],
      } as Prisma.InputJsonValue,
    },
    select: { id: true },
  });

  return {
    messageId: message.id,
    sessionId: session.id,
    glossThreads: [],
    created: true,
  };
}
