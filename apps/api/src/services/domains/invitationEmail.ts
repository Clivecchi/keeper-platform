import { ROLE_MAP, isDomainRole } from '@keeper/shared';
import { ResendService } from '../ResendService.js';
import { invitationAcceptPath } from './domainConnectionInvite.js';

export type InvitationEmailDelivery = {
  sent: boolean;
  skipped?: boolean;
  error?: string;
};

export type InvitationEmailCopy = {
  kind: 'invite' | 'granted';
  to: string;
  inviterName: string;
  domainName: string;
  domainSlug: string;
  roleLabel: string;
  acceptUrl?: string;
  domainUrl?: string;
  additionalDomainNames?: string[];
  expiresAt?: Date;
};

export function publicWebOrigin(): string {
  const raw = (
    process.env.PUBLIC_WEB_ORIGIN ||
    process.env.WEB_ORIGIN ||
    process.env.NEXT_PUBLIC_WEB_ORIGIN ||
    'https://www.ke3p.com'
  ).trim();
  return raw.replace(/\/+$/, '') || 'https://www.ke3p.com';
}

export function invitationAbsoluteUrl(path: string, origin: string = publicWebOrigin()): string {
  const trimmed = path.trim();
  if (!trimmed) return origin;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  return `${origin}${trimmed.startsWith('/') ? trimmed : `/${trimmed}`}`;
}

export function invitationAcceptAbsoluteUrl(token: string, origin: string = publicWebOrigin()): string {
  return invitationAbsoluteUrl(invitationAcceptPath(token), origin);
}

export function domainBoardAbsoluteUrl(slug: string, origin: string = publicWebOrigin()): string {
  const safe = slug.trim();
  if (!safe) return origin;
  return invitationAbsoluteUrl(`/d/${encodeURIComponent(safe)}?board=domain`, origin);
}

export function roleLabelForInvitation(role: string): string {
  return isDomainRole(role) ? ROLE_MAP[role].label : role.trim() || 'Connection';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function additionalLine(names: string[] | undefined): string {
  if (!names || names.length === 0) return '';
  return ` You are also invited onto ${names.join(', ')}.`;
}

export function buildInvitationEmail(copy: InvitationEmailCopy): { subject: string; text: string; html: string } {
  const additional = additionalLine(copy.additionalDomainNames);
  if (copy.kind === 'granted') {
    const url = copy.domainUrl || publicWebOrigin();
    const subject = `You were added to ${copy.domainName} on Keeper`;
    const text = [
      `${copy.inviterName} added you to ${copy.domainName} as ${copy.roleLabel}.`,
      additional.trim(),
      `Open it here: ${url}`,
    ]
      .filter(Boolean)
      .join('\n\n');
    const html = `<p>${escapeHtml(copy.inviterName)} added you to <strong>${escapeHtml(copy.domainName)}</strong> as ${escapeHtml(copy.roleLabel)}.</p>${
      additional ? `<p>${escapeHtml(additional.trim())}</p>` : ''
    }<p><a href="${escapeHtml(url)}">Open ${escapeHtml(copy.domainName)}</a></p>`;
    return { subject, text, html };
  }

  const acceptUrl = copy.acceptUrl || publicWebOrigin();
  const expires = copy.expiresAt
    ? copy.expiresAt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : null;
  const subject = `Invitation to ${copy.domainName} on Keeper`;
  const text = [
    `${copy.inviterName} invited you to ${copy.domainName} as ${copy.roleLabel}.`,
    additional.trim(),
    `Accept the invitation: ${acceptUrl}`,
    expires ? `This link expires ${expires}.` : '',
    'If you do not have a Keeper account yet, you can create one when you open the link.',
  ]
    .filter(Boolean)
    .join('\n\n');
  const html = `<p>${escapeHtml(copy.inviterName)} invited you to <strong>${escapeHtml(copy.domainName)}</strong> as ${escapeHtml(copy.roleLabel)}.</p>${
    additional ? `<p>${escapeHtml(additional.trim())}</p>` : ''
  }<p><a href="${escapeHtml(acceptUrl)}">Accept invitation</a></p>${
    expires ? `<p>This link expires ${escapeHtml(expires)}.</p>` : ''
  }<p>If you do not have a Keeper account yet, you can create one when you open the link.</p>`;
  return { subject, text, html };
}

export async function deliverInvitationEmail(
  copy: Omit<InvitationEmailCopy, 'to'> & { to?: string | null },
): Promise<InvitationEmailDelivery> {
  const to = copy.to?.trim();
  if (!to) {
    return { sent: false, skipped: true, error: 'No recipient email.' };
  }
  const built = buildInvitationEmail({ ...copy, to });
  const result = await ResendService.sendEmail({
    to,
    subject: built.subject,
    text: built.text,
    html: built.html,
  });
  if (result.ok) {
    return { sent: true };
  }
  return { sent: false, error: result.error };
}

export function jsonEmailDelivery(delivery: InvitationEmailDelivery): {
  sent: boolean;
  error?: string;
} {
  return {
    sent: delivery.sent,
    ...(delivery.error && !delivery.sent ? { error: delivery.error } : {}),
  };
}
