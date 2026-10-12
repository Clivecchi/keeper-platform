import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: path.join(root, 'apps/api/.env') });
const { prisma } = await import('@keeper/database');

const DIALOG = 'cmv04yrn50001otb8mwjrj0as';

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const dialog = await prisma.dialog.findUnique({
  where: { id: DIALOG },
  select: { id: true, title: true, domain_id: true, updated_at: true },
});

const sessions = await prisma.kip_sessions.findMany({
  where: { dialog_id: DIALOG },
  select: { id: true, updated_at: true, agent_id: true },
  orderBy: { updated_at: 'desc' },
  take: 3,
});

const sessionIds = sessions.map((row) => row.id);
const messages = sessionIds.length
  ? await prisma.kip_messages.findMany({
      where: {
        session_id: { in: sessionIds },
        created_at: { gte: new Date('2026-10-11T21:00:00-04:00') },
      },
      orderBy: { created_at: 'asc' },
      select: {
        id: true,
        session_id: true,
        sender: true,
        role: true,
        created_at: true,
        content: true,
        metadata: true,
      },
    })
  : [];

const domain = dialog
  ? await prisma.domain.findUnique({
      where: { id: dialog.domain_id },
      select: { id: true, slug: true, settings: true },
    })
  : null;

const settings = asRecord(domain?.settings) ?? {};
const stage = asRecord(settings.keeperStage);
const story = asRecord(stage?.story);
const slides = Array.isArray(story?.slides) ? story.slides : [];
const stories = asRecord(settings.stories);
const storyList = Array.isArray(stories?.items)
  ? stories.items
  : Array.isArray(settings.stories)
    ? settings.stories
    : [];

function storyBrief(value: unknown) {
  const row = asRecord(value);
  if (!row) return null;
  return {
    id: row.id ?? row.storyId,
    title: row.title,
    status: row.status,
    dialogId: row.dialogId,
    active: row.active,
    keys: Object.keys(row).slice(0, 20),
  };
}

const summary = {
  dialog,
  sessions,
  messageCount: messages.length,
  messages: messages.map((row) => {
    const meta = asRecord(row.metadata) ?? {};
    const actions = Array.isArray(meta.actionResults) ? meta.actionResults : [];
    const frame = asRecord(meta.framePerformance);
    const beats = Array.isArray(frame?.beats) ? frame.beats : [];
    return {
      id: row.id,
      at: row.created_at,
      role: row.role || row.sender,
      contentLen: (row.content ?? '').length,
      content: (row.content ?? '').slice(0, 1800),
      frame: frame
        ? {
            title: frame.title,
            promote: frame.promote,
            beatCount: beats.length,
            beats: beats.map((beat) => {
              const item = asRecord(beat);
              const body = typeof item?.body === 'string' ? item.body : '';
              return { title: item?.title, bodyLen: body.length, bodyHead: body.slice(0, 240) };
            }),
          }
        : null,
      actions: actions.map((action) => {
        const item = asRecord(action);
        const data = asRecord(item?.data);
        return {
          type: item?.type,
          status: item?.status,
          message: item?.message,
          data,
          agent: item?.agentSlug ?? item?.agent ?? data?.agent,
        };
      }),
      cast: Array.isArray(meta.castVoices)
        ? meta.castVoices.map((voice) => {
            const item = asRecord(voice);
            const content = typeof item?.content === 'string' ? item.content : '';
            return {
              slug: item?.slug,
              name: item?.attributedTo,
              status: item?.status,
              head: content.slice(0, 280),
            };
          })
        : [],
    };
  }),
  stageStory: {
    version: story?.version,
    slideCount: slides.length,
    slides: slides.map((slide) => {
      const row = asRecord(slide);
      const body = typeof row?.body === 'string' ? row.body : '';
      return {
        id: row?.id,
        title: row?.title,
        kind: row?.kind,
        slideType: row?.slideType,
        source: row?.source,
        bodyLen: body.length,
        bodyHead: body.slice(0, 300),
      };
    }),
  },
  storiesShape: settings.stories ? Object.keys(asRecord(settings.stories) ?? { list: true }) : null,
  activeStoryId: stories?.activeStoryId ?? settings.activeStoryId ?? null,
  storyBriefs: (Array.isArray(storyList) ? storyList : []).map(storyBrief),
};

writeFileSync(path.join(root, 'tmp', 'ot-handoff-947.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify({
  dialog: summary.dialog,
  messages: summary.messageCount,
  slides: summary.stageStory.slideCount,
  stories: summary.storyBriefs.length,
  active: summary.activeStoryId,
}, null, 2));
await prisma.$disconnect();
