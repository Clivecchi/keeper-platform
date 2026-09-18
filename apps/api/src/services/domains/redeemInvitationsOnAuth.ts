import { DomainCacheService, DomainPermissionService, prisma } from '@keeper/database';
import { getRedis } from '../../lib/redis.js';
import {
  acceptPendingInvitationsForUser,
  type PendingInvitationArrival,
} from './domainConnectionInvite.js';

let cacheService: DomainCacheService | null = null;
let permissionService: DomainPermissionService | null = null;

function getPermissionService(): DomainPermissionService {
  if (!permissionService) {
    if (!cacheService) {
      cacheService = new DomainCacheService(getRedis());
    }
    permissionService = new DomainPermissionService(prisma, cacheService);
  }
  return permissionService;
}

/**
 * Redeem pending Domain invitations that match this account's email.
 * Auth must still succeed if redeem fails.
 */
export async function redeemInvitationsOnAuth(
  userId: string,
  email: string | null | undefined,
): Promise<PendingInvitationArrival | null> {
  const trimmed = email?.trim();
  if (!trimmed) return null;
  try {
    return await acceptPendingInvitationsForUser(prisma, getPermissionService(), {
      userId,
      email: trimmed,
    });
  } catch (error) {
    console.warn('[auth] invitation redeem failed', { userId, error });
    return null;
  }
}

export function jsonInvitationArrival(
  arrival: PendingInvitationArrival | null,
): { domainSlug: string; dialogId?: string } | undefined {
  const slug = arrival?.domainSlug?.trim();
  if (!slug) return undefined;
  const dialogId = arrival.dialogId?.trim();
  return dialogId ? { domainSlug: slug, dialogId } : { domainSlug: slug };
}
