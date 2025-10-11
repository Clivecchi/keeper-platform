// src/mcp/index.ts
// MCP (Model Context Protocol) Router
// Minimal server for OpenAI Agent integration
// Updated with universal CORS for OpenAI Agent Builder compatibility

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { getSchema, callTool } from './tools.js';

const router = Router();

/**
 * Universal CORS + Preflight Handler
 * Ensures OpenAI Agent Builder can connect without hanging
 */
router.use((req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, x-domain-id');
  res.setHeader('Access-Control-Max-Age', '600');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

/**
 * Auth Middleware
 * Accepts both Authorization: Bearer and x-api-key headers
 */
router.use((req: Request, res: Response, next: NextFunction) => {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const apiKey = (req.headers['x-api-key'] as string) || bearer;
  const expected = process.env.OPAI_AGENT_MCP_KEY?.trim();
  
  if (!expected || !apiKey || apiKey !== expected) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.status(401).json({ 
      ok: false, 
      error: 'Unauthorized',
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
 * Health check endpoint
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
      { domainId: (req as any).domainId }
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

export default router;

