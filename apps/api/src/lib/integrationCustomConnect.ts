/**
 * Custom integration connect — env token verification (no Nango OAuth).
 * Railway probe uses the same GraphQL host + auth headers as RailwayService.
 */

import { RAILWAY_GRAPHQL_URL, railwayGraphql } from './railwayGraphql.js';

const RAILWAY_CONNECT_PROBE_QUERY = `query IntegrationConnectProbe($projectId: String!) {
  project(id: $projectId) {
    id
  }
}`;

export type RailwayConnectVerifyResult =
  | { ok: true }
  | { ok: false; error: string; hint?: string };

/**
 * Verify platform Railway credentials: env vars + GraphQL reachability + log read.
 * "Connected" means Cloud can pull deploymentLogs, not only list the project.
 */
export async function verifyRailwayCustomConnect(): Promise<RailwayConnectVerifyResult> {
  const token = process.env.RAILWAY_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      error: 'RAILWAY_TOKEN is not configured',
      hint: 'Add RAILWAY_TOKEN to your Railway API environment variables.',
    };
  }

  const projectId = process.env.RAILWAY_PROJECT_ID?.trim();
  if (!projectId) {
    return {
      ok: false,
      error: 'RAILWAY_PROJECT_ID is not configured',
      hint: 'Add RAILWAY_PROJECT_ID to your Railway API environment variables.',
    };
  }

  try {
    const projectData = await railwayGraphql<{ project?: { id?: string } | null }>(
      RAILWAY_CONNECT_PROBE_QUERY,
      { projectId },
    );

    if (!projectData.project?.id) {
      return {
        ok: false,
        error: 'Railway API did not return project data for RAILWAY_PROJECT_ID',
        hint: 'Confirm RAILWAY_PROJECT_ID matches an accessible Railway project.',
      };
    }

    // Prove log access — services/deployments alone were green while deploymentLogs failed.
    const deploymentsData = await railwayGraphql<{
      deployments?: {
        edges?: Array<{ node?: { id?: string } | null } | null> | null;
      } | null;
    }>(
      `query ConnectProbeDeployments($projectId: String!, $first: Int!) {
        deployments(input: { projectId: $projectId }, first: $first) {
          edges {
            node {
              id
            }
          }
        }
      }`,
      { projectId, first: 1 },
    );

    const deploymentId = deploymentsData.deployments?.edges?.[0]?.node?.id;
    if (!deploymentId) {
      // Project reachable but no deployments yet — still treat connect as OK.
      return { ok: true };
    }

    await railwayGraphql<{
      deploymentLogs?: Array<{ message?: string } | null> | null;
    }>(
      `query ConnectProbeLogs($deploymentId: String!, $limit: Int) {
        deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
          message
        }
      }`,
      { deploymentId, limit: 1 },
    );

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const authHint =
      /not authorized/i.test(message)
        ? ' Token may need RAILWAY_TOKEN_KIND=project (Project-Access-Token) or an account/workspace token with log read access. Endpoint must be backboard.railway.com.'
        : '';
    return {
      ok: false,
      error: `Failed to reach Railway API: ${message}`,
      hint: `Check RAILWAY_TOKEN / RAILWAY_PROJECT_ID and network access to ${RAILWAY_GRAPHQL_URL}.${authHint}`,
    };
  }
}

export type VercelConnectVerifyResult =
  | { ok: true }
  | { ok: false; error: string; hint?: string };

/**
 * Verify platform Vercel credentials: env token present + lightweight API reachability.
 */
export async function verifyVercelCustomConnect(): Promise<VercelConnectVerifyResult> {
  const token = process.env.VERCEL_TOKEN?.trim();
  if (!token) {
    return {
      ok: false,
      error: 'VERCEL_TOKEN not found',
      hint: 'Add VERCEL_TOKEN to the platform environment variables.',
    };
  }

  try {
    const res = await fetch('https://api.vercel.com/v2/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status !== 200) {
      return {
        ok: false,
        error: 'Vercel token invalid',
        hint: 'Check that VERCEL_TOKEN is correct and has not expired.',
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      ok: false,
      error: `Failed to reach Vercel API: ${message}`,
      hint: 'Check network connectivity from the API host to api.vercel.com.',
    };
  }
}
