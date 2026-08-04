/**
 * Gloss write — append a turn to a message-anchored gloss thread only.
 * Never mutates the entity referenced by GlossAnchor (LibraryItem, Draft, Moment, etc.).
 */
import { prisma } from '@keeper/database';
import type { Prisma } from '@keeper/database';
import {
  isGlossAnchor,
  parseGlossThreads,
  upsertGlossThreadMessage,
  type GlossAnchor,
  type GlossThread,
  type GlossThreadMessage,
} from '@keeper/shared';

export type AppendGlossTurnInput = {
  domainId: string;
  messageId: string;
  anchor: unknown;
  content: string;
  role?: 'user' | 'agent';
};

export type AppendGlossTurnResult = {
  messageId: string;
  thread: GlossThread;
  message: GlossThreadMessage;
};

/** Read-only existence checks — never update anchored entities. */
async function assertAnchorEntityReadableInDomain(
  domainId: string,
  anchor: GlossAnchor,
): Promise<void> {
  switch (anchor.entityKind) {
    case 'library': {
      const item = await prisma.libraryItem.findFirst({
        where: { id: anchor.entityId, domain_id: domainId },
        select: { id: true },
      });
      if (!item) {
        throw new Error(`Library item not found in domain: ${anchor.entityId}`);
      }
      return;
    }
    case 'draft': {
      const draft = await prisma.kip_drafts.findFirst({
        where: { id: anchor.entityId, domain_id: domainId },
        select: { id: true },
      });
      if (!draft) {
        throw new Error(`Draft not found in domain: ${anchor.entityId}`);
      }
      return;
    }
    case 'moment': {
      const moment = await prisma.moment.findFirst({
        where: { id: anchor.entityId, domainId },
        select: { id: true },
      });
      if (!moment) {
        throw new Error(`Moment not found in domain: ${anchor.entityId}`);
      }
      return;
    }
    case 'dialog': {
      const dialog = await prisma.dialog.findFirst({
        where: { id: anchor.entityId, domain_id: domainId },
        select: { id: true },
      });
      if (!dialog) {
        throw new Error(`Dialog not found in domain: ${anchor.entityId}`);
      }
      return;
    }
    default:
      return;
  }
}

async function resolveMessageDomainId(messageId: string): Promise<string | null> {
  const message = await prisma.kip_messages.findUnique({
    where: { id: messageId },
    select: {
      kip_sessions: {
        select: {
          dialog: { select: { domain_id: true } },
        },
      },
    },
  });
  return message?.kip_sessions.dialog?.domain_id ?? null;
}

/**
 * Append one gloss turn to `kip_messages.metadata.glossThreads` for a domain-bound dialog message.
 * Hard constraint: only message metadata is written — never the anchored entity record.
 */
export async function appendGlossTurn(input: AppendGlossTurnInput): Promise<AppendGlossTurnResult> {
  const domainId = input.domainId.trim();
  const messageId = input.messageId.trim();
  const content = input.content.trim();
  const role = input.role ?? 'user';

  if (!domainId) throw new Error('domainId is required');
  if (!messageId) throw new Error('messageId is required');
  if (!content) throw new Error('content is required');
  if (role !== 'user' && role !== 'agent') throw new Error('role must be user or agent');
  if (!isGlossAnchor(input.anchor)) throw new Error('anchor must be a valid GlossAnchor');

  const anchor: GlossAnchor = input.anchor;
  if (anchor.messageId && anchor.messageId !== messageId) {
    throw new Error('anchor.messageId must match messageId when provided');
  }

  const messageDomainId = await resolveMessageDomainId(messageId);
  if (!messageDomainId) {
    throw new Error('Message not found or session has no domain-bound dialog');
  }
  if (messageDomainId !== domainId) {
    throw new Error('Message does not belong to the requested domain');
  }

  await assertAnchorEntityReadableInDomain(domainId, anchor);

  const existingRow = await prisma.kip_messages.findUnique({
    where: { id: messageId },
    select: { metadata: true },
  });
  if (!existingRow) throw new Error('Message not found');

  const existingMeta =
    existingRow.metadata && typeof existingRow.metadata === 'object' && !Array.isArray(existingRow.metadata)
      ? (existingRow.metadata as Record<string, unknown>)
      : {};

  const existingThreads = parseGlossThreads(existingMeta.glossThreads);
  const turn: GlossThreadMessage = {
    id: crypto.randomUUID(),
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  const nextThreads = upsertGlossThreadMessage(existingThreads, anchor, turn);
  const thread = nextThreads.find(
    (row) =>
      row.messages.some((m) => m.id === turn.id),
  );
  if (!thread) throw new Error('Failed to upsert gloss thread');

  await prisma.kip_messages.update({
    where: { id: messageId },
    data: {
      metadata: {
        ...existingMeta,
        glossThreads: nextThreads,
      } as unknown as Prisma.InputJsonValue,
    },
  });

  return { messageId, thread, message: turn };
}
