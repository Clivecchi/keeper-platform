/**
 * Authentication Middleware
 * Handles user authentication and adds user context to requests
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

// Augment Express Request interface globally
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string | null;
        name?: string | null;
        role?: string | null;
        platformRoles?: string[];
      };
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string | null;
    name?: string | null;
    role?: string | null;
    platformRoles?: string[];
  };
}

/**
 * Type guard to check if user is authenticated
 */
export function isAuthenticated(req: Request): req is AuthenticatedRequest {
  return req.user !== undefined && req.user !== null;
}

/**
 * Get authenticated user or throw error
 */
export function getAuthenticatedUser(req: Request): AuthenticatedRequest['user'] {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
}

/**
 * Middleware to authenticate user and add user context to request
 */
export const authMiddleware = async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Check Authorization header first
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no header token, check for cookie (cookie-based auth for browsers)
    if (!token) {
      const cookieToken = (req as any).cookies?.keeper_session;
      if (cookieToken) {
        token = cookieToken;
      }
    }
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Fetch platform roles (e.g., super-admin) from user_roles → roles join
    const userRoles = await prisma.user_roles.findMany({
      where: { userId: user.id },
      select: {
        roles: {
          select: { name: true },
        },
      },
    });

    let platformRoles = userRoles.map((ur) => ur.roles?.name).filter(Boolean) as string[];

    // Dev bootstrap: if no roles yet and in non-production env, grant super-admin implicitly
    if (platformRoles.length === 0 && process.env.NODE_ENV !== 'production') {
      platformRoles = ['super-admin'];
    }

    req.user = {
      ...user,
      role: null, // Legacy single role (unused for platform roles)
      platformRoles,
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Express-compatible auth middleware that works with standard Request types
 */
export const authMiddlewareCompat = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { addLog } = await import('../utils/LogStore.js');
    addLog('auth-probe-enter', { path: req.path, headers: { authorization: req.header('Authorization') } });
  } catch {}

  try {
    // Check Authorization header first
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no header token, check for cookie (cookie-based auth for browsers)
    if (!token) {
      const cookieToken = (req as any).cookies?.keeper_session;
      if (cookieToken) {
        token = cookieToken;
      }
    }
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as { userId: string };
    
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const userRoles = await prisma.user_roles.findMany({
      where: { userId: user.id },
      select: { roles: { select: { name: true } } },
    });
    let platformRoles = userRoles.map((ur) => ur.roles?.name).filter(Boolean) as string[];
    // Dev bootstrap: if no roles yet and in non-production env, grant super-admin implicitly
    // Temporarily disabled to test database role assignment
    // if (platformRoles.length === 0 && process.env.NODE_ENV !== 'production') {
    //   platformRoles = ['super-admin'];
    // }

    req.user = {
      ...user,
      role: null, // Default role assignment
      platformRoles,
    };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Invalid token' });
    return;
  }
};

/**
 * Optional auth middleware - doesn't fail if no token is provided
 */
export const optionalAuthMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check Authorization header first
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    // If no header token, check for cookie (cookie-based auth for browsers)
    if (!token) {
      const cookieToken = (req as any).cookies?.keeper_session;
      if (cookieToken) {
        token = cookieToken;
      }
    }
    
    if (!token) {
      next();
      return;
    }

    // Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as {
      userId: string;
      email: string;
    };

    // Get user from database
    const user = await prisma.users.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true
      }
    });

    if (user) {
      const userRoles = await prisma.user_roles.findMany({
        where: { userId: user.id },
        select: { roles: { select: { name: true } } },
      });
      let platformRoles = userRoles.map((ur) => ur.roles?.name).filter(Boolean) as string[];
      // Dev bootstrap: if no roles yet and in non-production env, grant super-admin implicitly
      // Temporarily disabled to test database role assignment
      // if (platformRoles.length === 0 && process.env.NODE_ENV !== 'production') {
      //   platformRoles = ['super-admin'];
      // }

      req.user = {
        id: user.id,
        email: user.email,
        name: user.name,
        platformRoles,
      };
    }

    next();
  } catch (error) {
    // Continue without user context if token is invalid
    next();
  }
}; 