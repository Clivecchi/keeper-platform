/**
 * Capability check middleware — execution engine contract applied to HTTP routes.
 * Resolves agent capabilities (agent record ∩ board ceiling) and rejects with 403 when missing.
 */

import type { Request, Response, NextFunction } from 'express';
import { hasCapability, resolveAgentCapabilities } from '../capabilities/resolveCapabilities.js';

function readAgentRef(req: Request): { agentId?: string; agentSlug?: string; boardId?: string } {
  const q = req.query as Record<string, string | undefined>;
  return {
    agentId: q.agentId ?? (req.headers['x-agent-id'] as string | undefined),
    agentSlug: q.agentSlug ?? (req.headers['x-agent-slug'] as string | undefined),
    boardId: q.boardId ?? (req.headers['x-board-id'] as string | undefined),
  };
}

export function requireCapability(required: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { agentId, agentSlug, boardId } = readAgentRef(req);
    if (!agentId && !agentSlug) {
      res.status(400).json({
        error: 'agentId or agentSlug required for capability check',
        requiredCapability: required,
      });
      return;
    }

    const resolved = await resolveAgentCapabilities({ agentId, agentSlug, boardId });
    if (!resolved) {
      res.status(404).json({ error: 'Agent not found', requiredCapability: required });
      return;
    }

    if (!hasCapability(resolved, required)) {
      res.status(403).json({
        error: 'Capability denied',
        requiredCapability: required,
        agentSlug: resolved.agentSlug,
        capabilities: resolved.capabilities,
      });
      return;
    }

    (req as Request & { resolvedCapabilities?: typeof resolved }).resolvedCapabilities = resolved;
    next();
  };
}
