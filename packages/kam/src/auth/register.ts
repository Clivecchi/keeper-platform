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

import { createUserWithDefaultSettings, emailExists } from '@keeper/database';
import { RegisterInputSchema } from './types.js';
import type { RegisterInput, AuthResponse, AuthUser, AuthSuccessData } from './types.js';
import { createSession } from './session.js';
import * as bcrypt from 'bcryptjs';

/**
 * Handles new user registration.
 * Validates input, checks for existing user, creates a new User with UserSettings.
 * 
 * @param data - The registration input data (email, password, name?).
 * @returns AuthResponse containing AuthUser data (id, email, name, avatar_url) or an error.
 */
export async function registerUserHandler(data: RegisterInput): Promise<AuthResponse<AuthSuccessData>> {
  try {
    const validationResult = RegisterInputSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          message: validationResult.error.errors.map(e => e.message).join(', '),
          code: 'VALIDATION_ERROR',
        },
      };
    }

    const { email, password, name } = validationResult.data;

    // Check if user already exists using database package
    const userExists = await emailExists(email);
    if (userExists) {
      return {
        success: false,
        error: {
          message: 'User with this email already exists',
          code: 'EMAIL_TAKEN',
        },
      };
    }

    // Hash password
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Create user with default settings using database package
    const newUser = await createUserWithDefaultSettings({
      email,
      hashedPassword,
      name: name || undefined,
    });

    const session = await createSession(newUser);

    const authUser: AuthUser = {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      avatar_url: newUser.avatar_url,
    };

    return {
      success: true,
      data: {
        user: authUser,
        token: session.token,
      },
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