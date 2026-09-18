import { afterEach, describe, expect, it } from 'vitest';
import {
  buildInvitationEmail,
  domainBoardAbsoluteUrl,
  invitationAcceptAbsoluteUrl,
  publicWebOrigin,
  roleLabelForInvitation,
} from './invitationEmail.js';

describe('invitation email copy', () => {
  const originalOrigin = process.env.PUBLIC_WEB_ORIGIN;

  afterEach(() => {
    if (originalOrigin === undefined) {
      delete process.env.PUBLIC_WEB_ORIGIN;
    } else {
      process.env.PUBLIC_WEB_ORIGIN = originalOrigin;
    }
  });

  it('builds an absolute accept URL from PUBLIC_WEB_ORIGIN', () => {
    process.env.PUBLIC_WEB_ORIGIN = 'https://www.ke3p.com/';
    expect(publicWebOrigin()).toBe('https://www.ke3p.com');
    expect(invitationAcceptAbsoluteUrl('tok/value')).toBe(
      'https://www.ke3p.com/invite/accept?token=tok%2Fvalue',
    );
    expect(domainBoardAbsoluteUrl('livecchi')).toBe(
      'https://www.ke3p.com/d/livecchi?board=domain',
    );
  });

  it('labels stored user as Member', () => {
    expect(roleLabelForInvitation('user')).toBe('Member');
    expect(roleLabelForInvitation('connection')).toBe('Connection');
  });

  it('writes an invite email with accept link and extra domains', () => {
    const email = buildInvitationEmail({
      kind: 'invite',
      to: 'pat@example.com',
      inviterName: 'Chuck',
      domainName: 'ke3p',
      domainSlug: 'ke3p',
      roleLabel: 'Friend',
      acceptUrl: 'https://www.ke3p.com/invite/accept?token=abc',
      additionalDomainNames: ['livecchi.biz'],
      expiresAt: new Date('2026-09-23T00:00:00.000Z'),
    });
    expect(email.subject).toBe('Invitation to ke3p on Keeper');
    expect(email.text).toContain('Chuck invited you to ke3p as Friend');
    expect(email.text).toContain('livecchi.biz');
    expect(email.text).toContain('https://www.ke3p.com/invite/accept?token=abc');
    expect(email.html).toContain('Accept invitation');
    expect(email.html).not.toContain('<script');
  });

  it('writes a granted-member email with a Domain board link', () => {
    const email = buildInvitationEmail({
      kind: 'granted',
      to: 'pat@example.com',
      inviterName: 'Chuck',
      domainName: 'ke3p',
      domainSlug: 'ke3p',
      roleLabel: 'Member',
      domainUrl: 'https://www.ke3p.com/d/ke3p?board=domain',
    });
    expect(email.subject).toBe('You were added to ke3p on Keeper');
    expect(email.text).toContain('Chuck added you to ke3p as Member');
    expect(email.text).toContain('https://www.ke3p.com/d/ke3p?board=domain');
    expect(email.html).toContain('Open ke3p');
  });
});
