// src/mcp/tools.ts
// Tool registry and handlers for MCP server
// Provides safe, domain-scoped tools for OpenAI Agent

import { RailwayService } from '../services/RailwayService.js';
import { VercelDeploymentService } from '../services/VercelDeploymentService.js';
import { GitHubService } from '../services/GitHubService.js';

export type ToolContext = {
  domainId: string | null;
  agentCapabilities?: string[];
};

export type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  /** Declared for future MCP capability gate enforcement. */
  requiredCapability?: string;
  handler: (args: Record<string, unknown>, ctx: ToolContext) => Promise<unknown>;
};

function warnMissingCapability(tool: Tool, ctx: ToolContext): void {
  if (!tool.requiredCapability) return;
  const caps = ctx.agentCapabilities;
  if (!caps?.length) {
    console.warn(
      `[MCP tools] // incomplete — MCP capability gate not yet enforced; requiredCapability declared for future enforcement — tool=${tool.name} required=${tool.requiredCapability} (no agentCapabilities in context)`,
    );
    return;
  }
  if (!caps.includes(tool.requiredCapability)) {
    console.warn(
      `[MCP tools] // incomplete — MCP capability gate not yet enforced; requiredCapability declared for future enforcement — tool=${tool.name} required=${tool.requiredCapability} agentMissing=true`,
    );
  }
}

/**
 * Tool Registry
 *
 * Register safe, auditable tools that the OpenAI Agent can call.
 * All tools receive domain context for proper scoping.
 */
const tools: Tool[] = [
  {
    name: 'gk_recent_moments',
    description: 'List recent GenerationKeeper moments in the current domain.',
    parameters: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 20,
          default: 5,
          description: 'Number of moments to return (1-20)',
        },
      },
    },
    async handler(args, ctx) {
      const limit = Math.min(Math.max(Number(args?.limit ?? 5), 1), 20);
      return {
        moments: Array.from({ length: limit }, (_, i) => ({
          id: `mom_${i + 1}`,
          title: `Mock Moment ${i + 1}`,
          domain_id: ctx.domainId,
        })),
      };
    },
  },
  {
    name: 'pool_create_quote',
    description: 'Create a PoolKeeper quote with business rules.',
    parameters: {
      type: 'object',
      required: ['projectId'],
      properties: {
        projectId: {
          type: 'string',
          description: 'ID of the project to quote',
        },
        craneOverHouse: {
          type: 'boolean',
          default: false,
          description: 'Whether crane must go over house',
        },
        includesHeatPump: {
          type: 'boolean',
          default: false,
          description: 'Whether quote includes heat pump installation',
        },
      },
    },
    async handler(args, ctx) {
      return {
        quoteId: `q_${Date.now()}`,
        projectId: args.projectId,
        domainId: ctx.domainId,
        appliedRules: {
          craneOverHouse: !!args.craneOverHouse,
          includesHeatPump: !!args.includesHeatPump,
        },
        timestamp: new Date().toISOString(),
      };
    },
  },
  {
    name: 'railway_get_services',
    description: 'List all Railway services. Required capability: infra.railway.read.',
    requiredCapability: 'infra.railway.read',
    parameters: { type: 'object', properties: {} },
    async handler(_args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'railway_get_services')!, ctx);
      return RailwayService.getServices();
    },
  },
  {
    name: 'railway_get_deployments',
    description:
      'Get recent Railway deployments. Use to check deployment status or review history. Required capability: infra.railway.read.',
    requiredCapability: 'infra.railway.read',
    parameters: {
      type: 'object',
      properties: {
        serviceId: { type: 'string', description: 'Optional service ID to scope results' },
        limit: { type: 'number', description: 'Number of deployments, default 10' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'railway_get_deployments')!, ctx);
      return RailwayService.getDeployments(
        typeof args.serviceId === 'string' ? args.serviceId : undefined,
        typeof args.limit === 'number' ? args.limit : undefined,
      );
    },
  },
  {
    name: 'railway_get_logs',
    description: 'Get recent logs for a Railway service. Required capability: infra.railway.read.',
    requiredCapability: 'infra.railway.read',
    parameters: {
      type: 'object',
      properties: {
        serviceId: { type: 'string', description: 'Railway service ID' },
        limit: { type: 'number', description: 'Log lines, default 50' },
      },
      required: ['serviceId'],
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'railway_get_logs')!, ctx);
      return RailwayService.getLogs(String(args.serviceId), typeof args.limit === 'number' ? args.limit : undefined);
    },
  },
  {
    name: 'railway_get_env_names',
    description:
      'List environment variable names for a Railway service. Returns names only — never values. Required capability: infra.railway.read.',
    requiredCapability: 'infra.railway.read',
    parameters: {
      type: 'object',
      properties: {
        serviceId: { type: 'string', description: 'Railway service ID' },
      },
      required: ['serviceId'],
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'railway_get_env_names')!, ctx);
      return RailwayService.getEnvironmentVariables(String(args.serviceId));
    },
  },
  {
    name: 'railway_trigger_redeploy',
    description:
      'Trigger a Railway service redeploy. ALWAYS confirm with the user before calling this tool. Required capability: infra.railway.deploy.',
    requiredCapability: 'infra.railway.deploy',
    parameters: {
      type: 'object',
      properties: {
        serviceId: { type: 'string', description: 'Railway service ID to redeploy' },
      },
      required: ['serviceId'],
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'railway_trigger_redeploy')!, ctx);
      return RailwayService.triggerRedeploy(String(args.serviceId));
    },
  },
  {
    name: 'vercel_get_deployments',
    description: 'Get recent Vercel deployments. Required capability: infra.vercel.read.',
    requiredCapability: 'infra.vercel.read',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Number of deployments, default 10' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'vercel_get_deployments')!, ctx);
      return VercelDeploymentService.create().getDeployments(
        typeof args.limit === 'number' ? args.limit : undefined,
      );
    },
  },
  {
    name: 'vercel_get_deployment_logs',
    description:
      'Get build and runtime logs for a Vercel deployment. Required capability: infra.vercel.read.',
    requiredCapability: 'infra.vercel.read',
    parameters: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string', description: 'Vercel deployment ID' },
      },
      required: ['deploymentId'],
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'vercel_get_deployment_logs')!, ctx);
      return VercelDeploymentService.create().getDeploymentLogs(String(args.deploymentId));
    },
  },
  {
    name: 'vercel_get_project',
    description: 'Get Vercel project configuration and status. Required capability: infra.vercel.read.',
    requiredCapability: 'infra.vercel.read',
    parameters: { type: 'object', properties: {} },
    async handler(_args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'vercel_get_project')!, ctx);
      return VercelDeploymentService.create().getProjectInfo();
    },
  },
  {
    name: 'vercel_trigger_redeploy',
    description:
      'Trigger a Vercel redeploy. ALWAYS confirm with the user before calling this tool. Required capability: infra.vercel.deploy.',
    requiredCapability: 'infra.vercel.deploy',
    parameters: {
      type: 'object',
      properties: {
        deploymentId: { type: 'string', description: 'Vercel deployment ID to redeploy' },
      },
      required: ['deploymentId'],
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'vercel_trigger_redeploy')!, ctx);
      return VercelDeploymentService.create().triggerRedeploy(String(args.deploymentId));
    },
  },
  {
    name: 'github.repo.read',
    description:
      'Read repository contents, file tree, or a specific file by path. Required capability: github.repo.read.',
    requiredCapability: 'github.repo.read',
    parameters: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository as owner/repo' },
        owner: { type: 'string', description: 'Repository owner' },
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'File path within the repository' },
        branch: { type: 'string', description: 'Branch or ref (default main)' },
        ref: { type: 'string', description: 'Alias for branch' },
        mode: { type: 'string', enum: ['file', 'tree'], description: 'file or tree listing' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'github.repo.read')!, ctx);
      return GitHubService.readRepository(args);
    },
  },
  {
    name: 'github.commits.list',
    description: 'List recent commits on a branch. Required capability: github.commits.list.',
    requiredCapability: 'github.commits.list',
    parameters: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository as owner/repo' },
        owner: { type: 'string' },
        repo: { type: 'string' },
        branch: { type: 'string', description: 'Branch name (default main)' },
        limit: { type: 'number', description: 'Number of commits, default 10' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'github.commits.list')!, ctx);
      return GitHubService.listCommits(args);
    },
  },
  {
    name: 'github.branch.create',
    description:
      'Create a new branch from a base branch. ALWAYS confirm with the user before calling. Required capability: github.branch.create.',
    requiredCapability: 'github.branch.create',
    parameters: {
      type: 'object',
      required: ['branch'],
      properties: {
        repository: { type: 'string', description: 'Repository as owner/repo' },
        owner: { type: 'string' },
        repo: { type: 'string' },
        branch: { type: 'string', description: 'New branch name' },
        base: { type: 'string', description: 'Base branch (default main)' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'github.branch.create')!, ctx);
      return GitHubService.createBranch(args);
    },
  },
  {
    name: 'github.file.write',
    description:
      'Commit a file create or update to a branch. ALWAYS confirm with the user before calling. Required capability: github.file.write.',
    requiredCapability: 'github.file.write',
    parameters: {
      type: 'object',
      required: ['path', 'content'],
      properties: {
        repository: { type: 'string', description: 'Repository as owner/repo' },
        owner: { type: 'string' },
        repo: { type: 'string' },
        path: { type: 'string', description: 'File path within the repository' },
        branch: { type: 'string', description: 'Target branch' },
        content: { type: 'string', description: 'UTF-8 file content' },
        message: { type: 'string', description: 'Commit message' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'github.file.write')!, ctx);
      return GitHubService.writeFile(args);
    },
  },
  {
    name: 'github.pr.create',
    description:
      'Open a pull request from head branch to base. ALWAYS confirm with the user before calling. Required capability: github.pr.create.',
    requiredCapability: 'github.pr.create',
    parameters: {
      type: 'object',
      required: ['title', 'head'],
      properties: {
        repository: { type: 'string', description: 'Repository as owner/repo' },
        owner: { type: 'string' },
        repo: { type: 'string' },
        title: { type: 'string', description: 'PR title' },
        head: { type: 'string', description: 'Head branch' },
        base: { type: 'string', description: 'Base branch (default main)' },
        body: { type: 'string', description: 'PR description' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'github.pr.create')!, ctx);
      return GitHubService.createPullRequest(args);
    },
  },
  {
    name: 'github.pr.read',
    description: 'Read pull request status, reviews, and check state. Required capability: github.pr.read.',
    requiredCapability: 'github.pr.read',
    parameters: {
      type: 'object',
      required: ['number'],
      properties: {
        repository: { type: 'string', description: 'Repository as owner/repo' },
        owner: { type: 'string' },
        repo: { type: 'string' },
        number: { type: 'number', description: 'Pull request number' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'github.pr.read')!, ctx);
      return GitHubService.readPullRequest(args);
    },
  },
  {
    name: 'github.actions.status',
    description:
      'Read the most recent GitHub Actions workflow run. Required capability: github.actions.status.',
    requiredCapability: 'github.actions.status',
    parameters: {
      type: 'object',
      properties: {
        repository: { type: 'string', description: 'Repository as owner/repo' },
        owner: { type: 'string' },
        repo: { type: 'string' },
        branch: { type: 'string', description: 'Optional branch filter' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'github.actions.status')!, ctx);
      return GitHubService.getActionsStatus(args);
    },
  },
];

/**
 * Get MCP Schema
 */
export function getSchema() {
  return {
    service: 'keeper-mcp',
    version: '0.0.1',
    tools: tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
      requiredCapability: t.requiredCapability,
    })),
  };
}

/**
 * Call Tool
 */
export async function callTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = tools.find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  if (tool.requiredCapability) {
    warnMissingCapability(tool, ctx);
  }
  return tool.handler(args ?? {}, ctx);
}

export function getToolNames(): string[] {
  return tools.map((t) => t.name);
}
