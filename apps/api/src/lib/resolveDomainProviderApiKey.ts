/**
 * Tier-aware provider key resolution for a domain context.
 */

import type { ModelProvider } from '@keeper/database';
import { applyTierToResolvedProviderKey } from '@keeper/shared';
import { loadDomainTierContext } from './loadDomainTier.js';
import {
  resolveProviderApiKeyWithSource,
  type ResolvedProviderKey,
} from './resolveProviderApiKey.js';

export type DomainResolvedProviderKey = ResolvedProviderKey & {
  tierId: string;
  tierLabel: string;
};

export async function resolveDomainProviderApiKeyWithSource(
  domainId: string,
  provider: ModelProvider,
  userId?: string | null,
): Promise<DomainResolvedProviderKey | null> {
  const tierContext = await loadDomainTierContext(domainId);
  if (!tierContext) return null;

  const resolved = await resolveProviderApiKeyWithSource(provider, userId ?? undefined);
  const gated = applyTierToResolvedProviderKey(resolved, tierContext.policy);

  return {
    ...gated,
    tierId: tierContext.tierId,
    tierLabel: tierContext.tier.label,
  };
}
