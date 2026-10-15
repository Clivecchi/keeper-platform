import { buildKeeperTenantHostname, isKeeperTenantHostname } from '@keeper/shared';

export interface KeeperHostAttachResult {
  hostname: string | null;
  attached: boolean;
  error?: string;
}

type AddKeeperHost = (hostname: string) => Promise<void>;

async function addKeeperHostWithVercel(hostname: string): Promise<void> {
  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (!token || !projectId) {
    throw new Error('Keeper address hosting is not configured on the server.');
  }
  const { VercelDomainManagerService } = await import('../VercelDomainManagerService.js');
  const vercel = new VercelDomainManagerService(token, projectId);
  await vercel.addDomain(hostname);
}

/**
 * Register `{slug}.keeper.domains` on the Keeper web project.
 * DNS already sends every name under keeper.domains to Vercel. The project
 * still needs this exact name or the host 404s.
 */
export async function attachKeeperTenantHost(
  slug: string,
  addHost: AddKeeperHost = addKeeperHostWithVercel,
): Promise<KeeperHostAttachResult> {
  const hostname = buildKeeperTenantHostname(slug);
  if (!isKeeperTenantHostname(hostname)) {
    return {
      hostname: null,
      attached: false,
      error: 'This tag cannot be used as a Keeper address.',
    };
  }

  const token = process.env.VERCEL_TOKEN?.trim();
  const projectId = process.env.VERCEL_PROJECT_ID?.trim();
  if (addHost === addKeeperHostWithVercel && (!token || !projectId)) {
    return {
      hostname,
      attached: false,
      error: 'Keeper address hosting is not configured on the server.',
    };
  }

  try {
    await addHost(hostname);
    return { hostname, attached: true };
  } catch (error) {
    return {
      hostname,
      attached: false,
      error: error instanceof Error ? error.message : 'Failed to host Keeper address',
    };
  }
}
