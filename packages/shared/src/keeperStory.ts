/**
 * Domain Story — ordered narrative references.
 *
 * A Story is not a Document and not the Stage filmstrip.
 * Story Capture is a promoted FramePerformance already stored on a Lead message.
 * This record points at that message. It does not copy the performance.
 */

import type { StageStorySlideSource } from './keeperStage.js';

export const STORY_SETTINGS_KEY = 'stories' as const;
export const STORY_SET_VERSION = 1 as const;
export const STORY_VERSION = 1 as const;
export const STORY_MAX_COUNT = 24 as const;
export const STORY_MAX_MATERIAL = 24 as const;

export const STORY_STATUSES = ['shaping', 'staged'] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];

/**
 * capture — promoted FramePerformance on a Lead message (`sourceId` is that message id).
 * The other kinds are references to existing Keeper objects. This slice only adds captures.
 */
export const STORY_MATERIAL_KINDS = ['capture', 'moment', 'message', 'point', 'media'] as const;
export type StoryMaterialKind = (typeof STORY_MATERIAL_KINDS)[number];

export type StoryMaterialRef = {
  /** Slot id inside this Story. Not the source id. */
  id: string;
  kind: StoryMaterialKind;
  sourceId: string;
  title: string;
  /** Display excerpt. The source object remains the authority. */
  excerpt: string;
  dialogId?: string | null;
  /** Which beat was on screen when a capture was added. The message still holds every beat. */
  beatIndex?: number;
};

export type KeeperStory = {
  version: typeof STORY_VERSION;
  id: string;
  title: string;
  /** Narrative intention. Not a Document forward. */
  description: string;
  status: StoryStatus;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  material: StoryMaterialRef[];
};

export type DomainStorySet = {
  version: typeof STORY_SET_VERSION;
  activeStoryId: string | null;
  stories: KeeperStory[];
};

const KIND_SET = new Set<string>(STORY_MATERIAL_KINDS);
const STATUS_SET = new Set<string>(STORY_STATUSES);

function trimmed(value: unknown, max = 200): string | null {
  if (typeof value !== 'string') return null;
  const next = value.trim();
  if (!next) return null;
  return next.slice(0, max);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

export function emptyDomainStories(): DomainStorySet {
  return { version: STORY_SET_VERSION, activeStoryId: null, stories: [] };
}

export function storyMaterialSlotId(kind: StoryMaterialKind, sourceId: string): string {
  return `${kind}-${sourceId}`.slice(0, 80);
}

function parseMaterial(raw: unknown): StoryMaterialRef | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const kind = typeof rec.kind === 'string' ? rec.kind : '';
  if (!KIND_SET.has(kind)) return null;
  const sourceId = trimmed(rec.sourceId, 80);
  const title = trimmed(rec.title, 200);
  if (!sourceId || !title) return null;
  const id = trimmed(rec.id, 80) ?? storyMaterialSlotId(kind as StoryMaterialKind, sourceId);
  const excerpt = trimmed(rec.excerpt, 2000) ?? '';
  const dialogId = trimmed(rec.dialogId, 80);
  const beatIndex =
    typeof rec.beatIndex === 'number' && Number.isInteger(rec.beatIndex) && rec.beatIndex >= 0
      ? rec.beatIndex
      : undefined;
  return {
    id,
    kind: kind as StoryMaterialKind,
    sourceId,
    title,
    excerpt,
    ...(dialogId ? { dialogId } : {}),
    ...(beatIndex !== undefined ? { beatIndex } : {}),
  };
}

function parseStory(raw: unknown): KeeperStory | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const id = trimmed(rec.id, 80);
  const title = trimmed(rec.title, 200);
  if (!id || !title) return null;
  const status = typeof rec.status === 'string' && STATUS_SET.has(rec.status)
    ? (rec.status as StoryStatus)
    : 'shaping';
  const material: StoryMaterialRef[] = [];
  const seen = new Set<string>();
  if (Array.isArray(rec.material)) {
    for (const item of rec.material) {
      if (material.length >= STORY_MAX_MATERIAL) break;
      const row = parseMaterial(item);
      if (!row || seen.has(row.id)) continue;
      seen.add(row.id);
      material.push(row);
    }
  }
  return {
    version: STORY_VERSION,
    id,
    title,
    description: trimmed(rec.description, 2000) ?? '',
    status,
    createdBy: trimmed(rec.createdBy, 80),
    createdAt: trimmed(rec.createdAt, 40) ?? new Date(0).toISOString(),
    updatedAt: trimmed(rec.updatedAt, 40) ?? new Date(0).toISOString(),
    material,
  };
}

export function parseDomainStories(raw: unknown): DomainStorySet {
  const rec = asRecord(raw);
  if (!rec) return emptyDomainStories();
  const stories: KeeperStory[] = [];
  const seen = new Set<string>();
  if (Array.isArray(rec.stories)) {
    for (const item of rec.stories) {
      if (stories.length >= STORY_MAX_COUNT) break;
      const story = parseStory(item);
      if (!story || seen.has(story.id)) continue;
      seen.add(story.id);
      stories.push(story);
    }
  }
  const active = trimmed(rec.activeStoryId, 80);
  return {
    version: STORY_SET_VERSION,
    activeStoryId: active && seen.has(active) ? active : stories[0]?.id ?? null,
    stories,
  };
}

export function readStoriesFromDomainSettings(settings: unknown): DomainStorySet {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return emptyDomainStories();
  }
  return parseDomainStories((settings as Record<string, unknown>)[STORY_SETTINGS_KEY]);
}

export function createKeeperStory(input: {
  id: string;
  title?: string | null;
  description?: string | null;
  createdBy?: string | null;
  now?: string;
}): KeeperStory {
  const now = input.now ?? new Date().toISOString();
  return {
    version: STORY_VERSION,
    id: input.id.slice(0, 80),
    title: input.title?.trim().slice(0, 200) || 'Untitled story',
    description: input.description?.trim().slice(0, 2000) || '',
    status: 'shaping',
    createdBy: input.createdBy?.trim() || null,
    createdAt: now,
    updatedAt: now,
    material: [],
  };
}

/**
 * Append a reference. The same source is kept once.
 * Removing a slot does not delete the source.
 */
export function addStoryMaterial(
  story: KeeperStory,
  input: {
    kind: StoryMaterialKind;
    sourceId: string;
    title: string;
    excerpt?: string;
    dialogId?: string | null;
    beatIndex?: number;
    now?: string;
  },
): KeeperStory {
  const sourceId = input.sourceId.trim();
  const title = input.title.trim();
  if (!sourceId || !title || story.material.length >= STORY_MAX_MATERIAL) return story;
  if (story.material.some((row) => row.kind === input.kind && row.sourceId === sourceId)) {
    return story;
  }
  const now = input.now ?? new Date().toISOString();
  const slot: StoryMaterialRef = {
    id: storyMaterialSlotId(input.kind, sourceId),
    kind: input.kind,
    sourceId: sourceId.slice(0, 80),
    title: title.slice(0, 200),
    excerpt: (input.excerpt ?? '').trim().slice(0, 2000),
    ...(input.dialogId?.trim() ? { dialogId: input.dialogId.trim().slice(0, 80) } : {}),
    ...(typeof input.beatIndex === 'number' ? { beatIndex: input.beatIndex } : {}),
  };
  return { ...story, updatedAt: now, material: [...story.material, slot] };
}

export function removeStoryMaterial(story: KeeperStory, slotId: string, now?: string): KeeperStory {
  const material = story.material.filter((row) => row.id !== slotId);
  if (material.length === story.material.length) return story;
  return { ...story, updatedAt: now ?? new Date().toISOString(), material };
}

export function moveStoryMaterial(
  story: KeeperStory,
  slotId: string,
  direction: -1 | 1,
  now?: string,
): KeeperStory {
  const index = story.material.findIndex((row) => row.id === slotId);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= story.material.length) return story;
  const material = [...story.material];
  const [row] = material.splice(index, 1);
  if (!row) return story;
  material.splice(next, 0, row);
  return { ...story, updatedAt: now ?? new Date().toISOString(), material };
}

export function upsertStory(set: DomainStorySet, story: KeeperStory): DomainStorySet {
  const existing = set.stories.some((row) => row.id === story.id);
  const stories = existing
    ? set.stories.map((row) => (row.id === story.id ? story : row))
    : [...set.stories, story].slice(0, STORY_MAX_COUNT);
  return {
    version: STORY_SET_VERSION,
    activeStoryId: story.id,
    stories,
  };
}

/**
 * Preserve createdAt / createdBy for stories the domain already has.
 * Stamp the actor on stories that arrive without one.
 */
export function mergeDomainStories(
  current: DomainStorySet,
  incoming: DomainStorySet,
  actorId: string | null,
  now = new Date().toISOString(),
): DomainStorySet {
  const prior = new Map(current.stories.map((story) => [story.id, story]));
  const stories = incoming.stories.map((story) => {
    const previous = prior.get(story.id);
    return {
      ...story,
      createdAt: previous?.createdAt ?? story.createdAt ?? now,
      createdBy: previous?.createdBy ?? story.createdBy ?? actorId,
      updatedAt: story.updatedAt || now,
    };
  });
  const ids = new Set(stories.map((story) => story.id));
  const active = incoming.activeStoryId && ids.has(incoming.activeStoryId)
    ? incoming.activeStoryId
    : stories[0]?.id ?? null;
  return { version: STORY_SET_VERSION, activeStoryId: active, stories };
}

/** Ordered Story material as Stage filmstrip beats. Root cover stays a Stage concern. */
export function storyMaterialToStageSlides(
  story: KeeperStory,
): Array<{
  id: string;
  title: string;
  body: string;
  source?: StageStorySlideSource;
}> {
  return story.material.slice(0, STORY_MAX_MATERIAL).map((row) => {
    const source = stageSourceForMaterial(row);
    return {
      id: row.id,
      title: row.title,
      body: row.excerpt,
      ...(source ? { source } : {}),
    };
  });
}

function stageSourceForMaterial(row: StoryMaterialRef): StageStorySlideSource | undefined {
  if (row.kind === 'capture' || row.kind === 'message') {
    return { kind: 'live', id: row.sourceId };
  }
  if (row.kind === 'moment') return { kind: 'moment', id: row.sourceId };
  if (row.kind === 'point') return { kind: 'point', id: row.sourceId };
  return undefined;
}
