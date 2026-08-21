/**
 * GitHubService — REST client via Nango proxy for platform GitHub integration.
 */

import { prisma } from '@keeper/database';
import { formatNangoError } from '../lib/nangoConfig.js';
import { getNango, isNangoConfigured, resolveNangoIntegrationId } from '../lib/nango.js';
import { mergeGitHubToolArgs } from '../lib/resolveServiceBinding.js';

const DEFAULT_REPOSITORY = process.env.GITHUB_DEFAULT_REPOSITORY?.trim() || 'Clivecchi/keeper-platform';
const GITHUB_JSON_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
};

export type GitHubRepoRef = {
  owner: string;
  repo: string;
  fullName: string;
};

export type GitHubTreeEntry = {
  path?: string;
  type?: string;
  sha?: string;
  size?: number;
};

export type GitHubDirEntry = {
  type: string;
  name: string;
  path: string;
  sha?: string;
  size?: number;
};

/** Normalize a repo-relative path (no leading/trailing slashes). */
export function normalizeGitHubPath(value: string): string {
  return value.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, '');
}

/**
 * Encode a Contents path for the Nango GitHub proxy.
 * Encoding slashes as `%2F` keeps nested folders as one path (unencoded slashes
 * are otherwise eaten as extra proxy routes and GitHub 404s the folder).
 */
export function encodeGitHubContentsPath(path: string): string {
  return encodeURIComponent(normalizeGitHubPath(path));
}

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

const GITHUB_RECONNECT_HINT =
  'Reconnect GitHub on the Build board: Nav → Integrations → GitHub.';

function repoFromEndpoint(endpoint: string): string | undefined {
  const match = endpoint.match(/^\/repos\/([^/]+)\/([^/]+)/);
  if (!match) return undefined;
  return `${match[1]}/${match[2]}`;
}

function jsonBlob(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '';
  }
}

function pathBaseName(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(i + 1) : path;
}

function parentGitHubPath(path: string): string {
  const i = path.lastIndexOf('/');
  return i >= 0 ? path.slice(0, i) : '';
}

function scoreNearbyName(candidate: string, needle: string): number {
  if (candidate === needle) return 100;
  if (candidate === `${needle}s` || needle === `${candidate}s`) return 90;
  if (candidate.startsWith(needle) || needle.startsWith(candidate)) return 80;
  return 0;
}

export function nearbyGitHubPaths(entries: GitHubTreeEntry[], missingPath: string): string[] {
  const parent = parentGitHubPath(missingPath);
  const needle = pathBaseName(missingPath).toLowerCase();
  const siblings = [
    ...new Set(
      entries
        .map((entry) => entry.path)
        .filter((path): path is string => Boolean(path) && parentGitHubPath(path) === parent),
    ),
  ];
  siblings.sort((a, b) => {
    const scoreA = scoreNearbyName(pathBaseName(a).toLowerCase(), needle);
    const scoreB = scoreNearbyName(pathBaseName(b).toLowerCase(), needle);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.localeCompare(b);
  });
  return siblings.slice(0, 15);
}

function directTreeChildren(entries: GitHubTreeEntry[], dirPath: string): GitHubTreeEntry[] {
  const prefix = dirPath ? `${dirPath}/` : '';
  return entries.filter((entry) => {
    if (!entry.path?.startsWith(prefix)) return false;
    const rest = entry.path.slice(prefix.length);
    return rest.length > 0 && !rest.includes('/');
  });
}

function mapTreeChild(entry: GitHubTreeEntry): GitHubDirEntry {
  const path = entry.path ?? '';
  const type = entry.type === 'tree' ? 'dir' : entry.type === 'blob' ? 'file' : (entry.type ?? 'file');
  return {
    type,
    name: pathBaseName(path),
    path,
    sha: entry.sha,
    size: entry.size,
  };
}

function mapContentEntry(entry: {
  type?: string;
  name?: string;
  path?: string;
  sha?: string;
  size?: number;
}): GitHubDirEntry {
  return {
    type: entry.type ?? 'file',
    name: entry.name ?? pathBaseName(entry.path ?? ''),
    path: entry.path ?? '',
    sha: entry.sha,
    size: entry.size,
  };
}

function decodeBase64Content(encoding: string | undefined, content: string | undefined): string | null {
  if (encoding !== 'base64' || typeof content !== 'string') return null;
  return Buffer.from(content.replace(/\n/g, ''), 'base64').toString('utf8');
}

function contentsEndpoint(owner: string, repo: string, path: string, ref: string): string {
  const encoded = encodeGitHubContentsPath(path);
  const base = encoded
    ? `/repos/${owner}/${repo}/contents/${encoded}`
    : `/repos/${owner}/${repo}/contents`;
  return `${base}?ref=${encodeURIComponent(ref)}`;
}

function isGitHubApiNotFound(detail: unknown): boolean {
  // GitHub REST 404s include documentation_url. Bare "Not Found" is Nango/Axios.
  return /documentation_url/i.test(jsonBlob(detail));
}

function isNangoConnectionError(message: string, detail: unknown, status: number): boolean {
  const blob = `${message} ${jsonBlob(detail)}`;
  if (
    /unknown_connection|connection not found|no connection found|connection_not_found|unknown_provider|providerconfigkey|integration not found|unknown_integration/i.test(
      blob,
    )
  ) {
    return true;
  }
  // Generic Axios 404 with no GitHub API payload — Nango never reached GitHub.
  return status === 404 && !isGitHubApiNotFound(detail);
}

/** Map Nango/Axios GitHub proxy failures into a message Cloud can show honestly. */
export function formatGitHubProxyError(err: unknown, endpoint: string): string {
  const formatted = formatNangoError(err);
  const { status, message, detail } = formatted;
  const repo = repoFromEndpoint(endpoint);

  if (isNangoConnectionError(message, detail, status)) {
    return `GitHub is not connected in Nango. ${GITHUB_RECONNECT_HINT}`;
  }

  if (status === 401 || status === 403) {
    return `GitHub access was denied (${status}). ${GITHUB_RECONNECT_HINT}`;
  }

  if (status === 404 || /not found/i.test(message)) {
    if (/\/contents\//.test(endpoint)) {
      const path = decodeURIComponent(endpoint.split('/contents/')[1]?.split('?')[0] ?? '');
      return `GitHub file not found${path ? `: ${path}` : ''}${repo ? ` in ${repo}` : ''}. Check the path and repository binding.`;
    }
    if (/\/git\/ref\/heads\//.test(endpoint)) {
      const branch = decodeURIComponent(endpoint.split('/git/ref/heads/')[1] ?? '');
      return `GitHub branch not found${branch ? `: ${branch}` : ''}${repo ? ` in ${repo}` : ''}. Check the default branch in the GitHub binding.`;
    }
    return `GitHub repository not found or the connected GitHub app cannot access it${repo ? ` (${repo})` : ''}. ${GITHUB_RECONNECT_HINT}`;
  }

  if (message && !/status code \d+/i.test(message) && message !== 'Nango request failed') {
    return `GitHub: ${message}`;
  }

  return `GitHub request failed (${status}). ${GITHUB_RECONNECT_HINT}`;
}

export function isGitHubFileNotFoundError(err: unknown): boolean {
  return err instanceof Error && /GitHub file not found/i.test(err.message);
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
    throw new Error(`GitHub integration is not connected. ${GITHUB_RECONNECT_HINT}`);
  }

  try {
    const response = await getNango().proxy({
      method,
      endpoint,
      providerConfigKey: resolveNangoIntegrationId('github'),
      connectionId: integration.nangoConnectionId,
      headers: GITHUB_JSON_HEADERS,
      data,
    });
    return response.data as T;
  } catch (error) {
    throw new Error(formatGitHubProxyError(error, endpoint));
  }
}

async function readPathFromGitTree(params: {
  owner: string;
  repo: string;
  fullName: string;
  path: string;
  ref: string;
}) {
  const { owner, repo, fullName, path, ref } = params;
  const tree = await GitHubService.loadGitTree(owner, repo, ref);
  const exact = tree.entries.find((entry) => entry.path === path);
  const children = directTreeChildren(tree.entries, path);

  if (exact?.type === 'blob' && exact.sha) {
    const blob = await githubProxy<{
      encoding?: string;
      content?: string;
      sha?: string;
      size?: number;
    }>('GET', `/repos/${owner}/${repo}/git/blobs/${exact.sha}`);
    return {
      repository: fullName,
      path,
      ref,
      mode: 'file' as const,
      type: 'file',
      sha: blob.sha ?? exact.sha,
      size: blob.size ?? exact.size,
      content: decodeBase64Content(blob.encoding, blob.content),
    };
  }

  if (exact?.type === 'tree' || children.length > 0) {
    return {
      repository: fullName,
      path,
      ref,
      mode: 'dir' as const,
      type: 'dir',
      entries: children.map(mapTreeChild),
      truncated: tree.truncated,
    };
  }

  const nearby = nearbyGitHubPaths(tree.entries, path);
  const parent = parentGitHubPath(path) || 'repository root';
  const nearbyHint = nearby.length
    ? ` Nearby in ${parent}: ${nearby.map(pathBaseName).join(', ')}.`
    : '';
  throw new Error(
    `GitHub file not found: ${path} in ${fullName}.${nearbyHint} Check the path and repository binding.`,
  );
}

export class GitHubService {
  static resolveRepository(args: Record<string, unknown>): GitHubRepoRef {
    return resolveRepository(args);
  }

  static async loadGitTree(
    owner: string,
    repo: string,
    ref: string,
  ): Promise<{ ref: string; sha: string; entries: GitHubTreeEntry[]; truncated: boolean }> {
    const branchRef = await githubProxy<{ object?: { sha?: string } }>(
      'GET',
      `/repos/${owner}/${repo}/git/ref/heads/${encodeURIComponent(ref)}`,
    );
    const treeSha = branchRef.object?.sha;
    if (!treeSha) {
      throw new Error(`Could not resolve branch ref "${ref}" for ${owner}/${repo}`);
    }
    const tree = await githubProxy<{
      tree?: GitHubTreeEntry[];
      truncated?: boolean;
    }>('GET', `/repos/${owner}/${repo}/git/trees/${treeSha}?recursive=1`);
    return {
      ref,
      sha: treeSha,
      entries: tree.tree ?? [],
      truncated: tree.truncated ?? false,
    };
  }

  /** Read repository contents — file body, directory listing, or git tree. */
  static async readRepository(args: Record<string, unknown>, domainId?: string | null) {
    const resolvedArgs = await mergeGitHubToolArgs(args, domainId);
    const { owner, repo, fullName } = resolveRepository(resolvedArgs);
    const path = typeof args.path === 'string' ? normalizeGitHubPath(args.path) : '';
    const ref =
      (typeof resolvedArgs.ref === 'string' && resolvedArgs.ref) ||
      (typeof resolvedArgs.branch === 'string' && resolvedArgs.branch) ||
      'main';
    const mode = typeof args.mode === 'string' ? args.mode : path ? 'auto' : 'tree';

    if (mode === 'tree') {
      const tree = await GitHubService.loadGitTree(owner, repo, ref);
      const entries = path
        ? tree.entries.filter(
            (entry) => entry.path === path || Boolean(entry.path?.startsWith(`${path}/`)),
          )
        : tree.entries;
      return {
        repository: fullName,
        ref,
        path: path || undefined,
        mode: 'tree' as const,
        entries,
        truncated: tree.truncated,
      };
    }

    try {
      const content = await githubProxy<
        | {
            type?: string;
            name?: string;
            path?: string;
            sha?: string;
            size?: number;
            encoding?: string;
            content?: string;
          }
        | Array<{ type?: string; name?: string; path?: string; sha?: string; size?: number }>
      >('GET', contentsEndpoint(owner, repo, path, ref));

      if (Array.isArray(content)) {
        return {
          repository: fullName,
          path,
          ref,
          mode: 'dir' as const,
          type: 'dir',
          entries: content.map(mapContentEntry),
        };
      }

      return {
        repository: fullName,
        path,
        ref,
        mode: 'file' as const,
        type: content.type,
        sha: content.sha,
        size: content.size,
        content: decodeBase64Content(content.encoding, content.content),
      };
    } catch (error) {
      if (!isGitHubFileNotFoundError(error)) throw error;
      return readPathFromGitTree({ owner, repo, fullName, path, ref });
    }
  }

  static async listCommits(args: Record<string, unknown>, domainId?: string | null) {
    const resolvedArgs = await mergeGitHubToolArgs(args, domainId);
    const { owner, repo, fullName } = resolveRepository(resolvedArgs);
    const branch =
      (typeof resolvedArgs.branch === 'string' && resolvedArgs.branch) ||
      (typeof resolvedArgs.ref === 'string' && resolvedArgs.ref) ||
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

  static async createBranch(args: Record<string, unknown>, domainId?: string | null) {
    const resolvedArgs = await mergeGitHubToolArgs(args, domainId);
    const { owner, repo, fullName } = resolveRepository(resolvedArgs);
    const branchName = typeof args.branch === 'string' ? args.branch.trim() : '';
    const baseBranch =
      (typeof resolvedArgs.base === 'string' && resolvedArgs.base.trim()) ||
      (typeof resolvedArgs.baseBranch === 'string' && resolvedArgs.baseBranch.trim()) ||
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

  static async writeFile(args: Record<string, unknown>, domainId?: string | null) {
    const resolvedArgs = await mergeGitHubToolArgs(args, domainId);
    const { owner, repo, fullName } = resolveRepository(resolvedArgs);
    const path = typeof args.path === 'string' ? normalizeGitHubPath(args.path) : '';
    const branch =
      typeof resolvedArgs.branch === 'string' ? resolvedArgs.branch : 'main';
    const message =
      (typeof args.message === 'string' && args.message.trim()) || `Update ${path} via Keeper MCP`;
    const content = typeof args.content === 'string' ? args.content : '';
    const encodedPath = encodeGitHubContentsPath(path);

    if (!path) throw new Error('path is required');
    if (!content) throw new Error('content is required');

    let existingSha: string | undefined;
    try {
      const existing = await githubProxy<{ sha?: string }>(
        'GET',
        `/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`,
      );
      existingSha = existing.sha;
    } catch (error) {
      if (!isGitHubFileNotFoundError(error)) {
        throw error;
      }
      existingSha = undefined;
    }

    const result = await githubProxy<{
      content?: { sha?: string; path?: string };
      commit?: { sha?: string; html_url?: string };
    }>('PUT', `/repos/${owner}/${repo}/contents/${encodedPath}`, {
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

  static async createPullRequest(args: Record<string, unknown>, domainId?: string | null) {
    const resolvedArgs = await mergeGitHubToolArgs(args, domainId);
    const { owner, repo, fullName } = resolveRepository(resolvedArgs);
    const title = typeof args.title === 'string' ? args.title.trim() : '';
    const head = typeof args.head === 'string' ? args.head.trim() : '';
    const base = (typeof resolvedArgs.base === 'string' && resolvedArgs.base.trim()) || 'main';
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

  static async readPullRequest(args: Record<string, unknown>, domainId?: string | null) {
    const resolvedArgs = await mergeGitHubToolArgs(args, domainId);
    const { owner, repo, fullName } = resolveRepository(resolvedArgs);
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

  static async getActionsStatus(args: Record<string, unknown>, domainId?: string | null) {
    const resolvedArgs = await mergeGitHubToolArgs(args, domainId);
    const { owner, repo, fullName } = resolveRepository(resolvedArgs);
    const branch = typeof resolvedArgs.branch === 'string' ? resolvedArgs.branch : undefined;
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
