import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
const callModel = vi.fn();
const appendStageExpressionBeat = vi.fn();

vi.mock('@keeper/database', () => ({
  prisma: { kip_agents: { findUnique } },
}));

vi.mock('../ModelProviderService.js', () => ({
  ModelProviderService: { callModel },
}));

vi.mock('../kip/layoutStageStory.js', () => ({
  appendStageExpressionBeat,
}));

const { expressResolvedMeaningOnStage } = await import('./expressResolvedMeaningOnStage.js');

const meaning = {
  meaning: 'The human should hear one telling.',
  about: [{ kind: 'dialog' as const, id: 'dlg-1', title: 'Finding the Plot' }],
  performedBy: ['ceox'],
};

const frameJson = {
  version: 1,
  title: 'One storyline. Not three.',
  beats: [
    { title: 'One storyline. Not three.', body: 'The Lead keeps a single telling.' },
    {
      title: 'Let the voice enter',
      body: 'A line sits inside the story.',
      voice: {
        slug: 'ceox',
        attributedTo: 'Ceox',
        text: 'better editing',
      },
    },
  ],
};

describe('expressResolvedMeaningOnStage', () => {
  beforeEach(() => {
    findUnique.mockReset();
    callModel.mockReset();
    appendStageExpressionBeat.mockReset();
    findUnique.mockResolvedValue({
      model: 'claude-sonnet-4-6',
      model_provider: 'anthropic',
      model_settings: {},
    });
  });

  it('returns a Frame Performance and does not touch the Stage story on Dialog', async () => {
    callModel.mockResolvedValue({ success: true, content: JSON.stringify(frameJson) });

    const result = await expressResolvedMeaningOnStage({
      domainId: 'dom-1',
      leadMessageId: 'msg-1',
      resolvedMeaning: meaning,
      selectedVoices: [{ slug: 'ceox', line: 'You are asking for better editing.' }],
      hasCastVoices: true,
      placeOnStage: false,
      environment: {
        dialogDocument: {
          dialogId: 'dlg-1',
          title: 'Finding the Plot',
          paths: [{ id: 'vision', title: 'Vision' }],
          points: [],
        },
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok === false) return;
    expect(result.performance.title).toBe('One storyline. Not three.');
    expect(result.performance.beats).toHaveLength(2);
    expect(result.performance.context?.documentTitle).toBe('Finding the Plot');
    expect(result.performance.context?.sectionTitle).toBeNull();
    expect(result.stamp).toBeUndefined();
    expect(appendStageExpressionBeat).not.toHaveBeenCalled();
    const user = callModel.mock.calls[0][0].messages[1].content as string;
    expect(user).toContain('The human should hear one telling.');
    expect(user).not.toContain('castVoices');
  });

  it('appends one live-sourced cell titled with the Point when already on Stage', async () => {
    callModel.mockResolvedValue({ success: true, content: JSON.stringify(frameJson) });
    appendStageExpressionBeat.mockResolvedValue({
      ok: true,
      alreadyPresent: false,
      slide: {
        id: 'live-msg-1',
        slideType: 'text_slide',
        kind: 'beat',
        title: 'One storyline. Not three.',
        body: 'The Lead keeps a single telling.',
        source: { kind: 'live', id: 'msg-1' },
      },
      story: { version: 1, slides: [] },
      stage: {},
    });

    const result = await expressResolvedMeaningOnStage({
      domainId: 'dom-1',
      leadMessageId: 'msg-1',
      resolvedMeaning: meaning,
      selectedVoices: [{ slug: 'ceox', line: 'You are asking for better editing.' }],
      placeOnStage: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok === false) return;
    expect(result.stamp?.slideId).toBe('live-msg-1');
    expect(appendStageExpressionBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        leadMessageId: 'msg-1',
        title: 'One storyline. Not three.',
      }),
    );
  });

  it('skips the Frame when Rendr returns no composition', async () => {
    callModel.mockResolvedValue({
      success: true,
      content: 'I think the mood should be warmer.',
    });
    const result = await expressResolvedMeaningOnStage({
      domainId: 'dom-1',
      leadMessageId: 'msg-1',
      resolvedMeaning: meaning,
    });
    expect(result).toMatchObject({ ok: false, reason: 'no_expression' });
    expect(appendStageExpressionBeat).not.toHaveBeenCalled();
  });
});
