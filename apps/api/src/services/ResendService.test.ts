import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResendService } from './ResendService.js';

describe('ResendService.sendEmail', () => {
  const originalKey = process.env.RESEND_API_KEY;
  const originalFrom = process.env.RESEND_FROM_EMAIL;

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    if (originalFrom === undefined) delete process.env.RESEND_FROM_EMAIL;
    else process.env.RESEND_FROM_EMAIL = originalFrom;
  });

  it('refuses to send when RESEND_API_KEY is missing', async () => {
    delete process.env.RESEND_API_KEY;
    const result = await ResendService.sendEmail({
      to: 'pat@example.com',
      subject: 'Invitation',
      text: 'Hello',
    });
    expect(result).toEqual({
      ok: false,
      configured: false,
      error: 'RESEND_API_KEY is not configured on the API service (or as a platform key for provider resend)',
    });
  });

  it('posts the invitation to Resend and returns the id', async () => {
    process.env.RESEND_API_KEY = 're_test';
    process.env.RESEND_FROM_EMAIL = 'Keeper <invites@ke3p.com>';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: 'email_123' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await ResendService.sendEmail({
      to: 'pat@example.com',
      subject: 'Invitation to ke3p on Keeper',
      text: 'Accept the invitation',
      html: '<p>Accept the invitation</p>',
    });

    expect(result).toEqual({ ok: true, id: 'email_123' });
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer re_test',
        }),
      }),
    );
    const body = JSON.parse((fetchMock.mock.calls[0]?.[1] as { body: string }).body) as {
      from: string;
      to: string[];
      subject: string;
    };
    expect(body.from).toBe('Keeper <invites@ke3p.com>');
    expect(body.to).toEqual(['pat@example.com']);
    expect(body.subject).toBe('Invitation to ke3p on Keeper');
  });

  it('returns Resend error copy when the API rejects the send', async () => {
    process.env.RESEND_API_KEY = 're_test';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => JSON.stringify({ message: 'The ke3p.com domain is not verified.' }),
      }),
    );

    const result = await ResendService.sendEmail({
      to: 'pat@example.com',
      subject: 'Invitation',
      text: 'Hello',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.configured).toBe(true);
      expect(result.error).toContain('not verified');
    }
  });
});
