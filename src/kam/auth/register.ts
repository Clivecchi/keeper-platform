// 🔒 Uses canonical users model 
// Based on KAM and Prisma Model Reference
// KAM Rules:
// 1. Strict typing: All user logic must use Zod validation schemas and TypeScript types.
// 2. No hardcoded themes: Always respect database-configured UserSettings (applies to user creation defaults).
// 3. Theme fallback: On first sign-up, fallback to Keeper Classic theme (handled by UserSettings logic, this handler just creates the user).
// 4. Single source of truth: All user data must flow through KAM endpoints or hooks.
// 5. Scoped API routes: Use /api/kam/* routes for backend access control (this is a handler, routing is separate).
// 6. Avoid logic duplication: Share validation and database accessors across files.
// 7. Use pnpm for all package management.
// 8. Use npx only for one-time CLI utilities.

import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { RegisterInputSchema } from './types';
import type { RegisterInput, AuthResponse, AuthUser } from './types';
// import { hashPassword } from '../lib/hashPassword'; // CRITICAL: Implement and use this for actual password hashing.

const prisma = new PrismaClient();
// const KEEPER_CLASSIC_THEME_ID = 'keeper-classic-theme-id'; // No longer needed

/**
 * Handles new user registration.
 * Validates input, checks for existing user, creates a new User (providing id, updatedAt) and then related UserSettings.
 * Password hashing should be handled by a separate utility.
 * 
 * @param data - The registration input data (email, password, name?).
 * @returns AuthResponse containing AuthUser data (id, email, name, avatar_url) or an error.
 */
export async function registerUserHandler(data: RegisterInput): Promise<AuthResponse<AuthUser>> {
  try {
    const validationResult = RegisterInputSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          message: 'Invalid registration data',
          code: 'VALIDATION_ERROR',
        },
      };
    }

    const { email, password, name } = validationResult.data;

    const existingUser = await prisma.users.findUnique({
      where: { email },
    });

    if (existingUser) {
      return {
        success: false,
        error: {
          message: 'User with this email already exists',
          code: 'EMAIL_TAKEN',
        },
      };
    }

    // const actualHashedPassword = await hashPassword(password); // CRITICAL: Use this in production.
    // For now, using a placeholder for the hashedPassword field as per instructions.
    // const tempHashedPassword = password + '_hashed'; // MOCK HASHING - REPLACE IMMEDIATELY
    const hashedPassword = bcrypt.hashSync(password, 10);

    const newUserId = crypto.randomUUID();
    const currentTime = new Date();

    // Step 1: Create the User
    const newUser = await prisma.users.create({
      data: {
        id: newUserId,
        email,
        hashedPassword: hashedPassword, 
        name: name || null,
        updatedAt: currentTime,
        // avatar_url can be set here if provided, or later via profile update
      },
      select: { 
        id: true,
        email: true,
        name: true,
        avatar_url: true, // Select avatar_url, will be null if not set
      }
    });

    const newUserSettingsId = crypto.randomUUID(); // Generate ID for UserSettings

    // Step 2: Create the UserSettings, linking it to the new User
    await prisma.userSettings.create({
        data: {
            id: newUserSettingsId, // Provide id for UserSettings
            userId: newUser.id,
            updatedAt: currentTime, // Provide updatedAt for UserSettings
            // themeMode: 'system', // Optional: set default themeMode
            // respectSystemTheme: true, // Optional: set default respectSystemTheme (Prisma default is true)
        }
    });

    return {
      success: true,
      data: newUser, 
    };

  } catch (error) {
    console.error('Error during user registration:', error);
    return {
      success: false,
      error: {
        message: 'An unexpected error occurred during registration.',
        code: 'INTERNAL_SERVER_ERROR',
      },
    };
  }
}