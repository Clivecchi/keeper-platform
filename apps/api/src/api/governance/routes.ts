/**
 * Domain Governance API Routes
 * Agent Policy, Contracts, Compliance
 */

import { Router, Response } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import type { AuthenticatedRequest } from '../../middleware/authMiddleware.js';
import {
  loadAgentContract,
  ensureAllDomainsHaveAgentPolicy,
} from '../../governance/index.js';
import { requireSuperAdmin } from '../../middleware/platformRoleMiddleware.js';

const router = Router();

// GET /api/governance/contracts - List contracts (auth required)
router.get(
  '/contracts',
  authMiddlewareCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const contracts = await prisma.agentContract.findMany({
        select: {
          id: true,
          name: true,
          version: true,
          publishedAt: true,
          enforceDraft: true,
          enforceAction: true,
          enforceToolFirst: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return res.json({ contracts });
    } catch (error) {
      console.error('[governance:contracts:list:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_LIST_CONTRACTS' });
    }
  }
);

// GET /api/governance/contracts/:id - Contract detail + full text
router.get(
  '/contracts/:id',
  authMiddlewareCompat,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const contract = await loadAgentContract(id);
      if (!contract) {
        return res.status(404).json({ error: 'CONTRACT_NOT_FOUND', message: 'Contract not found' });
      }
      return res.json({
        id: contract.id,
        name: contract.name,
        version: contract.version,
        contractText: contract.contractText,
        enforceDraft: contract.enforceDraft,
        enforceAction: contract.enforceAction,
        enforceToolFirst: contract.enforceToolFirst,
        enforceErrorRecovery: contract.enforceErrorRecovery,
        publishedAt: contract.publishedAt,
      });
    } catch (error) {
      console.error('[governance:contracts:get:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_LOAD_CONTRACT' });
    }
  }
);

// POST /api/governance/backfill - Ensure all domains have agent policies (super-admin only)
router.post(
  '/backfill',
  authMiddlewareCompat,
  requireSuperAdmin,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const created = await ensureAllDomainsHaveAgentPolicy();
      return res.json({ created, message: `Created ${created} domain agent policies` });
    } catch (error) {
      console.error('[governance:backfill:error]', error);
      return res.status(500).json({ error: 'FAILED_TO_BACKFILL', message: String(error) });
    }
  }
);

export default router;
