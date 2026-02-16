/**
 * User Voice Preferences API
 *
 * GET  /api/users/me/voice-preferences — return preferences for authenticated user; create default row if missing
 * PATCH /api/users/me/voice-preferences — update preferences
 */

import { Router, type Request, type Response } from 'express';
import { prisma } from '@keeper/database';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { z } from 'zod';

const PATCH_SCHEMA = z.object({
  directness: z.enum(['direct', 'diplomatic', 'default']).optional(),
  conciseness: z.enum(['concise', 'normal', 'expanded']).optional(),
  preamble: z.enum(['minimal', 'normal', 'contextual']).optional(),
});

const router = Router();

router.get('/me/voice-preferences', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    let prefs = await prisma.userVoicePreferences.findUnique({
      where: { userId },
    });

    if (!prefs) {
      prefs = await prisma.userVoicePreferences.create({
        data: {
          userId,
          updatedAt: new Date(),
        },
      });
    }

    return res.json({
      directness: prefs.directness ?? 'default',
      conciseness: prefs.conciseness ?? 'normal',
      preamble: prefs.preamble ?? 'normal',
    });
  } catch (err) {
    console.error('[VoicePreferences] GET error', err);
    return res.status(500).json({ error: 'Failed to load voice preferences' });
  }
});

router.patch('/me/voice-preferences', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const parsed = PATCH_SCHEMA.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid payload', details: parsed.error.flatten() });
    }

    const data = parsed.data as Record<string, string | undefined>;
    const updateData: Record<string, string | Date> = { updatedAt: new Date() };
    if (data.directness !== undefined) updateData.directness = data.directness;
    if (data.conciseness !== undefined) updateData.conciseness = data.conciseness;
    if (data.preamble !== undefined) updateData.preamble = data.preamble;

    const prefs = await prisma.userVoicePreferences.upsert({
      where: { userId },
      create: {
        userId,
        directness: updateData.directness as string | undefined,
        conciseness: updateData.conciseness as string | undefined,
        preamble: updateData.preamble as string | undefined,
        updatedAt: new Date(),
      },
      update: updateData,
    });

    return res.json({
      directness: prefs.directness ?? 'default',
      conciseness: prefs.conciseness ?? 'normal',
      preamble: prefs.preamble ?? 'normal',
    });
  } catch (err) {
    console.error('[VoicePreferences] PATCH error', err);
    return res.status(500).json({ error: 'Failed to update voice preferences' });
  }
});

export default router;
