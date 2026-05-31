// src/mcp/jsonRpc.ts
// JSON-RPC 2.0 dispatcher for MCP endpoints
// Enables OpenAI Agent Builder compatibility by accepting JSON-RPC payloads

import type { Request, Response } from 'express';
import { mcpListActions, mcpCallAction, mcpGetCapabilities } from './core.js';
import { resolveAgentCapabilities } from '../capabilities/resolveCapabilities.js';
import { logMcp } from './log.js';
import { rid } from './id.js';

/**
 * JSON-RPC 2.0 Request
 * Standard JSON-RPC format expected by OpenAI Agent Builder
 * Made flexible to tolerate missing/default jsonrpc field
 */
type JsonRpcRequest = {
  jsonrpc?: '2.0' | string;
  id?: string | number | null;
  method?: string;
  params?: Record<string, any>;
};

/**
 * Initialize Request Params
 * Parameters sent by client during MCP handshake
 */
type InitializeParams = {
  protocolVersion?: string;
  capabilities?: Record<string, any>;
  clientInfo?: { name?: string; version?: string };
};

/**
 * Convert actions to MCP tools format
 * 
 * Transforms our internal action format to OpenAI Agent Builder's expected tools format:
 * - Uses camelCase 'inputSchema' (spec-correct)
 * - Adds optional 'title' field
 * - Adds JSON Schema draft-07 $schema property
 * - Maintains name and description
 * 
 * @param actions - Array of actions from mcpListActions()
 * @returns Array of tools in MCP format
 */
function actionsToTools(actions: any[]): any[] {
  return (actions || []).map((a: any) => ({
    name: a.name,
    title: a.title ?? a.name, // Optional title field
    description: a.description,
    inputSchema: {
      $schema: 'https://json-schema.org/draft-07/schema#',
      ...(a.parameters ?? { type: 'object', properties: {} })
    }
  }));
}

/**
 * Minimal Request Format
 * Alternative simpler format for flexibility
 */
type MinimalRequest = {
  action: string;
  name?: string;
  arguments?: Record<string, any>;
};

/**
 * JSON-RPC 2.0 Success Response
 */
type JsonRpcSuccess = {
  jsonrpc: '2.0';
  id: string | number | null;
  result: any;
};

/**
 * JSON-RPC 2.0 Error Response
 */
type JsonRpcError = {
  jsonrpc: '2.0';
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: any;
  };
};

/**
 * JSON-RPC Error Codes
 * Standard codes from JSON-RPC 2.0 specification
 */
const ErrorCodes = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603,
  SERVER_ERROR: -32000,
} as const;

/**
 * JSON-RPC Dispatcher
 * 
 * Handles JSON-RPC 2.0 requests at the base MCP endpoints.
 * Supports both JSON-RPC format and simplified format for flexibility.
 * 
 * Expected to be mounted at:
 * - POST /
 * - POST /mcp
 * 
 * Methods:
 * - initialize → MCP handshake, returns server capabilities
 * - initialized → MCP handshake acknowledgment (no-op)
 * - list_actions → returns available tools/actions (legacy)
 * - call_action → invokes a tool (legacy)
 * - capabilities → returns server capabilities
 * - tools/list → returns available tools (MCP standard)
 * - tools/call → invokes a tool (MCP standard)
 */
export async function jsonRpcDispatcher(req: Request, res: Response): Promise<void> {
  const t0 = Date.now();
  const requestId = rid();
  const hasAuth = !!req.header('authorization');
  
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', requestId);

  // Transport nicety: echo MCP protocol version header if present
  const protoHdr = req.header('MCP-Protocol-Version');
  if (protoHdr) {
    res.setHeader('MCP-Protocol-Version', protoHdr);
  }

  try {
    const body = req.body || {};
    
    // Defensive: tolerate missing jsonrpc field, default to "2.0"
    const jsonrpcVersion = body.jsonrpc || '2.0';
    const method = body.method || body.action;
    const rpcId = body.id ?? requestId;
    
    // Log every method call for diagnostics
    console.log(`[MCP METHOD] rid=${requestId} method=${method}`);
    
    // Require POST method
    if (req.method !== 'POST') {
      const response: JsonRpcError = {
        jsonrpc: '2.0',
        id: rpcId,
        error: {
          code: 405,
          message: 'Method Not Allowed',
        },
      };
      res.status(405).json(response);
      logMcp(req, 405, t0, requestId);
      console.warn(`[MCP JSONRPC] rid=${requestId} method=${req.method} -> 405 Not POST`);
      return;
    }

    // Validate method is present
    if (!method) {
      const response: JsonRpcError = {
        jsonrpc: '2.0',
        id: rpcId,
        error: {
          code: ErrorCodes.INVALID_REQUEST,
          message: 'Invalid request format. Missing "method" or "action" field.',
        },
      };
      res.status(400).json(response);
      logMcp(req, 400, t0, requestId);
      console.warn(`[MCP JSONRPC] rid=${requestId} -> 400 Missing method`);
      return;
    }

    // Parse params (support both params and arguments)
    let params: Record<string, any> = body.params || {};
    if (body.action && body.name) params.name = body.name;
    if (body.action && body.arguments) params.arguments = body.arguments;

    // Extract domain context from headers
    const domainId = (req.headers['x-domain-id'] as string) ?? null;
    const agentSlug = (req.headers['x-agent-slug'] as string) ?? undefined;
    const agentId = (req.headers['x-agent-id'] as string) ?? undefined;
    const boardId = (req.headers['x-board-id'] as string) ?? undefined;
    const resolvedCaps = await resolveAgentCapabilities({ agentSlug, agentId, boardId });
    const ctx = {
      domainId,
      agentCapabilities: resolvedCaps?.capabilities,
    };

    // Dispatch to appropriate handler
    let result: any;
    let rpcMethod = method; // for logging

    // Add canary marker function
    const addCanary = (data: any) => ({
      ...data,
      __keeper_canary: {
        origin: 'railway-api',
        service: 'keeper-api-mcp',
        build: process.env.RAILWAY_DEPLOYMENT_ID || process.env.BUILD_ID || 'dev',
        timestamp: new Date().toISOString()
      }
    });

    // ===== MCP Handshake: initialize / initialized =====
    // Handle the MCP protocol handshake before proceeding to tool operations
    
    if (method === 'initialize') {
      // Echo protocolVersion from client request per MCP spec
      const params = (body.params ?? {}) as InitializeParams;
      const requested = (typeof params.protocolVersion === 'string' && params.protocolVersion.trim()) 
        ? params.protocolVersion 
        : '2025-03-26';

      const result = {
        protocolVersion: requested, // Echo per spec
        capabilities: {
          logging: {},
          prompts: { listChanged: true },
          resources: { subscribe: true, listChanged: true },
          tools: { listChanged: true } // Spec-friendly format
        },
        serverInfo: { name: 'keeper-mcp', version: '0.0.1' },
        instructions: 'Keeper MCP'
      };
      
      console.log(`[MCP JSONRPC] rid=${requestId} method=initialize ok proto=${requested}`);
      const response: JsonRpcSuccess = {
        jsonrpc: '2.0',
        id: rpcId,
        result,
      };
      res.status(200).json(response);
      logMcp(req, 200, t0, requestId, 'initialize');
      return;
    }

    // Accept spec notification + legacy alias
    if (method === 'notifications/initialized' || method === 'initialized') {
      console.log(`[MCP JSONRPC] rid=${requestId} method=${method} (noop)`);
      // Notifications may have null/absent id; still return 200 envelope
      const response: JsonRpcSuccess = {
        jsonrpc: '2.0',
        id: rpcId ?? null,
        result: { ok: true },
      };
      res.status(200).json(response);
      logMcp(req, 200, t0, requestId, method);
      return;
    }

    switch (method) {
      case 'list_actions':
      case 'actions.list':
        result = addCanary(mcpListActions());
        console.log(`[MCP JSONRPC] rid=${requestId} method=list_actions hasAuth=${hasAuth}`);
        break;

      case 'call_action':
      case 'action.call':
      case 'call':
        {
          const toolName = params.name || params.tool;
          const toolArgs = params.arguments || params.args || params.parameters || {};
          
          if (!toolName) {
            const response: JsonRpcError = {
              jsonrpc: '2.0',
              id: rpcId,
              error: {
                code: ErrorCodes.INVALID_PARAMS,
                message: 'Missing required parameter: name (tool name)',
              },
            };
            res.status(400).json(response);
            logMcp(req, 400, t0, requestId, 'call_action');
            console.warn(`[MCP JSONRPC] rid=${requestId} method=call_action -> 400 Missing name`);
            return;
          }

          const rawResult = await mcpCallAction(toolName, toolArgs, ctx);
          result = addCanary(rawResult);
          rpcMethod = `call_action:${toolName}`;
          console.log(`[MCP JSONRPC] rid=${requestId} method=call_action name=${toolName} hasAuth=${hasAuth}`);
        }
        break;

      case 'capabilities':
      case 'server.capabilities':
        result = addCanary(mcpGetCapabilities());
        console.log(`[MCP JSONRPC] rid=${requestId} method=capabilities hasAuth=${hasAuth}`);
        break;

      // ===== OpenAI Agent Builder MCP Compatibility =====
      // Tools API - alternative to actions API, expected by Agent Builder
      
      case 'tools/list':
      case 'list_tools':
        {
          const { actions } = mcpListActions();
          const tools = actionsToTools(actions);
          result = addCanary({ tools });
          console.log(`[MCP JSONRPC] rid=${requestId} method=${method} hasAuth=${hasAuth} tools=${tools.length}`);
        }
        break;

      case 'tools/call':
      case 'call_tool':
        {
          // Agent Builder sends 'arguments' (prefer spec) but also accept legacy 'args'
          const toolName = params.name || params.tool;
          const toolArgs = params.arguments ?? params.args ?? params.parameters ?? {};
          
          if (!toolName) {
            const response: JsonRpcError = {
              jsonrpc: '2.0',
              id: rpcId,
              error: {
                code: ErrorCodes.INVALID_PARAMS,
                message: 'Missing required parameter: name (tool name)',
              },
            };
            res.status(400).json(response);
            logMcp(req, 400, t0, requestId, 'tools/call');
            console.warn(`[MCP JSONRPC] rid=${requestId} method=${method} -> 400 Missing name`);
            return;
          }

          const rawResult = await mcpCallAction(toolName, toolArgs, ctx);
          
          // Return both textual content and structured content for richer clients
          const toolResult = {
            content: [{ type: 'text', text: JSON.stringify(rawResult) }],
            structuredContent: rawResult,
            ...addCanary({}) // Add canary to top level
          };
          
          rpcMethod = `tools/call:${toolName}`;
          console.log(`[MCP JSONRPC] rid=${requestId} method=${method} name=${toolName} hasAuth=${hasAuth}`);
          
          const response: JsonRpcSuccess = {
            jsonrpc: '2.0',
            id: rpcId,
            result: toolResult,
          };
          res.status(200).json(response);
          logMcp(req, 200, t0, requestId, rpcMethod);
          return;
        }

      default:
        {
          const response: JsonRpcError = {
            jsonrpc: '2.0',
            id: rpcId,
            error: {
              code: ErrorCodes.METHOD_NOT_FOUND,
              message: `Method not found: ${method}`,
              data: {
                availableMethods: [
                  'initialize',
                  'notifications/initialized',
                  'initialized',
                  'list_actions',
                  'call_action',
                  'capabilities',
                  'tools/list',
                  'tools/call',
                ],
              },
            },
          };
          res.status(200).json(response); // JSON-RPC errors return 200
          logMcp(req, 200, t0, requestId, method);
          console.warn(`[MCP JSONRPC] rid=${requestId} method=${method} -> Method not found`);
          return;
        }
    }

    // Success response
    const response: JsonRpcSuccess = {
      jsonrpc: '2.0',
      id: rpcId,
      result,
    };

    res.status(200).json(response);
    logMcp(req, 200, t0, requestId, rpcMethod);
  } catch (error: any) {
    // Handle errors
    const errorMessage = error?.message || 'Internal server error';
    const sanitizedMessage = errorMessage.replace(/\b(sk_|token_|key_)[a-zA-Z0-9_]+/gi, '***REDACTED***');

    const response: JsonRpcError = {
      jsonrpc: '2.0',
      id: req.body?.id ?? null,
      error: {
        code: ErrorCodes.SERVER_ERROR,
        message: sanitizedMessage,
      },
    };

    res.status(200).json(response); // JSON-RPC errors return 200
    logMcp(req, 200, t0, requestId, req.body?.method || 'unknown');
    console.error(`[MCP JSONRPC] rid=${requestId} error:`, sanitizedMessage);
  }
}

