import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@keeper/database';
import { randomUUID } from 'crypto';

export type RequestLogLevel = 'debug' | 'info' | 'warn' | 'error';

export async function logReq(reqId: string | undefined, step: string, meta?: Record<string, unknown>, level: RequestLogLevel = 'info') {
  if (!reqId) return null;
  try {
    return await prisma.requestLog.create({
      data: {
        reqId,
        level,
        step,
        meta: (meta || {}) as any,
      },
    });
  } catch {
    return null;
  }
}

export function ensureRequestId(req: Request, res: Response, next: NextFunction): void {
  const existing = (req as any).reqId || req.get('x-request-id') || req.get('x-railway-request-id');
  const value = existing || randomUUID();
  (req as any).reqId = value;
  res.setHeader('x-request-id', value);
  next();
}


