/**
 * KIP User Keys API
 * =================
 * 
 * Endpoints for managing user-scoped API keys for model providers
 */

import type { Request, Response } from 'express';
import { KipUserKeyService } from '../../services/KipUserKeyService.js';
import type { ModelProvider } from '@keeper/database/types';

/**
 * GET /api/kip/user-keys
 * Get masked API keys for the current user
 */
export async function getUserKeys(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const maskedKeys = await KipUserKeyService.getUserKeysMasked(userId);
    
    return res.json({
      success: true,
      data: maskedKeys
    });
  } catch (error) {
    console.error('Error fetching user keys:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user keys' 
    });
  }
}

/**
 * POST /api/kip/user-keys
 * Set or update a user's API key for a provider
 */
export async function setUserKey(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { provider, apiKey } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    if (!provider || !apiKey) {
      return res.status(400).json({ 
        error: 'Provider and API key are required' 
      });
    }

    const validProviders: ModelProvider[] = ['openai', 'anthropic', 'together', 'elevenlabs'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({ 
        error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` 
      });
    }

    const success = await KipUserKeyService.setUserKey(provider, userId, apiKey);
    
    if (success) {
      return res.json({
        success: true,
        message: `API key set for ${provider}`
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to set API key'
      });
    }
  } catch (error) {
    console.error('Error setting user key:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to set user key' 
    });
  }
}

/**
 * DELETE /api/kip/user-keys/:provider
 * Delete a user's API key for a specific provider
 */
export async function deleteUserKey(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    const { provider } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const validProviders: ModelProvider[] = ['openai', 'anthropic', 'together', 'elevenlabs'];
    if (!validProviders.includes(provider as ModelProvider)) {
      return res.status(400).json({ 
        error: `Invalid provider. Must be one of: ${validProviders.join(', ')}` 
      });
    }

    const success = await KipUserKeyService.deleteUserKey(provider as ModelProvider, userId);
    
    if (success) {
      return res.json({
        success: true,
        message: `API key deleted for ${provider}`
      });
    } else {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete API key'
      });
    }
  } catch (error) {
    console.error('Error deleting user key:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to delete user key' 
    });
  }
}

/**
 * GET /api/kip/user-keys/providers
 * Get all providers for which the user has API keys
 */
export async function getUserProviders(req: Request, res: Response) {
  try {
    const userId = req.headers['x-user-id'] as string;
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID required' });
    }

    const providers = await KipUserKeyService.getUserProviders(userId);
    
    return res.json({
      success: true,
      data: providers
    });
  } catch (error) {
    console.error('Error fetching user providers:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch user providers' 
    });
  }
}

/**
 * Main handler for user keys routes
 */
export default async function handler(req: Request, res: Response) {
  const { method } = req;

  switch (method) {
    case 'GET':
      if (req.path.endsWith('/providers')) {
        return getUserProviders(req, res);
      }
      return getUserKeys(req, res);
    
    case 'POST':
      return setUserKey(req, res);
    
    case 'DELETE':
      return deleteUserKey(req, res);
    
    default:
      res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
      return res.status(405).json({ error: `Method ${method} Not Allowed` });
  }
} 