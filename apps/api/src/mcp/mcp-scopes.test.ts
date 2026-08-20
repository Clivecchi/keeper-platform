import { describe, expect, it } from 'vitest';
import { mcpListActions } from './core.js';
import {
  buildCapabilitiesManifest,
  callTool,
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
    expect(names).toContain('kip_actions_list');
    expect(names).toContain('cloud_ceiling_list');
    expect(names).toContain('capability_ledger');
    expect(names).toContain('library_list');
    expect(names).toContain('library_search');
    expect(names).toContain('gloss_write_turn');
    expect(names).not.toContain('dialog_list');
    expect(names).not.toContain('integrations_list');
    expect(names).not.toContain('github_repo_read');
    expect(names).not.toContain('railway_get_services');
  });

  it('empty scoped token still sees the four self-check tools', () => {
    const names = filterToolsByScopes([]).map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'capabilities_list',
        'kip_actions_list',
        'cloud_ceiling_list',
        'capability_ledger',
      ]),
    );
    expect(names).not.toContain('library_list');
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

  it('dialog.rw implies dialog.ro and exposes dialog_ingest', () => {
    const names = filterToolsByScopes(['dialog.rw']).map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining(['dialog_list', 'dialog_read', 'dialog_ingest']),
    );
    expect(filterToolsByScopes(['dialog.ro']).map((t) => t.name)).not.toContain(
      'dialog_ingest',
    );
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
    expect(manifest.tools).toContain('kip_actions_list');
    expect(manifest.tools).toContain('cloud_ceiling_list');
    expect(manifest.tools).toContain('capability_ledger');
    expect(manifest.tools).not.toContain('dialog_read');
  });

  it('kip_actions_list returns the Lead allowlist without mcp.call', async () => {
    const status = (await callTool('kip_actions_list', {}, { domainId: null })) as {
      surface: string;
      allowed: string[];
      canDraft: boolean | null;
    };
    expect(status.surface).toBe('kip_action_allowlist');
    expect(status.allowed).toContain('draft.create');
    expect(status.allowed).not.toContain('mcp.call');
    expect(status.canDraft).toBeNull();
  });

  it('cloud_ceiling_list returns the declared Cloud ceiling', async () => {
    const status = (await callTool('cloud_ceiling_list', {}, { domainId: null })) as {
      surface: string;
      boardId: string;
      ceiling: string[];
      granted: string[] | null;
    };
    expect(status.surface).toBe('cloud_mcp_ceiling');
    expect(status.boardId).toBe('build');
    expect(status.ceiling).toContain('infra.railway.read');
    expect(status.ceiling).toContain('github.repo.read');
    expect(status.granted).toBeNull();
  });

  it('capability_ledger aggregates the Phase 1 slices', async () => {
    const ledger = (await callTool('capability_ledger', {}, { domainId: null })) as {
      surface: string;
      phase: number;
      mcp: { tools: string[]; note: string };
      kipActions: { surface: string; allowed: string[] };
      cloudCeiling: { surface: string; ceiling: string[] };
      keyStores: { status: string };
    };
    expect(ledger.surface).toBe('capability_ledger');
    expect(ledger.phase).toBe(2);
    expect(ledger.mcp.tools).toContain('capability_ledger');
    expect(ledger.kipActions.surface).toBe('kip_action_allowlist');
    expect(ledger.kipActions.allowed).toContain('draft.create');
    expect(ledger.kipActions.allowed).not.toContain('mcp.call');
    expect(ledger.cloudCeiling.surface).toBe('cloud_mcp_ceiling');
    expect(ledger.cloudCeiling.ceiling).toContain('infra.railway.read');
    expect(ledger.keyStores.status).toBe('not_aggregated');
  });
});
