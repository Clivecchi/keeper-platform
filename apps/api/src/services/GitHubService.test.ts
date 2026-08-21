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
  encodeGitHubContentsPath,
  formatGitHubProxyError,
  isGitHubFileNotFoundError,
  nearbyGitHubPaths,
} from './GitHubService.js';

function githubContents404() {
  return Object.assign(new Error('Request failed with status code 404'), {
    response: {
      status: 404,
      data: {
        message: 'Not Found',
        documentation_url: 'https://docs.github.com/rest/repos/contents',
      },
    },
  });
}

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

  it('encodes nested contents paths so Nango does not drop extra slashes', () => {
    expect(encodeGitHubContentsPath('apps/web/src/components')).toBe(
      'apps%2Fweb%2Fsrc%2Fcomponents',
    );
  });

  it('ranks nearby sibling paths for a missed folder name', () => {
    expect(
      nearbyGitHubPaths(
        [
          { path: 'apps/web/src/components/agent' },
          { path: 'apps/web/src/components/boards' },
          { path: 'apps/web/src/components/frames' },
        ],
        'apps/web/src/components/board',
      )[0],
    ).toBe('apps/web/src/components/boards');
  });

  it('readRepository decodes base64 file content', async () => {
    const proxy = vi.fn().mockResolvedValue({
      data: { type: 'file', content: Buffer.from('hello').toString('base64'), encoding: 'base64' },
    });
    nangoMock.getNango.mockReturnValue({ proxy });

    const result = await GitHubService.readRepository({
      repository: 'Clivecchi/keeper-platform',
      path: 'README.md',
      mode: 'file',
    });
    expect(result.content).toBe('hello');
    expect(result.mode).toBe('file');
    expect(String(proxy.mock.calls[0]?.[0]?.endpoint)).toContain('/contents/README.md?ref=main');
  });

  it('readRepository lists a directory from GitHub contents array', async () => {
    const proxy = vi.fn().mockResolvedValue({
      data: [
        { type: 'dir', name: 'boards', path: 'apps/web/src/components/boards', sha: 'a' },
        { type: 'dir', name: 'frames', path: 'apps/web/src/components/frames', sha: 'b' },
      ],
    });
    nangoMock.getNango.mockReturnValue({ proxy });

    const result = await GitHubService.readRepository({
      repository: 'Clivecchi/keeper-platform',
      path: 'apps/web/src/components',
    });

    expect(result).toMatchObject({
      mode: 'dir',
      path: 'apps/web/src/components',
    });
    expect(result).toHaveProperty('entries');
    expect((result as { entries: Array<{ name: string }> }).entries.map((e) => e.name)).toEqual([
      'boards',
      'frames',
    ]);
    expect(String(proxy.mock.calls[0]?.[0]?.endpoint)).toContain(
      '/contents/apps%2Fweb%2Fsrc%2Fcomponents?ref=main',
    );
  });

  it('readRepository falls back to the git tree when nested contents 404', async () => {
    const proxy = vi
      .fn()
      .mockRejectedValueOnce(githubContents404('apps/web/src/components'))
      .mockResolvedValueOnce({ data: { object: { sha: 'commitsha' } } })
      .mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'apps/web/src/components', type: 'tree', sha: 'dirsha' },
            { path: 'apps/web/src/components/boards', type: 'tree', sha: 'boardssha' },
            { path: 'apps/web/src/components/frames', type: 'tree', sha: 'framessha' },
          ],
        },
      });
    nangoMock.getNango.mockReturnValue({ proxy });

    const result = await GitHubService.readRepository({
      repository: 'Clivecchi/keeper-platform',
      path: 'apps/web/src/components',
    });

    expect(result).toMatchObject({ mode: 'dir', path: 'apps/web/src/components' });
    expect((result as { entries: Array<{ name: string }> }).entries.map((e) => e.name)).toEqual([
      'boards',
      'frames',
    ]);
  });

  it('readRepository names nearby paths when a folder does not exist', async () => {
    const proxy = vi
      .fn()
      .mockRejectedValueOnce(githubContents404('apps/web/src/components/board'))
      .mockResolvedValueOnce({ data: { object: { sha: 'commitsha' } } })
      .mockResolvedValueOnce({
        data: {
          tree: [
            { path: 'apps/web/src/components', type: 'tree', sha: 'dirsha' },
            { path: 'apps/web/src/components/boards', type: 'tree', sha: 'boardssha' },
            { path: 'apps/web/src/components/frames', type: 'tree', sha: 'framessha' },
          ],
        },
      });
    nangoMock.getNango.mockReturnValue({ proxy });

    await expect(
      GitHubService.readRepository({
        repository: 'Clivecchi/keeper-platform',
        path: 'apps/web/src/components/board',
      }),
    ).rejects.toThrow(/Nearby in apps\/web\/src\/components: boards/);
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

  it('formatGitHubProxyError decodes encoded nested contents paths', () => {
    const err = Object.assign(new Error('Request failed with status code 404'), {
      response: {
        status: 404,
        data: {
          message: 'Not Found',
          documentation_url: 'https://docs.github.com/rest/repos/contents',
        },
      },
    });
    expect(
      formatGitHubProxyError(
        err,
        '/repos/Clivecchi/keeper-platform/contents/apps%2Fweb%2Fsrc%2Fcomponents',
      ),
    ).toContain('GitHub file not found: apps/web/src/components');
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
