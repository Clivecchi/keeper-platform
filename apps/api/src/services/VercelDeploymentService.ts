/**
 * VercelDeploymentService — deployment operations only.
 * Domain operations remain in VercelDomainManagerService (do not duplicate).
 */

import { fetchWithTimeout } from '../lib/fetchWithTimeout.js';

export type VercelDeploymentSummary = {
  id: string;
  url?: string;
  state?: string;
  createdAt?: number;
  target?: string;
  meta?: Record<string, unknown>;
};

export type VercelProjectInfo = {
  id: string;
  name: string;
  framework?: string | null;
  link?: { type?: string; repo?: string };
};

export type VercelLogEvent = {
  type?: string;
  text?: string;
  created?: number;
  payload?: Record<string, unknown>;
};

export class VercelDeploymentService {
  private readonly token: string;
  private readonly projectId: string;
  private readonly baseUrl = 'https://api.vercel.com';

  constructor(token?: string, projectId?: string) {
    this.token = token ?? process.env.VERCEL_TOKEN?.trim() ?? '';
    this.projectId = projectId ?? process.env.VERCEL_PROJECT_ID?.trim() ?? '';
    if (!this.token) throw new Error('VERCEL_TOKEN is not configured');
    if (!this.projectId) throw new Error('VERCEL_PROJECT_ID is not configured');
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
    } as const;
  }

  static create(): VercelDeploymentService {
    return new VercelDeploymentService();
  }

  async getDeployments(limit = 10): Promise<VercelDeploymentSummary[]> {
    const count = Math.min(Math.max(limit, 1), 50);
    const url = `${this.baseUrl}/v6/deployments?projectId=${encodeURIComponent(this.projectId)}&limit=${count}`;
    const res = await fetchWithTimeout(url, { headers: this.headers });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Vercel deployments failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = JSON.parse(text) as { deployments?: VercelDeploymentSummary[] };
    return data.deployments ?? [];
  }

  async getDeploymentStatus(deploymentId: string): Promise<VercelDeploymentSummary> {
    const url = `${this.baseUrl}/v13/deployments/${encodeURIComponent(deploymentId)}`;
    const res = await fetchWithTimeout(url, { headers: this.headers });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Vercel deployment status failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return JSON.parse(text) as VercelDeploymentSummary;
  }

  async getDeploymentLogs(deploymentId: string): Promise<VercelLogEvent[]> {
    const url = `${this.baseUrl}/v2/deployments/${encodeURIComponent(deploymentId)}/events`;
    const res = await fetchWithTimeout(url, { headers: this.headers });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Vercel deployment logs failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = JSON.parse(text) as VercelLogEvent[] | { events?: VercelLogEvent[] };
    if (Array.isArray(data)) return data;
    return data.events ?? [];
  }

  // incomplete — requires human confirmation gate before agent-initiated redeploys go live
  async triggerRedeploy(deploymentId: string): Promise<{ jobId?: string; state?: string }> {
    const url = `${this.baseUrl}/v13/deployments/${encodeURIComponent(deploymentId)}/redeploy`;
    const res = await fetchWithTimeout(url, { method: 'POST', headers: this.headers, body: JSON.stringify({}) });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Vercel redeploy failed (${res.status}): ${text.slice(0, 300)}`);
    }
    return JSON.parse(text) as { jobId?: string; state?: string };
  }

  async getProjectInfo(): Promise<VercelProjectInfo> {
    const url = `${this.baseUrl}/v9/projects/${encodeURIComponent(this.projectId)}`;
    const res = await fetchWithTimeout(url, { headers: this.headers });
    const text = await res.text();
    if (!res.ok) {
      throw new Error(`Vercel project info failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const data = JSON.parse(text) as VercelProjectInfo;
    return {
      id: data.id,
      name: data.name,
      framework: data.framework,
      link: data.link,
    };
  }
}
