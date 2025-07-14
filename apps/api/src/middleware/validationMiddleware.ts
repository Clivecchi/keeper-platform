/**
 * Validation Middleware
 * Validates request data using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

/**
 * Middleware to validate request body using Zod schema
 */
export const validationMiddleware = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: (error as z.ZodError).errors.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        res.status(500).json({
          error: 'Internal validation error'
        });
      }
    }
  };
};

/**
 * Middleware to validate query parameters using Zod schema
 */
export const queryValidationMiddleware = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate query parameters
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Query validation failed',
          details: (error as z.ZodError).errors.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        res.status(500).json({
          error: 'Internal validation error'
        });
      }
    }
  };
};

/**
 * Middleware to validate request parameters using Zod schema
 */
export const paramValidationMiddleware = (schema: z.ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate parameters
      req.params = schema.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: 'Parameter validation failed',
          details: (error as z.ZodError).errors.map((err: any) => ({
            field: err.path.join('.'),
            message: err.message
          }))
        });
      } else {
        res.status(500).json({
          error: 'Internal validation error'
        });
      }
    }
  };
}; 