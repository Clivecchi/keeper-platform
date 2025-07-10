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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
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

    req.user = {
      ...user,
      role: null, // Default role assignment
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
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
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

    req.user = {
      ...user,
      role: null, // Default role assignment
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
    const token = req.headers.authorization?.replace('Bearer ', '');
    
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
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name
      };
    }

    next();
  } catch (error) {
    // Continue without user context if token is invalid
    next();
  }
}; 