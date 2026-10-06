/**
 * The Reading Rendr may cite. Built with the same projectors as the Stage walker.
 * Rendr does not receive a second, invented set of sentences.
 */

import { prisma } from '@keeper/database';
import {
  projectDomainWhereWeAre,
  projectRealmWhereWeAre,
  projectStoryPass,
  readKeeperStageFromDomainSettings,
  resolveRealmWhereWeAre,
  resolveWhereWeAre,
  type StageContext,
  type StageReading,
  type StageTruthKey,
  type StoryPassSlide,
  type WhereWeAreDialogInput,
} from '@keeper/shared';

function dialogInput(row: {
  id: string;
  title: string;
  title_source: string | null;
  document_status: string | null;
  orientation: string | null;
  orientation_updated_at: Date | null;
  orientation_updated_by: string | null;
  forward_title: string | null;
  forward_description: string | null;
  updated_at: Date | null;
}): WhereWeAreDialogInput {
  return {
    id: row.id,
    title: row.title,
    titleSource: row.title_source,
    documentStatus: row.document_status,
    orientation: row.orientation,
    orientationUpdatedAt: row.orientation_updated_at?.toISOString() ?? null,
    orientationUpdatedBy: row.orientation_updated_by,
    forwardTitle: row.forward_title,
    forwardDescription: row.forward_description,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

async function dialogsFor(domainId: string): Promise<WhereWeAreDialogInput[]> {
  const rows = await prisma.dialog.findMany({
    where: { domain_id: domainId, is_archived: false },
    select: {
      id: true,
      title: true,
      title_source: true,
      document_status: true,
      orientation: true,
      orientation_updated_at: true,
      orientation_updated_by: true,
      forward_title: true,
      forward_description: true,
      updated_at: true,
    },
  });
  return rows.map(dialogInput);
}

function contextFor(truth: StageTruthKey, domainId: string): StageContext {
  if (truth === 'realm-where-we-are') {
    return { scope: 'realm', audience: 'admin', arriving: true };
  }
  return {
    scope: 'domain',
    domainId,
    audience: 'admin',
    arriving: truth === 'domain-where-we-are',
  };
}

export async function loadStageReading(input: {
  domainId: string;
  truth: StageTruthKey;
  userId?: string;
}): Promise<StageReading | null> {
  const domain = await prisma.domain.findUnique({
    where: { id: input.domainId },
    select: { id: true, settings: true },
  });
  if (!domain) return null;
  const context = contextFor(input.truth, input.domainId);

  if (input.truth === 'story') {
    const stage = readKeeperStageFromDomainSettings(domain.settings);
    const slides: StoryPassSlide[] = (stage.story?.slides ?? []).map((slide) => ({
      id: slide.id,
      title: slide.title,
      body: slide.body,
      kind: slide.kind === 'root' ? 'root' : 'beat',
      ...(slide.source ? { source: slide.source } : {}),
      frameMessageId: slide.source?.kind === 'live' ? slide.source.id ?? null : null,
    }));
    return projectStoryPass({ context, domainId: input.domainId, slides }).reading;
  }

  if (input.truth === 'domain-where-we-are') {
    const stage = readKeeperStageFromDomainSettings(domain.settings);
    const dialogs = await dialogsFor(input.domainId);
    return projectDomainWhereWeAre({
      context,
      truth: resolveWhereWeAre({
        dialogs,
        stageBeatTitles: stage.story?.slides.map((slide) => slide.title) ?? [],
      }),
    }).reading;
  }

  const user = input.userId
    ? await prisma.users.findUnique({
        where: { id: input.userId },
        select: { primaryDomainId: true },
      })
    : null;
  const memberships = input.userId
    ? await prisma.domainPermission.findMany({
        where: { userId: input.userId },
        select: { domainId: true },
        take: 8,
      })
    : [];
  const ids = [...new Set([input.domainId, ...memberships.map((row) => row.domainId)])].slice(0, 8);
  const domains = await prisma.domain.findMany({
    where: { id: { in: ids } },
    select: { id: true, slug: true, name: true, settings: true },
  });
  const signals = await Promise.all(
    domains.map(async (row) => {
      const stage = readKeeperStageFromDomainSettings(row.settings);
      return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        face: user?.primaryDomainId === row.id,
        dialogs: await dialogsFor(row.id),
        stageBeatTitles: stage.story?.slides.map((slide) => slide.title) ?? [],
      };
    }),
  );
  return projectRealmWhereWeAre({
    context,
    truth: resolveRealmWhereWeAre({ domains: signals }),
  }).reading;
}
