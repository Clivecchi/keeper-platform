import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/resolveProviderApiKey.js', () => ({
  resolveProviderApiKey: vi.fn(),
}));
vi.mock('../../lib/resolveDomainProviderApiKey.js', () => ({
  resolveDomainProviderApiKeyWithSource: vi.fn(),
}));

import { resolveProviderApiKey } from '../../lib/resolveProviderApiKey.js';
import { JEV_PROBE_ACTION, jevProbePromptBlock, runJevProbeAction } from './JevProbeService.js';

const resolveKey = vi.mocked(resolveProviderApiKey);

describe('JevProbeService', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    resolveKey.mockReset();
  });

  it('teaches agents that Jev Probe is a Kip action over evidence, not an MCP tool', () => {
    const prompt = jevProbePromptBlock();
    expect(prompt).toContain(JEV_PROBE_ACTION);
    expect(prompt).toContain('Capability: jev.probe');
    expect(prompt).toContain('Never mcp.call name "jev.probe"');
    expect(prompt).toContain('does not persist a Probe');
  });

  it('evaluates evidence with the TypeSafe key and returns parsed evaluations', async () => {
    resolveKey.mockResolvedValue('ts-tool-key');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          model: 'jev-latest',
          answers: { domainScoped: { type: 'choice', choice: 'yes', confidence: 0.9 } },
        }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const outcome = await runJevProbeAction({
      payload: {
        evidence: { path: 'journeys.ts' },
        questions: {
          domainScoped: {
            type: 'choice',
            instructions: 'Does this list require Domain scope?',
            criteria: { yes: 'Yes', no: 'No' },
          },
        },
      },
    });

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.evaluations[0]?.answer).toBe('yes');
      expect(outcome.formatted).toContain('domainScoped');
    }
  });

  it('fails closed when evidence is missing', async () => {
    const invalid = await runJevProbeAction({
      payload: { questions: { q1: { type: 'noul', instructions: 'Ready?' } } },
    });
    expect(invalid).toMatchObject({ ok: false, errorCode: 'INVALID_QUESTIONS' });
  });
});
