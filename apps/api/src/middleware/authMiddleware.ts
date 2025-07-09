/**
 * Authentication Middleware
 * Handles user authentication and adds user context to requests
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();

export interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string | null;
    name?: string | null;
  };
}

/**
 * Middleware to authenticate user and add user context to request
 */
export const authMiddleware = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'Authentication required' });
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

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    // Add user to request
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Invalid token' });
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