// src/kam/auth-routes.ts
// Auth routes for user authentication (not KAM API)
// These routes handle login, logout, and identity verification

import { Router } from 'express';
import { login, logout, me } from './auth.js';
import { authWeb } from './session.js';

export const authRouter = Router();

// Public routes (no auth required)
authRouter.post('/login', login);
authRouter.post('/logout', logout);

// Protected routes (require auth from cookie or header)
authRouter.get('/me', authWeb, me);

export default authRouter;

