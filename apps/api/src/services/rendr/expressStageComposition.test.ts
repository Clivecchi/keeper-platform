import { beforeEach, describe, expect, it, vi } from 'vitest';

const findUnique = vi.fn();
const executeRegisteredChat = vi.fn();
const loadStageReading = vi.fn();
const loadKeeperStage = vi.fn();
const saveKeeperStage = vi.fn();

vi.mock('@keeper/database', () => ({
  prisma: { kip_agents: { findUnique } },
}));

vi.mock('../executeRegisteredChat.js', () => ({
  executeRegisteredChat,
}));

vi.mock('./loadStageReading.js', () => ({
  loadStageReading,
}));

vi.mock('../domains/keeperStageStore.js', () => ({
  loadKeeperStage,
  saveKeeperStage,
}));

const { expressStageComposition } = await import('./expressStageComposition.js');

const reading = {
  context: { scope: 'domain', domainId: 'dom-1', audience: 'admin', arriving: true },
  items: [
    {
      id: 'place:dlg-1',
      lifecycle: 'derived',
      text: 'Becoming Together',
      source: { kind: 'dialog', id: 'dlg-1' },
      actions: [{ kind: 'continue', subject: { kind: 'dialog', id: 'dlg-1' } }],
    },
  ],
};

describe('expressStageComposition', () => {
  beforeEach(() => {
    findUnique.mockReset();
    executeRegisteredChat.mockReset();
    loadStageReading.mockReset();
    loadKeeperStage.mockReset();
    saveKeeperStage.mockReset();
    findUnique.mockResolvedValue({
      id: 'rendr-1',
      model: 'claude-sonnet-4-6',
      model_provider: 'anthropic',
      model_settings: {},
    });
    loadKeeperStage.mockResolvedValue({ arrangements: undefined });
    saveKeeperStage.mockImplementation(async (_id: string, patch: unknown) => patch);
  });

  it('does not call Rendr when the turn is off Stage', async () => {
    const result = await expressStageComposition({
      domainId: 'dom-1',
      truth: 'domain-where-we-are',
      onStage: false,
    });
    expect(result.status).toBe('offstage');
    expect(executeRegisteredChat).not.toHaveBeenCalled();
    expect(saveKeeperStage).not.toHaveBeenCalled();
  });

  it('applies a composition of the Reading and records what it replaced', async () => {
    loadStageReading.mockResolvedValue(reading);
    executeRegisteredChat.mockResolvedValue({
      response: {
        success: true,
        content: JSON.stringify({
          dress: { title: 'quiet', span: 'room', density: 'open', field: 'paper', motion: 'arrive' },
          nodes: [
            {
              kind: 'cite',
              readingId: 'place:dlg-1',
              emphasis: 'primary',
              gesture: 'place',
              text: 'Invented heading',
            },
          ],
        }),
      },
    });

    const result = await expressStageComposition({
      domainId: 'dom-1',
      truth: 'domain-where-we-are',
      brief: 'Make the place the navigation.',
      onStage: true,
    });

    expect(result.status).toBe('applied');
    expect(result.message).toContain('domain-where-we-are');
    expect(result.message).toContain('replaced pass-domain');
    expect(result.actionResult.message).toContain('applied');
    expect(saveKeeperStage).toHaveBeenCalledOnce();
    const patch = saveKeeperStage.mock.calls[0]?.[1] as {
      arrangements: { 'domain-where-we-are': { composition: { nodes: unknown[] }; replacedId: string } };
    };
    expect(patch.arrangements['domain-where-we-are'].replacedId).toBe('pass-domain');
    expect(JSON.stringify(patch)).not.toContain('Invented heading');
  });

  it('keeps the previous arrangement when Rendr asks for a token the grammar does not have', async () => {
    loadStageReading.mockResolvedValue(reading);
    executeRegisteredChat.mockResolvedValue({
      response: {
        success: true,
        content: JSON.stringify({
          nodes: [{ kind: 'group', emphasis: 'primary', layout: 'banner', children: [] }],
        }),
      },
    });

    const result = await expressStageComposition({
      domainId: 'dom-1',
      truth: 'domain-where-we-are',
      onStage: true,
    });

    expect(result.status).toBe('needs-grammar');
    expect(result.message).toContain('layout:banner');
    expect(saveKeeperStage).not.toHaveBeenCalled();
  });
});
