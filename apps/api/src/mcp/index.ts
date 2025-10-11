// src/mcp/index.ts
// MCP (Model Context Protocol) Router
// Minimal server for OpenAI Agent integration

import { Router } from 'express';
import type { Request, Response } from 'express';
import { mcpAuth } from './auth.js';
import { getSchema, callTool } from './tools.js';

const router = Router();

// Apply auth middleware to all MCP routes
router.use(mcpAuth);

/**
 * GET /api/mcp/
 * Health check endpoint
 */
router.get('/', (_req: Request, res: Response) => {
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
  res.json(getSchema());
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
  try {
    const { name, args } = req.body ?? {};
    
    if (!name) {
      res.status(400).json({ 
        ok: false, 
        error: 'Missing tool name' 
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

