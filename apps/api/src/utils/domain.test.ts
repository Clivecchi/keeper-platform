/**
 * Domain Utilities Tests
 * Basic tests and examples for domain context utilities
 */

import { Request, Response, NextFunction } from 'express';
import { extractDomainContext } from './domain.js';

// Mock request and response objects
const mockReq = {
  params: {},
  query: {},
  headers: {},
} as Request;

const mockRes = {
  status: (code: number) => ({
    json: (data: unknown) => console.log('Response:', data),
  }),
} as Response;

const mockNext = () => console.log('Next called');

// Test domain middleware
const domainMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const context = extractDomainContext(req);
  
  if (!context) {
    res.status(400).json({ error: 'Domain context required' });
    return;
  }

  // Set domain context
  (req as any).domainContext = {
    domain: context,
    isCustomDomain: false,
    originalHostname: 'test.keeper.tools',
    resolvedSlug: context.domainId,
  };

  next();
}; 