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
  meaning: 'Finding the Plot is the Dialog.',
  about: [{ kind: 'dialog' as const, id: 'dlg-1', title: 'Finding the Plot' }],
  performedBy: ['cloud'],
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

  it('appends one Frame from a valid stage_expression', async () => {
    callModel.mockResolvedValue({
      success: true,
      content: JSON.stringify({
        type: 'stage_expression',
        beat: { title: 'The Dialog is the plot', body: 'Not a fiction outline.' },
      }),
    });
    appendStageExpressionBeat.mockResolvedValue({
      ok: true,
      alreadyPresent: false,
      slide: {
        id: 'live-msg-1',
        slideType: 'text_slide',
        kind: 'beat',
        title: 'The Dialog is the plot',
        body: 'Not a fiction outline.',
        source: { kind: 'live', id: 'msg-1' },
      },
      story: { version: 1, slides: [] },
      stage: {},
    });

    const result = await expressResolvedMeaningOnStage({
      domainId: 'dom-1',
      leadMessageId: 'msg-1',
      resolvedMeaning: meaning,
      environment: { domainName: 'ke3p' },
    });

    expect(result.ok).toBe(true);
    if (result.ok === false) return;
    expect(result.stamp.slideId).toBe('live-msg-1');
    const user = callModel.mock.calls[0][0].messages[1].content as string;
    expect(user).toContain('Finding the Plot is the Dialog.');
    expect(user).not.toContain('castVoices');
    expect(appendStageExpressionBeat).toHaveBeenCalledWith(
      expect.objectContaining({
        leadMessageId: 'msg-1',
        title: 'The Dialog is the plot',
      }),
    );
  });

  it('skips Stage when Rendr returns no expression', async () => {
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
