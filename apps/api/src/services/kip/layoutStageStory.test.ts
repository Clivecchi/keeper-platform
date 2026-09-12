import { describe, expect, it, vi } from 'vitest';

const loadKeeperStage = vi.fn();
const saveKeeperStage = vi.fn();

vi.mock('../domains/keeperStageStore.js', () => ({
  loadKeeperStage,
  saveKeeperStage,
}));

const { appendStageExpressionBeat } = await import('./layoutStageStory.js');

describe('appendStageExpressionBeat', () => {
  it('appends one live-sourced beat and is idempotent for the same Lead message', async () => {
    const current = {
      version: 1 as const,
      slug: 'keeper' as const,
      title: 'Keeper',
      selectedPresenceId: null,
      presences: [],
      theme: null,
      story: {
        version: 1 as const,
        slides: [{ id: 's1', slideType: 'text_slide' as const, kind: 'beat' as const, title: 'Prior', body: '' }],
      },
    };
    loadKeeperStage.mockResolvedValue(current);
    saveKeeperStage.mockImplementation(async (_domainId: string, next: typeof current) => next);

    const first = await appendStageExpressionBeat({
      domainId: 'dom-1',
      leadMessageId: 'msg-1',
      title: 'The Dialog is the plot',
      body: 'Not a fiction outline.',
    });
    expect(first.ok).toBe(true);
    if (first.ok === false) return;
    expect(first.alreadyPresent).toBe(false);
    expect(first.story.slides).toHaveLength(2);
    expect(first.slide.source).toEqual({ kind: 'live', id: 'msg-1' });

    loadKeeperStage.mockResolvedValue(first.stage);
    const second = await appendStageExpressionBeat({
      domainId: 'dom-1',
      leadMessageId: 'msg-1',
      title: 'A second Frame must not land',
      body: 'No.',
    });
    expect(second.ok).toBe(true);
    if (second.ok === false) return;
    expect(second.alreadyPresent).toBe(true);
    expect(second.slide.id).toBe(first.slide.id);
    expect(saveKeeperStage).toHaveBeenCalledTimes(1);
  });
});
