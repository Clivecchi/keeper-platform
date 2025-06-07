// 🔒 Uses canonical User model (not PublicUser)
// Based on KAM and Prisma Model Reference
// KAM Rules headers as in register.ts...
import { PrismaClient } from '@prisma/client';
import { LoginInputSchema } from './types';
import bcrypt from 'bcryptjs';
// import { verifyPassword } from '../lib/hashPassword'; // Crucial for password verification
// import { createSession } from './session'; // For creating a session on login
const prisma = new PrismaClient();
/**
 * Handles user login.
 * Validates input, finds user, verifies password, and (not implemented) creates a session.
 *
 * @param data - The login input data (email, password).
 * @returns AuthResponse containing AuthUser data or an error.
 */
export async function loginUserHandler(data) {
    try {
        const validationResult = LoginInputSchema.safeParse(data);
        if (!validationResult.success) {
            return {
                success: false,
                error: { message: 'Invalid login data', code: 'VALIDATION_ERROR' },
            };
        }
        const { email, password } = validationResult.data;
        const user = await prisma.users.findUnique({
            where: { email },
        });
        if (!user) {
            return {
                success: false,
                error: { message: 'User not found', code: 'USER_NOT_FOUND' },
            };
        }
        if (!user.hashedPassword) {
            // Should not happen for a registered user, but good to check
            return {
                success: false,
                error: { message: 'User account not properly configured', code: 'ACCOUNT_ERROR' },
            };
        }
        // const isValidPassword = await verifyPassword(password, user.hashedPassword); // CRITICAL
        // MOCK PASSWORD VERIFICATION - REPLACE IMMEDIATELY
        const isValidPassword = bcrypt.compareSync(password, user.hashedPassword);
        if (!isValidPassword) {
            return {
                success: false,
                error: { message: 'Invalid password', code: 'INVALID_PASSWORD' },
            };
        }
        // Session creation logic would go here, e.g.:
        // const session = await createSession({ userId: user.id, email: user.email, name: user.name });
        // For now, just returning user data as per AuthUser.
        const authUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            avatar_url: user.avatar_url,
        };
        return {
            success: true,
            data: authUser,
        };
    }
    catch (error) {
        console.error('Error during user login:', error);
        return {
            success: false,
            error: { message: 'An unexpected error occurred during login.', code: 'INTERNAL_SERVER_ERROR' },
        };
    }
}
