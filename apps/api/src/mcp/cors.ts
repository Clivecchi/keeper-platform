// src/mcp/cors.ts
// CORS middleware for MCP endpoints
// Ensures OpenAI Agent Builder can connect without preflight failures
// Updated to echo Origin and support credentialled requests

import type { Request, Response, NextFunction } from 'express';

const ALLOWED_HEADERS = 'Content-Type, Authorization, x-api-key, x-domain-id';

/**
 * MCP CORS Middleware
 * 
 * Adds CORS headers to all MCP responses and handles OPTIONS preflight.
 * Required for OpenAI Agent Builder to connect successfully.
 * 
 * Key features:
 * - Echoes the caller's Origin (required for credentialled requests)
 * - Access-Control-Allow-Credentials: true
 * - Supports GET, POST, OPTIONS, HEAD methods
 * - Vary: Origin for proper caching
 * - 600-second cache for preflight responses
 * 
 * Note: Cannot use wildcard (*) with credentials, so we echo the actual Origin.
 */
export function mcpCors(req: Request, res: Response, next: NextFunction): void {
  const origin = (req.headers.origin as string) || '*';
  
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS,HEAD');
  res.setHeader('Access-Control-Allow-Headers', ALLOWED_HEADERS);
  res.setHeader('Access-Control-Max-Age', '600');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}

