/**
 * Handles user logout.
 * Since JWTs are stateless, this function simply returns success.
 * If JWT is stored in a cookie, instruct the client to clear it.
 */
export declare function logoutUserHandler(): Promise<{
    success: boolean;
}>;
//# sourceMappingURL=logout.d.ts.map