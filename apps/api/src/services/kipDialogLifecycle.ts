/**
 * Shared find-or-create for Kip Dialog records (admin vs keeper scoped).
 * Used by designer, agent createSession, and related flows.
 */

import type { PrismaClient } from '@keeper/database';

export type KipDialogScope = 'admin' | 'keeper';

const frameTitleFallback = (frameKey: string): string => {
  const map: Record<string, string> = {
    cover: 'Board Cover',
    feed: 'Feed',
    journeys: 'Journeys',
    keepers: 'Keepers',
    moments: 'Moments',
    relationships: 'Relationships',
    agent: 'Agent Board',
    commons: 'Commons',
    index: 'Index',
  };
  return map[frameKey] ?? frameKey;
};

/** Human-readable board label for auto-generated Dialog titles. */
const boardTitleForContext = (board: string): string => {
  const key = board.trim().toLowerCase();
  const map: Record<string, string> = {
    domain: 'Domain',
    designer: 'Designer',
    design: 'Designer',
  };
  return map[key] ?? (board ? board.charAt(0).toUpperCase() + board.slice(1).toLowerCase() : 'Board');
};

export async function findOrCreateKipDialog(
  prisma: PrismaClient,
  params: {
    domainId: string;
    board: string;
    frame: string;
    subject?: string;
    scope: KipDialogScope;
    userId: string | null;
  },
): Promise<{ id: string }> {
  const { domainId, board, frame, subject, scope, userId } = params;
  const availableTo = scope === 'admin' ? (['admin'] as string[]) : (['keeper'] as string[]);
  const dialogUserId = scope === 'keeper' ? userId : null;

  if (scope === 'keeper' && !userId) {
    throw new Error('keeper-scoped dialog requires userId');
  }

  const existing = await prisma.dialog.findFirst({
    where: {
      domain_id: domainId,
      is_archived: false,
      user_id: dialogUserId,
      available_to: { equals: availableTo },
      AND: [
        { context: { path: ['board'], equals: board } },
        { context: { path: ['frame'], equals: frame } },
      ],
    },
    select: { id: true },
    orderBy: { updated_at: 'desc' },
  });

  if (existing) return existing;

  const frameName = frameTitleFallback(frame);
  const dateLabel = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const boardLabel = boardTitleForContext(board);
  const title = `${boardLabel} · ${frameName} · ${dateLabel}`;

  const dialog = await prisma.dialog.create({
    data: {
      title,
      domain_id: domainId,
      user_id: dialogUserId,
      available_to: availableTo,
      context: {
        board,
        frame,
        subject: subject ?? '',
      },
    },
    select: { id: true },
  });

  return dialog;
}
