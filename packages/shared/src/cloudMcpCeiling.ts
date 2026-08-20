/**
 * Cloud MCP capability ceiling — what Cloud may invoke via mcp.call.
 * Declared on Cloud's agent record and on Build Board allowedCapabilities.
 * Not an "IDE" identity.
 */

export const CLOUD_MCP_CEILING = [
  'infra.railway.read',
  'infra.railway.deploy',
  'infra.vercel.read',
  'infra.vercel.deploy',
  'infra.github.read',
  'infra.github.write',
  'infra.nango.read',
  'infra.resend.read',
  'github.repo.read',
  'github.commits.list',
  'github.branch.create',
  'github.file.write',
  'github.pr.create',
  'github.pr.read',
  'github.actions.status',
  'integrations.list',
  'nango.status.read',
  'resend.status.read',
  'library.ro',
  'gloss.rw',
] as const;

export type CloudMcpCapability = (typeof CLOUD_MCP_CEILING)[number];
