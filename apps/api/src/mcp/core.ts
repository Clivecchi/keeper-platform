// src/mcp/core.ts
// Core MCP logic extracted for reuse by both REST and JSON-RPC dispatchers

import { getSchema, callTool } from './tools.js';

/**
 * Core MCP Handlers
 * 
 * These functions encapsulate the business logic for MCP operations.
 * Used by both REST endpoints and JSON-RPC dispatcher.
 */

export interface McpContext {
  domainId: string | null;
  agentCapabilities?: string[];
}

/**
 * List Available Actions
 * 
 * Returns the list of available tools/actions with their schemas.
 * Used by GET /actions, POST /actions/list, and JSON-RPC list_actions.
 */
export function mcpListActions() {
  const schema = getSchema();
  return {
    actions: schema.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }))
  };
}

/**
 * Call an Action/Tool
 * 
 * Invokes a registered tool by name with the given arguments.
 * Used by POST /call and JSON-RPC call_action.
 * 
 * @param name - Tool name
 * @param args - Tool arguments
 * @param ctx - Execution context with domainId
 * @returns Tool execution result
 * @throws Error if tool not found or execution fails
 */
export async function mcpCallAction(
  name: string,
  args: any,
  ctx: McpContext
): Promise<any> {
  if (!name) {
    throw new Error('Missing tool name');
  }

  const result = await callTool(String(name), args ?? {}, ctx);
  return result;
}

/**
 * Get Server Capabilities
 * 
 * Returns information about the MCP server's capabilities.
 * Used by GET /capabilities and JSON-RPC capabilities method.
 */
export function mcpGetCapabilities() {
  const schema = getSchema();
  return {
    service: schema.service,
    version: schema.version,
    protocol: 'http',
    capabilities: {
      tools: true,
      actions: true,
      toolExecution: true,
      domainScoping: true
    },
    toolCount: schema.tools.length
  };
}

