/**
 * Minimal operational bindings per integration service — domain-scoped resource pointers.
 * Chronicle Manage surfaces edit these; API resolvers inject them into feeds and MCP tools.
 */

export type GitHubServiceBinding = {
  repository: string;
  defaultBranch: string;
};

export type DomainServiceBindings = {
  github?: GitHubServiceBinding;
};

export type ServiceBindingFieldDef = {
  key: string;
  label: string;
  placeholder: string;
  required: boolean;
};

export const GITHUB_SERVICE_BINDING_FIELDS: readonly ServiceBindingFieldDef[] = [
  {
    key: 'repository',
    label: 'Repository',
    placeholder: 'owner/repo',
    required: true,
  },
  {
    key: 'defaultBranch',
    label: 'Default branch',
    placeholder: 'main',
    required: true,
  },
] as const;

const REPO_SLUG_PATTERN = /^[^/\s]+\/[^/\s]+$/;

export function hasServiceBindingConfig(service: string): boolean {
  return service === 'github';
}

export function getServiceBindingFieldDefs(service: string): readonly ServiceBindingFieldDef[] {
  if (service === 'github') return GITHUB_SERVICE_BINDING_FIELDS;
  return [];
}

export function isUsableGitHubRepository(value: string | undefined | null): value is string {
  return Boolean(value && REPO_SLUG_PATTERN.test(value.trim()));
}

export function parseGitHubServiceBinding(value: unknown): GitHubServiceBinding | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const repository =
    typeof row.repository === 'string'
      ? row.repository.trim()
      : typeof row.activeRepository === 'string'
        ? row.activeRepository.trim()
        : '';
  const defaultBranch =
    typeof row.defaultBranch === 'string'
      ? row.defaultBranch.trim()
      : typeof row.activeBranch === 'string'
        ? row.activeBranch.trim()
        : '';

  if (!isUsableGitHubRepository(repository) || !defaultBranch) return null;
  return { repository, defaultBranch };
}

export function parseIntegrationServiceBinding(
  service: string,
  metadata: unknown,
): GitHubServiceBinding | null {
  if (service !== 'github') return null;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const binding = (metadata as Record<string, unknown>).binding;
  return parseGitHubServiceBinding(binding);
}

export function parseDomainServiceBindings(settings: unknown): DomainServiceBindings {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return {};
  const root = settings as Record<string, unknown>;
  const raw =
    root.serviceBindings && typeof root.serviceBindings === 'object' && !Array.isArray(root.serviceBindings)
      ? (root.serviceBindings as Record<string, unknown>)
      : null;
  const github = raw ? parseGitHubServiceBinding(raw.github) : null;
  const ideBuild =
    root.ideBuildContext && typeof root.ideBuildContext === 'object' && !Array.isArray(root.ideBuildContext)
      ? parseGitHubServiceBinding(root.ideBuildContext)
      : null;
  return {
    ...(github ? { github } : {}),
    ...(!github && ideBuild ? { github: ideBuild } : {}),
  };
}

export function validateGitHubBindingFields(
  fields: Record<string, string>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  const repository = fields.repository?.trim() ?? '';
  const defaultBranch = fields.defaultBranch?.trim() ?? '';

  if (!repository) {
    errors.repository = 'Repository is required (owner/repo).';
  } else if (!isUsableGitHubRepository(repository)) {
    errors.repository = 'Use owner/repo format, e.g. Clivecchi/keeper-platform.';
  }

  if (!defaultBranch) {
    errors.defaultBranch = 'Default branch is required.';
  }

  return errors;
}

export function githubBindingToFieldValues(
  binding: GitHubServiceBinding | null,
  defaults?: { repository: string; defaultBranch: string },
): Record<string, string> {
  return {
    repository: binding?.repository ?? defaults?.repository ?? '',
    defaultBranch: binding?.defaultBranch ?? defaults?.defaultBranch ?? 'main',
  };
}
