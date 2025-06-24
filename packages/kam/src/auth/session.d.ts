import type { UserSession } from './types.js';
/**
 * Creates a JWT session token for the given user.
 *
 * @param user - The user object (id, email, name) for whom to create a session.
 * @returns A UserSession object containing the token and user details.
 */
export declare function createSession(user: {
    id: string;
    email: string | null;
    name?: string | null;
}): Promise<UserSession>;
/**
 * Verifies and decodes a session token into a UserSession.
 * @param token - The JWT token from headers or cookies
 * @returns UserSession or null
 */
export declare function getSessionHandler(token: string): Promise<UserSession | null>;
/**
 * Invalidates a session (e.g., on logout).
 * For JWTs, this is typically handled client-side by deleting the token.
 * Server-side blocklisting can be implemented if needed but is not standard for JWTs.
 *
 * @param token - The session token to invalidate.
 */
export declare function invalidateSession(token: string): Promise<void>;
//# sourceMappingURL=session.d.ts.map