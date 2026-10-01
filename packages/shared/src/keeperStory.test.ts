import { describe, expect, it } from 'vitest';
import {
  addStoryMaterial,
  createKeeperStory,
  mergeDomainStories,
  moveStoryMaterial,
  parseDomainStories,
  removeStoryMaterial,
  storyMaterialToStageSlides,
  upsertStory,
} from './keeperStory.js';

describe('keeper story', () => {
  it('keeps a capture once and does not copy the performance', () => {
    const story = createKeeperStory({ id: 'story-1', title: 'First telling', now: '2026-09-30T00:00:00.000Z' });
    const once = addStoryMaterial(story, {
      kind: 'capture',
      sourceId: 'msg-1',
      title: 'Structure as Signal',
      excerpt: 'A distilled paragraph.',
      dialogId: 'dlg-1',
      beatIndex: 0,
      now: '2026-09-30T00:01:00.000Z',
    });
    const twice = addStoryMaterial(once, {
      kind: 'capture',
      sourceId: 'msg-1',
      title: 'Again',
      excerpt: 'no',
    });
    expect(twice.material).toHaveLength(1);
    expect(twice.material[0]).toMatchObject({
      id: 'capture-msg-1',
      kind: 'capture',
      sourceId: 'msg-1',
      title: 'Structure as Signal',
      dialogId: 'dlg-1',
      beatIndex: 0,
    });
  });

  it('reorders and removes a slot without touching the source id contract', () => {
    let story = createKeeperStory({ id: 'story-1' });
    story = addStoryMaterial(story, { kind: 'capture', sourceId: 'a', title: 'A' });
    story = addStoryMaterial(story, { kind: 'moment', sourceId: 'b', title: 'B' });
    story = moveStoryMaterial(story, 'capture-a', 1);
    expect(story.material.map((row) => row.title)).toEqual(['B', 'A']);
    story = removeStoryMaterial(story, 'moment-b');
    expect(story.material.map((row) => row.sourceId)).toEqual(['a']);
  });

  it('maps captures onto live Stage sources in story order', () => {
    let story = createKeeperStory({ id: 'story-1', title: 'Telling' });
    story = addStoryMaterial(story, {
      kind: 'capture',
      sourceId: 'msg-1',
      title: 'Structure as Signal',
      excerpt: 'Paragraph',
    });
    story = addStoryMaterial(story, {
      kind: 'moment',
      sourceId: 'mom-1',
      title: 'A moment',
      excerpt: 'Kept',
    });
    expect(storyMaterialToStageSlides(story)).toEqual([
      {
        id: 'capture-msg-1',
        title: 'Structure as Signal',
        body: 'Paragraph',
        source: { kind: 'live', id: 'msg-1' },
      },
      {
        id: 'moment-mom-1',
        title: 'A moment',
        body: 'Kept',
        source: { kind: 'moment', id: 'mom-1' },
      },
    ]);
  });

  it('round-trips and stamps a creator only when the story is new', () => {
    const created = upsertStory(
      { version: 1, activeStoryId: null, stories: [] },
      createKeeperStory({ id: 'story-1', title: 'Telling', createdBy: 'user-1', now: 't0' }),
    );
    const parsed = parseDomainStories(created);
    const moved = upsertStory(
      parsed,
      { ...parsed.stories[0]!, title: 'Renamed', updatedAt: 't1' },
    );
    const merged = mergeDomainStories(parsed, moved, 'user-2', 't2');
    expect(merged.stories[0]).toMatchObject({
      title: 'Renamed',
      createdBy: 'user-1',
      createdAt: 't0',
    });
  });
});
