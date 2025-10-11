// src/mcp/cors.ts
// CORS middleware for MCP endpoints
// Ensures OpenAI Agent Builder can connect without preflight failures

import type { Request, Response, NextFunction } from 'express';

/**
 * MCP CORS Middleware
 * 
 * Adds universal CORS headers to all MCP responses and handles OPTIONS preflight.
 * Required for OpenAI Agent Builder to connect successfully.
 * 
 * Headers set:
 * - Access-Control-Allow-Origin: * (universal access)
 * - Vary: Origin (cache considerations)
 * - Access-Control-Allow-Methods: GET,POST,OPTIONS
 * - Access-Control-Allow-Headers: Content-Type, Authorization, x-api-key, x-domain-id
 * - Access-Control-Max-Age: 600 (10 minutes)
 */
export function mcpCors(req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, x-api-key, x-domain-id'
  );
  res.setHeader('Access-Control-Max-Age', '600');
  
  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
}

