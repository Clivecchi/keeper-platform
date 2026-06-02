/**
 * Custom integration connect — env token verification (no Nango OAuth).
 * Does not use RailwayService — lightweight probe only per Phase A scope.
 */

const RAILWAY_GRAPHQL_URL = 'https://backboard.railway.app/graphql/v2';

const RAILWAY_CONNECT_PROBE_QUERY = `query IntegrationConnectProbe($projectId: String!) {
  project(id: $projectId) {
    id
  }
}`;

export type RailwayConnectVerifyResult =
  | { ok: true }
  | { ok: false; error: string; hint?: string };

/**
 * Verify platform Railway credentials: env vars present + GraphQL reachability.
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
    const res = await fetch(RAILWAY_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: RAILWAY_CONNECT_PROBE_QUERY,
        variables: { projectId },
      }),
    });

    const text = await res.text();
    let payload: {
      data?: { project?: { id?: string } | null };
      errors?: Array<{ message: string }>;
    };
    try {
      payload = JSON.parse(text) as typeof payload;
    } catch {
      return {
        ok: false,
        error: 'Railway API returned invalid JSON',
        hint: 'Check network access and Railway API status.',
      };
    }

    if (!res.ok || payload.errors?.length) {
      const msg =
        payload.errors?.map((e) => e.message).join('; ') ||
        `HTTP ${res.status}`;
      return {
        ok: false,
        error: `Railway API unreachable or rejected the token: ${msg}`,
        hint: 'Verify RAILWAY_TOKEN and RAILWAY_PROJECT_ID are valid for this project.',
      };
    }

    if (!payload.data?.project?.id) {
      return {
        ok: false,
        error: 'Railway API did not return project data for RAILWAY_PROJECT_ID',
        hint: 'Confirm RAILWAY_PROJECT_ID matches an accessible Railway project.',
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      ok: false,
      error: `Failed to reach Railway API: ${message}`,
      hint: 'Check network connectivity from the API host to backboard.railway.app.',
    };
  }
}
