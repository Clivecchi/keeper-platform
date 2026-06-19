/**
 * Infrastructure capability identifiers — canonical strings for Railway, Vercel, GitHub, Nango, Resend.
 * Seeded onto agent records and board defs as data; resolved at runtime.
 */

export const INFRA_CAPABILITIES = {
  RAILWAY_READ: 'infra.railway.read',
  RAILWAY_DEPLOY: 'infra.railway.deploy',
  VERCEL_READ: 'infra.vercel.read',
  VERCEL_DEPLOY: 'infra.vercel.deploy',
  GITHUB_READ: 'infra.github.read',
  GITHUB_WRITE: 'infra.github.write',
  NANGO_READ: 'infra.nango.read',
  RESEND_READ: 'infra.resend.read',
} as const;

export type InfraCapability = (typeof INFRA_CAPABILITIES)[keyof typeof INFRA_CAPABILITIES];

/** Base infra capability strings (policy / requireCapability on REST routes). */
export const ALL_INFRA_CAPABILITIES: readonly string[] = Object.values(INFRA_CAPABILITIES);

/** GitHub MCP tool capability strings — one per registered tool. */
export const GITHUB_MCP_TOOL_CAPABILITIES: readonly string[] = [
  'github.repo.read',
  'github.commits.list',
  'github.branch.create',
  'github.file.write',
  'github.pr.create',
  'github.pr.read',
  'github.actions.status',
];

/** Integration / Nango / Resend MCP tool capability strings. */
export const INTEGRATION_MCP_TOOL_CAPABILITIES: readonly string[] = [
  'integrations.list',
  'nango.status.read',
  'resend.status.read',
];

/** IDE board ceiling — infra + all MCP tool capabilities Cloud may invoke. */
export const IDE_BOARD_MCP_CEILING: readonly string[] = [
  ...ALL_INFRA_CAPABILITIES,
  ...GITHUB_MCP_TOOL_CAPABILITIES,
  ...INTEGRATION_MCP_TOOL_CAPABILITIES,
];

/** Read-only infra capabilities seeded on Cloud. */
export const CLOUD_INFRA_READ_CAPABILITIES: readonly string[] = [
  INFRA_CAPABILITIES.RAILWAY_READ,
  INFRA_CAPABILITIES.VERCEL_READ,
  INFRA_CAPABILITIES.GITHUB_READ,
  INFRA_CAPABILITIES.NANGO_READ,
  INFRA_CAPABILITIES.RESEND_READ,
];

/** Full Cloud infra + MCP capability set. */
export const CLOUD_AGENT_CAPABILITIES: readonly string[] = [
  ...CLOUD_INFRA_READ_CAPABILITIES,
  INFRA_CAPABILITIES.GITHUB_WRITE,
  ...GITHUB_MCP_TOOL_CAPABILITIES,
  ...INTEGRATION_MCP_TOOL_CAPABILITIES,
];
