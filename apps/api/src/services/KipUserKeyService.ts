/**
 * KipUserKeyService
 * =================
 * 
 * Service for managing user-scoped API keys for different model providers.
 * Users can store their own API keys which take precedence over system keys.
 */

import { prisma } from '@keeper/database';
import type { ModelProvider } from '@keeper/database';

export class KipUserKeyService {
  /**
   * Validate that a string is a proper UUID format
   */
  private static validateUUID(uuid: string): boolean {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(uuid);
  }

  /**
   * Validate user ID and throw error if invalid
   */
  private static validateUserId(userId: string): void {
    if (!userId || !this.validateUUID(userId)) {
      throw new Error(`Invalid user ID format: ${userId}. Expected valid UUID.`);
    }
  }

  /**
   * Get user's API key for a specific provider
   */
  static async getUserKey(provider: ModelProvider, userId: string): Promise<string | null> {
    try {
      this.validateUserId(userId);
      
      const userKey = await prisma.kip_user_keys.findUnique({
        where: {
          user_id_provider: {
            user_id: userId,
            provider: provider,
          },
        },
      });

      return userKey?.api_key || null;
    } catch (error) {
      console.error('Error fetching user key:', error);
      return null;
    }
  }

  /**
   * Set or update user's API key for a specific provider
   */
  static async setUserKey(provider: ModelProvider, userId: string, apiKey: string): Promise<boolean> {
    try {
      this.validateUserId(userId);
      
      await prisma.kip_user_keys.upsert({
        where: {
          user_id_provider: {
            user_id: userId,
            provider: provider,
          },
        },
        update: {
          api_key: apiKey,
        },
        create: {
          user_id: userId,
          provider: provider,
          api_key: apiKey,
        },
      });

      return true;
    } catch (error) {
      console.error('Error setting user key:', error);
      return false;
    }
  }

  /**
   * Delete user's API key for a specific provider
   */
  static async deleteUserKey(provider: ModelProvider, userId: string): Promise<boolean> {
    try {
      this.validateUserId(userId);
      
      await prisma.kip_user_keys.delete({
        where: {
          user_id_provider: {
            user_id: userId,
            provider: provider,
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Error deleting user key:', error);
      return false;
    }
  }

  /**
   * Get all providers for which the user has API keys
   */
  static async getUserProviders(userId: string): Promise<ModelProvider[]> {
    try {
      this.validateUserId(userId);
      
      const userKeys = await prisma.kip_user_keys.findMany({
        where: {
          user_id: userId,
        },
        select: {
          provider: true,
        },
      });

      return userKeys.map((key) => key.provider as ModelProvider);
    } catch (error) {
      console.error('Error fetching user providers:', error);
      return [];
    }
  }

  /**
   * Get masked API keys for UI display (show only last 4 characters)
   */
  static async getUserKeysMasked(userId: string): Promise<Array<{ provider: ModelProvider; maskedKey: string }>> {
    try {
      this.validateUserId(userId);
      
      const userKeys = await prisma.kip_user_keys.findMany({
        where: {
          user_id: userId,
        },
        select: {
          provider: true,
          api_key: true,
        },
      });

      return userKeys.map((key) => ({
        provider: key.provider as ModelProvider,
        maskedKey: `****${key.api_key.slice(-4)}`,
      }));
    } catch (error) {
      console.error('Error fetching masked user keys:', error);
      return [];
    }
  }
} 