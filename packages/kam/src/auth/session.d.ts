import { AuthUser, UserSession } from './types.js';
/**
 * Creates a new session for the given user.
 * Generates a JWT token and returns session data.
 *
 * @param user - The authenticated user
 * @returns UserSession with token and user info
 */
export declare function createSession(user: AuthUser): Promise<UserSession>;
/**
 * Validates and decodes a session token.
 *
 * @param token - The JWT token to validate
 * @returns UserSession if valid, null if invalid
 */
export declare function getSessionHandler(token: string): Promise<UserSession | null>;
/**
 * Invalidates a user session.
 * For JWT tokens, this is mainly informational since JWTs are stateless.
 * In a production system, you'd typically maintain a blacklist or use database sessions.
 *
 * @param token - The session token to invalidate
 * @returns Success status
 */
export declare function invalidateSession(token: string): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=session.d.ts.map