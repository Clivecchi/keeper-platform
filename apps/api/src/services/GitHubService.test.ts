import { describe, it, expect, vi, beforeEach } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  integration: { findFirst: vi.fn() },
}));

const nangoMock = vi.hoisted(() => ({
  isNangoConfigured: vi.fn(),
  getNango: vi.fn(),
  resolveNangoIntegrationId: vi.fn(),
}));

vi.mock('@keeper/database', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@keeper/database')>();
  return { ...actual, prisma: prismaMock };
});

vi.mock('../lib/nango.js', () => ({
  isNangoConfigured: nangoMock.isNangoConfigured,
  getNango: nangoMock.getNango,
  resolveNangoIntegrationId: nangoMock.resolveNangoIntegrationId,
}));

import {
  GitHubService,
  formatGitHubProxyError,
  isGitHubFileNotFoundError,
} from './GitHubService.js';

describe('GitHubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    nangoMock.isNangoConfigured.mockReturnValue(true);
    nangoMock.resolveNangoIntegrationId.mockReturnValue('github-app');
    prismaMock.integration.findFirst.mockResolvedValue({
      nangoConnectionId: 'conn_github_test',
      scopes: [],
    });
    nangoMock.getNango.mockReturnValue({
      proxy: vi.fn().mockResolvedValue({
        data: { type: 'file', content: Buffer.from('hello').toString('base64'), encoding: 'base64' },
      }),
    });
  });

  it('readRepository decodes base64 file content', async () => {
    const result = await GitHubService.readRepository({
      repository: 'Clivecchi/keeper-platform',
      path: 'README.md',
      mode: 'file',
    });
    expect(result.content).toBe('hello');
    expect(result.mode).toBe('file');
  });

  it('createBranch calls git refs endpoint', async () => {
    const proxy = vi
      .fn()
      .mockResolvedValueOnce({ data: { object: { sha: 'abc123' } } })
      .mockResolvedValueOnce({ data: { ref: 'refs/heads/cloud/test' } });
    nangoMock.getNango.mockReturnValue({ proxy });

    const result = await GitHubService.createBranch({
      repository: 'Clivecchi/keeper-platform',
      branch: 'cloud/test',
      base: 'main',
    });

    expect(proxy).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ branch: 'cloud/test', created: true, sha: 'abc123' });
  });

  it('formatGitHubProxyError maps generic Axios 404 to reconnect copy', () => {
    const err = Object.assign(new Error('Request failed with status code 404'), {
      response: { status: 404, data: {} },
    });
    expect(
      formatGitHubProxyError(err, '/repos/Clivecchi/keeper-platform/contents/README.md'),
    ).toContain('GitHub is not connected in Nango');
  });

  it('formatGitHubProxyError maps GitHub file 404 without calling it a save failure', () => {
    const err = Object.assign(new Error('Request failed with status code 404'), {
      response: {
        status: 404,
        data: {
          message: 'Not Found',
          documentation_url: 'https://docs.github.com/rest/repos/contents',
        },
      },
    });
    const message = formatGitHubProxyError(
      err,
      '/repos/Clivecchi/keeper-platform/contents/apps/web/missing.ts',
    );
    expect(message).toContain('GitHub file not found: apps/web/missing.ts');
    expect(message).toContain('Clivecchi/keeper-platform');
    expect(isGitHubFileNotFoundError(new Error(message))).toBe(true);
  });

  it('formatGitHubProxyError maps missing branch refs', () => {
    const err = Object.assign(new Error('Request failed with status code 404'), {
      response: {
        status: 404,
        data: {
          message: 'Not Found',
          documentation_url: 'https://docs.github.com/rest/git/refs',
        },
      },
    });
    expect(
      formatGitHubProxyError(err, '/repos/Clivecchi/keeper-platform/git/ref/heads/main'),
    ).toContain('GitHub branch not found: main');
  });

  it('writeFile does not treat a dead Nango connection as a missing file', async () => {
    const proxy = vi.fn().mockRejectedValue(
      Object.assign(new Error('Request failed with status code 404'), {
        response: { status: 404, data: { error: { code: 'unknown_connection' } } },
      }),
    );
    nangoMock.getNango.mockReturnValue({ proxy });

    await expect(
      GitHubService.writeFile({
        repository: 'Clivecchi/keeper-platform',
        path: 'README.md',
        content: 'hello',
        branch: 'main',
      }),
    ).rejects.toThrow(/GitHub is not connected in Nango/);
    expect(proxy).toHaveBeenCalledTimes(1);
  });
});
