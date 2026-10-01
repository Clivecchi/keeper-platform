/**
 * Domain-scoped Stories.
 * Persists on Domain.settings.stories — references, not clones.
 * Does not touch keeperStage or any sibling settings key.
 */

import { prisma, type Prisma } from '@keeper/database';
import {
  mergeDomainStories,
  readStoriesFromDomainSettings,
  STORY_SETTINGS_KEY,
  type DomainStorySet,
} from '@keeper/shared';

function asSettings(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

export async function loadDomainStories(domainId: string): Promise<DomainStorySet> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  return readStoriesFromDomainSettings(domain?.settings);
}

export async function saveDomainStories(
  domainId: string,
  incoming: DomainStorySet,
  actorId: string | null,
): Promise<DomainStorySet> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  const current = readStoriesFromDomainSettings(domain?.settings);
  const next = mergeDomainStories(current, incoming, actorId);
  const settings = asSettings(domain?.settings);
  settings[STORY_SETTINGS_KEY] = next;
  await prisma.domain.update({
    where: { id: domainId },
    data: { settings: settings as Prisma.InputJsonValue },
  });
  return next;
}
