/**
 * Image Generation Subagent — Route Handler
 * POST /api/image/generate
 *
 * Receives a creative brief, assembles a FLUX prompt, and calls
 * ModelProviderService.generateImage() via Together AI.
 *
 * Auth-gated. No Kip memory, domain context, or brand voice required.
 * This is a specialist endpoint: receives a well-formed brief, executes, returns a URL.
 *
 * Intended caller: Kip (Step 4 wires the image.generate action).
 * Can also be called directly for testing or by other platform services.
 *
 * Rate limited: 10 requests per minute per IP.
 *
 * KE3P · Keeper Platform · March 2026
 */

import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { ModelProviderService } from '../../services/ModelProviderService.js';
import type { ImageGenerationBrief } from '../../services/ModelProviderService.js';

const router = express.Router();

// ─── Rate limiter ─────────────────────────────────────────────────────────────
// Image generation is expensive — stricter than companion (10 vs 20 req/min)

const imageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many image generation requests. Try again shortly.',
    });
  },
});

// ─── Aspect ratio map ─────────────────────────────────────────────────────────

const ASPECT_RATIO_MAP: Record<string, { width: number; height: number }> = {
  '1:1':  { width: 1024, height: 1024 },
  '16:9': { width: 1344, height: 768  },
  '9:16': { width: 768,  height: 1344 },
  '4:3':  { width: 1024, height: 768  },
};

// ─── Request schema ───────────────────────────────────────────────────────────

const ImageGenerateSchema = z.object({
  subject:        z.string().min(1).max(500),
  mood:           z.string().max(200).optional(),
  style:          z.string().max(200).optional(),
  aspect_ratio:   z.enum(['1:1', '16:9', '9:16', '4:3']).optional().default('1:1'),
  model:          z.string().max(100).optional(),
  domain_context: z.string().max(500).optional(),
});

type ImageGenerateRequest = z.infer<typeof ImageGenerateSchema>;

// ─── Prompt assembly ──────────────────────────────────────────────────────────
// FLUX performs well with comma-separated descriptors.
// domain_context is folded in as a trailing style anchor — it frames the whole image.

function assembleFLUXPrompt(req: ImageGenerateRequest): string {
  const parts: string[] = [req.subject.trim()];
  if (req.mood)           parts.push(req.mood.trim());
  if (req.style)          parts.push(req.style.trim());
  if (req.domain_context) parts.push(req.domain_context.trim());
  return parts.join(', ');
}

// ─── Route ────────────────────────────────────────────────────────────────────

router.post('/generate', imageLimiter, authMiddlewareCompat, async (req: Request, res: Response) => {
  const validation = ImageGenerateSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: 'Invalid request.',
      details: validation.error.flatten().fieldErrors,
    });
  }

  const body = validation.data;
  const userId = req.user?.id;

  try {
    const prompt = assembleFLUXPrompt(body);
    const dimensions = ASPECT_RATIO_MAP[body.aspect_ratio] ?? ASPECT_RATIO_MAP['1:1'];

    const brief: ImageGenerationBrief = {
      prompt,
      model:          body.model,
      width:          dimensions.width,
      height:         dimensions.height,
      domain_context: body.domain_context,
    };

    console.log('[image/generate] Brief assembled:', {
      subject: body.subject,
      model:   brief.model ?? 'default (FLUX.1-schnell)',
      dims:    `${dimensions.width}x${dimensions.height}`,
      userId:  userId ?? 'none',
    });

    const result = await ModelProviderService.generateImage(brief, userId);

    return res.json({
      url:          result.url,
      model:        result.model,
      prompt:       result.prompt,
      subject:      body.subject,
      aspect_ratio: body.aspect_ratio,
    });

  } catch (error: unknown) {
    const err = error as any;
    console.error('[image/generate] FULL ERROR:', err);
    console.error('[image/generate] ERROR TYPE:', typeof err);
    console.error('[image/generate] ERROR CONSTRUCTOR:', err?.constructor?.name);
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[image/generate] Error:', message);

    if (
      message.includes('MISSING_API_KEY') ||
      message.includes('API key not configured') ||
      message.includes('TOGETHER_API_KEY')
    ) {
      return res.status(503).json({
        error: 'Image generation not configured — Together AI key missing.',
      });
    }

    return res.status(500).json({
      error:  'Image generation failed.',
      detail: message,
    });
  }
});

export default router;
