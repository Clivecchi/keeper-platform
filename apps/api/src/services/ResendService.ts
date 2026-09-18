/**
 * Resend — domain status for Cloud MCP, and product email send (invitations).
 */

const RESEND_API_BASE = 'https://api.resend.com';

export type ResendDomainSummary = {
  id: string;
  name: string;
  status: string;
  region?: string;
};

export type ResendStatusResult = {
  configured: boolean;
  apiKeyPresent: boolean;
  domains: ResendDomainSummary[];
  domainCount: number;
  hint?: string;
  error?: string;
  checkedAt: string;
};

export type ResendSendInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type ResendSendResult =
  | { ok: true; id: string }
  | { ok: false; configured: boolean; error: string };

function envResendApiKey(): string {
  return process.env.RESEND_API_KEY?.trim() ?? '';
}

async function resolveResendApiKey(): Promise<string> {
  const envKey = envResendApiKey();
  if (envKey) return envKey;
  if (process.env.VITEST || !process.env.DATABASE_URL?.trim()) return '';
  try {
    const { prisma } = await import('@keeper/database');
    const row = await prisma.kip_platform_keys.findFirst({
      where: { is_active: true, provider: 'resend' },
      select: { api_key: true },
    });
    return row?.api_key?.trim() ?? '';
  } catch {
    return '';
  }
}

export function invitationFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL?.trim() || 'Keeper <invites@ke3p.com>';
}

export class ResendService {
  static async getStatus(): Promise<ResendStatusResult> {
    const checkedAt = new Date().toISOString();
    const apiKey = await resolveResendApiKey();

    if (!apiKey) {
      return {
        configured: false,
        apiKeyPresent: false,
        domains: [],
        domainCount: 0,
        hint: 'RESEND_API_KEY is not configured on the API service (or as a platform key for provider resend)',
        checkedAt,
      };
    }

    try {
      const response = await fetch(`${RESEND_API_BASE}/domains`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
        },
      });

      const text = await response.text();
      let payload: { data?: ResendDomainSummary[]; message?: string };
      try {
        payload = JSON.parse(text) as typeof payload;
      } catch {
        throw new Error(`Resend API returned invalid JSON (${response.status})`);
      }

      if (!response.ok) {
        throw new Error(payload.message || `Resend API error (${response.status})`);
      }

      const domains = Array.isArray(payload.data) ? payload.data : [];
      return {
        configured: true,
        apiKeyPresent: true,
        domains: domains.slice(0, 20),
        domainCount: domains.length,
        checkedAt,
      };
    } catch (error) {
      return {
        configured: false,
        apiKeyPresent: true,
        domains: [],
        domainCount: 0,
        error: error instanceof Error ? error.message : 'Resend status check failed',
        checkedAt,
      };
    }
  }

  static async sendEmail(input: ResendSendInput): Promise<ResendSendResult> {
    const apiKey = await resolveResendApiKey();
    const to = input.to.trim();
    if (!to) {
      return { ok: false, configured: Boolean(apiKey), error: 'No recipient email.' };
    }
    if (!apiKey) {
      return {
        ok: false,
        configured: false,
        error: 'RESEND_API_KEY is not configured on the API service (or as a platform key for provider resend)',
      };
    }

    try {
      const response = await fetch(`${RESEND_API_BASE}/emails`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: invitationFromAddress(),
          to: [to],
          subject: input.subject,
          text: input.text,
          ...(input.html ? { html: input.html } : {}),
          ...(input.replyTo ? { reply_to: input.replyTo } : {}),
        }),
      });

      const text = await response.text();
      let payload: { id?: string; message?: string; name?: string };
      try {
        payload = JSON.parse(text) as typeof payload;
      } catch {
        return {
          ok: false,
          configured: true,
          error: `Resend API returned invalid JSON (${response.status})`,
        };
      }

      if (!response.ok || !payload.id) {
        return {
          ok: false,
          configured: true,
          error: payload.message || payload.name || `Resend API error (${response.status})`,
        };
      }

      return { ok: true, id: payload.id };
    } catch (error) {
      return {
        ok: false,
        configured: true,
        error: error instanceof Error ? error.message : 'Resend send failed',
      };
    }
  }
}
