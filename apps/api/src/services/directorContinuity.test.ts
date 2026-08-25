import { describe, expect, it } from 'vitest';
import {
  isDirectorContinuityPhrase,
  isLeadThreadReply,
  isSupportEchoPrompt,
  resolveDirectorDelegationMessage,
  resolveLeadThreadReply,
} from '@keeper/shared';

describe('directorContinuity @smoke', () => {
  it('detects try again and refer-back phrases', () => {
    expect(isDirectorContinuityPhrase('Try again')).toBe(true);
    expect(isDirectorContinuityPhrase('check again')).toBe(true);
    expect(
      isDirectorContinuityPhrase("interesting. Why wouldn't you look at the previous prompt?"),
    ).toBe(true);
    expect(isDirectorContinuityPhrase('Cloud — full infra status please')).toBe(false);
  });

  it('resolves try again to the last delegatable user message', () => {
    const prior = [
      {
        role: 'user' as const,
        content:
          'Cloud — full infra status please: Railway, Vercel, GitHub connection, Nango, and Resend.',
      },
      { role: 'agent' as const, content: 'Summary…' },
    ];
    const result = resolveDirectorDelegationMessage({
      userMessage: 'Try again',
      priorMessages: prior,
    });
    expect(result.resolvedFromPrior).toBe(true);
    expect(result.delegationMessage).toContain('full infra status');
    expect(result.displayMessage).toBe('Try again');
  });

  it('passes through substantive messages unchanged', () => {
    const msg = 'Cloud — list recent commits on main';
    const result = resolveDirectorDelegationMessage({
      userMessage: msg,
      priorMessages: [],
    });
    expect(result.resolvedFromPrior).toBe(false);
    expect(result.delegationMessage).toBe(msg);
  });
});

describe('lead thread continuity', () => {
  it('treats Yes as a reply to the last agent turn', () => {
    expect(isLeadThreadReply('Yes.')).toBe(true);
    expect(isLeadThreadReply('propose')).toBe(true);
    expect(isLeadThreadReply('Make Community Commerce a section')).toBe(false);
    expect(isSupportEchoPrompt('[Platform collaboration — Kip]\nThe user asked: "Hi"')).toBe(true);

    const result = resolveLeadThreadReply({
      userMessage: 'Yes.',
      priorMessages: [
        { role: 'user', content: 'Want to fix that now?' },
        { role: 'agent', content: 'Want to fix that now?' },
      ],
    });
    expect(result.resolvedFromPrior).toBe(true);
    expect(result.priorAgentMessage).toContain('Want to fix that now?');
  });
});
