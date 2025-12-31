/**
 * Platform API Key Service
 * =========================
 * 
 * Service for managing platform-level API keys used as fallbacks when users
 * don't provide their own keys. Admin-level access only.
 */

import { prisma } from '@keeper/database';
import { PlatformApiKey, PlatformApiKeyInput, ModelProvider } from '@keeper/database';

export class PlatformApiKeyService {
  /**
   * Get all platform API keys (masked for security)
   */
  static async getAllKeys(): Promise<{
    success: boolean;
    data?: Array<Omit<PlatformApiKey, 'api_key'> & { maskedKey: string }>;
    error?: string;
  }> {
    try {
      const keys = await prisma.kip_platform_keys.findMany({
        orderBy: { created_at: 'desc' }
      });

      const maskedKeys = keys.map((key: any) => ({
        ...key,
        maskedKey: this.maskApiKey(key.api_key),
        api_key: undefined // Remove the actual key
      })).map(({ api_key, ...rest }: any) => rest); // Type-safe removal

      return { success: true, data: maskedKeys };
    } catch (error) {
      console.error('Error fetching platform keys:', error);
      return { 
        success: false, 
        error: 'Failed to fetch platform API keys' 
      };
    }
  }

  /**
   * Get active platform key for a specific provider
   */
  static async getActiveKey(provider: ModelProvider): Promise<{
    success: boolean;
    data?: PlatformApiKey;
    error?: string;
  }> {
    try {
      const key = await prisma.kip_platform_keys.findFirst({
        where: {
          provider,
          is_active: true
        }
      });

      if (!key) {
        return { 
          success: false, 
          error: `No active platform key found for ${provider}` 
        };
      }

      return { success: true, data: key };
    } catch (error) {
      console.error(`Error fetching active key for ${provider}:`, error);
      return { 
        success: false, 
        error: `Failed to fetch active key for ${provider}` 
      };
    }
  }

  /**
   * Create or update a platform API key
   */
  static async upsertKey(
    input: PlatformApiKeyInput, 
    adminUserId?: string
  ): Promise<{
    success: boolean;
    data?: PlatformApiKey;
    error?: string;
  }> {
    try {
      // Validate and sanitize the adminUserId to ensure it's a valid UUID or null
      let validatedAdminUserId: string | null = null;
      
      if (adminUserId) {
        // Check if adminUserId is a valid UUID format
        const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidPattern.test(adminUserId)) {
          validatedAdminUserId = adminUserId;
        } else {
          console.warn(`Invalid UUID format for adminUserId: ${adminUserId}. Using null instead.`);
          // Don't fail the operation, just log the warning and proceed with null
        }
      }

      // Only deactivate existing keys if we're explicitly setting this key as active
      if (input.is_active === true) {
        await prisma.kip_platform_keys.updateMany({
          where: { provider: input.provider },
          data: { is_active: false, updated_at: new Date() }
        });
      }

      // Create or update the key
      const key = await prisma.kip_platform_keys.upsert({
        where: { provider: input.provider },
        update: {
          api_key: input.api_key,
          label: input.label,
          is_active: input.is_active !== false, // Default to true
          created_by: validatedAdminUserId, // Use validated UUID or null
          updated_at: new Date()
        },
        create: {
          provider: input.provider,
          api_key: input.api_key,
          label: input.label,
          is_active: input.is_active !== false, // Default to true
          created_by: validatedAdminUserId // Use validated UUID or null
        }
      });

      return { success: true, data: key };
    } catch (error) {
      console.error('Error upserting platform key:', error);
      return { 
        success: false, 
        error: 'Failed to save platform API key' 
      };
    }
  }

  /**
   * Update platform key status (active/inactive)
   */
  static async updateKeyStatus(
    provider: ModelProvider, 
    isActive: boolean,
    adminUserId?: string
  ): Promise<{
    success: boolean;
    data?: PlatformApiKey;
    error?: string;
  }> {
    try {
      // If activating this key, deactivate others for the same provider
      if (isActive) {
        await prisma.kip_platform_keys.updateMany({
          where: { 
            provider,
            is_active: true
          },
          data: { is_active: false, updated_at: new Date() }
        });
      }

      const key = await prisma.kip_platform_keys.update({
        where: { provider },
        data: { 
          is_active: isActive,
          updated_at: new Date()
        }
      });

      return { success: true, data: key };
    } catch (error) {
      console.error('Error updating platform key status:', error);
      return { 
        success: false, 
        error: 'Failed to update platform key status' 
      };
    }
  }

  /**
   * Delete a platform API key
   */
  static async deleteKey(provider: ModelProvider): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      await prisma.kip_platform_keys.delete({
        where: { provider }
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting platform key:', error);
      return { 
        success: false, 
        error: 'Failed to delete platform API key' 
      };
    }
  }

  /**
   * Get platform key for use in model calls (returns actual key)
   * This is used internally by ModelProviderService
   */
  static async getKeyForProvider(provider: ModelProvider): Promise<string | null> {
    try {
      const result = await this.getActiveKey(provider);
      return result.success && result.data ? result.data.api_key : null;
    } catch (error) {
      console.error(`Error getting platform key for ${provider}:`, error);
      return null;
    }
  }

  /**
   * Check if any active platform keys exist
   */
  static async hasActiveKeys(): Promise<boolean> {
    try {
      const count = await prisma.kip_platform_keys.count({
        where: { is_active: true }
      });
      return count > 0;
    } catch (error) {
      console.error('Error checking for active platform keys:', error);
      return false;
    }
  }

  /**
   * Get platform key statistics
   */
  static async getKeyStats(): Promise<{
    total: number;
    active: number;
    byProvider: Record<string, { total: number; active: number }>;
  }> {
    try {
      const keys = await prisma.kip_platform_keys.findMany();
      
      const stats = {
        total: keys.length,
        active: keys.filter((k: any) => k.is_active).length,
        byProvider: {} as Record<string, { total: number; active: number }>
      };

      // Group by provider
      keys.forEach((key: any) => {
        if (!stats.byProvider[key.provider]) {
          stats.byProvider[key.provider] = { total: 0, active: 0 };
        }
        stats.byProvider[key.provider].total++;
        if (key.is_active) {
          stats.byProvider[key.provider].active++;
        }
      });

      return stats;
    } catch (error) {
      console.error('Error getting platform key stats:', error);
      return { total: 0, active: 0, byProvider: {} };
    }
  }

  /**
   * Mask API key for display (show only last 4 characters)
   */
  private static maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) {
      return '*'.repeat(apiKey.length);
    }
    const visibleChars = 4;
    const maskedLength = apiKey.length - visibleChars;
    return '*'.repeat(maskedLength) + apiKey.slice(-visibleChars);
  }

  /**
   * Validate API key format for a given provider
   */
  static validateKeyFormat(provider: ModelProvider, apiKey: string): boolean {
    if (!apiKey || apiKey.trim().length === 0) return false;

    switch (provider) {
      case 'openai':
        return apiKey.startsWith('sk-') && apiKey.length > 20;
      case 'anthropic':
        return apiKey.startsWith('sk-ant-') && apiKey.length > 30;
      case 'together':
      case 'elevenlabs':
        return apiKey.length > 10;
      default:
        return apiKey.length > 5;
    }
  }
}

export default PlatformApiKeyService; 