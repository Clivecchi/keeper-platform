/**
 * Domain Permission Middleware
 * Handles domain-level permission checks
 */

import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@keeper/database';

const prisma = new PrismaClient();

export interface DomainPermissionRequest extends Request {
  user?: {
    id: string;
    email: string | null;
    name?: string | null;
    role?: string | null;
  };
  domainContext?: {
    domain: Record<string, unknown>;
    isCustomDomain: boolean;
    originalHostname: string;
    resolvedSlug: string;
  };
}

/**
 * Require domain read permissions
 */
export function requireDomainRead(req: DomainPermissionRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.domainContext?.domain) {
    res.status(400).json({ error: 'Domain context required' });
    return;
  }

  const { domain } = req.domainContext;
  const userId = req.user.id;

  // Check if user is owner
  if ((domain as any).ownerId === userId) {
    next();
    return;
  }

  // Check domain permissions
  prisma.domainPermission.findFirst({
    where: {
      domainId: (domain as any).id as string,
      userId,
      role: { in: ['admin', 'user'] },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  }).then((permission: any) => {
    if (permission) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient domain permissions' });
    }
  }).catch((error: any) => {
    console.error('Domain permission check error:', error);
    res.status(500).json({ error: 'Permission check failed' });
  });
}

/**
 * Require domain write permissions
 */
export function requireDomainWrite(req: DomainPermissionRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.domainContext?.domain) {
    res.status(400).json({ error: 'Domain context required' });
    return;
  }

  const { domain } = req.domainContext;
  const userId = req.user.id;

  // Check if user is owner
  if (domain.ownerId === userId) {
    next();
    return;
  }

  // Check domain permissions
  prisma.domainPermission.findFirst({
    where: {
      domainId: (domain as any).id as string,
      userId,
      role: { in: ['admin'] },
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  }).then((permission: any) => {
    if (permission) {
      next();
    } else {
      res.status(403).json({ error: 'Insufficient domain permissions' });
    }
  }).catch((error: any) => {
    console.error('Domain permission check error:', error);
    res.status(500).json({ error: 'Permission check failed' });
  });
}

/**
 * Require domain admin permissions
 */
export function requireDomainAdmin(req: DomainPermissionRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!req.domainContext?.domain) {
    res.status(400).json({ error: 'Domain context required' });
    return;
  }

  const { domain } = req.domainContext;
  const userId = req.user.id;

  // Check if user is owner
  if (domain.ownerId === userId) {
    next();
    return;
  }

  // Check domain permissions
  prisma.domainPermission.findFirst({
    where: {
      domainId: (domain as any).id as string,
      userId,
      role: 'admin',
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
  }).then((permission: any) => {
    if (permission) {
      next();
    } else {
      res.status(403).json({ error: 'Admin permissions required' });
    }
  }).catch((error: any) => {
    console.error('Domain permission check error:', error);
    res.status(500).json({ error: 'Permission check failed' });
  });
} 