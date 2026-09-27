import { describe, expect, it } from 'vitest';
import {
  buildPasswordResetEmail,
  createPasswordResetIssue,
  hashPasswordResetToken,
  passwordResetAbsoluteUrl,
  safeRelativeNext,
} from './passwordReset.js';

describe('password reset', () => {
  it('stores a hash, not the emailed token', () => {
    const issue = createPasswordResetIssue(new Date('2026-09-26T12:00:00.000Z'));
    expect(issue.token).toHaveLength(64);
    expect(issue.hash).toBe(hashPasswordResetToken(issue.token));
    expect(issue.hash).not.toBe(issue.token);
    expect(issue.expiresAt.toISOString()).toBe('2026-09-26T13:00:00.000Z');
  });

  it('keeps the return path on the same site', () => {
    expect(safeRelativeNext('/invite/accept?token=abc')).toBe('/invite/accept?token=abc');
    expect(safeRelativeNext('https://evil.example/steal')).toBeNull();
    expect(safeRelativeNext('//evil.example')).toBeNull();
    expect(
      passwordResetAbsoluteUrl('tok', '/invite/accept?token=abc', 'https://www.ke3p.com'),
    ).toBe(
      'https://www.ke3p.com/reset-password?token=tok&next=%2Finvite%2Faccept%3Ftoken%3Dabc',
    );
  });

  it('writes a reset email with the link', () => {
    const email = buildPasswordResetEmail('https://www.ke3p.com/reset-password?token=tok');
    expect(email.subject).toBe('Reset your Keeper password');
    expect(email.text).toContain('https://www.ke3p.com/reset-password?token=tok');
  });
});
