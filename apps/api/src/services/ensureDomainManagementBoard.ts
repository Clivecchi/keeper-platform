import { prisma } from '@keeper/database';
import { ensureDomainManagementBoard as ensureDmbImpl } from './boards/domainManagement.js';

/**
 * ensureDomainManagementBoard
 * Idempotently ensures a single Domain Management Board exists for a domain
 * and seeds a small deterministic frame set. Returns minimal identifiers.
 */
export async function ensureDomainManagementBoard(domainId: string): Promise<{ boardId: string; domainId: string } | null> {
  // Verify domain exists first
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) return null;

  const board = await ensureDmbImpl(prisma as any, domainId);
  return { boardId: board.id, domainId };
}


