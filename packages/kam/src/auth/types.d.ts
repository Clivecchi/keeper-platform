/**
 * Auth-specific type definitions (e.g., LoginInput, AuthResponse).
 * These types are scoped only to the /kam/auth module.
 * For global auth-related types, use /kam/types instead.
 */
/**
 * 🧾 KAM Auth Types
 *
 * This file defines static types used across authentication logic,
 * including login, signup, session management, and token structure.
 *
 * ❗ DO NOT implement runtime code here.
 * ❗ DO NOT import services, handlers, or side-effect modules.
 *
 * ✅ Types only.
 * ✅ Shared across API, hooks, components.
 * ✅ Automatically discoverable by Cursor through folder context.
 */
import { z } from 'zod';
/**
 * Schema for user registration input.
 * Requires email and password. `name` is optional.
 */
export declare const RegisterInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
    name: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
    name?: string | undefined;
}, {
    email: string;
    password: string;
    name?: string | undefined;
}>;
export type RegisterInput = z.infer<typeof RegisterInputSchema>;
/**
 * Schema for user login input.
 * Requires email and password.
 */
export declare const LoginInputSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export type LoginInput = z.infer<typeof LoginInputSchema>;
/**
 * Represents the authenticated user data to be returned by auth handlers.
 * Fields: id, email, name, avatar_url
 */
export interface AuthUser {
    id: string;
    email: string | null;
    name: string | null;
    avatar_url: string | null;
}
/**
 * Represents the successful response from an authentication request.
 * Includes user data and an optional token.
 */
export interface AuthSuccessData {
    user: AuthUser;
    token?: string;
}
/**
 * Represents the structure of a user session.
 */
export interface UserSession {
    token: string;
    userId: string;
    email: string | null;
    name?: string | null;
}
/**
 * Generic success response for auth operations.
 */
export interface AuthSuccessResponse<T = AuthSuccessData> {
    success: true;
    data: T;
}
/**
 * Generic error response for auth operations.
 */
export interface AuthErrorResponse {
    success: false;
    error: {
        message: string;
        code?: string;
    };
}
export type AuthResponse<T = AuthSuccessData> = AuthSuccessResponse<T> | AuthErrorResponse;
//# sourceMappingURL=types.d.ts.map