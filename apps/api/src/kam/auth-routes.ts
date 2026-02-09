// src/kam/auth-routes.ts
// Auth routes for identity verification
//
// NOTE: login/register/logout are handled by inline handlers in index.ts
// which are registered BEFORE this router. Those inline handlers intercept
// POST /login and POST /logout, so this router only serves GET /me.

import { Router } from 'express';
import { me } from './auth.js';
import { authWeb } from './session.js';

export const authRouter = Router();

// Protected routes (require auth from cookie or header)
authRouter.get('/me', authWeb, me);

export default authRouter;

