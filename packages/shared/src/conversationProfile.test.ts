import { describe, expect, it } from 'vitest';
import {
  CONVERSATION_PROFILE_LABELS,
  conversationProfileFromContext,
  DEFAULT_CONVERSATION_PROFILE,
  parseConversationProfile,
  profileHearsCast,
  resolveProfileHearingSlugs,
} from './conversationProfile.js';

describe('conversationProfile', () => {
  it('defaults unknown and legacy current to Conversation', () => {
    expect(parseConversationProfile(undefined)).toBe(DEFAULT_CONVERSATION_PROFILE);
    expect(parseConversationProfile('current')).toBe('conversation');
    expect(parseConversationProfile('reduced')).toBe('conversation');
    expect(parseConversationProfile(true)).toBe('conversation');
  });

  it('accepts the three human-facing profiles', () => {
    expect(parseConversationProfile('conversation')).toBe('conversation');
    expect(parseConversationProfile('cast')).toBe('cast');
    expect(parseConversationProfile('agency')).toBe('agency');
  });

  it('reads the profile from agentContext', () => {
    expect(conversationProfileFromContext({ conversationProfile: 'agency' })).toBe('agency');
    expect(conversationProfileFromContext({ conversationProfile: 'current' })).toBe('conversation');
    expect(conversationProfileFromContext({})).toBe('conversation');
  });

  it('labels the three profiles for the composer', () => {
    expect(CONVERSATION_PROFILE_LABELS.conversation).toBe('Conversation');
    expect(CONVERSATION_PROFILE_LABELS.cast).toBe('Cast');
    expect(CONVERSATION_PROFILE_LABELS.agency).toBe('Agency');
  });

  it('lets Cast and Agency hear, and keeps Conversation quiet unless cued', () => {
    const voices = ['cloud', 'rendr'];
    expect(profileHearsCast('conversation')).toBe(false);
    expect(profileHearsCast('cast')).toBe(true);
    expect(profileHearsCast('agency')).toBe(true);
    expect(resolveProfileHearingSlugs({
      profile: 'conversation',
      explicitCues: [],
      eligibleVoiceSlugs: voices,
    })).toEqual([]);
    expect(resolveProfileHearingSlugs({
      profile: 'cast',
      explicitCues: [],
      eligibleVoiceSlugs: voices,
    })).toEqual(['cloud', 'rendr']);
    expect(resolveProfileHearingSlugs({
      profile: 'agency',
      explicitCues: [],
      eligibleVoiceSlugs: voices,
    })).toEqual(['cloud', 'rendr']);
  });

  it('treats an explicit cue as a narrower hearing set on every profile', () => {
    expect(resolveProfileHearingSlugs({
      profile: 'conversation',
      explicitCues: ['Rendr'],
      eligibleVoiceSlugs: ['cloud', 'rendr'],
    })).toEqual(['rendr']);
    expect(resolveProfileHearingSlugs({
      profile: 'agency',
      explicitCues: ['cloud'],
      eligibleVoiceSlugs: ['cloud', 'rendr'],
    })).toEqual(['cloud']);
  });
});
