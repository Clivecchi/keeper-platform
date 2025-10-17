// src/mcp/index.ts
// MCP (Model Context Protocol) Router
// Minimal server for OpenAI Agent integration
// Updated with universal CORS for OpenAI Agent Builder compatibility

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { mcpCors } from './cors.js';
import { getSchema, callTool } from './tools.js';

const router = Router();

// Apply CORS middleware first
router.use(mcpCors);

/**
 * Allow unauthenticated HEAD requests for discovery
 * Some tool UIs probe with HEAD before making actual requests
 * No data is leaked - just returns 200 OK
 */
router.head(['/', '/health', '/schema', '/call'], (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.sendStatus(200);
});

/**
 * GET /api/mcp/health (BEFORE auth middleware)
 * Health check endpoint - accessible without authentication for monitoring
 */
router.get('/health', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({ 
    ok: true, 
    service: 'keeper-mcp', 
    version: '0.0.1',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
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
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(401).json({ 
      ok: false, 
      error: 'unauthorized',
      timestamp: new Date().toISOString()
    });
    return;
  }
  
  // Extract optional domain ID for scoping
  (req as any).domainId = (req.headers['x-domain-id'] as string) ?? null;
  
  next();
});

/**
 * GET /api/mcp/
 * Root endpoint - requires auth
 */
router.get('/', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({ 
    ok: true, 
    service: 'keeper-mcp', 
    version: '0.0.1',
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/mcp/whoami
 * Auth check endpoint - verifies bearer token is valid
 */
router.get('/whoami', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({ 
    ok: true,
    authenticated: true,
    service: 'keeper-mcp',
    domainId: (req as any).domainId || null,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/mcp/schema
 * Returns tool list with JSON schemas
 */
router.get('/schema', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json({ 
    ...getSchema(), 
    timestamp: new Date().toISOString() 
  });
});

/**
 * GET /api/mcp/tools
 * Standard MCP endpoint - Returns list of available tools
 * Compatible with OpenAI Agent Builder discovery
 */
router.get('/tools', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const schema = getSchema();
  res.json({ 
    tools: schema.tools.map(t => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters
    })),
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/mcp/capabilities
 * Standard MCP endpoint - Returns server capabilities
 */
router.get('/capabilities', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const schema = getSchema();
  res.json({ 
    service: schema.service,
    version: schema.version,
    capabilities: {
      tools: true,
      toolExecution: true,
      domainScoping: true
    },
    toolCount: schema.tools.length,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/mcp/.well-known/mcp
 * Well-known discovery endpoint for MCP
 */
router.get('/.well-known/mcp', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  const schema = getSchema();
  res.json({ 
    service: schema.service,
    version: schema.version,
    endpoints: {
      health: '/',
      tools: '/tools',
      capabilities: '/capabilities',
      schema: '/schema',
      call: '/call'
    },
    capabilities: {
      tools: true,
      toolExecution: true,
      domainScoping: true
    },
    timestamp: new Date().toISOString()
  });
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
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  
  try {
    const { name, args } = req.body ?? {};
    
    if (!name) {
      res.status(400).json({ 
        ok: false, 
        error: 'Missing tool name',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const result = await callTool(
      String(name), 
      args ?? {}, 
      { domainId: (req as any).domainId ?? null }
    );
    
    res.json({ 
      ok: true, 
      result,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    res.status(400).json({ 
      ok: false, 
      error: e?.message ?? 'Tool error',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Catch-all 404 handler for unsupported MCP routes
 * Returns JSON instead of falling through to SPA
 */
router.use('*', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(404).json({
    ok: false,
    error: 'Not found',
    path: req.originalUrl,
    availableEndpoints: ['/', '/tools', '/capabilities', '/.well-known/mcp', '/schema', '/call'],
    timestamp: new Date().toISOString()
  });
});

export default router;

