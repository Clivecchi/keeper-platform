/**
 * Resend — read-only status for Cloud MCP (email infra; not yet product-active).
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

export class ResendService {
  static async getStatus(): Promise<ResendStatusResult> {
    const checkedAt = new Date().toISOString();
    const apiKey = process.env.RESEND_API_KEY?.trim();

    if (!apiKey) {
      return {
        configured: false,
        apiKeyPresent: false,
        domains: [],
        domainCount: 0,
        hint: 'RESEND_API_KEY is not configured on the API service',
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
}
