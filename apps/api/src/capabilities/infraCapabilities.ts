/**
 * Infrastructure capability identifiers — canonical strings for Railway, Vercel, GitHub access.
 * Seeded onto agent records and board defs as data; resolved at runtime.
 */

export const INFRA_CAPABILITIES = {
  RAILWAY_READ: 'infra.railway.read',
  RAILWAY_DEPLOY: 'infra.railway.deploy',
  VERCEL_READ: 'infra.vercel.read',
  VERCEL_DEPLOY: 'infra.vercel.deploy',
  GITHUB_READ: 'infra.github.read',
  GITHUB_WRITE: 'infra.github.write',
} as const;

export type InfraCapability = (typeof INFRA_CAPABILITIES)[keyof typeof INFRA_CAPABILITIES];

/** All six infra capability strings — IDE Board ceiling. */
export const ALL_INFRA_CAPABILITIES: readonly string[] = Object.values(INFRA_CAPABILITIES);

/** Read-only infra capabilities seeded on Cloud. */
export const CLOUD_INFRA_READ_CAPABILITIES: readonly string[] = [
  INFRA_CAPABILITIES.RAILWAY_READ,
  INFRA_CAPABILITIES.VERCEL_READ,
  INFRA_CAPABILITIES.GITHUB_READ,
];
