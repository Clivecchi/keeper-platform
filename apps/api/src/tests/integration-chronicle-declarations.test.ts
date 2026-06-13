import { describe, it, expect } from 'vitest';
import {
  INTEGRATION_CHRONICLE_DECLARATIONS,
  resolveIntegrationDeclarationBackfill,
  resolveIntegrationDeclarationForCreate,
  resolveKeyChronicleDefaults,
  resolveKeyDeclarationBackfill,
} from '@keeper/shared';

describe('@keeper/shared integrationChronicleDeclarations', () => {
  it('returns full declaration on create for known services', () => {
    const created = resolveIntegrationDeclarationForCreate('railway');
    expect(created.display_label).toBe('Railway');
    expect(created.chronicle_blocks).toContain('deployment_feed');
  });

  it('backfills empty integration declaration columns only', () => {
    const patch = resolveIntegrationDeclarationBackfill('anthropic', {
      chronicle_blocks: [],
      display_label: 'Custom Anthropic',
      description: null,
    });
    expect(patch.chronicle_blocks).toEqual(
      INTEGRATION_CHRONICLE_DECLARATIONS.anthropic.chronicle_blocks,
    );
    expect(patch.display_label).toBeUndefined();
    expect(patch.description).toBe(INTEGRATION_CHRONICLE_DECLARATIONS.anthropic.description);
  });

  it('resolves key defaults from provider slug', () => {
    const defaults = resolveKeyChronicleDefaults('openai');
    expect(defaults.display_label).toBe('OpenAI Key');
    expect(defaults.chronicle_actions).toContain('verify');
  });

  it('backfills empty key declaration columns only', () => {
    const patch = resolveKeyDeclarationBackfill('openai', {
      chronicle_blocks: [],
      display_label: 'My OpenAI Key',
    });
    expect(patch.chronicle_blocks?.length).toBeGreaterThan(0);
    expect(patch.display_label).toBeUndefined();
  });
});
