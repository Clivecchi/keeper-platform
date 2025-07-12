/**
 * Authentication Middleware
 * Ensures user is authenticated before accessing protected resources
 */

import { Request, Response, NextFunction } from 'express';
import { DomainError } from '../../lib/errors/DomainError';
import { AuthenticatedRequest } from '@keeper/database';

/**
 * Require authentication middleware
 * Ensures user is authenticated, returns consistent error if not
 */
export function requireAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const typedReq = req as AuthenticatedRequest;
      
      // Check if user is authenticated
      if (!typedReq.user) {
        const error = DomainError.AuthRequired();
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Validate user object has required fields
      if (!typedReq.user.id) {
        const error = DomainError.InvalidToken();
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Add user headers for debugging
      res.set('X-User-Id', typedReq.user.id);
      if (typedReq.user.email) {
        res.set('X-User-Email', typedReq.user.email);
      }

      next();
    } catch (error) {
      console.error('Authentication error:', error);
      
      const authError = DomainError.InvalidToken();
      res.status(authError.statusCode).json({
        success: false,
        error: authError.code,
        message: authError.message
      });
      return;
    }
  };
}

/**
 * Optional authentication middleware
 * Allows both authenticated and non-authenticated users
 */
export function optionalAuth() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const typedReq = req as AuthenticatedRequest;
    
    // Add user headers if user is authenticated
    if (typedReq.user?.id) {
      res.set('X-User-Id', typedReq.user.id);
      if (typedReq.user.email) {
        res.set('X-User-Email', typedReq.user.email);
      }
    }

    next();
  };
}

/**
 * Require admin role middleware
 * Ensures user is authenticated and has admin role
 */
export function requireAdmin() {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const typedReq = req as AuthenticatedRequest;
      
      // Check if user is authenticated
      if (!typedReq.user) {
        const error = DomainError.AuthRequired();
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Check if user has admin role
      if (typedReq.user.role !== 'admin') {
        const error = DomainError.AdminRequired();
        res.status(error.statusCode).json({
          success: false,
          error: error.code,
          message: error.message
        });
        return;
      }

      // Add admin headers
      res.set('X-User-Role', 'admin');

      next();
    } catch (error) {
      console.error('Admin authentication error:', error);
      
      const authError = DomainError.AdminRequired();
      res.status(authError.statusCode).json({
        success: false,
        error: authError.code,
        message: authError.message
      });
      return;
    }
  };
} 