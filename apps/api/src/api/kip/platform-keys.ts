/**
 * Platform API Keys API Endpoints
 * ===============================
 * 
 * Admin-level endpoints for managing platform API keys
 * These keys serve as fallbacks when users don't provide their own keys
 */

import express, { Router } from 'express';
import { z } from 'zod';
import { PlatformApiKeyService } from '../../services/PlatformApiKeyService';
import { ModelProvider } from '@keeper/database';

const router: Router = express.Router();

// Validation schemas
const PlatformKeyInputSchema = z.object({
  provider: z.enum(['openai', 'anthropic', 'together', 'elevenlabs']),
  api_key: z.string().min(5, 'API key must be at least 5 characters'),
  label: z.string().optional(),
  is_active: z.boolean().optional()
});

const UpdateKeyStatusSchema = z.object({
  is_active: z.boolean()
});

/**
 * GET /api/kip/platform-keys
 * Get all platform API keys (masked for security)
 */
router.get('/', async (req, res) => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    
    // TODO: Add admin role verification here
    // if (!isAdminUser(adminUserId)) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const result = await PlatformApiKeyService.getAllKeys();
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to fetch platform keys' 
      });
    }

    // Also include stats for the admin dashboard
    const stats = await PlatformApiKeyService.getKeyStats();

    return res.json({
      success: true,
      data: {
        keys: result.data || [],
        stats
      }
    });
  } catch (error) {
    console.error('Platform keys fetch error:', error);
    return res.status(500).json({ 
      error: 'Internal server error while fetching platform keys' 
    });
  }
});

/**
 * POST /api/kip/platform-keys
 * Create or update a platform API key
 */
router.post('/', async (req, res) => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    
    // TODO: Add admin role verification here
    // if (!isAdminUser(adminUserId)) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    // Validate input
    const validation = PlatformKeyInputSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: validation.error.errors
      });
    }

    const input = validation.data;

    // Validate API key format
    if (!PlatformApiKeyService.validateKeyFormat(input.provider as ModelProvider, input.api_key)) {
      return res.status(400).json({
        error: `Invalid API key format for ${input.provider}`
      });
    }

    const result = await PlatformApiKeyService.upsertKey(input, adminUserId);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to save platform key' 
      });
    }

    return res.json({
      success: true,
      data: {
        ...result.data,
        api_key: undefined // Don't return the actual key
      },
      message: `Platform key for ${input.provider} saved successfully`
    });
  } catch (error) {
    console.error('Platform key creation error:', error);
    return res.status(500).json({ 
      error: 'Internal server error while saving platform key' 
    });
  }
});

/**
 * PATCH /api/kip/platform-keys/:provider/status
 * Update platform key active status
 */
router.patch('/:provider/status', async (req, res) => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const provider = req.params.provider as ModelProvider;
    
    // TODO: Add admin role verification here
    // if (!isAdminUser(adminUserId)) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    // Validate provider
    if (!['openai', 'anthropic', 'together', 'elevenlabs'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    // Validate input
    const validation = UpdateKeyStatusSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid input data',
        details: validation.error.errors
      });
    }

    const { is_active } = validation.data;

    const result = await PlatformApiKeyService.updateKeyStatus(provider, is_active, adminUserId);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to update platform key status' 
      });
    }

    return res.json({
      success: true,
      data: {
        ...result.data,
        api_key: undefined // Don't return the actual key
      },
      message: `Platform key for ${provider} ${is_active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Platform key status update error:', error);
    return res.status(500).json({ 
      error: 'Internal server error while updating platform key status' 
    });
  }
});

/**
 * DELETE /api/kip/platform-keys/:provider
 * Delete a platform API key
 */
router.delete('/:provider', async (req, res) => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    const provider = req.params.provider as ModelProvider;
    
    // TODO: Add admin role verification here
    // if (!isAdminUser(adminUserId)) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    // Validate provider
    if (!['openai', 'anthropic', 'together', 'elevenlabs'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid provider' });
    }

    const result = await PlatformApiKeyService.deleteKey(provider);
    
    if (!result.success) {
      return res.status(500).json({ 
        error: result.error || 'Failed to delete platform key' 
      });
    }

    return res.json({
      success: true,
      message: `Platform key for ${provider} deleted successfully`
    });
  } catch (error) {
    console.error('Platform key deletion error:', error);
    return res.status(500).json({ 
      error: 'Internal server error while deleting platform key' 
    });
  }
});

/**
 * GET /api/kip/platform-keys/stats
 * Get platform key statistics for admin dashboard
 */
router.get('/stats', async (req, res) => {
  try {
    const adminUserId = req.headers['x-user-id'] as string;
    
    // TODO: Add admin role verification here
    // if (!isAdminUser(adminUserId)) {
    //   return res.status(403).json({ error: 'Admin access required' });
    // }

    const stats = await PlatformApiKeyService.getKeyStats();
    const hasActiveKeys = await PlatformApiKeyService.hasActiveKeys();

    return res.json({
      success: true,
      data: {
        ...stats,
        hasActiveKeys,
        warning: !hasActiveKeys ? 'No active platform keys configured. User requests may fail without fallback keys.' : null
      }
    });
  } catch (error) {
    console.error('Platform key stats error:', error);
    return res.status(500).json({ 
      error: 'Internal server error while fetching platform key stats' 
    });
  }
});

export default router; 