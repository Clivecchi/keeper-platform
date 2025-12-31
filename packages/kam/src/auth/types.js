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
// KAM Rules:
// 1. Strict typing: All user logic must use Zod validation schemas and TypeScript types.
// 2. Single source of truth: All user data must flow through KAM endpoints or hooks.
// 3. Avoid logic duplication: Share validation and database accessors across files.
/**
 * Schema for user registration input.
 * Requires email and password. `name` is optional.
 */
export const RegisterInputSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(8, { message: 'Password must be at least 8 characters long' }),
    name: z.string().min(1).optional(),
});
/**
 * Schema for user login input.
 * Requires email and password.
 */
export const LoginInputSchema = z.object({
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string(),
});
//# sourceMappingURL=types.js.map