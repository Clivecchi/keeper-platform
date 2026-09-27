import { createHash, randomBytes } from 'crypto';
import { ResendService } from '../ResendService.js';
import { invitationAbsoluteUrl, publicWebOrigin } from '../domains/invitationEmail.js';

const RESET_TTL_MS = 60 * 60 * 1000;

export type PasswordResetIssue = {
  token: string;
  hash: string;
  expiresAt: Date;
};

export function hashPasswordResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createPasswordResetIssue(now: Date = new Date()): PasswordResetIssue {
  const token = randomBytes(32).toString('hex');
  return {
    token,
    hash: hashPasswordResetToken(token),
    expiresAt: new Date(now.getTime() + RESET_TTL_MS),
  };
}

/** Relative in-app paths only. Blocks protocol-relative and absolute URLs. */
export function safeRelativeNext(value: string | undefined | null): string | null {
  const raw = value?.trim();
  if (!raw) return null;
  if (!raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\') || raw.includes('://')) {
    return null;
  }
  return raw;
}

export function passwordResetAbsoluteUrl(
  token: string,
  next?: string | null,
  origin: string = publicWebOrigin(),
): string {
  const path = `/reset-password?token=${encodeURIComponent(token)}`;
  const safeNext = safeRelativeNext(next);
  const withNext = safeNext ? `${path}&next=${encodeURIComponent(safeNext)}` : path;
  return invitationAbsoluteUrl(withNext, origin);
}

export function buildPasswordResetEmail(resetUrl: string): { subject: string; text: string; html: string } {
  const subject = 'Reset your Keeper password';
  const text = [
    'A password reset was requested for this Keeper account.',
    `Choose a new password: ${resetUrl}`,
    'This link expires in one hour. If you did not ask for it, you can ignore this email.',
  ].join('\n\n');
  const html = `<p>A password reset was requested for this Keeper account.</p><p><a href="${escapeHtml(resetUrl)}">Choose a new password</a></p><p>This link expires in one hour. If you did not ask for it, you can ignore this email.</p>`;
  return { subject, text, html };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function deliverPasswordResetEmail(to: string, resetUrl: string): Promise<{ sent: boolean; error?: string }> {
  const built = buildPasswordResetEmail(resetUrl);
  const result = await ResendService.sendEmail({
    to,
    subject: built.subject,
    text: built.text,
    html: built.html,
  });
  if (result.ok === false) {
    return { sent: false, error: result.error };
  }
  return { sent: true };
}
