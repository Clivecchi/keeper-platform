import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  assertClaudeSafeToolNames,
  callTool,
  getSchema,
  getToolNames,
  resolveToolName,
} from './tools.js';
import { GITHUB_MCP_TOOL_CAPABILITIES } from '../capabilities/infraCapabilities.js';

const githubMock = vi.hoisted(() => ({
  readRepository: vi.fn(),
  listCommits: vi.fn(),
  createBranch: vi.fn(),
  writeFile: vi.fn(),
  createPullRequest: vi.fn(),
  readPullRequest: vi.fn(),
  getActionsStatus: vi.fn(),
}));

vi.mock('../services/GitHubService.js', () => ({
  GitHubService: githubMock,
}));

describe('GitHub MCP tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    githubMock.readRepository.mockResolvedValue({
      repository: 'Clivecchi/keeper-platform',
      path: 'README.md',
      mode: 'file',
      content: '# Keeper',
    });
    githubMock.createBranch.mockResolvedValue({
      repository: 'Clivecchi/keeper-platform',
      branch: 'cloud/test-branch',
      base: 'main',
      created: true,
    });
  });

  it('registers all seven GitHub MCP tools in schema (Claude-safe underscore names)', () => {
    const names = getSchema().tools.map((t) => t.name);
    for (const capability of GITHUB_MCP_TOOL_CAPABILITIES) {
      expect(names).toContain(resolveToolName(capability));
    }
    expect(() => assertClaudeSafeToolNames(names)).not.toThrow();
  });

  it('github_repo_read returns file contents (dotted alias still works)', async () => {
    const result = await callTool(
      'github.repo.read',
      { repository: 'Clivecchi/keeper-platform', path: 'README.md' },
      { domainId: null, agentCapabilities: ['github.repo.read'] },
    );
    expect(githubMock.readRepository).toHaveBeenCalled();
    expect(result).toMatchObject({ content: '# Keeper', mode: 'file' });
  });

  it('github_branch_create creates a branch', async () => {
    const result = await callTool(
      'github_branch_create',
      {
        repository: 'Clivecchi/keeper-platform',
        branch: 'cloud/test-branch',
        base: 'main',
      },
      { domainId: null, agentCapabilities: ['github.branch.create'] },
    );
    expect(githubMock.createBranch).toHaveBeenCalledWith(
      expect.objectContaining({ branch: 'cloud/test-branch', base: 'main' }),
      null,
    );
    expect(result).toMatchObject({ branch: 'cloud/test-branch', created: true });
  });

  it('rejects unknown github tool names', async () => {
    await expect(callTool('github.unknown', {}, { domainId: null })).rejects.toThrow(
      'Unknown tool',
    );
  });

  it('getToolNames includes github tools without removing railway or vercel', () => {
    const names = getToolNames();
    expect(names).toContain('railway_get_services');
    expect(names).toContain('vercel_get_deployments');
    expect(names).toContain('github_repo_read');
    expect(names).not.toContain('github.repo.read');
  });
});
