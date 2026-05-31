// src/mcp/index.ts
// MCP (Model Context Protocol) Router
// Minimal server for OpenAI Agent integration
// Updated with universal CORS for OpenAI Agent Builder compatibility
// Instrumented with structured logging for production diagnostics

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { mcpCors } from './cors.js';
import { getSchema, callTool } from './tools.js';
import { logMcp } from './log.js';
import { rid } from './id.js';
import { mcpListActions, mcpCallAction, mcpGetCapabilities } from './core.js';
import { jsonRpcDispatcher } from './jsonRpc.js';
import { resolveAgentCapabilities } from '../capabilities/resolveCapabilities.js';

const router = Router();

// Apply CORS middleware first
router.use(mcpCors);

/**
 * Allow unauthenticated HEAD requests for discovery
 * Some tool UIs probe with HEAD before making actual requests
 * No data is leaked - just returns 200 OK
 */
router.head(['/', '/health', '/schema', '/call'], (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  res.sendStatus(200);
  logMcp(req, 200, t0, id);
});

/**
 * GET /api/mcp/health (BEFORE auth middleware)
 * Health check endpoint - accessible without authentication for monitoring
 */
router.get('/health', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  res.json({ 
    ok: true, 
    service: 'keeper-mcp', 
    version: '0.0.1',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * Auth Middleware
 * Accepts both Authorization: Bearer and x-api-key headers
 * Applied to all routes below this point
 */
router.use((req: Request, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const apiKey = (req.headers['x-api-key'] as string) || bearer;
  const expected = process.env.OPAI_AGENT_MCP_KEY?.trim();
  
  if (!expected || apiKey !== expected) {
    const t0 = Date.now();
    const id = rid();
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('x-request-id', id);
    res.status(401).json({ 
      ok: false, 
      error: 'unauthorized',
      timestamp: new Date().toISOString()
    });
    logMcp(req, 401, t0, id);
    return;
  }
  
  // Extract optional domain ID for scoping
  (req as any).domainId = (req.headers['x-domain-id'] as string) ?? null;
  
  next();
});

/**
 * POST /mcp (JSON-RPC base endpoint)
 * OpenAI Agent Builder's primary endpoint - uses JSON-RPC 2.0 format
 * Handles: list_actions, call_action, capabilities
 * This solves the 424 Failed Dependency error by providing a base endpoint
 */
router.post('/', jsonRpcDispatcher);

/**
 * GET /api/mcp/
 * Root endpoint - requires auth
 */
router.get('/', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  res.json({ 
    ok: true, 
    service: 'keeper-mcp', 
    version: '0.0.1',
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * GET /api/mcp/whoami
 * Auth check endpoint - verifies bearer token is valid
 */
router.get('/whoami', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  res.json({ 
    ok: true,
    authenticated: true,
    service: 'keeper-mcp',
    domainId: (req as any).domainId || null,
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * GET /api/mcp/schema
 * Returns tool list with JSON schemas
 */
router.get('/schema', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  res.json({ 
    ...getSchema(), 
    timestamp: new Date().toISOString() 
  });
  logMcp(req, 200, t0, id);
});

/**
 * GET /api/mcp/tools
 * Standard MCP endpoint - Returns list of available tools
 * Compatible with OpenAI Agent Builder discovery
 */
router.get('/tools', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  const schema = getSchema();
  res.json({ 
    tools: schema.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    })),
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * GET /api/mcp/actions
 * OpenAI Agent Builder expects actions discovery at this endpoint
 * Returns the same tools but formatted as "actions" for compatibility
 */
router.get('/actions', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  const result = mcpListActions();
  res.json({ 
    ...result,
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * POST /api/mcp/actions/list
 * OpenAI Agent Builder may use POST for listing actions
 * Returns the same actions list as GET /actions
 */
router.post('/actions/list', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  const result = mcpListActions();
  res.json({ 
    ...result,
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * GET /api/mcp/capabilities
 * Standard MCP endpoint - Returns server capabilities
 */
router.get('/capabilities', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  const result = mcpGetCapabilities();
  res.json({ 
    ...result,
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * GET /api/mcp/.well-known/mcp
 * Well-known discovery endpoint for MCP
 */
router.get('/.well-known/mcp', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  const schema = getSchema();
  res.json({ 
    service: schema.service,
    version: schema.version,
    endpoints: {
      health: '/',
      tools: '/tools',
      actions: '/actions',
      capabilities: '/capabilities',
      schema: '/schema',
      call: '/call'
    },
    capabilities: {
      tools: true,
      actions: true,
      toolExecution: true,
      domainScoping: true
    },
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * POST /api/mcp/call
 * Invokes a registered tool
 * 
 * Request body:
 * {
 *   "name": "tool_name",
 *   "args": { ... }
 * }
 * 
 * Response:
 * {
 *   "ok": true,
 *   "result": { ... }
 * }
 */
router.post('/call', async (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  
  try {
    const { name, args } = req.body ?? {};
    
    if (!name) {
      res.status(400).json({ 
        ok: false, 
        error: 'Missing tool name',
        timestamp: new Date().toISOString()
      });
      logMcp(req, 400, t0, id);
      return;
    }
    
    const agentSlug = (req.headers['x-agent-slug'] as string) ?? undefined;
    const agentId = (req.headers['x-agent-id'] as string) ?? undefined;
    const boardId = (req.headers['x-board-id'] as string) ?? undefined;
    const resolvedCaps = await resolveAgentCapabilities({ agentSlug, agentId, boardId });

    const result = await mcpCallAction(
      String(name), 
      args ?? {}, 
      {
        domainId: (req as any).domainId ?? null,
        agentCapabilities: resolvedCaps?.capabilities,
      }
    );
    
    res.json({ 
      ok: true, 
      result,
      timestamp: new Date().toISOString()
    });
    logMcp(req, 200, t0, id, String(name));
  } catch (e: any) {
    res.status(400).json({ 
      ok: false, 
      error: e?.message ?? 'Tool error',
      timestamp: new Date().toISOString()
    });
    logMcp(req, 400, t0, id, req.body?.name);
  }
});

/**
 * GET /api/mcp/_diag
 * Diagnostic endpoint for troubleshooting OpenAI Agent 424s
 * Returns server info and request metadata (no secrets)
 */
router.get('/_diag', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  res.json({ 
    service: 'keeper-mcp',
    version: '0.0.1',
    endpoints: ['/mcp/tools', '/mcp/actions', '/mcp/actions/list', '/mcp/call', '/mcp/schema', '/mcp/_diag', '/mcp/health', '/mcp/whoami', '/mcp/capabilities', '/mcp/.well-known/mcp'],
    hasAuthHeader: !!req.headers.authorization || !!req.headers['x-api-key'],
    timestamp: new Date().toISOString()
  });
  logMcp(req, 200, t0, id);
});

/**
 * Catch-all 404 handler for unsupported MCP routes
 * Returns JSON instead of falling through to SPA
 */
router.use('*', (req: Request, res: Response) => {
  const t0 = Date.now();
  const id = rid();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('x-request-id', id);
  res.status(404).json({
    ok: false,
    error: 'Not found',
    path: req.originalUrl,
    availableEndpoints: ['/', '/tools', '/actions', '/capabilities', '/.well-known/mcp', '/schema', '/call', '/_diag'],
    timestamp: new Date().toISOString()
  });
  logMcp(req, 404, t0, id);
});

export default router;

