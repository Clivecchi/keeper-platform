// src/mcp/tools.ts
// Tool registry and handlers for MCP server
// Provides safe, domain-scoped tools for OpenAI Agent

import { RailwayService } from '../services/RailwayService.js';
import { VercelDeploymentService } from '../services/VercelDeploymentService.js';
import { GitHubService } from '../services/GitHubService.js';
import { IntegrationMcpService } from '../services/IntegrationMcpService.js';
import { ResendService } from '../services/ResendService.js';
import { prisma } from '@keeper/database';
import { searchLibraryItems } from '../services/LibraryItemSearchService.js';
import { appendGlossTurn } from '../services/GlossWriteService.js';
import { isGlossAnchor } from '@keeper/shared';

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

/**
 * Claude.ai / Anthropic FrontendRemoteMcpToolDefinition rejects tool names outside
 * `^[a-zA-Z0-9_-]{1,64}$` (dots are invalid). Map legacy dotted names → underscore names.
 */
const TOOL_NAME_ALIASES: Record<string, string> = {
  'github.repo.read': 'github_repo_read',
  'github.commits.list': 'github_commits_list',
  'github.branch.create': 'github_branch_create',
  'github.file.write': 'github_file_write',
  'github.pr.create': 'github_pr_create',
  'github.pr.read': 'github_pr_read',
  'github.actions.status': 'github_actions_status',
};

export function resolveToolName(name: string): string {
  return TOOL_NAME_ALIASES[name] ?? name;
}

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
    throw new Error(
      `Missing capability ${tool.requiredCapability} for MCP tool "${tool.name}"`,
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
    // Underscore names for Claude.ai (`^[a-zA-Z0-9_-]{1,64}$`); dotted aliases still resolve in callTool.
    name: 'github_repo_read',
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
      warnMissingCapability(tools.find((t) => t.name === 'github_repo_read')!, ctx);
      return GitHubService.readRepository(args, ctx.domainId);
    },
  },
  {
    name: 'github_commits_list',
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
      warnMissingCapability(tools.find((t) => t.name === 'github_commits_list')!, ctx);
      return GitHubService.listCommits(args, ctx.domainId);
    },
  },
  {
    name: 'github_branch_create',
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
      warnMissingCapability(tools.find((t) => t.name === 'github_branch_create')!, ctx);
      return GitHubService.createBranch(args, ctx.domainId);
    },
  },
  {
    name: 'github_file_write',
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
      warnMissingCapability(tools.find((t) => t.name === 'github_file_write')!, ctx);
      return GitHubService.writeFile(args, ctx.domainId);
    },
  },
  {
    name: 'github_pr_create',
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
      warnMissingCapability(tools.find((t) => t.name === 'github_pr_create')!, ctx);
      return GitHubService.createPullRequest(args, ctx.domainId);
    },
  },
  {
    name: 'github_pr_read',
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
      warnMissingCapability(tools.find((t) => t.name === 'github_pr_read')!, ctx);
      return GitHubService.readPullRequest(args, ctx.domainId);
    },
  },
  {
    name: 'github_actions_status',
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
      warnMissingCapability(tools.find((t) => t.name === 'github_actions_status')!, ctx);
      return GitHubService.getActionsStatus(args, ctx.domainId);
    },
  },
  {
    name: 'integrations_list',
    description:
      'List platform integration connection status (Railway, Vercel, GitHub). Required capability: integrations.list.',
    requiredCapability: 'integrations.list',
    parameters: {
      type: 'object',
      properties: {},
    },
    async handler(_args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'integrations_list')!, ctx);
      return IntegrationMcpService.listPlatformIntegrations();
    },
  },
  {
    name: 'nango_get_status',
    description:
      'Read Nango OAuth host configuration and which services use it (GitHub). Required capability: nango.status.read.',
    requiredCapability: 'nango.status.read',
    parameters: {
      type: 'object',
      properties: {},
    },
    async handler(_args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'nango_get_status')!, ctx);
      return IntegrationMcpService.getNangoStatus();
    },
  },
  {
    name: 'resend_get_status',
    description:
      'Read Resend email API configuration and verified domains (read-only). Required capability: resend.status.read.',
    requiredCapability: 'resend.status.read',
    parameters: {
      type: 'object',
      properties: {},
    },
    async handler(_args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'resend_get_status')!, ctx);
      return ResendService.getStatus();
    },
  },
  {
    name: 'library_list',
    description:
      'List Library items for the current domain. Required capability: library.ro. Requires x-domain-id.',
    requiredCapability: 'library.ro',
    parameters: {
      type: 'object',
      properties: {
        limit: { type: 'number', minimum: 1, maximum: 50, default: 20 },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'library_list')!, ctx);
      if (!ctx.domainId) throw new Error('x-domain-id header is required');
      const limit = Math.min(Math.max(Number(args?.limit ?? 20), 1), 50);
      const rows = await prisma.libraryItem.findMany({
        where: { domain_id: ctx.domainId },
        orderBy: { created_at: 'desc' },
        take: limit,
        select: {
          id: true,
          display_label: true,
          source_type: true,
          source_ref: true,
          agent_perspective: true,
          updated_at: true,
        },
      });
      return { domainId: ctx.domainId, items: rows };
    },
  },
  {
    name: 'library_get',
    description:
      'Get one Library item by id in the current domain. Required capability: library.ro.',
    requiredCapability: 'library.ro',
    parameters: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'string', description: 'LibraryItem id' },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'library_get')!, ctx);
      if (!ctx.domainId) throw new Error('x-domain-id header is required');
      const id = String(args.id ?? '').trim();
      if (!id) throw new Error('id is required');
      const item = await prisma.libraryItem.findFirst({
        where: { id, domain_id: ctx.domainId },
      });
      if (!item) throw new Error(`Library item not found: ${id}`);
      return { item };
    },
  },
  {
    name: 'library_search',
    description:
      'Semantic search over Library item perspectives in the current domain. Required capability: library.ro.',
    requiredCapability: 'library.ro',
    parameters: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'Natural language search query' },
        limit: { type: 'number', minimum: 1, maximum: 20, default: 10 },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'library_search')!, ctx);
      if (!ctx.domainId) throw new Error('x-domain-id header is required');
      const query = String(args.query ?? '').trim();
      if (!query) throw new Error('query is required');
      const limit = Math.min(Math.max(Number(args?.limit ?? 10), 1), 20);
      const results = await searchLibraryItems({ domainId: ctx.domainId, query, limit });
      return { query, results };
    },
  },
  {
    name: 'gloss_write_turn',
    description:
      'Append one Gloss turn to a message-anchored thread. Required capability: gloss.rw. Writes only kip_messages.metadata.glossThreads — never mutates the anchored LibraryItem, Draft, Moment, or other entity.',
    requiredCapability: 'gloss.rw',
    parameters: {
      type: 'object',
      required: ['messageId', 'anchor', 'content'],
      properties: {
        messageId: {
          type: 'string',
          description: 'Parent kip_message id that owns glossThreads metadata',
        },
        anchor: {
          type: 'object',
          description: 'GlossAnchor — entityKind, entityId, optional nodeId/messageId/receiptIndex',
        },
        content: {
          type: 'string',
          description: 'Turn text to append',
        },
        role: {
          type: 'string',
          enum: ['user', 'agent'],
          default: 'user',
          description: 'Turn author role (default user for external callers)',
        },
      },
    },
    async handler(args, ctx) {
      warnMissingCapability(tools.find((t) => t.name === 'gloss_write_turn')!, ctx);
      if (!ctx.domainId) throw new Error('x-domain-id header is required');

      const messageId = String(args.messageId ?? '').trim();
      const content = String(args.content ?? '').trim();
      const roleRaw = args.role;
      const role = roleRaw === 'agent' ? 'agent' : roleRaw === 'user' ? 'user' : 'user';

      if (!messageId) throw new Error('messageId is required');
      if (!content) throw new Error('content is required');
      if (!isGlossAnchor(args.anchor)) throw new Error('anchor must be a valid GlossAnchor');

      const result = await appendGlossTurn({
        domainId: ctx.domainId,
        messageId,
        anchor: args.anchor,
        content,
        role,
      });

      return {
        ok: true,
        messageId: result.messageId,
        threadId: result.thread.id,
        turn: result.message,
        threadMessageCount: result.thread.messages.length,
      };
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
  const resolved = resolveToolName(name);
  const tool = tools.find((t) => t.name === resolved);
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

/** Claude.ai-compatible tool name pattern. */
const CLAUDE_SAFE_TOOL_NAME = /^[a-zA-Z0-9_-]{1,64}$/;

export function assertClaudeSafeToolNames(names: string[] = getToolNames()): void {
  const bad = names.filter((n) => !CLAUDE_SAFE_TOOL_NAME.test(n));
  if (bad.length > 0) {
    throw new Error(`MCP tool names unsafe for Claude.ai: ${bad.join(', ')}`);
  }
}
