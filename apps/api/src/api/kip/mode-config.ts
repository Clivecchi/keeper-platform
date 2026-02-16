import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@keeper/database';
import { loadModeState, updateModeState } from '../../services/kip/modeConfig.js';

const router: Router = express.Router({ mergeParams: true });

const OutputStyleEnum = z.enum(['concise', 'normal', 'expanded']);

const LimitsSchema = z.object({
  maxChars: z.number().int().min(0).nullable().optional(),
}).optional();

const DomainModeSchema = z.object({
  lensId: z.string().nullable().optional(),
  outputStyle: OutputStyleEnum.optional(),
  limits: LimitsSchema,
  contextFlags: z.record(z.boolean()).optional(),
});

const DebugModeSchema = DomainModeSchema.extend({
  captureN: z.number().int().min(1).max(50).optional(),
  autoBrief: z.boolean().optional(),
  includeFixPlan: z.boolean().optional(),
});

const ModeConfigPatchSchema = z.object({
  activeMode: z.enum(['domain', 'debug']).optional(),
  modeConfigs: z
    .object({
      domain: DomainModeSchema.optional(),
      debug: DebugModeSchema.optional(),
    })
    .optional(),
});

router.get('/:agentId/mode-config', async (req, res) => {
  try {
    const { agentId } = req.params;
    const domainId = typeof req.query.domainId === 'string' ? req.query.domainId : undefined;
    const result = await loadModeState(agentId, domainId);
    const activeMode = result.state.activeMode;
    const modeConfig = result.state.modeConfigs[activeMode];
    const lensId =
      modeConfig?.lensId ??
      (activeMode === 'debug' ? result.lenses.debugLensId : result.lenses.domainLensId) ??
      null;

    let resolvedLens: { id: string; name: string } | null = null;
    if (lensId) {
      const lens = await prisma.kip_lenses.findUnique({
        where: { id: lensId },
        select: { id: true, name: true },
      });
      if (lens) {
        resolvedLens = { id: lens.id, name: lens.name };
      }
    }
    if (!resolvedLens) {
      resolvedLens = {
        id: '',
        name: activeMode === 'debug' ? 'Debug Investigator Lens' : 'Domain Lens',
      };
    }

    return res.json({
      success: true,
      data: {
        ...result.state,
        domainKey: result.domainKey,
        lenses: result.lenses,
        resolvedLens,
      },
    });
  } catch (error) {
    console.error('[kip/mode-config] GET error', error);
    return res.status(500).json({ success: false, error: 'Failed to load mode config' });
  }
});

router.patch('/:agentId/mode-config', async (req, res) => {
  try {
    const { agentId } = req.params;
    const domainId = typeof req.query.domainId === 'string' ? req.query.domainId : undefined;
    const validation = ModeConfigPatchSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Invalid mode config input', details: validation.error.errors });
    }

    const payload = validation.data;
    const updated = await updateModeState(agentId, domainId, {
      ...(payload.activeMode ? { activeMode: payload.activeMode } : {}),
      ...(payload.modeConfigs
        ? {
            modeConfigs: {
              domain: payload.modeConfigs.domain || {},
              debug: payload.modeConfigs.debug || {},
            },
          }
        : {}),
    });
    return res.json({ success: true, data: updated });
  } catch (error) {
    console.error('[kip/mode-config] PATCH error', error);
    return res.status(500).json({ success: false, error: 'Failed to update mode config' });
  }
});

export default router;
