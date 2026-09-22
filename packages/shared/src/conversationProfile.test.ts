import { describe, expect, it } from 'vitest';
import {
  CONVERSATION_PROFILE_LABELS,
  conversationProfileFromContext,
  DEFAULT_CONVERSATION_PROFILE,
  parseConversationProfile,
} from './conversationProfile.js';

describe('conversationProfile', () => {
  it('defaults unknown values to current', () => {
    expect(parseConversationProfile(undefined)).toBe(DEFAULT_CONVERSATION_PROFILE);
    expect(parseConversationProfile('reduced')).toBe('current');
    expect(parseConversationProfile(true)).toBe('current');
  });

  it('accepts the experimental family values', () => {
    expect(parseConversationProfile('current')).toBe('current');
    expect(parseConversationProfile('conversation')).toBe('conversation');
  });

  it('reads from agentContext without inventing a boolean flag', () => {
    expect(conversationProfileFromContext({ conversationProfile: 'conversation' })).toBe(
      'conversation',
    );
    expect(conversationProfileFromContext({})).toBe('current');
  });

  it('labels the first two profiles for Composer', () => {
    expect(CONVERSATION_PROFILE_LABELS.current).toBe('Current');
    expect(CONVERSATION_PROFILE_LABELS.conversation).toBe('Conversation');
  });
});
