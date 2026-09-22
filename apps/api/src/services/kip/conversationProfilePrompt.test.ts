import { describe, expect, it } from 'vitest';
import {
  buildConversationProfileLeadPrompt,
  buildConversationProfileProtocolPrompt,
  conversationProfileFromEnvironment,
  isExperimentalConversationProfile,
} from './conversationProfilePrompt.js';

describe('conversationProfilePrompt', () => {
  it('reads the profile from environment.agentContext', () => {
    expect(conversationProfileFromEnvironment(null)).toBe('current');
    expect(
      conversationProfileFromEnvironment({
        agentContext: { conversationProfile: 'conversation' },
      }),
    ).toBe('conversation');
    expect(
      isExperimentalConversationProfile({
        agentContext: { conversationProfile: 'conversation' },
      }),
    ).toBe(true);
  });

  it('keeps the Lead line short and the protocol free of tool sermons', () => {
    const lead = buildConversationProfileLeadPrompt();
    expect(lead.length).toBeLessThan(400);
    expect(lead).toContain('SESSION ACTION LOG');

    const protocol = buildConversationProfileProtocolPrompt(['dialog.read', 'web.search']);
    expect(protocol).toContain('Allowed actions: dialog.read, web.search');
    expect(protocol).not.toContain('Do not defer to Kip');
    expect(protocol).not.toContain('image.generate');
    expect(protocol).not.toContain('STORY-BUILDER');
  });
});
