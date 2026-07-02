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
    expect((frame.kip as { greeting?: string }).greeting).toContain('livecchi.us');
    expect((frame.kip_context as { admin?: string }).admin).toContain('livecchi.us');
    expect((frame.kip_context as { admin?: string }).admin).not.toContain('Platform admin');
  });

  it('sets interaction bar and agent board messaging to domain identity', () => {
    const frame = buildInitialDomainFrameJson({
      name: 'Chuck Livecchi',
      slug: 'chuck-livecchi',
      description: null,
      leadAgentSlug: 'chuck-livecchi-lead',
    });

    const labels = (frame.interaction_bar as { labels?: { kip?: string } }).labels;
    expect(labels?.kip).toBe('Chuck Livecchi');

    const messaging = (frame.agent_board as {
      messaging?: {
        signin?: { title?: string; body?: string };
        empty_states?: { start_conversation?: string };
      };
    }).messaging;

    expect(messaging?.signin?.title).toBe('Chuck Livecchi');
    expect(messaging?.signin?.body).toContain('Chuck Livecchi');
    expect(messaging?.signin?.body).not.toContain('Keeper Platform');
    expect(messaging?.empty_states?.start_conversation).toContain('Chuck Livecchi');
  });

  it('uses a domain welcome when description is empty', () => {
    const frame = buildInitialDomainFrameJson({
      name: 'My Domain',
      slug: 'my-domain',
      description: '   ',
      leadAgentSlug: 'my-domain-lead',
    });

    expect((frame.theme as { tagline?: string }).tagline).toBe('');
    expect((frame.kip as { greeting?: string }).greeting).toBe(
      'Welcome to My Domain. What would you like to keep here?',
    );
    expect((frame.arrival as { completed?: boolean }).completed).toBe(false);
  });
});
