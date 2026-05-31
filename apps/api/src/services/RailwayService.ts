/**
 * RailwayService — GraphQL v2 client for Railway project operations.
 * API: https://backboard.railway.app/graphql/v2 (Railway Public API, GraphQL v2)
 *
 * // incomplete — Railway GraphQL schema may require adjustment based on live API response
 */

const RAILWAY_GRAPHQL_URL = 'https://backboard.railway.app/graphql/v2';

export type RailwayServiceSummary = {
  id: string;
  name: string;
  environmentId?: string;
};

export type RailwayDeploymentSummary = {
  id: string;
  status: string;
  createdAt: string;
  serviceId?: string;
};

export type RailwayLogLine = {
  message: string;
  timestamp?: string;
};

async function railwayGraphql<T>(
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const token = process.env.RAILWAY_TOKEN?.trim();
  if (!token) {
    throw new Error('RAILWAY_TOKEN is not configured');
  }

  const projectId = process.env.RAILWAY_PROJECT_ID?.trim();
  if (!projectId) {
    throw new Error('RAILWAY_PROJECT_ID is not configured');
  }

  const res = await fetch(RAILWAY_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await res.text();
  let payload: { data?: T; errors?: Array<{ message: string }> };
  try {
    payload = JSON.parse(text) as typeof payload;
  } catch {
    throw new Error(`Railway GraphQL invalid JSON (${res.status}): ${text.slice(0, 200)}`);
  }

  if (!res.ok || payload.errors?.length) {
    const msg = payload.errors?.map((e) => e.message).join('; ') || text.slice(0, 300);
    throw new Error(`Railway GraphQL error (${res.status}): ${msg}`);
  }

  if (!payload.data) {
    throw new Error('Railway GraphQL returned no data');
  }

  return payload.data;
}

function getProjectId(): string {
  const projectId = process.env.RAILWAY_PROJECT_ID?.trim();
  if (!projectId) throw new Error('RAILWAY_PROJECT_ID is not configured');
  return projectId;
}

export class RailwayService {
  static async getServices(): Promise<RailwayServiceSummary[]> {
    const projectId = getProjectId();
    const data = await railwayGraphql<{
      project: {
        services: {
          edges: Array<{
            node: {
              id: string;
              name: string;
              serviceInstances: {
                edges: Array<{ node: { id: string; environmentId: string } }>;
              };
            };
          }>;
        };
      };
    }>(
      `query GetProjectServices($projectId: String!) {
        project(id: $projectId) {
          services {
            edges {
              node {
                id
                name
                serviceInstances {
                  edges {
                    node {
                      id
                      environmentId
                    }
                  }
                }
              }
            }
          }
        }
      }`,
      { projectId },
    );

    return (data.project?.services?.edges ?? []).map(({ node }) => ({
      id: node.id,
      name: node.name,
      environmentId: node.serviceInstances?.edges?.[0]?.node?.environmentId,
    }));
  }

  static async getDeployments(
    serviceId?: string,
    limit = 10,
  ): Promise<RailwayDeploymentSummary[]> {
    const projectId = getProjectId();
    const first = Math.min(Math.max(limit, 1), 50);

    const data = await railwayGraphql<{
      deployments: {
        edges: Array<{
          node: {
            id: string;
            status: string;
            createdAt: string;
            serviceId?: string;
          };
        }>;
      };
    }>(
      `query ListDeployments($projectId: String!, $serviceId: String, $first: Int!) {
        deployments(
          input: { projectId: $projectId, serviceId: $serviceId }
          first: $first
        ) {
          edges {
            node {
              id
              status
              createdAt
              serviceId
            }
          }
        }
      }`,
      { projectId, serviceId: serviceId ?? null, first },
    );

    return (data.deployments?.edges ?? []).map(({ node }) => ({
      id: node.id,
      status: node.status,
      createdAt: node.createdAt,
      serviceId: node.serviceId,
    }));
  }

  static async getDeploymentStatus(deploymentId: string): Promise<RailwayDeploymentSummary> {
    const data = await railwayGraphql<{
      deployment: {
        id: string;
        status: string;
        createdAt: string;
        serviceId?: string;
      };
    }>(
      `query GetDeployment($id: String!) {
        deployment(id: $id) {
          id
          status
          createdAt
          serviceId
        }
      }`,
      { id: deploymentId },
    );

    if (!data.deployment) {
      throw new Error(`Deployment not found: ${deploymentId}`);
    }

    return {
      id: data.deployment.id,
      status: data.deployment.status,
      createdAt: data.deployment.createdAt,
      serviceId: data.deployment.serviceId,
    };
  }

  static async getLogs(serviceId: string, limit = 50): Promise<RailwayLogLine[]> {
    const deployments = await RailwayService.getDeployments(serviceId, 1);
    const latest = deployments[0];
    if (!latest) return [];

    const data = await railwayGraphql<{
      deploymentLogs: Array<{ message: string; timestamp?: string }>;
    }>(
      `query DeploymentLogs($deploymentId: String!, $limit: Int!) {
        deploymentLogs(deploymentId: $deploymentId, limit: $limit) {
          message
          timestamp
        }
      }`,
      { deploymentId: latest.id, limit: Math.min(Math.max(limit, 1), 500) },
    );

    return (data.deploymentLogs ?? []).map((line) => ({
      message: line.message,
      timestamp: line.timestamp,
    }));
  }

  // incomplete — requires human confirmation gate before agent-initiated redeploys go live
  static async triggerRedeploy(serviceId: string): Promise<{ deploymentId?: string; status: string }> {
    const services = await RailwayService.getServices();
    const match = services.find((s) => s.id === serviceId);
    const environmentId =
      match?.environmentId ?? process.env.RAILWAY_ENVIRONMENT_ID?.trim();

    if (!environmentId) {
      throw new Error(
        'environmentId required for redeploy — set RAILWAY_ENVIRONMENT_ID or ensure service has an instance',
      );
    }

    const data = await railwayGraphql<{
      serviceInstanceDeployV2?: string;
      deploymentTrigger?: { id: string; status: string };
    }>(
      `mutation TriggerRedeploy($serviceId: String!, $environmentId: String!) {
        serviceInstanceDeployV2(serviceId: $serviceId, environmentId: $environmentId)
      }`,
      { serviceId, environmentId },
    );

    return {
      deploymentId: data.deploymentTrigger?.id,
      status: data.deploymentTrigger?.status ?? 'triggered',
    };
  }

  // incomplete — env var names only; values must never be returned to agents
  static async getEnvironmentVariables(serviceId: string): Promise<{ names: string[] }> {
    const projectId = getProjectId();
    const environmentId = process.env.RAILWAY_ENVIRONMENT_ID?.trim();

    const data = await railwayGraphql<{
      variables: Array<{ name: string }>;
    }>(
      `query ServiceVariables($projectId: String!, $environmentId: String!, $serviceId: String!) {
        variables(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
          name
        }
      }`,
      { projectId, environmentId, serviceId },
    );

    return {
      names: (data.variables ?? []).map((v) => v.name).filter(Boolean),
    };
  }
}
