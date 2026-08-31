import { describe, expect, it } from 'vitest';
import {
  bringOntoStage,
  buildKeeperStagePrompt,
  displayKeeperStageTitle,
  domainCoverRootSlide,
  emptyKeeperStage,
  mergeKeeperStagePatch,
  parseKeeperStage,
  parseStageStory,
  readKeeperStageFromDomainSettings,
  withDomainCoverRoot,
} from './keeperStage.js';

describe('parseKeeperStage', () => {
  it('returns an empty Keeper stage for junk', () => {
    expect(parseKeeperStage(null).slug).toBe('keeper');
    expect(parseKeeperStage({ presences: 'nope' }).presences).toEqual([]);
  });

  it('dedupes the same object and keeps contextual Agency', () => {
    const parsed = parseKeeperStage({
      title: 'Keeper',
      selectedPresenceId: 'p1',
      presences: [
        {
          id: 'p1',
          kind: 'agent',
          objectId: 'kip-id',
          title: 'Kip',
          x: 0.2,
          y: 0.3,
          contextualRole: 'Lead',
          direction: 'Hold the plot',
        },
        {
          id: 'p-dup',
          kind: 'agent',
          objectId: 'kip-id',
          title: 'Kip clone',
        },
      ],
    });
    expect(parsed.presences).toHaveLength(1);
    expect(parsed.presences[0]?.contextualRole).toBe('Lead');
    expect(parsed.selectedPresenceId).toBe('p1');
  });
});

describe('bringOntoStage', () => {
  it('references the object instead of cloning it', () => {
    const first = bringOntoStage(emptyKeeperStage(), {
      id: 'p1',
      kind: 'dialog',
      objectId: 'dlg-plot',
      title: 'Finding the Plot',
    });
    const second = bringOntoStage(first, {
      id: 'p2',
      kind: 'dialog',
      objectId: 'dlg-plot',
      title: 'Finding the Plot again',
    });
    expect(second.presences).toHaveLength(1);
    expect(second.presences[0]?.id).toBe('p1');
    expect(second.selectedPresenceId).toBe('p1');
  });
});

describe('buildKeeperStagePrompt', () => {
  it('names composition and contextual Agency for the turn', () => {
    const stage = bringOntoStage(emptyKeeperStage(), {
      id: 'p1',
      kind: 'agent',
      objectId: 'kip-id',
      title: 'Kip',
      contextualRole: 'Lead',
      direction: 'Keep the Re-Center honest',
    });
    const prompt = buildKeeperStagePrompt(stage);
    expect(prompt).toContain('Stage: “Keeper Stage”');
    expect(buildKeeperStagePrompt(stage, 'livecchi.biz')).toContain('Stage: “livecchi.biz Stage”');
    expect(prompt).toContain('single story being told');
    expect(prompt).toContain('Lay it out as Slides');
    expect(prompt).toContain('stage.story.layout');
    expect(prompt).toContain('Slides for presentation');
    expect(prompt).toContain('Agent “Kip”');
    expect(prompt).toContain('stage role: Lead');
    expect(prompt).toContain('Keep the Re-Center honest');
  });

  it('is silent when the Stage is empty', () => {
    expect(buildKeeperStagePrompt(emptyKeeperStage())).toBeNull();
  });

  it('speaks on an empty Stage when the human is in the room', () => {
    const prompt = buildKeeperStagePrompt(emptyKeeperStage(), 'ke3p', { onStage: true });
    expect(prompt).toContain('stage.story.layout');
    expect(prompt).toContain('domain Root');
  });
});

describe('displayKeeperStageTitle', () => {
  it('belongs to the domain when the stored title is the platform default', () => {
    expect(displayKeeperStageTitle('Keeper', 'Livecchi.biz')).toBe('Livecchi.biz Stage');
    expect(displayKeeperStageTitle('Keeper Stage', 'livecchi.biz')).toBe('livecchi.biz Stage');
    expect(displayKeeperStageTitle('Workshop', 'livecchi.biz')).toBe('Workshop');
  });
});

describe('parseStageStory', () => {
  it('stores story beats only — Root is the domain Cover, not an agent title', () => {
    const story = parseStageStory({
      slides: [
        { title: 'ke3p', kind: 'root', slideType: 'domain_cover' },
        { title: 'Finding the Plot', body: 'On ke3p Stage.', source: { kind: 'live' } },
        { title: 'The gap', body: 'Stage is not the story.', source: { kind: 'point', id: 'p1' } },
      ],
    });
    expect(story?.slides.map((slide) => slide.title)).toEqual(['Finding the Plot', 'The gap']);
    expect(story?.slides[0]?.kind).toBe('beat');
    expect(story?.slides[1]?.source).toEqual({ kind: 'point', id: 'p1' });
  });

  it('places the domain Cover as Root in front of the selected story', () => {
    const story = parseStageStory({
      slides: [{ title: 'The gap', body: 'Stage is not the story.' }],
    });
    const strip = withDomainCoverRoot(story?.slides ?? [], domainCoverRootSlide({
      wordmark: 'ke3p',
      tagline: 'Becoming together',
    }));
    expect(strip[0]).toMatchObject({ id: 'root', kind: 'root', slideType: 'domain_cover', title: 'ke3p' });
    expect(strip[1]?.title).toBe('The gap');
  });

  it('returns null for an empty slide list', () => {
    expect(parseStageStory({ slides: [] })).toBeNull();
  });
});

describe('mergeKeeperStagePatch', () => {
  it('keeps the filmstrip when a presence PATCH omits story', () => {
    const current = parseKeeperStage({
      title: 'Keeper',
      presences: [{ id: 'p1', kind: 'dialog', objectId: 'd1', title: 'Finding the Plot' }],
      story: { slides: [{ title: 'Finding the Plot', body: 'Laid out.' }] },
    });
    const next = mergeKeeperStagePatch(current, {
      presences: [{ id: 'p1', kind: 'dialog', objectId: 'd1', title: 'Finding the Plot', x: 0.2, y: 0.2 }],
    });
    expect(next.story?.slides[0]?.title).toBe('Finding the Plot');
  });

  it('does not wipe the filmstrip when story is null', () => {
    const current = parseKeeperStage({
      story: { slides: [{ title: 'Finding the Plot' }] },
    });
    const next = mergeKeeperStagePatch(current, { story: null, presences: [] });
    expect(next.story?.slides[0]?.title).toBe('Finding the Plot');
  });
});

describe('readKeeperStageFromDomainSettings', () => {
  it('reads the settings key without owning the Domain', () => {
    const stage = readKeeperStageFromDomainSettings({
      primaryAgentId: 'keep-me',
      keeperStage: {
        presences: [{ id: 'p1', kind: 'agent', objectId: 'a1', title: 'Kip' }],
      },
    });
    expect(stage.presences[0]?.title).toBe('Kip');
  });
});
