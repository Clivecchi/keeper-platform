/**
 * Log Request Middleware
 * Simple request logging for debugging and monitoring
 */

import { Request, Response, NextFunction } from 'express';

export const logRequestMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  
  console.log(`[${timestamp}] ${method} ${url} - ${ip}`);
  
  // Log headers for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log('  Headers:', JSON.stringify(req.headers, null, 2));
  }
  
  next();
}; 