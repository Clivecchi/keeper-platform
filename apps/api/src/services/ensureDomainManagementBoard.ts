import { prisma } from '@keeper/database';
import { ensureDomainManagementBoard as ensureDmbImpl } from './boards/domainManagement.js';
import { logReq } from '../utils/requestLog.js';
import { randomUUID } from 'crypto';

/**
 * ensureDomainManagementBoard
 * Idempotently ensures a single Domain Management Board exists for a domain
 * and seeds a small deterministic frame set. Returns minimal identifiers.
 */
export async function ensureDomainManagementBoard(domainId: string, opts?: { reqId?: string }): Promise<{ ok: boolean; boardId?: string; domainId: string; warnings: string[]; error?: string }> {
  const warnings: string[] = [];

  // 1) Verify domain exists first
  const domain = await prisma.domain.findUnique({ where: { id: domainId } });
  if (!domain) {
    return { ok: false, domainId, warnings, error: 'DOMAIN_NOT_FOUND' };
  }

  // 2) Try full ensure (creates board + deterministic frames). Do not fail the whole call.
  try {
    const board = await ensureDmbImpl(prisma as any, domainId, { reqId: opts?.reqId });
    await logReq(opts?.reqId, 'ENSURE_DMB_OK', { domainId, boardId: board.id });
    return { ok: true, boardId: board.id, domainId, warnings };
  } catch (e: any) {
    warnings.push(`ensureDmbImpl failed: ${e?.message ?? 'unknown'}`);
    await logReq(opts?.reqId, 'ENSURE_DMB_FAIL', { domainId, message: e?.message }, 'warn');
  }

  // 3) Fallback – ensure at least one board of type 'domain-home' exists for this domain
  try {
    const existing = await prisma.board.findFirst({ where: { domainId, boardType: 'domain-home' } });
    if (existing) {
      await logReq(opts?.reqId, 'ENSURE_DMB_EXISTING', { domainId, boardId: existing.id });
      return { ok: true, boardId: existing.id, domainId, warnings };
    }

    const safeSlug = `domain-${domainId.slice(0, 8)}-home`;
    const created = await prisma.board.create({
      data: {
        id: randomUUID(),
        keeperId: domainId,
        name: 'Domain Management Board',
        slug: safeSlug,
        description: 'Management board for this domain',
        domainId,
        boardType: 'domain-home',
      } as any,
    });
    await logReq(opts?.reqId, 'ENSURE_DMB_CREATED_FALLBACK', { domainId, boardId: created.id });
    return { ok: true, boardId: created.id, domainId, warnings };
  } catch (e: any) {
    if (e?.code === 'P2002') {
      // Unique conflict – fetch the existing row
      const fallback = await prisma.board.findFirst({ where: { domainId, boardType: 'domain-home' } });
      if (fallback) return { ok: true, boardId: fallback.id, domainId, warnings };
    }
    warnings.push(`fallback board ensure failed: ${e?.message ?? 'unknown'}`);
    return { ok: false, domainId, warnings, error: 'ENSURE_DMB_FAILED' };
  }
}


