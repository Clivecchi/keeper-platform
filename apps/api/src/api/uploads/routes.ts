/**
 * Upload API Routes - Phase 3 Implementation
 * Signed uploads for media assets (Vercel Blob)
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

const router: Router = Router();

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

const SignUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image\/(png|jpg|jpeg|webp)|video\/mp4)$/),
  size: z.number().min(1).max(25 * 1024 * 1024) // 25MB max
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/uploads/sign → returns signed URL for direct upload
 */
router.post('/sign', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Validate request
    const { filename, contentType, size } = SignUploadSchema.parse(req.body);

    // Generate unique key
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = filename.split('.').pop();
    const key = `uploads/${userId}/${timestamp}-${randomSuffix}.${extension}`;

    // For now, we'll use a simple approach without Vercel Blob
    // In production, you would integrate with Vercel Blob or S3 here
    // For Phase 3, we'll provide a fallback that accepts direct uploads
    
    const signedData = {
      url: `${process.env.API_BASE_URL || 'http://localhost:3001'}/api/uploads/direct`,
      method: 'POST',
      fields: {
        key,
        'Content-Type': contentType,
        'x-user-id': userId
      },
      key,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    };

    return res.json({
      success: true,
      data: signedData
    });
  } catch (error) {
    console.error('Error signing upload:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid upload parameters', 
        details: error.errors 
      });
    }
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * POST /api/uploads/direct → direct upload endpoint (fallback)
 */
router.post('/direct', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // In a real implementation, you would:
    // 1. Validate the uploaded file
    // 2. Store it in Vercel Blob/S3
    // 3. Return the public URL
    
    // For Phase 3, we'll simulate a successful upload
    const { key } = req.body;
    
    if (!key) {
      return res.status(400).json({ success: false, error: 'Missing key' });
    }

    // Simulate upload success with a placeholder URL
    const publicUrl = `https://placeholder.keeper.com/${key}`;

    return res.json({
      success: true,
      data: {
        url: publicUrl,
        key,
        size: req.body.size || 0,
        contentType: req.body['Content-Type'] || 'image/jpeg'
      }
    });
  } catch (error) {
    console.error('Error in direct upload:', error);
    return res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

/**
 * DELETE /api/uploads/:key → remove uploaded asset
 */
router.delete('/:key', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { key } = req.params;
    
    // Validate that the user owns this upload (key should start with uploads/{userId}/)
    if (!key.startsWith(`uploads/${userId}/`)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // In a real implementation, you would delete from Vercel Blob/S3
    // For Phase 3, we'll just return success
    console.log(`Simulated deletion of upload key: ${key}`);

    return res.json({
      success: true,
      data: { key, deleted: true }
    });
  } catch (error) {
    console.error('Error deleting upload:', error);
    return res.status(500).json({ success: false, error: 'Delete failed' });
  }
});

export default router;
