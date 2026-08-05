import { describe, expect, it } from 'vitest';
import { mcpListActions } from './core.js';
import {
  buildCapabilitiesManifest,
  filterToolsByScopes,
  scopesAllowCapability,
} from './tools.js';

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
    expect(names).toContain('capabilities_list');
    expect(names).toContain('library_list');
    expect(names).toContain('library_search');
    expect(names).toContain('gloss_write_turn');
    expect(names).not.toContain('dialog_list');
    expect(names).not.toContain('integrations_list');
    expect(names).not.toContain('github_repo_read');
    expect(names).not.toContain('railway_get_services');
  });

  it('exposes dialog tools when dialog.ro is granted', () => {
    const names = filterToolsByScopes(['library.ro', 'dialog.ro', 'gloss.rw']).map(
      (t) => t.name,
    );
    expect(names).toEqual(
      expect.arrayContaining([
        'capabilities_list',
        'library_list',
        'dialog_list',
        'dialog_search',
        'dialog_read',
        'gloss_write_turn',
      ]),
    );
    expect(names).not.toContain('integrations_list');
  });

  it('mcpListActions with library.ro hides infra tools Claude was approving', () => {
    const { actions } = mcpListActions(['library.ro']);
    const names = actions.map((a) => a.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'capabilities_list',
        'library_list',
        'library_get',
        'library_search',
      ]),
    );
    expect(names).not.toContain('integrations_list');
  });

  it('platform * still lists full catalog', () => {
    const { actions } = mcpListActions(['*']);
    expect(actions.length).toBeGreaterThan(10);
    expect(actions.map((a) => a.name)).toContain('integrations_list');
    expect(actions.map((a) => a.name)).toContain('capabilities_list');
  });

  it('capabilities_list manifest marks dialog.ro as not granted when missing', async () => {
    const manifest = await buildCapabilitiesManifest({
      scopes: ['library.ro', 'gloss.rw'],
      domainId: null,
    });
    expect(manifest.granted).toEqual(['library.ro', 'gloss.rw']);
    expect(manifest.denied).toContain('dialog.ro');
    expect(manifest.capabilities).toContain('dialog.ro: not granted');
    expect(manifest.capabilities).toContain('library.ro');
    expect(manifest.tools).toContain('capabilities_list');
    expect(manifest.tools).not.toContain('dialog_read');
  });
});
