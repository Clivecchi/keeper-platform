/**
 * Scope + authorization for the mounted GET /api/journeys list.
 * Does not implement GET-by-id / POST / PATCH / DELETE.
 */

import type { PrismaClient } from '@keeper/database';
import { resolveParamDomainAccess } from '../middleware/resolveParamDomainAccess.js';

export type JourneyListScopeInput = {
  userId: string;
  domainId?: string;
  keeperId?: string;
};

export type JourneyListWhere = {
  domainId?: string;
  keeperId?: string;
};

export type JourneyListScopeFailure = {
  ok: false;
  status: 400 | 403 | 404;
  body: { error: string; required?: string[]; current?: string[] };
};

export type JourneyListScopeSuccess = {
  ok: true;
  where: JourneyListWhere;
  /** Keeper exists but has no domainId — list stays keeper-scoped; Domain auth cannot be applied. */
  keeperDomainUnresolved: boolean;
};

export type JourneyListScopeResult = JourneyListScopeFailure | JourneyListScopeSuccess;

type JourneyListPrisma = Pick<PrismaClient, 'domain' | 'domainPermission' | 'keeper'>;

export async function assertDomainReadAccess(
  db: JourneyListPrisma,
  userId: string,
  domainId: string,
): Promise<JourneyListScopeFailure | { ok: true }> {
  const domain = await db.domain.findUnique({
    where: { id: domainId },
    select: { id: true, ownerId: true, isPublic: true },
  });

  if (!domain) {
    return { ok: false, status: 404, body: { error: 'Domain not found' } };
  }

  const perm = await db.domainPermission.findFirst({
    where: { domainId: domain.id, userId },
    select: { role: true, permissions: true, expiresAt: true },
  });

  const ownsKeeperInDomain = await db.keeper
    .findFirst({
      where: { domainId: domain.id, ownerId: userId },
      select: { id: true },
    })
    .then(Boolean)
    .catch(() => false);

  const access = resolveParamDomainAccess({
    userId,
    ownerId: domain.ownerId,
    isPublic: domain.isPublic,
    permission: perm,
    ownsKeeperInDomain,
  });

  if (!access.permissions.includes('read')) {
    return {
      ok: false,
      status: 403,
      body: {
        error: 'Insufficient permissions',
        required: ['read'],
        current: access.permissions,
      },
    };
  }

  return { ok: true };
}

/**
 * Reject unscoped lists. Authorize every Domain we can see on the request.
 * Keeper-only lists stay keeper-scoped; if the Keeper has a domainId, that Domain is authorized.
 */
export async function authorizeJourneyListScope(
  db: JourneyListPrisma,
  input: JourneyListScopeInput,
): Promise<JourneyListScopeResult> {
  const domainId = input.domainId?.trim() || undefined;
  const keeperId = input.keeperId?.trim() || undefined;

  if (!domainId && !keeperId) {
    return {
      ok: false,
      status: 400,
      body: { error: 'domainId or keeperId is required' },
    };
  }

  const where: JourneyListWhere = {};
  let keeperDomainUnresolved = false;

  if (domainId) {
    const domainAccess = await assertDomainReadAccess(db, input.userId, domainId);
    if (domainAccess.ok === false) return domainAccess;
    where.domainId = domainId;
  }

  if (keeperId) {
    const keeper = await db.keeper.findUnique({
      where: { id: keeperId },
      select: { id: true, domainId: true },
    });

    if (!keeper) {
      return { ok: false, status: 404, body: { error: 'Keeper not found' } };
    }

    if (keeper.domainId) {
      if (keeper.domainId !== domainId) {
        const keeperDomainAccess = await assertDomainReadAccess(db, input.userId, keeper.domainId);
        if (keeperDomainAccess.ok === false) return keeperDomainAccess;
      }
    } else {
      keeperDomainUnresolved = true;
    }

    where.keeperId = keeperId;
  }

  return { ok: true, where, keeperDomainUnresolved };
}
