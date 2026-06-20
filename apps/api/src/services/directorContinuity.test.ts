import { describe, expect, it } from 'vitest';
import {
  isDirectorContinuityPhrase,
  resolveDirectorDelegationMessage,
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
