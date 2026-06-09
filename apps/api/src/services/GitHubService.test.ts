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

import { GitHubService } from './GitHubService.js';

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
});
