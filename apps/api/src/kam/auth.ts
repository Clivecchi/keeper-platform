// src/kam/auth.ts
// Identity verification endpoint for KAM
//
// NOTE: login/register/logout are handled by inline handlers in index.ts.
// Those handlers are the canonical production auth endpoints.
// This file only exports the `me` identity check, which is used by auth-routes.ts.

import type { Request, Response } from 'express';
import { prisma } from '@keeper/database';

/** Load platform roles (e.g. super-admin) from user_roles → roles. Shared by me and login/register. */
export async function getPlatformRolesForUser(userId: string): Promise<string[]> {
  const userRoles = await prisma.user_roles.findMany({
    where: { userId },
    select: { roles: { select: { name: true } } },
  });
  return userRoles.map((ur) => ur.roles?.name).filter(Boolean) as string[];
}

// GET /api/kam/auth/me
export async function me(req: Request, res: Response) {
  // Identity from auth middleware (cookie preferred)
  const user = (req as any).user;

  // Always set no-store for identity endpoints
  res.set('Cache-Control', 'private, no-store');

  if (!user?.id) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    // Fetch full user details from database
    const dbUser = await prisma.users.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        avatar_url: true,
      },
    });

    if (!dbUser) {
      return res.status(401).json({ error: 'user_not_found' });
    }

    const platformRoles = await getPlatformRolesForUser(dbUser.id);

    return res.json({
      user: { ...dbUser, platformRoles },
    });
  } catch (error) {
    console.error('[kam/auth] Me endpoint error:', error);
    return res.status(500).json({ error: 'internal_server_error' });
  }
}

