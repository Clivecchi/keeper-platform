// src/kam/auth.ts
// HttpOnly cookie-based authentication endpoints for KAM
// Provides login, logout, and identity verification

import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '@keeper/database';
import { setSessionCookie, clearSessionCookie } from './session.js';

const JWT_SECRET = process.env.JWT_SECRET!;

// POST /api/kam/auth/login
export async function login(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'invalid_credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set HttpOnly cookie
    setSessionCookie(res, token);

    // Return success (still include token for CLI/tools, but web will ignore it)
    return res.json({
      ok: true,
      token, // For backward compatibility with CLI tools
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('[kam/auth] Login error:', error);
    return res.status(500).json({ error: 'internal_server_error' });
  }
}

// POST /api/kam/auth/logout
export async function logout(_req: Request, res: Response) {
  clearSessionCookie(res);
  return res.json({ ok: true });
}

// GET /api/kam/auth/me
export async function me(req: Request, res: Response) {
  // Identity from auth middleware (cookie preferred)
  const user = (req as any).user;

  // Always set no-store for identity endpoints
  res.set('Cache-Control', 'private, no-store');

  if (!user?.id) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // Fetch full user details from database
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
      },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'user_not_found' });
    }

    return res.json({ 
      user: dbUser 
    });
  } catch (error) {
    console.error('[kam/auth] Me endpoint error:', error);
    return res.status(500).json({ error: 'internal_server_error' });
  }
}

