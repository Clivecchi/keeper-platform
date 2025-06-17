// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference
// KAM Rules headers as in register.ts...

import jwt from 'jsonwebtoken';
import type { UserSession } from './types.js';
// PrismaClient is not strictly needed here anymore if we don't look up users in getSessionHandler directly,
// but it might be used if we decide to enrich session data from DB. For now, keeping it commented.
// import { PrismaClient } from '@prisma/client';

// const prisma = new PrismaClient(); // Not used with pure JWT verification

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'; // Secure this in production!

/**
 * Creates a JWT session token for the given user.
 *
 * @param user - The user object (id, email, name) for whom to create a session.
 * @returns A UserSession object containing the token and user details.
 */
export async function createSession(user: { id:string; email: string | null; name?: string | null }): Promise<UserSession> {
  console.log('[SESSION] Creating session for user:', user.id);
  
  const payload = {
    userId: user.id,
    email: user.email,
    name: user.name,
  };
  console.log('[SESSION] JWT payload:', payload);

  if (!process.env.JWT_SECRET) {
    console.warn('[SESSION] WARNING: Using fallback JWT_SECRET. This should not happen in production!');
  }

  const token = jwt.sign(
    payload,
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
  console.log('[SESSION] JWT token created successfully');

  const session = {
    token,
    userId: user.id,
    email: user.email,
    name: user.name,
  };
  console.log('[SESSION] Session created successfully for user:', user.id);
  
  return session;
}

/**
 * Verifies and decodes a session token into a UserSession.
 * @param token - The JWT token from headers or cookies
 * @returns UserSession or null
 */
export async function getSessionHandler(token: string): Promise<UserSession | null> {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;

    if (!decoded || typeof decoded !== 'object' || !decoded.userId) return null;

    return {
      userId: decoded.userId,
      email: decoded.email || null,
      name: decoded.name || null,
      token, // Optional: echo token if you need it downstream
    };
  } catch (err) {
    console.error('Invalid session token:', err);
    return null;
  }
}

/**
 * Invalidates a session (e.g., on logout).
 * For JWTs, this is typically handled client-side by deleting the token.
 * Server-side blocklisting can be implemented if needed but is not standard for JWTs.
 *
 * @param token - The session token to invalidate.
 */
export async function invalidateSession(token: string): Promise<void> {
    console.log(`Placeholder: Invalidate session for token ${token}. For JWT, client should discard the token.`);
    // No server-side action is typically required for stateless JWT invalidation
    // unless a token blocklist strategy is in place.
    // If a blocklist is used, this function would add the token (or its jti) to the list.
    return Promise.resolve();
} 