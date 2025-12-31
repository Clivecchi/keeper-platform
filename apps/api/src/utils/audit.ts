/**
 * Audit Utility
 * =============
 * Provides audit logging for board operations
 */

import { PrismaClient } from '@keeper/database';
import crypto from 'crypto';

const prisma = new PrismaClient();

export interface AuditLogInput {
  who: string;
  tool: string;
  boardId?: string;
  frameId?: string;
  inputHash: string;
  resultHash: string;
  dryRun?: boolean;
  requestId?: string;
}

/**
 * Compute a stable hash of an object for audit tracking
 */
export function computeHash(obj: any): string {
  const str = JSON.stringify(obj, Object.keys(obj).sort());
  return crypto.createHash('sha256').update(str).digest('hex');
}

/**
 * Log an audit entry for board operations
 */
export async function logAudit(input: AuditLogInput): Promise<void> {
  try {
    // For MVP, we'll log to console and could extend to a dedicated audit table
    const logEntry = {
      timestamp: new Date().toISOString(),
      who: input.who,
      tool: input.tool,
      boardId: input.boardId,
      frameId: input.frameId,
      inputHash: input.inputHash,
      resultHash: input.resultHash,
      dryRun: input.dryRun || false,
      requestId: input.requestId,
    };

    console.log('[AUDIT]', JSON.stringify(logEntry));

    // Optional: Store in database if we have an audit table
    // For now, we can use DomainAudit or create a BoardAudit model later
    if (input.boardId) {
      // Try to get the board to find its domain
      const board = await prisma.board.findUnique({
        where: { id: input.boardId },
        select: { domainId: true }
      });

      if (board?.domainId) {
        await prisma.domainAudit.create({
          data: {
            domainId: board.domainId,
            action: input.tool,
            actorUserId: input.who,
            before: null,
            after: {
              inputHash: input.inputHash,
              resultHash: input.resultHash,
              boardId: input.boardId,
              frameId: input.frameId,
              dryRun: input.dryRun,
              requestId: input.requestId,
            },
            createdAt: new Date()
          }
        });
      }
    }
  } catch (error) {
    console.error('[AUDIT ERROR]', error);
    // Don't throw - audit failures shouldn't break operations
  }
}

