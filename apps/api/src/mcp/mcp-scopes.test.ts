import { describe, expect, it } from 'vitest';
import { mcpListActions } from './core.js';
import { filterToolsByScopes, scopesAllowCapability } from './tools.js';

describe('MCP OAuth scope gating', () => {
  it('scopesAllowCapability treats * as full access', () => {
    expect(scopesAllowCapability(['*'], 'integrations.list')).toBe(true);
    expect(scopesAllowCapability(['*'], 'library.ro')).toBe(true);
  });

  it('library.rw implies library.ro', () => {
    expect(scopesAllowCapability(['library.rw'], 'library.ro')).toBe(true);
    expect(scopesAllowCapability(['library.rw'], 'gloss.rw')).toBe(false);
  });

  it('filters tools/list to library + gloss for Claude OAuth grants', () => {
    const names = filterToolsByScopes(['library.ro', 'gloss.rw']).map((t) => t.name);
    expect(names).toContain('library_list');
    expect(names).toContain('library_search');
    expect(names).toContain('gloss_write_turn');
    expect(names).not.toContain('integrations_list');
    expect(names).not.toContain('github_repo_read');
    expect(names).not.toContain('railway_get_services');
  });

  it('mcpListActions with library.ro hides infra tools Claude was approving', () => {
    const { actions } = mcpListActions(['library.ro']);
    const names = actions.map((a) => a.name);
    expect(names).toEqual(
      expect.arrayContaining(['library_list', 'library_get', 'library_search']),
    );
    expect(names).not.toContain('integrations_list');
  });

  it('platform * still lists full catalog', () => {
    const { actions } = mcpListActions(['*']);
    expect(actions.length).toBeGreaterThan(10);
    expect(actions.map((a) => a.name)).toContain('integrations_list');
  });
});
