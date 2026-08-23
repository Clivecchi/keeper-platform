/**
 * Domain-scoped Keeper Stage composition.
 * Persists on Domain.settings.keeperStage — references, not clones.
 */

import { prisma, type Prisma } from '@keeper/database';
import {
  KEEPER_STAGE_SETTINGS_KEY,
  parseKeeperStage,
  readKeeperStageFromDomainSettings,
  type KeeperStageComposition,
} from '@keeper/shared';

function asSettings(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export async function loadKeeperStage(domainId: string): Promise<KeeperStageComposition> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  return readKeeperStageFromDomainSettings(domain?.settings);
}

export async function saveKeeperStage(
  domainId: string,
  next: KeeperStageComposition,
): Promise<KeeperStageComposition> {
  const parsed = parseKeeperStage(next);
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  const settings = asSettings(domain?.settings);
  settings[KEEPER_STAGE_SETTINGS_KEY] = parsed;
  await prisma.domain.update({
    where: { id: domainId },
    data: { settings: settings as Prisma.InputJsonValue },
  });
  return parsed;
}
