import type { RegisterInput, AuthResponse, AuthSuccessData } from './types.js';
/**
 * Handles new user registration.
 * Validates input, checks for existing user, creates a new User with UserSettings.
 *
 * @param data - The registration input data (email, password, name?).
 * @returns AuthResponse containing AuthUser data (id, email, name, avatar_url) or an error.
 */
export declare function registerUserHandler(data: RegisterInput): Promise<AuthResponse<AuthSuccessData>>;
//# sourceMappingURL=register.d.ts.map