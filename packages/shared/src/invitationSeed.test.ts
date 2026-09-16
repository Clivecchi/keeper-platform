import { describe, expect, it } from 'vitest';
import {
  formatInvitationSeedForAgent,
  formatInvitationSeedLines,
  invitationSeedHasContent,
  normalizeInvitationSeed,
} from './invitationSeed.js';

describe('invitationSeed', () => {
  it('drops blank seed and keeps trimmed fields', () => {
    expect(normalizeInvitationSeed({})).toBeNull();
    expect(normalizeInvitationSeed({ givenName: '  ', about: '' })).toBeNull();
    expect(normalizeInvitationSeed({ givenName: '  Pat Lee  ', relation: ' studio colleague ' })).toEqual({
      givenName: 'Pat Lee',
      relation: 'studio colleague',
    });
  });

  it('caps field length so agent context stays short', () => {
    const about = 'x'.repeat(900);
    const seed = normalizeInvitationSeed({ about });
    expect(seed?.about).toHaveLength(800);
  });

  it('keeps briefing notes as inviter-held agent context', () => {
    const seed = normalizeInvitationSeed({
      givenName: 'Pat',
      briefing: [
        { kind: 'prompt', title: 'How to greet', body: 'Call them Pat. They know Cover.' },
        { kind: 'document', title: '', body: '   ' },
      ],
    });
    expect(seed).toEqual({
      givenName: 'Pat',
      briefing: [{ kind: 'prompt', title: 'How to greet', body: 'Call them Pat. They know Cover.' }],
      coOwnership: 'inviter-held',
    });
    expect(formatInvitationSeedLines(seed)).toEqual(['Called Pat', 'Prompt: How to greet']);
  });

  it('formats lines for People and a compact agent sentence', () => {
    const seed = { givenName: 'Pat', relation: 'Cover collaborator', about: 'Knows the Domain card work.' };
    expect(invitationSeedHasContent(seed)).toBe(true);
    expect(formatInvitationSeedLines(seed)).toEqual([
      'Called Pat',
      'Cover collaborator',
      'Knows the Domain card work.',
    ]);
    expect(
      formatInvitationSeedForAgent({
        email: 'pat@example.com',
        role: 'friend',
        status: 'pending',
        seed,
      }),
    ).toBe(
      'Pat (invited, not yet arrived, friend) — Cover collaborator — Knows the Domain card work. — pat@example.com',
    );
  });
});
