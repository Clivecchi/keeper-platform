/**
 * Upload API Routes - Vercel Blob Integration
 * Direct uploads for media assets using Vercel Blob Storage
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { put, del } from '@vercel/blob';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';

const router: Router = Router();

/** Allowed blob hostnames - only proxy URLs from our Vercel Blob store */
const BLOB_HOST_PATTERN = /\.(public|private)\.blob\.vercel-storage\.com$/;

// =============================================================================
// PUBLIC ROUTES (no auth)
// =============================================================================

/**
 * GET /api/uploads/proxy?url=... - Proxy blob images for public display
 * Fixes 401 when blob store is private or has access restrictions.
 * Only allows URLs from *.blob.vercel-storage.com.
 */
router.get('/proxy', async (req: Request, res: Response) => {
  try {
    const rawUrl = req.query.url;
    if (typeof rawUrl !== 'string' || !rawUrl) {
      return res.status(400).json({ error: 'Missing url query parameter' });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(rawUrl);
    } catch {
      return res.status(400).json({ error: 'Invalid url' });
    }

    if (!BLOB_HOST_PATTERN.test(parsedUrl.hostname)) {
      return res.status(403).json({ error: 'URL must be from Vercel Blob storage' });
    }

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return res.status(503).json({ error: 'Blob storage not configured' });
    }

    const isPrivate = parsedUrl.hostname.includes('.private.');
    let blobRes = await fetch(parsedUrl.href, {
      headers: isPrivate ? { Authorization: `Bearer ${token}` } : undefined,
    });
    // Some "public" URLs may 401 if store is private - retry with token
    if (blobRes.status === 401 && !isPrivate) {
      blobRes = await fetch(parsedUrl.href, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    if (!blobRes.ok) {
      return res.status(blobRes.status).json({ error: 'Failed to fetch image' });
    }

    const contentType = blobRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h cache
    const buffer = Buffer.from(await blobRes.arrayBuffer());
    res.send(buffer);
  } catch (error) {
    console.error('[Upload Proxy] Error:', error);
    res.status(500).json({ error: 'Failed to proxy image' });
  }
});

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
 * POST /api/uploads/sign → prepare upload metadata and return endpoint
 * Client will send the actual file to /api/uploads/direct
 */
router.post('/sign', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    // Debug logging for auth issues
    console.log('[Upload Sign] Auth check:', {
      hasUser: !!(req as any).user,
      userId: (req as any).user?.id,
      hasCookie: !!(req as any).cookies?.keeper_session,
      hasAuthHeader: !!req.header('Authorization'),
      origin: req.get('origin'),
      host: req.get('host')
    });
    
    const userId = (req as any).user?.id;
    if (!userId) {
      console.error('[Upload Sign] No user ID found - returning 401');
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    // Validate request
    const { filename, contentType, size } = SignUploadSchema.parse(req.body);

    // Generate unique key for this upload
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = filename.split('.').pop();
    const key = `uploads/${userId}/${timestamp}-${randomSuffix}.${extension}`;

    // Build upload URL - always use HTTPS in production
    // Railway terminates SSL at load balancer, so req.protocol may be 'http' internally
    // but we need to return HTTPS URLs for the frontend
    // IMPORTANT: Use the proper API domain (api.ke3p.com) not the Railway hostname
    // to ensure cookies are sent with the upload request
    const isProduction = process.env.NODE_ENV === 'production';
    const baseUrl = process.env.API_BASE_URL || (isProduction ? 'https://api.ke3p.com' : `${req.protocol || 'http'}://${req.get('host')}`);

    // Return upload endpoint - client will POST the file here with the key
    const signedData = {
      url: `${baseUrl}/api/uploads/direct`,
      method: 'POST',
      fields: {
        key,
        'Content-Type': contentType,
        'x-user-id': userId,
        'x-filename': filename
      },
      key,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour
    };

    console.log('[Upload Sign] Returning signed URL:', {
      url: signedData.url,
      baseUrl,
      requestHost: req.get('host')
    });

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
 * POST /api/uploads/direct → upload file to Vercel Blob
 * Expects JSON body with { key, file: base64String, contentType }
 */
router.post('/direct', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { key, file, contentType } = req.body;
    
    if (!key || !file) {
      return res.status(400).json({ success: false, error: 'Missing key or file data' });
    }

    // Validate user owns this key (allows contextual paths: uploads/{userId}/agent/.../domain/.../keeper/.../journey/...)
    if (!key.startsWith(`uploads/${userId}/`)) {
      return res.status(403).json({ success: false, error: 'Invalid upload key' });
    }
    // Reject path traversal
    if (key.includes('..')) {
      return res.status(403).json({ success: false, error: 'Invalid upload key' });
    }

    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not configured, upload will fail');
      return res.status(500).json({ 
        success: false, 
        error: 'Storage not configured. Please set BLOB_READ_WRITE_TOKEN environment variable.' 
      });
    }

    // Convert base64 to Buffer
    const fileBuffer = Buffer.from(file, 'base64');

    // Upload to Vercel Blob
    const blob = await put(key, fileBuffer, {
      access: 'public',
      contentType: contentType || 'application/octet-stream',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log(`✅ Uploaded file to Vercel Blob: ${blob.url}`);

    return res.json({
      success: true,
      data: {
        url: blob.url,
        key: key,
        size: fileBuffer.length,
        contentType: contentType || 'application/octet-stream'
      }
    });
  } catch (error) {
    console.error('Error in direct upload:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Upload failed' 
    });
  }
});

const ImportUrlSchema = z.object({
  url: z.string().url(),
  domainId: z.string().min(1),
  displayLabel: z.string().max(200).optional(),
  keeperId: z.string().optional(),
});

/**
 * POST /api/uploads/import-url — fetch external image and persist to Vercel Blob + Library
 */
router.post('/import-url', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const parsed = ImportUrlSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: 'Invalid request', details: parsed.error.flatten() });
    }

    const { persistImageToLibrary } = await import('../../services/imageArchiveService.js');
    const result = await persistImageToLibrary({
      sourceUrl: parsed.data.url,
      userId,
      domainId: parsed.data.domainId,
      displayLabel: parsed.data.displayLabel,
      keeperId: parsed.data.keeperId,
    });

    return res.json({
      success: true,
      data: {
        url: result.persistedUrl,
        libraryItemId: result.libraryItemId,
      },
    });
  } catch (error) {
    console.error('[Upload Import URL] Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import image',
    });
  }
});

/**
 * DELETE /api/uploads/:key → remove uploaded asset from Vercel Blob
 */
router.delete('/:key(*)', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const key = req.params.key;
    
    if (!key) {
      return res.status(400).json({ success: false, error: 'Missing key' });
    }

    // Validate that the user owns this upload (key should start with uploads/{userId}/)
    if (!key.startsWith(`uploads/${userId}/`)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Check if BLOB_READ_WRITE_TOKEN is configured
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.warn('BLOB_READ_WRITE_TOKEN not configured, delete will be skipped');
      return res.json({
        success: true,
        data: { key, deleted: false, reason: 'Storage not configured' }
      });
    }

    // Delete from Vercel Blob
    await del(key, {
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log(`✅ Deleted file from Vercel Blob: ${key}`);

    return res.json({
      success: true,
      data: { key, deleted: true }
    });
  } catch (error) {
    console.error('Error deleting upload:', error);
    return res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Delete failed' 
    });
  }
});

export default router;
