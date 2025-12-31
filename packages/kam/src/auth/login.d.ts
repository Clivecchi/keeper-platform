import type { LoginInput, AuthResponse, AuthSuccessData } from './types.js';
/**
 * Handles user login.
 * Validates input, finds user, verifies password, and (not implemented) creates a session.
 *
 * @param data - The login input data (email, password).
 * @returns AuthResponse containing AuthUser data or an error.
 */
export declare function loginUserHandler(data: LoginInput): Promise<AuthResponse<AuthSuccessData>>;
//# sourceMappingURL=login.d.ts.map