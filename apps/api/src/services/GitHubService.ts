/**
 * GitHubService — REST client via Nango proxy for platform GitHub integration.
 */

import { prisma } from '@keeper/database';
import { getNango, isNangoConfigured, resolveNangoIntegrationId } from '../lib/nango.js';

const DEFAULT_REPOSITORY = process.env.GITHUB_DEFAULT_REPOSITORY?.trim() || 'Clivecchi/keeper-platform';

export type GitHubRepoRef = {
  owner: string;
  repo: string;
  fullName: string;
};

function parseRepository(value: string): GitHubRepoRef {
  const [owner, repo] = value.split('/');
  if (!owner || !repo) {
    throw new Error(`Invalid repository "${value}" — expected owner/repo`);
  }
  return { owner, repo, fullName: `${owner}/${repo}` };
}

function resolveRepository(args: Record<string, unknown>): GitHubRepoRef {
  if (typeof args.repository === 'string' && args.repository.includes('/')) {
    return parseRepository(args.repository.trim());
  }
  const owner =
    (typeof args.owner === 'string' && args.owner.trim()) ||
    parseRepository(DEFAULT_REPOSITORY).owner;
  const repo =
    (typeof args.repo === 'string' && args.repo.trim()) ||
    parseRepository(DEFAULT_REPOSITORY).repo;
  return { owner, repo, fullName: `${owner}/${repo}` };
}

async function findConnectedGitHubIntegration() {
  return prisma.integration.findFirst({
    where: {
      service: 'github',
      tier: 'platform',
      domainId: null,
      userId: null,
      status: 'connected',
    },
    select: { nangoConnectionId: true, scopes: true },
  });
}

async function githubProxy<T>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: unknown,
): Promise<T> {
  if (!isNangoConfigured()) {
    throw new Error('Nango is not configured');
  }

  const integration = await findConnectedGitHubIntegration();
  if (!integration?.nangoConnectionId) {
    throw new Error('GitHub integration is not connected');
  }

  const response = await getNango().proxy({
    method,
    endpoint,
    providerConfigKey: resolveNangoIntegrationId('github'),
    connectionId: integration.nangoConnectionId,
    data,
  });

  return response.data as T;
}

export class GitHubService {
  static resolveRepository(args: Record<string, unknown>): GitHubRepoRef {
    return resolveRepository(args);
  }

  /** Read repository contents — file body or directory listing. */
  static async readRepository(args: Record<string, unknown>) {
    const { owner, repo, fullName } = resolveRepository(args);
    const path = typeof args.path === 'string' ? args.path.replace(/^\//, '') : '';
    const mode = typeof args.mode === 'string' ? args.mode : path ? 'file' : 'tree';

    if (mode === 'tree') {
      const ref =
        (typeof args.ref === 'string' && args.ref) ||
        (typeof args.branch === 'string' && args.branch) ||
        'main';
      const branchRef = await githubProxy<{ object?: { sha?: string } }>(
        'GET',
        `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ref)}`,
      );
      const treeSha = branchRef.object?.sha;
      if (!treeSha) {
        throw new Error(`Could not resolve branch ref "${ref}" for ${fullName}`);
      }
      const tree = await githubProxy<{
        tree?: Array<{ path?: string; type?: string; sha?: string; size?: number }>;
        truncated?: boolean;
      }>('GET', `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
      return {
        repository: fullName,
        ref,
        mode: 'tree' as const,
        entries: tree.tree ?? [],
        truncated: tree.truncated ?? false,
      };
    }

    const content = await githubProxy<{
      type?: string;
      name?: string;
      path?: string;
      sha?: string;
      size?: number;
      encoding?: string;
      content?: string;
    }>('GET', `/repos/${owner}/${repo}/contents/${path}`);

    let decoded: string | null = null;
    if (content.encoding === 'base64' && typeof content.content === 'string') {
      decoded = Buffer.from(content.content.replace(/\n/g, ''), 'base64').toString('utf8');
    }

    return {
      repository: fullName,
      path,
      mode: 'file' as const,
      type: content.type,
      sha: content.sha,
      size: content.size,
      content: decoded,
    };
  }

  static async listCommits(args: Record<string, unknown>) {
    const { owner, repo, fullName } = resolveRepository(args);
    const branch =
      (typeof args.branch === 'string' && args.branch) ||
      (typeof args.ref === 'string' && args.ref) ||
      'main';
    const limit = Math.min(Math.max(Number(args.limit ?? 10), 1), 30);
    const commits = await githubProxy<
      Array<{
        sha: string;
        commit?: {
          message?: string;
          author?: { name?: string; date?: string };
        };
      }>
    >('GET', `/repos/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&per_page=${limit}`);

    return {
      repository: fullName,
      branch,
      commits: commits.map((row) => ({
        sha: row.sha,
        message: row.commit?.message?.split('\n')[0] ?? '',
        author: row.commit?.author?.name ?? null,
        date: row.commit?.author?.date ?? null,
      })),
    };
  }

  static async createBranch(args: Record<string, unknown>) {
    const { owner, repo, fullName } = resolveRepository(args);
    const branchName = typeof args.branch === 'string' ? args.branch.trim() : '';
    const baseBranch =
      (typeof args.base === 'string' && args.base.trim()) ||
      (typeof args.baseBranch === 'string' && args.baseBranch.trim()) ||
      'main';

    if (!branchName) {
      throw new Error('branch is required');
    }

    const baseRef = await githubProxy<{ object?: { sha?: string } }>(
      'GET',
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(baseBranch)}`,
    );
    const sha = baseRef.object?.sha;
    if (!sha) {
      throw new Error(`Could not resolve base branch "${baseBranch}"`);
    }

    await githubProxy('POST', `/repos/${owner}/${repo}/git/refs`, {
      ref: `refs/heads/${branchName}`,
      sha,
    });

    return {
      repository: fullName,
      branch: branchName,
      base: baseBranch,
      sha,
      created: true,
    };
  }

  static async writeFile(args: Record<string, unknown>) {
    const { owner, repo, fullName } = resolveRepository(args);
    const path = typeof args.path === 'string' ? args.path.replace(/^\//, '') : '';
    const branch = typeof args.branch === 'string' ? args.branch : 'main';
    const message =
      (typeof args.message === 'string' && args.message.trim()) || `Update ${path} via Keeper MCP`;
    const content = typeof args.content === 'string' ? args.content : '';

    if (!path) throw new Error('path is required');
    if (!content) throw new Error('content is required');

    let existingSha: string | undefined;
    try {
      const existing = await githubProxy<{ sha?: string }>(
        'GET',
        `/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(branch)}`,
      );
      existingSha = existing.sha;
    } catch {
      existingSha = undefined;
    }

    const result = await githubProxy<{
      content?: { sha?: string; path?: string };
      commit?: { sha?: string; html_url?: string };
    }>('PUT', `/repos/${owner}/${repo}/contents/${path}`, {
      message,
      content: Buffer.from(content, 'utf8').toString('base64'),
      branch,
      ...(existingSha ? { sha: existingSha } : {}),
    });

    return {
      repository: fullName,
      path,
      branch,
      sha: result.content?.sha ?? result.commit?.sha ?? null,
      commitUrl: result.commit?.html_url ?? null,
      updated: Boolean(existingSha),
      created: !existingSha,
    };
  }

  static async createPullRequest(args: Record<string, unknown>) {
    const { owner, repo, fullName } = resolveRepository(args);
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const head = typeof args.head === 'string' ? args.head.trim() : '';
    const base = (typeof args.base === 'string' && args.base.trim()) || 'main';
    const body = typeof args.body === 'string' ? args.body : '';

    if (!title) throw new Error('title is required');
    if (!head) throw new Error('head branch is required');

    const pr = await githubProxy<{
      number: number;
      html_url?: string;
      state?: string;
      title?: string;
    }>('POST', `/repos/${owner}/${repo}/pulls`, {
      title,
      head,
      base,
      body,
    });

    return {
      repository: fullName,
      number: pr.number,
      title: pr.title ?? title,
      state: pr.state ?? 'open',
      url: pr.html_url ?? null,
      head,
      base,
    };
  }

  static async readPullRequest(args: Record<string, unknown>) {
    const { owner, repo, fullName } = resolveRepository(args);
    const number = Number(args.number ?? args.pullNumber);
    if (!Number.isFinite(number) || number <= 0) {
      throw new Error('number is required');
    }

    const pr = await githubProxy<{
      number: number;
      title?: string;
      state?: string;
      merged?: boolean;
      html_url?: string;
      head?: { ref?: string; sha?: string };
      base?: { ref?: string };
      user?: { login?: string };
    }>('GET', `/repos/${owner}/${repo}/pulls/${number}`);

    const headSha = pr.head?.sha;
    const [reviews, checks] = await Promise.all([
      githubProxy<Array<{ state?: string; user?: { login?: string } }>>(
        'GET',
        `/repos/${owner}/${repo}/pulls/${number}/reviews`,
      ).catch(() => []),
      headSha
        ? githubProxy<{
            state?: string;
            statuses?: Array<{ context?: string; state?: string }>;
            total_count?: number;
          }>('GET', `/repos/${owner}/${repo}/commits/${headSha}/status`).catch(() => null)
        : Promise.resolve(null),
    ]);

    return {
      repository: fullName,
      number: pr.number,
      title: pr.title,
      state: pr.state,
      merged: pr.merged ?? false,
      url: pr.html_url,
      head: pr.head?.ref,
      base: pr.base?.ref,
      author: pr.user?.login,
      reviews: reviews.map((r) => ({ state: r.state, user: r.user?.login })),
      checks: {
        state: checks?.state ?? 'unknown',
        total: checks?.total_count ?? 0,
        statuses: checks?.statuses ?? [],
      },
    };
  }

  static async getActionsStatus(args: Record<string, unknown>) {
    const { owner, repo, fullName } = resolveRepository(args);
    const branch = typeof args.branch === 'string' ? args.branch : undefined;
    const query = branch ? `?branch=${encodeURIComponent(branch)}&per_page=1` : '?per_page=1';

    const runs = await githubProxy<{
      workflow_runs?: Array<{
        id: number;
        name?: string;
        status?: string;
        conclusion?: string;
        html_url?: string;
        head_branch?: string;
        created_at?: string;
        updated_at?: string;
      }>;
    }>('GET', `/repos/${owner}/${repo}/actions/runs${query}`);

    const latest = runs.workflow_runs?.[0] ?? null;
    return {
      repository: fullName,
      run: latest
        ? {
            id: latest.id,
            name: latest.name,
            status: latest.status,
            conclusion: latest.conclusion,
            url: latest.html_url,
            branch: latest.head_branch,
            createdAt: latest.created_at,
            updatedAt: latest.updated_at,
          }
        : null,
    };
  }
}
