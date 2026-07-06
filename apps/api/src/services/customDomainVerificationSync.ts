/**
 * Sync Keeper DB customDomainVerified with Vercel when DNS is already verified.
 * UI can show Vercel "verified" before the DB flag is persisted — this closes that gap.
 */

import type { Domain } from '@prisma/client';
import { DomainCacheService, DomainService } from '@keeper/database';
import { VercelDomainManagerService } from './VercelDomainManagerService.js';

export function createVercelDomainManager(): VercelDomainManagerService | null {
  const token = process.env.VERCEL_TOKEN;
  const projectId = process.env.VERCEL_PROJECT_ID;
  if (!token || !projectId) return null;
  return new VercelDomainManagerService(token, projectId);
}

type DomainCustomHostRow = Pick<Domain, 'id' | 'slug' | 'name' | 'customDomain' | 'customDomainVerified'>;

export async function syncCustomDomainVerificationIfReady(
  domainService: DomainService,
  cacheService: DomainCacheService | null,
  domain: DomainCustomHostRow,
): Promise<Domain | null> {
  if (!domain.customDomain?.trim()) return null;
  if (domain.customDomainVerified) return domain as Domain;

  const vercel = createVercelDomainManager();
  if (!vercel) return null;

  const hostname = domain.customDomain.trim().toLowerCase();

  try {
    const status = await vercel.getDomainStatus(hostname);
    if (!status.verified) {
      const cfg = await vercel.getDomainConfig(hostname);
      if (!cfg.configured) return null;
      await vercel.verifyDomain(hostname);
    }

    const updated = await domainService.updateDomain(domain.id, {
      customDomainVerified: true,
    });

    if (cacheService) {
      await cacheService.invalidateDomain(domain.id);
      await cacheService.cacheDomain(updated);
    }

    return updated;
  } catch (error) {
    console.error('[customDomainVerificationSync]', {
      domainId: domain.id,
      hostname,
      error,
    });
    return null;
  }
}

export async function resolveDomainForCustomHostname(
  domainService: DomainService,
  cacheService: DomainCacheService | null,
  hostname: string,
  findUnverifiedByHostname: (host: string) => Promise<DomainCustomHostRow | null>,
): Promise<Domain | null> {
  const verified = await domainService.getDomainByHostname(hostname);
  if (verified) return verified;

  const candidate = await findUnverifiedByHostname(hostname);
  if (!candidate?.customDomain) return null;

  const synced = await syncCustomDomainVerificationIfReady(
    domainService,
    cacheService,
    candidate,
  );
  return synced?.customDomainVerified ? synced : null;
}
