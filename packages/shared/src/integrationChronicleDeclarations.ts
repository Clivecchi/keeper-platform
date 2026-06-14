/**
 * Integration and Key Chronicle declaration defaults — single source for API, seeds, and web.
 */

export type IntegrationChronicleDeclaration = {
  display_label: string;
  description: string;
  connect_copy: string;
  is_gateway: boolean;
  chronicle_blocks: string[];
  chronicle_actions: string[];
};

export const INTEGRATION_CHRONICLE_DECLARATIONS: Record<string, IntegrationChronicleDeclaration> =
  {
    railway: {
      display_label: 'Railway',
      description: 'Infrastructure hosting — services, deployments, and logs',
      connect_copy: 'Connect Railway to monitor deployments and manage services from Chronicle',
      is_gateway: false,
      chronicle_blocks: ['connection_status', 'deployment_feed'],
      chronicle_actions: ['view_logs', 'redeploy', 'disconnect'],
    },
    vercel: {
      display_label: 'Vercel',
      description: 'Frontend deployments and build pipeline',
      connect_copy: 'Connect Vercel to track deployments and access build logs from Chronicle',
      is_gateway: false,
      chronicle_blocks: ['connection_status', 'deployment_feed'],
      chronicle_actions: ['open_deployment', 'view_build_logs', 'redeploy', 'disconnect'],
    },
    github: {
      display_label: 'GitHub',
      description: 'Source control — commits, pull requests, and branches',
      connect_copy: 'Connect GitHub to surface repository activity in Chronicle',
      is_gateway: false,
      chronicle_blocks: ['connection_status', 'repository_activity'],
      chronicle_actions: ['view_on_github', 'create_branch', 'open_pr', 'disconnect'],
    },
    anthropic: {
      display_label: 'Anthropic',
      description: 'Claude models — powers Kip and platform AI capabilities',
      connect_copy: 'Add an Anthropic API key to enable Claude-powered agents',
      is_gateway: false,
      chronicle_blocks: ['connection_status', 'key_health', 'linked_agents'],
      chronicle_actions: ['test_provider', 'manage_keys', 'disconnect'],
    },
    openai: {
      display_label: 'OpenAI',
      description: 'GPT models — available for agent configuration',
      connect_copy: 'Add an OpenAI API key to enable GPT-powered agents',
      is_gateway: false,
      chronicle_blocks: ['connection_status', 'key_health', 'linked_agents'],
      chronicle_actions: ['test_provider', 'manage_keys', 'disconnect'],
    },
    'together-ai': {
      display_label: 'Together AI',
      description: 'Open model catalog — image generation, JSON, and agent chat',
      connect_copy: 'Add a Together AI API key to access the open model catalog',
      is_gateway: true,
      chronicle_blocks: ['connection_status', 'key_health', 'model_catalog', 'linked_agents'],
      chronicle_actions: ['test_provider', 'refresh_models', 'manage_keys', 'disconnect'],
    },
    elevenlabs: {
      display_label: 'ElevenLabs',
      description: 'Voice synthesis — powers agent voice capabilities',
      connect_copy: 'Add an ElevenLabs API key to enable voice for agents',
      is_gateway: false,
      chronicle_blocks: ['connection_status', 'key_health', 'linked_agents'],
      chronicle_actions: ['test_provider', 'manage_keys', 'disconnect'],
    },
  };

export const DEFAULT_KEY_CHRONICLE_BLOCKS: readonly string[] = [
  'connection_status',
  'key_health',
  'linked_agents',
];

export const DEFAULT_KEY_CHRONICLE_ACTIONS: readonly string[] = ['verify', 'rotate', 'revoke'];

export function getIntegrationChronicleDeclaration(
  service: string,
): IntegrationChronicleDeclaration | null {
  return INTEGRATION_CHRONICLE_DECLARATIONS[service] ?? null;
}

/** Full declaration columns applied on Integration create when a known service slug exists. */
export function resolveIntegrationDeclarationForCreate(
  service: string,
): IntegrationChronicleDeclaration | Record<string, never> {
  return getIntegrationChronicleDeclaration(service) ?? {};
}

export type IntegrationDeclarationRow = {
  chronicle_blocks?: string[];
  chronicle_actions?: string[];
  display_label?: string | null;
  description?: string | null;
  connect_copy?: string | null;
  is_gateway?: boolean;
};

/** Backfill empty declaration columns on existing Integration rows (idempotent). */
export function resolveIntegrationDeclarationBackfill(
  service: string,
  existing: IntegrationDeclarationRow,
): Partial<IntegrationChronicleDeclaration> {
  const declaration = getIntegrationChronicleDeclaration(service);
  if (!declaration) return {};

  const patch: Partial<IntegrationChronicleDeclaration> = {};
  if (!existing.chronicle_blocks?.length) {
    patch.chronicle_blocks = declaration.chronicle_blocks;
  }
  if (!existing.chronicle_actions?.length) {
    patch.chronicle_actions = declaration.chronicle_actions;
  }
  if (!existing.display_label?.trim()) {
    patch.display_label = declaration.display_label;
  }
  if (!existing.description?.trim()) {
    patch.description = declaration.description;
  }
  if (!existing.connect_copy?.trim()) {
    patch.connect_copy = declaration.connect_copy;
  }
  if (declaration.is_gateway && !existing.is_gateway) {
    patch.is_gateway = true;
  }
  return patch;
}

export type KeyChronicleDefaults = {
  chronicle_blocks: string[];
  chronicle_actions: string[];
  display_label: string;
  description: string | null;
};

export function resolveKeyChronicleDefaults(provider: string): KeyChronicleDefaults {
  const integrationDecl = getIntegrationChronicleDeclaration(provider);
  return {
    chronicle_blocks: [...DEFAULT_KEY_CHRONICLE_BLOCKS],
    chronicle_actions: [...DEFAULT_KEY_CHRONICLE_ACTIONS],
    display_label: integrationDecl ? `${integrationDecl.display_label} Key` : `${provider} Key`,
    description: integrationDecl?.description ?? null,
  };
}

export type KeyDeclarationRow = {
  chronicle_blocks?: string[];
  chronicle_actions?: string[];
  display_label?: string | null;
  description?: string | null;
};

/** Backfill empty Key declaration columns (idempotent). */
export function resolveKeyDeclarationBackfill(
  provider: string,
  existing: KeyDeclarationRow,
): Partial<KeyChronicleDefaults> {
  const defaults = resolveKeyChronicleDefaults(provider);
  const patch: Partial<KeyChronicleDefaults> = {};
  if (!existing.chronicle_blocks?.length) {
    patch.chronicle_blocks = defaults.chronicle_blocks;
  }
  if (!existing.chronicle_actions?.length) {
    patch.chronicle_actions = defaults.chronicle_actions;
  }
  if (!existing.display_label?.trim()) {
    patch.display_label = defaults.display_label;
  }
  if (!existing.description?.trim()) {
    patch.description = defaults.description;
  }
  return patch;
}

export type CapabilityKind = 'infra' | 'tool' | 'permission' | 'action';

export const DEFAULT_CAPABILITY_CHRONICLE_BLOCKS: readonly string[] = ['definition', 'used_by'];

export const DEFAULT_CAPABILITY_CHRONICLE_ACTIONS: readonly string[] = [];

export type CapabilityChronicleDefaults = {
  chronicle_blocks: string[];
  chronicle_actions: string[];
};

/** Default Chronicle blocks for Capability EntityKind — same for all kinds in Pass 1. */
export function resolveCapabilityChronicleDefaults(
  _kind: CapabilityKind,
): CapabilityChronicleDefaults {
  return {
    chronicle_blocks: [...DEFAULT_CAPABILITY_CHRONICLE_BLOCKS],
    chronicle_actions: [...DEFAULT_CAPABILITY_CHRONICLE_ACTIONS],
  };
}

export type CapabilityDeclarationRow = {
  chronicle_blocks?: string[];
  chronicle_actions?: string[];
  display_label?: string | null;
  description?: string | null;
};

/** Backfill empty Capability declaration columns (idempotent). */
export function resolveCapabilityDeclarationBackfill(
  kind: CapabilityKind,
  existing: CapabilityDeclarationRow,
): Partial<CapabilityChronicleDefaults> {
  const defaults = resolveCapabilityChronicleDefaults(kind);
  const patch: Partial<CapabilityChronicleDefaults> = {};
  if (!existing.chronicle_blocks?.length) {
    patch.chronicle_blocks = defaults.chronicle_blocks;
  }
  if (!existing.chronicle_actions?.length) {
    patch.chronicle_actions = defaults.chronicle_actions;
  }
  return patch;
}
