// src/mcp/log.ts
// Structured logging for MCP endpoints
// Provides production-safe request logging without exposing secrets

import type { Request } from 'express';

/**
 * Log MCP Request
 * 
 * Emits a single-line structured JSON log for each MCP request.
 * Safe for production: never logs bearer tokens or sensitive data.
 * 
 * @param req - Express Request object
 * @param status - HTTP status code
 * @param startedAt - Request start timestamp (Date.now())
 * @param requestId - Unique request ID
 * @param toolName - Optional tool name for /call endpoint
 */
export function logMcp(
  req: Request, 
  status: number, 
  startedAt: number, 
  requestId: string,
  toolName?: string
): void {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const ua = req.headers['user-agent'] || 'n/a';
  const origin = req.headers.origin || 'n/a';
  const hasAuth = !!req.headers.authorization || !!req.headers['x-api-key'];
  const ms = Date.now() - startedAt;

  const logEntry: any = {
    ts: new Date().toISOString(),
    id: requestId,
    path: url.pathname,
    method: req.method,
    status,
    ms,
    hasAuth,
    ua,
    origin
  };

  // Include tool name for /call endpoint (never log arguments)
  if (toolName) {
    logEntry.tool = toolName;
  }

  // One-line structured log, easy to grep in Railway/Vercel logs
  console.info('[MCP]', JSON.stringify(logEntry));
}

