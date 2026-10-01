/**
 * Ensure a Dialog has a kip_message that can carry glossThreads metadata.
 * Used by Document Chronicle Gloss (Point-anchored polish in Keeper).
 */
import { prisma, type Prisma } from '@keeper/database';
import {
  isDocumentPointGlossThread,
  mergeDocumentGlossThreads,
  parseGlossThreads,
  type GlossThread,
} from '@keeper/shared';
import { dialogVisibleToUserWhere } from './dialogVisibility.js';

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
      ...dialogVisibleToUserWhere(userId),
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
    const glossThreads = await reconcileDialogGlossOntoCarrier(dialogId, dedicated.id);
    return {
      messageId: dedicated.id,
      sessionId: dedicated.session_id,
      glossThreads,
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

  const glossThreads = await reconcileDialogGlossOntoCarrier(dialogId, message.id);
  return {
    messageId: message.id,
    sessionId: session.id,
    glossThreads,
    created: true,
  };
}

function metadataRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/**
 * One Document Gloss thread per Point, stored on the dedicated carrier.
 * Document Point threads hitchhiked onto later chat messages are folded in by
 * Point identity and removed from those messages. In-stream Gloss stays put.
 */
export async function reconcileDialogGlossOntoCarrier(
  dialogId: string,
  carrierMessageId: string,
): Promise<GlossThread[]> {
  const rows = await prisma.kip_messages.findMany({
    where: {
      kip_sessions: {
        dialog_id: dialogId,
        is_archived: false,
      },
    },
    select: { id: true, metadata: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });

  const carrierRow = rows.find((row) => row.id === carrierMessageId);
  const carrierMeta = metadataRecord(carrierRow?.metadata);
  const carrierThreads = parseGlossThreads(carrierMeta.glossThreads);
  const carrierDocument = carrierThreads.filter((thread) => isDocumentPointGlossThread(thread));
  const carrierOther = carrierThreads.filter((thread) => !isDocumentPointGlossThread(thread));

  const strandedDocument: GlossThread[] = [];
  const strayWrites: Array<{ id: string; metadata: Record<string, unknown> }> = [];

  for (const row of rows) {
    if (row.id === carrierMessageId) continue;
    const meta = metadataRecord(row.metadata);
    const threads = parseGlossThreads(meta.glossThreads);
    const documentThreads = threads.filter((thread) => isDocumentPointGlossThread(thread));
    if (documentThreads.length === 0) continue;
    strandedDocument.push(...documentThreads);
    const messageThreads = threads.filter((thread) => !isDocumentPointGlossThread(thread));
    strayWrites.push({
      id: row.id,
      metadata: { ...meta, glossThreads: messageThreads },
    });
  }

  const merged = mergeDocumentGlossThreads([...carrierDocument, ...strandedDocument]);
  const nextCarrierThreads = [...merged, ...carrierOther];
  const carrierChanged =
    JSON.stringify(nextCarrierThreads) !== JSON.stringify(carrierThreads);

  if (!carrierChanged && strayWrites.length === 0) return carrierThreads;

  await prisma.$transaction([
    ...(carrierChanged
      ? [
          prisma.kip_messages.update({
            where: { id: carrierMessageId },
            data: {
              metadata: {
                ...carrierMeta,
                glossCarrier: true,
                glossThreads: nextCarrierThreads,
              } as unknown as Prisma.InputJsonValue,
            },
          }),
        ]
      : []),
    ...strayWrites.map((write) =>
      prisma.kip_messages.update({
        where: { id: write.id },
        data: { metadata: write.metadata as Prisma.InputJsonValue },
      }),
    ),
  ]);

  return nextCarrierThreads;
}
