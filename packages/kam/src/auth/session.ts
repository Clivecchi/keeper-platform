// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference
// KAM Rules headers as in register.ts...

import jwt from 'jsonwebtoken';
import { AuthUser, UserSession } from './types';
// PrismaClient is not strictly needed here anymore if we don't look up users in getSessionHandler directly,
// but it might be used if we decide to enrich session data from DB. For now, keeping it commented.
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient(); // Not used with pure JWT verification

/**
 * Creates a new session for the given user.
 * Generates a JWT token and returns session data.
 * 
 * @param user - The authenticated user
 * @returns UserSession with token and user info
 */
export async function createSession(user: AuthUser): Promise<UserSession> {
  // For now, we'll use a simple JWT without database storage
  // In production, consider storing sessions in database for better security
  
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
  };

  // Use a default secret for now - should be environment variable
  const secret = process.env.JWT_SECRET || 'keeper-default-secret-change-in-production';
  
  const token = jwt.sign(payload, secret, { 
    expiresIn: '7d' // 7 days
  });

  return {
    token,
    userId: user.id,
    email: user.email,
    name: user.name,
  };
}

/**
 * Validates and decodes a session token.
 * 
 * @param token - The JWT token to validate
 * @returns UserSession if valid, null if invalid
 */
export async function getSessionHandler(token: string): Promise<UserSession | null> {
  try {
    const secret = process.env.JWT_SECRET || 'keeper-default-secret-change-in-production';
    
    const decoded = jwt.verify(token, secret) as any;
    
    return {
      token,
      userId: decoded.userId,
      email: decoded.email,
      name: decoded.name,
    };
  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Invalidates a user session.
 * For JWT tokens, this is mainly informational since JWTs are stateless.
 * In a production system, you'd typically maintain a blacklist or use database sessions.
 * 
 * @param token - The session token to invalidate
 * @returns Success status
 */
export async function invalidateSession(token: string): Promise<{ success: boolean }> {
  // For JWT-based sessions, we can't truly invalidate without a blacklist
  // This is a placeholder for future implementation
  console.log('Session invalidated (JWT-based):', token.substring(0, 10) + '...');
  
  return { success: true };
} 