/**
 * Bridges Kip agent runs to in-process MCP tools (Railway, Vercel, GitHub, Nango, Resend).
 */

import { resolveAgentCapabilities } from '../capabilities/resolveCapabilities.js';
import { withAsyncTimeout } from '../lib/fetchWithTimeout.js';
import { mcpCallAction, type McpContext } from '../mcp/core.js';
import { getSchema } from '../mcp/tools.js';

export type McpToolDescriptor = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  requiredCapability?: string;
};

export type McpActionResultLike = {
  type: string;
  status: string;
  message: string;
  data?: Record<string, unknown>;
};

const BOARD_INSTRUMENT_SLUGS = new Set(['cloud', 'rendr']);

export function getMcpToolsForCapabilities(capabilities: string[]): McpToolDescriptor[] {
  const capSet = new Set(capabilities);
  const schema = getSchema();
  return schema.tools.filter(
    (tool) => !tool.requiredCapability || capSet.has(tool.requiredCapability),
  );
}

export async function resolveMcpToolsForAgent(params: {
  agentId: string;
  agentSlug: string;
  boardId?: string | null;
}): Promise<{ tools: McpToolDescriptor[]; capabilities: string[] }> {
  const boardId =
    params.boardId ??
    (BOARD_INSTRUMENT_SLUGS.has(params.agentSlug) ? 'ide' : undefined);

  const resolved = await resolveAgentCapabilities({
    agentId: params.agentId,
    agentSlug: params.agentSlug,
    boardId: boardId ?? undefined,
  });

  const capabilities = resolved?.capabilities ?? [];
  return {
    capabilities,
    tools: getMcpToolsForCapabilities(capabilities),
  };
}

export function buildMcpToolSystemPrompt(tools: McpToolDescriptor[]): string {
  if (!tools.length) return '';

  const lines = tools.map(
    (tool) =>
      `- ${tool.name}: ${tool.description}${
        tool.requiredCapability ? ` (capability: ${tool.requiredCapability})` : ''
      }`,
  );

  return [
    'MCP INFRA TOOLS — live and callable in this session via the mcp.call action:',
    ...lines,
    '',
    'When the user asks for Railway, Vercel, GitHub, integration/Nango, or Resend status — call the relevant tool(s) in "actions" using mcp.call BEFORE answering.',
    'GitHub repo/commits/PR/actions tools require a connected GitHub integration (Nango OAuth). Use integrations_list or nango_get_status when connection state is unclear.',
    'mcp.call payload schema: { "name": "<tool_name>", "args": { ...optional params } }',
    'Example envelope:',
    '{"type":"agent_output","response":"Checking live deploy status.","actions":[',
    '  {"type":"mcp.call","payload":{"name":"railway_get_deployments","args":{"limit":5}}},',
    '  {"type":"mcp.call","payload":{"name":"vercel_get_deployments","args":{"limit":5}}}',
    ']}',
    'Deploy/write tools (railway_trigger_redeploy, vercel_trigger_redeploy) require explicit user confirmation first.',
    'Do NOT tell the user MCP tools are unavailable — they are wired via mcp.call when listed above.',
  ].join('\n');
}

export async function executeMcpCallAction(params: {
  toolName: string;
  args: Record<string, unknown>;
  domainId?: string | null;
  agentCapabilities: string[];
}): Promise<unknown> {
  const ctx: McpContext = {
    domainId: params.domainId ?? null,
    agentCapabilities: params.agentCapabilities,
  };
  return withAsyncTimeout(
    mcpCallAction(params.toolName, params.args ?? {}, ctx),
    30_000,
    `MCP ${params.toolName}`,
  );
}

export function hasSuccessfulMcpResults(results: McpActionResultLike[]): boolean {
  return results.some((result) => result.type === 'mcp.call' && result.status === 'success');
}

export function formatMcpActionResultsForFollowUp(results: McpActionResultLike[]): string {
  return results
    .filter((result) => result.type === 'mcp.call')
    .map((result) => {
      const toolName =
        typeof result.data?.tool === 'string' ? result.data.tool : result.type;
      const payload = result.data?.result ?? result.data ?? result.message;
      return [`Tool: ${toolName}`, `Status: ${result.status}`, JSON.stringify(payload, null, 2)].join(
        '\n',
      );
    })
    .join('\n\n');
}

export function buildMcpFollowUpInput(params: {
  originalInput: string;
  agentName: string;
  actionResults: McpActionResultLike[];
}): string {
  return [
    `[MCP tool results — reply as ${params.agentName} with concrete data]`,
    formatMcpActionResultsForFollowUp(params.actionResults),
    '',
    `Original user message: "${params.originalInput}"`,
    'Summarize the tool results for the user. Use specific statuses, timestamps, and service names when present.',
    'Do not say tools are unavailable or suggest wiring MCP — you already ran them.',
  ].join('\n');
}
