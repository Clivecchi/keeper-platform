import { describe, expect, it } from 'vitest';
import {
  bringOntoStage,
  buildKeeperStagePrompt,
  emptyKeeperStage,
  parseKeeperStage,
  readKeeperStageFromDomainSettings,
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
    expect(prompt).toContain('assets for the story in development');
    expect(prompt).toContain('Frames for presentation');
    expect(prompt).toContain('Agent “Kip”');
    expect(prompt).toContain('stage role: Lead');
    expect(prompt).toContain('Keep the Re-Center honest');
  });

  it('is silent when the Stage is empty', () => {
    expect(buildKeeperStagePrompt(emptyKeeperStage())).toBeNull();
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
