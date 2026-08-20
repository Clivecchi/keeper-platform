/**
 * Session-bound Kip allowlist read — policy + golden path + optional canDraft.
 * No enforcement changes.
 */

import { loadDomainPolicy } from '../../policy/domainPolicyService.js';
import {
  buildKipActionAllowlistStatus,
  type KipActionAllowlistStatus,
  type KipAllowlistEnvironment,
} from '../../policy/kipActionAllowlist.js';
import { resolveSessionDraftCapability } from './resolveAgentEnvironment.js';

export async function resolveKipActionAllowlistStatusForSession(params: {
  domainId?: string | null;
  userId?: string | null;
}): Promise<KipActionAllowlistStatus> {
  const domainId = params.domainId?.trim() || null;
  const userId = params.userId?.trim() || null;

  let environment: KipAllowlistEnvironment = null;
  if (domainId) {
    try {
      const policy = await loadDomainPolicy(domainId);
      environment = { policy };
    } catch (error) {
      console.warn('[kipActionAllowlist] domain policy load failed', { domainId, error });
    }
  }

  let canDraft: boolean | null = null;
  if (userId && domainId) {
    try {
      const session = await resolveSessionDraftCapability(userId, domainId);
      canDraft = session.canDraft;
    } catch (error) {
      console.warn('[kipActionAllowlist] canDraft resolve failed', { userId, domainId, error });
    }
  }

  return buildKipActionAllowlistStatus({ environment, canDraft });
}
