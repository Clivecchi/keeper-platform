/**
 * Domain-scoped People role catalog.
 * Persists on Domain.settings.roles — names and descriptions over the four permission bundles.
 */

import { prisma, type Prisma } from '@keeper/database';
import {
  DOMAIN_ROLE_CATALOG_SETTINGS_KEY,
  applyDomainRoleCatalogWrite,
  readDomainRoleCatalog,
  resolveDomainRoleCatalog,
  type CustomDomainRole,
  type DomainRole,
  type DomainRoleCatalogEntry,
  type DomainRoleCatalogRecord,
} from '@keeper/shared';

function asSettings(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export async function loadDomainRoleCatalog(domainId: string): Promise<DomainRoleCatalogEntry[]> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  return resolveDomainRoleCatalog(domain?.settings);
}

async function writeCatalogRecord(
  domainId: string,
  record: DomainRoleCatalogRecord,
): Promise<DomainRoleCatalogEntry[]> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  const settings = asSettings(domain?.settings);
  const compact = readDomainRoleCatalog({ [DOMAIN_ROLE_CATALOG_SETTINGS_KEY]: record });
  if (!compact.owner && !compact.labels && !compact.custom) {
    delete settings[DOMAIN_ROLE_CATALOG_SETTINGS_KEY];
  } else {
    settings[DOMAIN_ROLE_CATALOG_SETTINGS_KEY] = compact;
  }
  await prisma.domain.update({
    where: { id: domainId },
    data: { settings: settings as Prisma.InputJsonValue },
  });
  return resolveDomainRoleCatalog(settings);
}

export async function createDomainRole(
  domainId: string,
  input: { name: string; description: string; mapsTo?: DomainRole },
): Promise<DomainRoleCatalogEntry[]> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  const next = applyDomainRoleCatalogWrite(domain?.settings, {
    action: 'create',
    name: input.name,
    description: input.description,
    mapsTo: input.mapsTo,
  });
  return writeCatalogRecord(domainId, next.record);
}

export async function updateDomainRole(
  domainId: string,
  input: { key: string; label: string; description: string; mapsTo?: DomainRole },
): Promise<DomainRoleCatalogEntry[]> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  const next = applyDomainRoleCatalogWrite(domain?.settings, {
    action: 'update',
    key: input.key,
    label: input.label,
    description: input.description,
    mapsTo: input.mapsTo,
  });
  return writeCatalogRecord(domainId, next.record);
}

export async function deleteDomainRole(
  domainId: string,
  key: string,
): Promise<{ catalog: DomainRoleCatalogEntry[]; removed: CustomDomainRole }> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  const next = applyDomainRoleCatalogWrite(domain?.settings, { action: 'delete', key });
  if (!next.removed) {
    throw new Error('Only custom roles can be removed.');
  }
  await prisma.domainPermission.updateMany({
    where: { domainId, role: key },
    data: { role: next.removed.mapsTo },
  });
  await prisma.domainInvitation.updateMany({
    where: { domainId, role: key },
    data: { role: next.removed.mapsTo },
  });
  const catalog = await writeCatalogRecord(domainId, next.record);
  return { catalog, removed: next.removed };
}
