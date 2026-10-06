import { describe, expect, it } from 'vitest';
import {
  buildConversationProfileLeadPrompt,
  buildConversationProfileProtocolPrompt,
  buildDialoguePosturePrompt,
  conversationProfileFromEnvironment,
  profileUsesThinInstruction,
} from './conversationProfilePrompt.js';

describe('conversationProfilePrompt', () => {
  it('reads the profile from environment.agentContext and migrates current', () => {
    expect(conversationProfileFromEnvironment(null)).toBe('conversation');
    expect(
      conversationProfileFromEnvironment({
        agentContext: { conversationProfile: 'agency' },
      }),
    ).toBe('agency');
    expect(
      conversationProfileFromEnvironment({
        agentContext: { conversationProfile: 'current' },
      }),
    ).toBe('conversation');
    expect(profileUsesThinInstruction('conversation')).toBe(true);
    expect(profileUsesThinInstruction('cast')).toBe(true);
    expect(profileUsesThinInstruction('agency')).toBe(false);
  });

  it('keeps Conversation and Cast off the action sermons', () => {
    const conversation = buildConversationProfileLeadPrompt('conversation');
    expect(conversation).toContain('dialogue');
    expect(conversation.length).toBeLessThan(500);

    const cast = buildConversationProfileLeadPrompt('cast');
    expect(cast).toContain('Cast is in the room');
    expect(cast).toContain('explicitly asked');

    const protocol = buildConversationProfileProtocolPrompt(['dialog.read', 'web.search'], 'cast');
    expect(protocol).toContain('Allowed actions: dialog.read, web.search');
    expect(protocol).toContain('engage');
    expect(protocol).not.toContain('Do not defer to Kip');

    expect(buildDialoguePosturePrompt('conversation')).toContain('explicitly requested');
    expect(buildDialoguePosturePrompt('cast')).toContain('Do not mutate Keeper');
  });
});
