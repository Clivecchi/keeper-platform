/**
 * Lead save for a Keeper Story.
 * Writes Domain.settings.stories. Does not touch the Stage filmstrip.
 */

import { prisma } from '@keeper/database';
import {
  addStoryMaterial,
  buildStoryTruthPacket,
  createKeeperStory,
  keeperStoryIdForTitle,
  resolveWhereWeAre,
  selectStoryClaims,
  upsertStory,
  type StoryTruthClaim,
  type StoryTruthPacket,
  type WhereWeAreDialogInput,
} from '@keeper/shared';
import { loadDomainStories, saveDomainStories } from './storyStore.js';

export type DirectedStorySave = {
  storyId: string;
  title: string;
  dialogId: string;
  claims: StoryTruthClaim[];
  trimmed: boolean;
};

function asFrame(raw: unknown): { wordmark?: string; tagline?: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const theme = (raw as { theme?: { wordmark?: string; tagline?: string } }).theme;
  return {
    wordmark: theme?.wordmark,
    tagline: theme?.tagline,
  };
}

export async function loadStoryTruthPacket(
  domainId: string,
  dialogId: string,
): Promise<StoryTruthPacket | null> {
  const [domain, dialogs, sessionTrail] = await Promise.all([
    prisma.domain.findUnique({
      where: { id: domainId },
      select: { id: true, name: true, frame_json: true },
    }),
    prisma.dialog.findMany({
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
        step_title: true,
        step_body: true,
        updated_at: true,
      },
    }),
    prisma.chronicleEvent.count({
      where: { dialogId, eventType: 'session' },
    }),
  ]);
  if (!domain) return null;
  const focus = dialogs.find((row) => row.id === dialogId);
  if (!focus) return null;

  const readingInput: WhereWeAreDialogInput[] = dialogs.map((row) => ({
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
  }));
  const cover = asFrame(domain.frame_json);
  return buildStoryTruthPacket({
    domainId: domain.id,
    domainName: domain.name,
    wordmark: cover.wordmark,
    tagline: cover.tagline,
    focus: {
      id: focus.id,
      title: focus.title,
      documentStatus: focus.document_status,
      orientation: focus.orientation,
      forwardTitle: focus.forward_title,
      forwardDescription: focus.forward_description,
      stepTitle: focus.step_title,
      stepBody: focus.step_body,
      hasSessionTrail: sessionTrail > 0,
    },
    reading: resolveWhereWeAre({ dialogs: readingInput }),
  });
}

export async function saveDirectedStory(input: {
  domainId: string;
  dialogId: string;
  title: string;
  claimIds: string[];
  actorId: string | null;
}): Promise<{ ok: true; save: DirectedStorySave } | { ok: false; message: string }> {
  const title = input.title.trim();
  if (!title) return { ok: false, message: 'A Story needs a title.' };
  const packet = await loadStoryTruthPacket(input.domainId, input.dialogId);
  if (!packet) return { ok: false, message: 'That Dialog is not in this Domain.' };
  const selected = selectStoryClaims(packet, input.claimIds);
  if (!selected.claims.length) {
    return { ok: false, message: 'Choose claim ids from story.truth.read.' };
  }
  const now = new Date().toISOString();
  const storyId = keeperStoryIdForTitle(title);
  const description = selected.claims.map((claim) => claim.text).join('\n');
  const current = await loadDomainStories(input.domainId);
  const prior = current.stories.find((row) => row.id === storyId);
  const story = prior
    ? {
        ...prior,
        title,
        description,
        updatedAt: now,
      }
    : createKeeperStory({
        id: storyId,
        title,
        description,
        createdBy: input.actorId,
        now,
      });
  await saveDomainStories(input.domainId, upsertStory(current, story), input.actorId);
  return {
    ok: true,
    save: {
      storyId,
      title,
      dialogId: input.dialogId,
      claims: selected.claims,
      trimmed: selected.trimmed,
    },
  };
}

export async function attachFrameToDirectedStory(input: {
  domainId: string;
  storyId: string;
  messageId: string;
  dialogId: string;
  title: string;
  excerpt: string;
  actorId: string | null;
}): Promise<void> {
  const current = await loadDomainStories(input.domainId);
  const story = current.stories.find((row) => row.id === input.storyId);
  if (!story) return;
  const next = addStoryMaterial(story, {
    kind: 'capture',
    sourceId: input.messageId,
    title: input.title,
    excerpt: input.excerpt,
    dialogId: input.dialogId,
  });
  await saveDomainStories(input.domainId, upsertStory(current, next), input.actorId);
}

export function readDirectedStorySave(
  results: ReadonlyArray<{ type: string; status: string; data?: Record<string, unknown> | null }>,
): DirectedStorySave | null {
  const row = results.find((result) => result.type === 'story.save' && result.status === 'success');
  const data = row?.data;
  if (!data || typeof data.storyId !== 'string' || typeof data.dialogId !== 'string') return null;
  if (!Array.isArray(data.claims) || data.claims.length === 0) return null;
  const claims = data.claims.filter((claim): claim is StoryTruthClaim => {
    if (!claim || typeof claim !== 'object') return false;
    const row = claim as StoryTruthClaim;
    return typeof row.id === 'string' && typeof row.text === 'string' && Boolean(row.source);
  });
  if (!claims.length) return null;
  return {
    storyId: data.storyId,
    title: typeof data.title === 'string' ? data.title : 'Untitled story',
    dialogId: data.dialogId,
    claims,
    trimmed: data.trimmed === true,
  };
}
