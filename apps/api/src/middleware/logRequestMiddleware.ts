import type { Request, Response, NextFunction } from 'express';

export const logRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Minimal logging for development - only log errors or specific endpoints if needed
  next();
}; 