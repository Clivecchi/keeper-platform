import type { Request, Response, NextFunction } from 'express';

console.log('🧭 DEBUG: Loaded logRequestMiddleware.ts');

export const logRequestMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const { method, path } = req;
  
  console.log(`[REQ] --> ${method} ${path}`);
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { statusCode } = res;
    console.log(`[RES] <-- ${method} ${path} ${statusCode} ${duration}ms`);
  });
  
  next();
}; 