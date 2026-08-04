/**
 * Unauthenticated OAuth discovery routes (RFC 9728 + RFC 8414).
 * Mounted at app root — not under /mcp auth middleware.
 */

import { Router } from 'express';
import type { Request, Response } from 'express';
import {
  buildAuthorizationServerMetadata,
  buildProtectedResourceMetadata,
} from './oauthDiscovery.js';

const router = Router();

function sendDiscoveryJson(res: Response, body: unknown): void {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json(body);
}

/**
 * GET /.well-known/oauth-protected-resource
 * Path-suffixed twin for MCP-at-/mcp clients that probe without WWW-Authenticate.
 */
router.get(
  [
    '/.well-known/oauth-protected-resource',
    '/.well-known/oauth-protected-resource/mcp',
  ],
  (_req: Request, res: Response) => {
    sendDiscoveryJson(res, buildProtectedResourceMetadata());
  },
);

/**
 * GET /.well-known/oauth-authorization-server
 * Phase A: metadata only — authorize/token/register land in Phase B.
 */
router.get('/.well-known/oauth-authorization-server', (_req: Request, res: Response) => {
  sendDiscoveryJson(res, buildAuthorizationServerMetadata());
});

export default router;
