import { describe, expect, it } from 'vitest';
import { DEFAULT_POLICY_PACK_V1 } from './policyPack.js';
import {
  GOLDEN_PATH_ACTIONS,
  KIP_ACTION_HANDLERS,
  buildAllowedActions,
  buildKipActionAllowlistStatus,
} from './kipActionAllowlist.js';

describe('kipActionAllowlist', () => {
  it('golden path always includes draft.create and dialog.read even if policy omits them', () => {
    const allowed = buildAllowedActions({
      policyPack: { actions: { allow: ['journey.read'] } },
    });
    expect(allowed.has('draft.create')).toBe(true);
    expect(allowed.has('dialog.read')).toBe(true);
    expect(allowed.has('journey.read')).toBe(true);
  });

  it('does not put mcp.call on the Lead allowlist', () => {
    const allowed = buildAllowedActions(null);
    expect(allowed.has('mcp.call')).toBe(false);
  });

  it('adds delegate.consult only when a domain agent roster is present', () => {
    expect(buildAllowedActions(null).has('delegate.consult')).toBe(false);
    expect(
      buildAllowedActions({ domainAgents: [{ slug: 'cloud' }] }).has('delegate.consult'),
    ).toBe(true);
  });

  it('status reports canDraft as null when unresolved', () => {
    const status = buildKipActionAllowlistStatus();
    expect(status.surface).toBe('kip_action_allowlist');
    expect(status.canDraft).toBeNull();
    expect(status.goldenPath).toEqual([...GOLDEN_PATH_ACTIONS]);
    expect(status.policyAllow).toEqual([...DEFAULT_POLICY_PACK_V1.actions.allow]);
    expect(status.handlers).toEqual([...KIP_ACTION_HANDLERS]);
    expect(status.handlersNotAllowed).toContain('mcp.call');
    expect(status.allowed).toContain('draft.create');
    expect(status.allowed).not.toContain('mcp.call');
    expect(status.delegateConsult).toBe('not_applicable');
  });

  it('status records canDraft when the session is bound', () => {
    const denied = buildKipActionAllowlistStatus({ canDraft: false });
    expect(denied.canDraft).toBe(false);
    expect(denied.canDraftNote).toContain('canDraft=false');
    const granted = buildKipActionAllowlistStatus({ canDraft: true });
    expect(granted.canDraft).toBe(true);
  });
});
