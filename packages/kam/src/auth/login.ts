// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference
// KAM Rules headers as in register.ts...

import { getUserByEmail } from '@keeper/database';
import { LoginInputSchema } from './types.js';
import type { LoginInput, AuthResponse, AuthUser, AuthSuccessData } from './types.js';
import bcrypt from 'bcryptjs';
import { createSession } from './session.js';

/**
 * Handles user login.
 * Validates input, finds user, verifies password, and (not implemented) creates a session.
 * 
 * @param data - The login input data (email, password).
 * @returns AuthResponse containing AuthUser data or an error.
 */
export async function loginUserHandler(data: LoginInput): Promise<AuthResponse<AuthSuccessData>> {
  try {
    const validationResult = LoginInputSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: {
          message: validationResult.error.errors.map((e: any) => e.message).join(', '),
          code: 'VALIDATION_ERROR',
        },
      };
    }

    const { email, password } = validationResult.data;

    const user = await getUserByEmail(email);

    if (!user) {
      return {
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      };
    }

    if (!user.hashedPassword) {
        // Should not happen for a registered user, but good to check
        return {
            success: false,
            error: { message: 'User account not properly configured', code: 'ACCOUNT_ERROR' },
        };
    }

    // const isValidPassword = await verifyPassword(password, user.hashedPassword); // CRITICAL
    // MOCK PASSWORD VERIFICATION - REPLACE IMMEDIATELY
    const isValidPassword = bcrypt.compareSync(password, user.hashedPassword);

    if (!isValidPassword) {
      return {
        success: false,
        error: { message: 'Invalid password', code: 'INVALID_PASSWORD' },
      };
    }

    // Session creation logic would go here, e.g.:
    const session = await createSession(user);

    const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
    };

    return {
      success: true,
      data: {
        user: authUser,
        token: session.token,
      },
    };

  } catch (error) {
    console.error('Error during user login:', error);
    return {
      success: false,
      error: { message: 'An unexpected error occurred during login.', code: 'INTERNAL_SERVER_ERROR' },
    };
  }
} 