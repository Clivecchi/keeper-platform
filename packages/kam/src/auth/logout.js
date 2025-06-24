// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference
// KAM Rules headers as in register.ts...
// import { invalidateSession } from './session'; // Not strictly needed for stateless JWT logout
/**
 * Handles user logout.
 * Since JWTs are stateless, this function simply returns success.
 * If JWT is stored in a cookie, instruct the client to clear it.
 */
export async function logoutUserHandler() {
    // If using HTTP-only cookies, you'd clear them on the server here
    // (e.g., res.clearCookie('tokenName')) if this handler had access to `res`.
    // Otherwise, the client is responsible for deleting the token.
    return { success: true };
}
//# sourceMappingURL=logout.js.map