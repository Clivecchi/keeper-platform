// src/mcp/auth.ts
// Authentication middleware for MCP (Model Context Protocol) server
// Validates API key from Authorization header or x-api-key header

import type { Request, Response, NextFunction } from 'express';

/**
 * MCP Authentication Middleware
 * 
 * Validates the OpenAI Agent's API key against OPAI_AGENT_MCP_KEY env var.
 * Accepts key from either:
 * - Authorization: Bearer <key>
 * - x-api-key: <key>
 * 
 * Also extracts optional x-domain-id header for domain scoping.
 */
export function mcpAuth(req: Request, res: Response, next: NextFunction): void {
  const bearer = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  const apiKey = (req.headers['x-api-key'] as string) || bearer;
  const expected = process.env.OPAI_AGENT_MCP_KEY?.trim();

  // Validate API key
  if (!expected || !apiKey || apiKey !== expected) {
    res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Invalid or missing API key'
    });
    return;
  }

  // Extract optional domain ID for scoping
  (req as any).domainId = (req.headers['x-domain-id'] as string) ?? null;

  next();
}

