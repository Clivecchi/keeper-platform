// Node 18+ provides global fetch; no external dependency required

interface DNSRecord {
  type: string;
  domain: string;
  value: string;
  ttl: number;
}

export class VercelDomainManagerService {
  private readonly token: string;
  private readonly projectId: string;
  private readonly baseUrl = 'https://api.vercel.com';

  constructor(token: string, projectId: string) {
    if (!token) throw new Error('VERCEL_TOKEN env var is required');
    if (!projectId) throw new Error('VERCEL_PROJECT_ID env var is required');
    this.token = token;
    this.projectId = projectId;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    } as const;
  }

  /** Add or update a custom domain on the Vercel project */
  async addDomain(domain: string, gitBranch: string = 'production'): Promise<{ dnsRecords: DNSRecord[] }> {
    if (!this.token || !this.projectId) {
      throw new Error('Vercel configuration missing. Please check VERCEL_TOKEN and VERCEL_PROJECT_ID.');
    }

    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains`;
    console.log('Vercel addDomain request:', {
      url,
      domain,
      gitBranch,
      hasToken: !!this.token,
      projectId: this.projectId
    });

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({ name: domain, gitBranch }),
      });

      const responseText = await res.text();
      console.log('Vercel API raw response:', {
        status: res.status,
        statusText: res.statusText,
        body: responseText
      });

      if (res.status === 409) {
        // Domain already exists in project – treat as success
        return { dnsRecords: [] };
      }

      if (!res.ok) {
        let errorMessage = `Vercel API Error (${res.status}): `;
        try {
          const errorJson = JSON.parse(responseText);
          if (errorJson.error?.message) {
            errorMessage += errorJson.error.message;
          } else {
            errorMessage += responseText;
          }
        } catch {
          errorMessage += responseText;
        }
        throw new Error(errorMessage);
      }

      try {
        const data = JSON.parse(responseText) as { dns: DNSRecord[] };
        return { dnsRecords: data.dns || [] };
      } catch (parseError) {
        console.error('Failed to parse Vercel API response:', parseError);
        throw new Error('Invalid response from Vercel API');
      }
    } catch (error) {
      console.error('Vercel API call failed:', error);
      throw error;
    }
  }

  /** Get DNS configuration requirements for a domain */
  async getDomainConfig(domain: string): Promise<{ configured: boolean; records: DNSRecord[] }> {
    const url = `${this.baseUrl}/v4/domains/${domain}/config`;
    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Vercel domain config failed: ${res.status} ${errBody}`);
    }
    const data = (await res.json()) as any;
    return {
      configured: data.configured || false,
      records: data.records || [],
    };
  }

  /** Verify a domain once DNS is correct */
  async verifyDomain(domain: string): Promise<boolean> {
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}/verify`;
    const res = await fetch(url, { method: 'POST', headers: this.headers });
    if (res.status === 409) return true; // already verified
    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`Vercel verifyDomain failed: ${res.status} ${errBody}`);
    }
    return true;
  }

  /** Remove a domain from the project */
  async removeDomain(domain: string): Promise<void> {
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}`;
    const res = await fetch(url, { method: 'DELETE', headers: this.headers });
    if (!res.ok && res.status !== 404) {
      const errBody = await res.text();
      throw new Error(`Vercel removeDomain failed: ${res.status} ${errBody}`);
    }
  }
} 