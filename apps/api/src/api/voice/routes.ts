/**
 * Voice Synthesis — Route Handler
 * POST /api/voice/synthesize
 *
 * Converts text to speech via ElevenLabs (ModelProviderService.synthesizeVoice).
 * Auth-gated. Returns raw audio/mpeg by default, or base64 JSON when requested.
 */

import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { ModelProviderService } from '../../services/ModelProviderService.js';

const router = express.Router();

const voiceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many voice synthesis requests. Try again shortly.',
    });
  },
});

const VoiceSynthesizeSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  format: z.enum(['stream', 'base64']).optional().default('stream'),
});

router.post('/synthesize', voiceLimiter, authMiddlewareCompat, async (req: Request, res: Response) => {
  const validation = VoiceSynthesizeSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request.',
      details: validation.error.flatten().fieldErrors,
    });
  }

  const body = validation.data;
  const userId = req.user?.id;

  try {
    console.log('[voice/synthesize] Request:', {
      textLength: body.text.length,
      voiceId: body.voiceId ?? 'default',
      model: body.model ?? 'default',
      format: body.format,
      userId: userId ?? 'none',
    });

    const result = await ModelProviderService.synthesizeVoice(
      {
        text: body.text,
        voiceId: body.voiceId,
        model: body.model,
      },
      userId,
    );

    if (body.format === 'base64') {
      return res.json({
        audio: result.audio.toString('base64'),
        contentType: result.contentType,
        voiceId: result.voiceId,
        model: result.model,
        text: result.text,
      });
    }

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Length', result.audio.length);
    res.setHeader('X-Voice-Id', result.voiceId);
    res.setHeader('X-Model-Id', result.model);
    return res.send(result.audio);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[voice/synthesize] Error:', message);

    if (
      message.includes('MISSING_API_KEY') ||
      message.includes('API key not configured') ||
      message.includes('ELEVENLABS_API_KEY')
    ) {
      return res.status(503).json({
        error: 'Voice synthesis not configured — ElevenLabs key missing.',
      });
    }

    return res.status(500).json({
      error: 'Voice synthesis failed.',
      detail: message,
    });
  }
});

export default router;
