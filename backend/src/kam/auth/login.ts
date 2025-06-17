console.log('🧭 DEBUG: Loaded login.ts');
// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference
// KAM Rules headers as in register.ts...

import { PrismaClient } from '@prisma/client';
import { LoginInputSchema } from './types.js';
import type { LoginInput, AuthResponse, AuthUser, AuthSuccessData } from './types.js';
import bcrypt from 'bcryptjs';
import { createSession } from './session.js';
// import { verifyPassword } from '../lib/hashPassword'; // Crucial for password verification
// import { createSession } from './session'; // For creating a session on login

const prisma = new PrismaClient();

/**
 * Handles user login.
 * Validates input, finds user, verifies password, and (not implemented) creates a session.
 * 
 * @param data - The login input data (email, password).
 * @returns AuthResponse containing AuthUser data or an error.
 */
export async function loginUserHandler(data: LoginInput): Promise<AuthResponse<AuthSuccessData>> {
  try {
    console.log('[LOGIN] Starting login process for email:', data.email);
    
    const validationResult = LoginInputSchema.safeParse(data);
    if (!validationResult.success) {
      console.log('[LOGIN] Validation failed:', validationResult.error.errors);
      return {
        success: false,
        error: {
          message: validationResult.error.errors.map(e => e.message).join(', '),
          code: 'VALIDATION_ERROR',
        },
      };
    }
    console.log('[LOGIN] Input validation successful');

    const { email, password } = validationResult.data;

    console.log('[LOGIN] Looking up user in database...');
    const user = await prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      console.log('[LOGIN] User not found for email:', email);
      return {
        success: false,
        error: { message: 'User not found', code: 'USER_NOT_FOUND' },
      };
    }
    console.log('[LOGIN] User found:', { id: user.id, email: user.email });

    if (!user.hashedPassword) {
      console.log('[LOGIN] User found but has no password hash:', user.id);
      return {
        success: false,
        error: { message: 'User account not properly configured', code: 'ACCOUNT_ERROR' },
      };
    }

    console.log('[LOGIN] Verifying password...');
    const isValidPassword = bcrypt.compareSync(password, user.hashedPassword);

    if (!isValidPassword) {
      console.log('[LOGIN] Password verification failed for user:', user.id);
      return {
        success: false,
        error: { message: 'Invalid password', code: 'INVALID_PASSWORD' },
      };
    }
    console.log('[LOGIN] Password verified successfully');

    console.log('[LOGIN] Creating session...');
    const session = await createSession(user);
    console.log('[LOGIN] Session created successfully');

    const authUser: AuthUser = {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    };

    console.log('[LOGIN] Login successful for user:', user.id);
    return {
      success: true,
      data: {
        user: authUser,
        token: session.token,
      },
    };

  } catch (error) {
    console.error('[LOGIN] Error during user login:', error);
    return {
      success: false,
      error: { message: 'An unexpected error occurred during login.', code: 'INTERNAL_SERVER_ERROR' },
    };
  }
} 