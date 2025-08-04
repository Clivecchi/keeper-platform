// Node 18+ provides global fetch; no external dependency required

interface DNSRecord {
  type: string;
  domain: string;
  value: string;
  ttl: number;
}

interface VercelDomainStatus {
  attached: boolean;
  verified: boolean;
  error?: string;
  errorCode?: string;
  details?: any;
}

export class VercelDomainManagerService {
  private readonly token: string;
  private readonly projectId: string;
  private readonly teamId?: string;
  private readonly baseUrl = 'https://api.vercel.com';

  constructor(token: string, projectId: string) {
    if (!token) throw new Error('VERCEL_TOKEN env var is required');
    if (!projectId) throw new Error('VERCEL_PROJECT_ID env var is required');
    this.token = token;
    this.projectId = projectId;
    // Temporarily disable team context to test with personal account
    // this.teamId = process.env.VERCEL_TEAM_ID;
    this.teamId = undefined;
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    } as const;
  }

  /** Register the domain under the Vercel account (team/user) if it is not already present */
  private async registerDomainIfNeeded(domain: string): Promise<void> {
    const params = this.teamId ? `?teamId=${this.teamId}` : '';
    const url = `${this.baseUrl}/v4/domains${params}`;
    
    console.log('Vercel: Registering domain if needed:', { domain, url });
    
    const res = await fetch(url, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ name: domain })
    });
    
    const responseText = await res.text();
    console.log('Vercel: Register domain response:', {
      status: res.status,
      domain,
      response: responseText
    });
    
    if (res.status === 409 || res.status === 200) {
      console.log('Vercel: Domain registration successful or already exists');
      return; // domain already exists or created successfully
    }
    if (!res.ok) {
      console.error('Vercel: Domain registration failed:', {
        status: res.status,
        response: responseText,
        domain
      });
      (await import('../utils/LogStore.js')).addLog('vercel-register', {
        domain,
        status: res.status,
        response: responseText
      });
      throw new Error(`Vercel registerDomain failed: ${res.status} ${responseText}`);
    }
  }

  /** Add or update a custom domain on the Vercel project */
  async addDomain(domain: string, gitBranch: string = 'production'): Promise<{ dnsRecords: DNSRecord[] }> {
    if (!this.token || !this.projectId) {
      throw new Error('Vercel configuration missing. Please check VERCEL_TOKEN and VERCEL_PROJECT_ID.');
    }

    const params = this.teamId ? `?teamId=${this.teamId}` : '';
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains${params}`;
    
    console.log('Vercel: Adding domain to project:', {
      url,
      domain,
      gitBranch,
      hasToken: !!this.token,
      projectId: this.projectId,
      teamId: this.teamId
    });

    try {
      // Ensure domain is registered under the Vercel account first
      await this.registerDomainIfNeeded(domain);

      const res = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(gitBranch && gitBranch !== 'production' ? { name: domain, gitBranch } : { name: domain }),
      });

      const responseText = await res.text();
      console.log('Vercel: Add domain response:', {
        status: res.status,
        statusText: res.statusText,
        domain,
        response: responseText
      });

      if (res.status === 409) {
        // Domain already exists in project – treat as success
        console.log('Vercel: Domain already exists in project, treating as success');
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
        console.error('Vercel: Add domain failed:', {
          status: res.status,
          response: responseText,
          domain
        });
        (await import('../utils/LogStore.js')).addLog('vercel', {
          action: 'addDomain',
          domain,
          status: res.status,
          response: responseText
        });
        throw new Error(errorMessage);
      }

      try {
        const data = JSON.parse(responseText) as { dns: DNSRecord[] };
        console.log('Vercel: Domain added successfully:', {
          domain,
          dnsRecords: data.dns?.length || 0
        });
        return { dnsRecords: data.dns || [] };
      } catch (parseError: unknown) {
        console.error('Vercel: Failed to parse response:', parseError);
        throw new Error('Invalid response from Vercel API.');
      }
    } catch (error) {
      console.error('Vercel: Add domain call failed:', error);
      throw error;
    }
  }

  /** Get DNS configuration requirements for a domain */
  async getDomainConfig(domain: string): Promise<{ configured: boolean; records: DNSRecord[]; nameServers: string[] }> {
    const url = `${this.baseUrl}/v4/domains/${domain}/config`;
    
    console.log('Vercel: Getting domain config:', { domain, url });
    
    const res = await fetch(url, { headers: this.headers });
    const responseText = await res.text();
    
    console.log('Vercel: Domain config response:', {
      status: res.status,
      domain,
      response: responseText
    });
    
    if (!res.ok) {
      console.error('Vercel: Domain config failed:', {
        status: res.status,
        domain,
        response: responseText
      });
      throw new Error(`Vercel domain config failed: ${res.status} ${responseText}`);
    }
    
    try {
      const data = JSON.parse(responseText) as any;
      console.log('Vercel: Domain config parsed:', {
        domain,
        configured: data.configured,
        recordsCount: data.records?.length || 0,
        nameServersCount: (data.nameservers || data.nameServers)?.length || 0
      });
      
      return {
        configured: data.configured || false,
        records: data.records || [],
        nameServers: data.nameservers || data.nameServers || []
      };
    } catch (parseError: unknown) {
      console.error('Vercel: Failed to parse domain config:', parseError);
      throw new Error('Invalid domain config response from Vercel API.');
    }
  }

  /** Check if domain is attached to project and its status */
  async getDomainStatus(domain: string): Promise<VercelDomainStatus> {
    const params = this.teamId ? `?teamId=${this.teamId}` : '';
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}${params}`;
    
    console.log('Vercel: Getting domain status:', { domain, url });
    
    try {
      const res = await fetch(url, { headers: this.headers });
      const responseText = await res.text();
      
      console.log('Vercel: Domain status response:', {
        status: res.status,
        domain,
        response: responseText
      });
      
      if (res.status === 404) {
        console.log('Vercel: Domain not found in project:', { domain });
        return { attached: false, verified: false };
      }
      
      if (!res.ok) {
        console.error('Vercel: Domain status failed:', {
          status: res.status,
          domain,
          response: responseText
        });
        
        let errorDetails;
        try {
          errorDetails = JSON.parse(responseText);
        } catch {
          errorDetails = { message: responseText };
        }
        
        return {
          attached: false,
          verified: false,
          error: `Vercel domain status failed: ${res.status}`,
          errorCode: res.status.toString(),
          details: errorDetails
        };
      }
      
      try {
        const data = JSON.parse(responseText) as any;
        console.log('Vercel: Domain status parsed:', {
          domain,
          attached: true,
          verified: !!data.verified,
          data
        });
        
        return { 
          attached: true, 
          verified: !!data.verified,
          details: data
        };
      } catch (parseError: unknown) {
        console.error('Vercel: Failed to parse domain status:', parseError);
        return {
          attached: false,
          verified: false,
          error: 'Invalid response from Vercel API',
          details: { parseError: (parseError as Error).message }
        };
      }
    } catch (error) {
      console.error('Vercel: Domain status call failed:', error);
      return {
        attached: false,
        verified: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        details: { error }
      };
    }
  }

  /** Verify a domain once DNS is correct */
  async verifyDomain(domain: string): Promise<boolean> {
    const params = this.teamId ? `?teamId=${this.teamId}` : '';
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}/verify${params}`;
    
    console.log('Vercel: Verifying domain:', { domain, url });
    
    const res = await fetch(url, { method: 'POST', headers: this.headers });
    const responseText = await res.text();
    
    console.log('Vercel: Verify domain response:', {
      status: res.status,
      domain,
      response: responseText
    });
    
    if (res.status === 409) {
      console.log('Vercel: Domain already verified:', { domain });
      return true; // already verified
    }
    
    if (!res.ok) {
      console.error('Vercel: Verify domain failed:', {
        status: res.status,
        domain,
        response: responseText
      });
      throw new Error(`Vercel verifyDomain failed: ${res.status} ${responseText}`);
    }
    
    console.log('Vercel: Domain verified successfully:', { domain });
    return true;
  }

  /** Remove a domain from the project */
  async removeDomain(domain: string): Promise<void> {
    const params = this.teamId ? `?teamId=${this.teamId}` : '';
    const url = `${this.baseUrl}/v9/projects/${this.projectId}/domains/${domain}${params}`;
    
    console.log('Vercel: Removing domain:', { domain, url });
    
    const res = await fetch(url, { method: 'DELETE', headers: this.headers });
    const responseText = await res.text();
    
    console.log('Vercel: Remove domain response:', {
      status: res.status,
      domain,
      response: responseText
    });
    
    if (!res.ok && res.status !== 404) {
      console.error('Vercel: Remove domain failed:', {
        status: res.status,
        domain,
        response: responseText
      });
      throw new Error(`Vercel removeDomain failed: ${res.status} ${responseText}`);
    }
    
    console.log('Vercel: Domain removed successfully:', { domain });
  }
} 