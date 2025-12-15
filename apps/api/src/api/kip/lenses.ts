import express, { Router } from 'express';
import { z } from 'zod';
import { prisma } from '@keeper/database';

const router: Router = express.Router();

const LensInputSchema = z.object({
  domainId: z.string().optional(),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  systemPrompt: z.string().min(10, 'System prompt must be at least 10 characters'),
  rulesJson: z.any().optional(),
  outputSchemaJson: z.any().optional(),
});

/**
 * GET /api/kip/lenses
 * Optional query: domainId
 */
router.get('/', async (req, res) => {
  try {
    const domainId = typeof req.query.domainId === 'string' ? req.query.domainId : undefined;
    const lenses = await prisma.kip_lenses.findMany({
      where: domainId ? { domainId } : {},
      orderBy: { updatedAt: 'desc' },
    });
    return res.json({ success: true, data: lenses });
  } catch (error) {
    console.error('[kip/lenses] GET error', error);
    return res.status(500).json({ success: false, error: 'Failed to load lenses' });
  }
});

/**
 * POST /api/kip/lenses
 * Create a new lens
 */
router.post('/', async (req, res) => {
  try {
    const validation = LensInputSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Invalid lens input', details: validation.error.errors });
    }

    const data = validation.data;
    const lens = await prisma.kip_lenses.create({
      data: {
        domainId: data.domainId ?? 'default',
        name: data.name,
        systemPrompt: data.systemPrompt,
        rulesJson: data.rulesJson ?? null,
        outputSchemaJson: data.outputSchemaJson ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    return res.status(201).json({ success: true, data: lens });
  } catch (error) {
    console.error('[kip/lenses] POST error', error);
    return res.status(500).json({ success: false, error: 'Failed to create lens' });
  }
});

/**
 * PATCH /api/kip/lenses/:id
 * Update an existing lens
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validation = LensInputSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ success: false, error: 'Invalid lens input', details: validation.error.errors });
    }

    const data = validation.data;
    const lens = await prisma.kip_lenses.update({
      where: { id },
      data: {
        ...(data.domainId !== undefined ? { domainId: data.domainId || 'default' } : {}),
        ...(data.name ? { name: data.name } : {}),
        ...(data.systemPrompt ? { systemPrompt: data.systemPrompt } : {}),
        rulesJson: data.rulesJson ?? undefined,
        outputSchemaJson: data.outputSchemaJson ?? undefined,
        updatedAt: new Date(),
      },
    });

    return res.json({ success: true, data: lens });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ success: false, error: 'Lens not found' });
    }
    console.error('[kip/lenses] PATCH error', error);
    return res.status(500).json({ success: false, error: 'Failed to update lens' });
  }
});

export default router;
