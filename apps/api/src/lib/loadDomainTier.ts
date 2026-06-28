/**
 * Load domain tier + key policy for resolver and key presence sync.
 */

import { prisma } from '@keeper/database';
import {
  getDomainTierDefinition,
  getDomainTierKeyPolicy,
  parseDomainTier,
  type DomainTierDefinition,
  type DomainTierId,
  type DomainTierKeyPolicy,
} from '@keeper/shared';

export type LoadedDomainTierContext = {
  domainId: string;
  slug: string;
  tierId: DomainTierId;
  tier: DomainTierDefinition;
  policy: DomainTierKeyPolicy;
};

export async function loadDomainTierContext(
  domainId: string,
): Promise<LoadedDomainTierContext | null> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { id: true, slug: true, settings: true, features: true },
  });

  if (!domain) return null;

  const tierId = parseDomainTier({
    settings: domain.settings,
    features: domain.features,
    slug: domain.slug,
  });
  const tier = getDomainTierDefinition(tierId);

  return {
    domainId: domain.id,
    slug: domain.slug,
    tierId,
    tier,
    policy: getDomainTierKeyPolicy(tierId),
  };
}
