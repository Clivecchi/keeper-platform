import { PrismaClient } from '@prisma/client';
import type { UserSettings } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Retrieves user settings by user ID.
 * If none exist, returns null.
 *
 * @param userId - The ID of the user to look up
 * @returns A UserSettings object or null
 */
export async function getUserSettingsHandler(userId: string): Promise<UserSettings | null> {
  return prisma.userSettings.findUnique({
    where: { userId }
  });
} 