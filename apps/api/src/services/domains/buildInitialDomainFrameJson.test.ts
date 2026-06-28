import { describe, expect, it } from 'vitest';
import { buildInitialDomainFrameJson } from './buildInitialDomainFrameJson.js';

describe('buildInitialDomainFrameJson', () => {
  it('uses domain identity instead of platform KE3P defaults', () => {
    const frame = buildInitialDomainFrameJson({
      name: 'livecchi.us',
      slug: 'livecchi-us',
      description: 'Realm of the old ones',
      leadAgentSlug: 'livecchi-us-lead',
    });

    expect(frame.domain).toBe('livecchi-us');
    expect(frame.keeper_type).toBe('domain');
    expect((frame.theme as { wordmark?: string }).wordmark).toBe('livecchi.us');
    expect((frame.theme as { tagline?: string }).tagline).toBe('Realm of the old ones');
    expect((frame.kip as { agent_id?: string }).agent_id).toBe('livecchi-us-lead');
    expect((frame.agent_board as { messaging?: unknown }).messaging).toBeTruthy();
  });
});
