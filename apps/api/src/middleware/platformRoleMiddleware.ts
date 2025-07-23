import { Request, Response, NextFunction } from 'express';

/**
 * Platform Role Middleware
 * Requires the authenticated user to possess a specific platform-level role (e.g., "super-admin").
 * Assumes authMiddleware/authMiddlewareCompat has populated req.user.platformRoles.
 */
export function requirePlatformRole(role: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as { id: string; platformRoles?: string[] } | undefined;

    if (!user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!user.platformRoles || !user.platformRoles.includes(role)) {
      res.status(403).json({ error: `Requires ${role} role` });
      return;
    }

    next();
  };
}

// Convenience wrapper for the most common case
export const requireSuperAdmin = requirePlatformRole('super-admin'); 