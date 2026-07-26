import { describe, expect, it } from 'vitest';
import {
  resolveDialogParticipation,
  isDialogParticipation,
  dialogParticipationLabel,
} from './dialogParticipation.js';
import { redactForLog, redactStringForLog } from './redactForLog.js';

describe('dialogParticipation', () => {
  it('defaults every agent to voice when unset (including Cloud)', () => {
    expect(resolveDialogParticipation({}, { slug: 'cloud' })).toBe('voice');
    expect(resolveDialogParticipation({}, { slug: 'rendr' })).toBe('voice');
    expect(resolveDialogParticipation(null, { slug: 'ceox' })).toBe('voice');
  });

  it('honors explicit config', () => {
    expect(
      resolveDialogParticipation({ dialog_participation: 'silent' }, { slug: 'cloud' }),
    ).toBe('silent');
    expect(isDialogParticipation('voice')).toBe(true);
    expect(dialogParticipationLabel('support_only')).toBe('Support');
  });
});

describe('redactForLog', () => {
  it('redacts token fields and JWTs', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
    const redacted = redactForLog({
      success: true,
      data: { token: jwt, user: { email: 'a@b.com' } },
    }) as { data: { token: string; user: { email: string } } };
    expect(redacted.data.token).toBe('<redacted>');
    expect(redacted.data.user.email).toBe('a@b.com');
    expect(redactStringForLog(`Bearer ${jwt}`)).toContain('<redacted>');
  });
});
