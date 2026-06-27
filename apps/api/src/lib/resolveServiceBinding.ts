/**
 * Resolve domain-scoped service bindings for Chronicle feeds, MCP tools, and agent context.
 */

import { prisma } from '@keeper/database';
import {
  parseDomainServiceBindings,
  parseGitHubServiceBinding,
  parseIntegrationServiceBinding,
  type GitHubServiceBinding,
} from '@keeper/shared';
import { findConnectedPlatformIntegration, parseGatewayMetadata, toPrismaIntegrationMetadata } from './integrationCatalog.js';

const ENV_DEFAULT_REPOSITORY =
  process.env.GITHUB_DEFAULT_REPOSITORY?.trim() || 'Clivecchi/keeper-platform';
const ENV_DEFAULT_BRANCH = process.env.GITHUB_DEFAULT_BRANCH?.trim() || 'main';

export function defaultGitHubBinding(): GitHubServiceBinding {
  const [owner, repo] = ENV_DEFAULT_REPOSITORY.split('/');
  if (owner && repo) {
    return { repository: ENV_DEFAULT_REPOSITORY, defaultBranch: ENV_DEFAULT_BRANCH };
  }
  return { repository: 'Clivecchi/keeper-platform', defaultBranch: 'main' };
}

async function loadDomainSettings(domainId: string): Promise<Record<string, unknown>> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  if (!domain?.settings || typeof domain.settings !== 'object' || Array.isArray(domain.settings)) {
    return {};
  }
  return domain.settings as Record<string, unknown>;
}

export async function resolveGitHubBinding(domainId: string | null | undefined): Promise<GitHubServiceBinding> {
  if (domainId) {
    const settings = await loadDomainSettings(domainId);
    const fromDomain = parseDomainServiceBindings(settings).github;
    if (fromDomain) return fromDomain;
  }

  try {
    const integration = await findConnectedPlatformIntegration('github');
    const metadata = parseGatewayMetadata(integration?.metadata);
    const fromIntegration = parseIntegrationServiceBinding('github', metadata);
    if (fromIntegration) return fromIntegration;
  } catch {
    // fall through to env default
  }

  return defaultGitHubBinding();
}

export async function mergeGitHubToolArgs(
  args: Record<string, unknown>,
  domainId: string | null | undefined,
): Promise<Record<string, unknown>> {
  const binding = await resolveGitHubBinding(domainId);
  const merged: Record<string, unknown> = { ...args };

  if (
    typeof merged.repository !== 'string' &&
    !(typeof merged.owner === 'string' && typeof merged.repo === 'string')
  ) {
    merged.repository = binding.repository;
  }

  const branchKeys = ['branch', 'ref'] as const;
  const hasBranch = branchKeys.some((key) => typeof merged[key] === 'string' && String(merged[key]).trim());
  if (!hasBranch) {
    merged.branch = binding.defaultBranch;
  }

  const baseKeys = ['base', 'baseBranch'] as const;
  const hasBase = baseKeys.some((key) => typeof merged[key] === 'string' && String(merged[key]).trim());
  if (!hasBase && typeof merged.base !== 'string') {
    merged.base = binding.defaultBranch;
  }

  return merged;
}

export async function persistGitHubBinding(
  domainId: string,
  binding: GitHubServiceBinding,
): Promise<void> {
  const domain = await prisma.domain.findUnique({
    where: { id: domainId },
    select: { settings: true },
  });
  if (!domain) {
    throw new Error('Domain not found');
  }

  const existingSettings =
    domain.settings && typeof domain.settings === 'object' && !Array.isArray(domain.settings)
      ? (domain.settings as Record<string, unknown>)
      : {};

  const existingServiceBindings =
    existingSettings.serviceBindings &&
    typeof existingSettings.serviceBindings === 'object' &&
    !Array.isArray(existingSettings.serviceBindings)
      ? (existingSettings.serviceBindings as Record<string, unknown>)
      : {};

  const existingIdeBuild =
    existingSettings.ideBuildContext &&
    typeof existingSettings.ideBuildContext === 'object' &&
    !Array.isArray(existingSettings.ideBuildContext)
      ? (existingSettings.ideBuildContext as Record<string, unknown>)
      : {};

  const nextSettings: Record<string, unknown> = {
    ...existingSettings,
    serviceBindings: {
      ...existingServiceBindings,
      github: binding,
    },
    ideBuildContext: {
      ...existingIdeBuild,
      activeRepository: binding.repository,
      activeBranch: binding.defaultBranch,
    },
  };

  await prisma.domain.update({
    where: { id: domainId },
    data: {
      settings: JSON.parse(JSON.stringify(nextSettings)) as object,
    },
  });
}

export async function mirrorGitHubBindingOnIntegration(binding: GitHubServiceBinding): Promise<void> {
  const integration = await findConnectedPlatformIntegration('github');
  if (!integration) return;

  const metadata = parseGatewayMetadata(integration.metadata) ?? {};
  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      metadata: toPrismaIntegrationMetadata({
        ...metadata,
        binding,
      }),
    },
  });
}

export function parseGitHubBindingPatch(value: unknown): GitHubServiceBinding | null {
  return parseGitHubServiceBinding(value);
}
