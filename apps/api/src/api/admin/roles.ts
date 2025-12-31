import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authMiddlewareCompat } from '../../middleware/authMiddleware.js';
import { requireSuperAdmin } from '../../middleware/platformRoleMiddleware.js';
import { randomUUID } from 'crypto';

const router: Router = Router();
const prisma = new PrismaClient();

/**
 * GET /api/admin/roles
 * Returns list of all platform roles
 */
router.get('/', authMiddlewareCompat, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const roles = await prisma.roles.findMany({ orderBy: { name: 'asc' } });
    return res.json({ roles });
  } catch (error) {
    console.error('[Roles] list roles error', error);
    return res.status(500).json({ error: 'Failed to fetch platform roles' });
  }
});

/**
 * GET /api/admin/roles/users
 * Returns users with their platform roles
 */
router.get('/users', authMiddlewareCompat, requireSuperAdmin, async (_req: Request, res: Response) => {
  try {
    const users = await prisma.users.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      roles: [], // Removed user_roles as it doesn't exist in schema
    }));

    return res.json({ users: formatted });
  } catch (error) {
    console.error('[Roles] list users error', error);
    return res.status(500).json({ error: 'Failed to fetch users with roles' });
  }
});

/**
 * POST /api/admin/roles/assign
 * Body: { userId, roleName }
 */
router.post('/assign', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  const { userId, roleName } = req.body as { userId?: string; roleName?: string };
  
  console.log(`[Roles] Attempting to assign role '${roleName}' to user ${userId}`);
  
  if (!userId || !roleName) {
    console.log('[Roles] Missing userId or roleName');
    return res.status(400).json({ error: 'userId and roleName are required' });
  }

  try {
    // Validate user exists
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      console.log(`[Roles] User ${userId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log(`[Roles] Found user: ${user.email}`);

    // Validate role exists
    const role = await prisma.roles.findUnique({ where: { name: roleName } });
    if (!role) {
      console.log(`[Roles] Role '${roleName}' not found`);
      return res.status(404).json({ error: `Role '${roleName}' not found` });
    }
    console.log(`[Roles] Found role: ${role.name} (${role.id})`);

    // Check if role is already assigned
    const existingAssignment = await prisma.user_roles.findUnique({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });

    if (existingAssignment) {
      console.log(`[Roles] User ${userId} already has role '${roleName}'`);
      return res.status(409).json({ error: `User already has role '${roleName}'` });
    }

    // Assign the role
    const newAssignment = await prisma.user_roles.create({
      data: {
        id: randomUUID(),
        userId,
        roleId: role.id,
        updatedAt: new Date(),
      },
    });

    console.log(`[Roles] Successfully assigned role '${roleName}' to user ${userId}. Assignment ID: ${newAssignment.id}`);
    return res.json({ success: true, message: `Role '${roleName}' assigned successfully` });
  } catch (error) {
    console.error('[Roles] assign error', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return res.status(409).json({ error: 'Role assignment already exists' });
    } else {
      return res.status(500).json({ error: 'Failed to assign role' });
    }
  }
});

/**
 * DELETE /api/admin/roles/assign
 * Body: { userId, roleName }
 */
router.delete('/assign', authMiddlewareCompat, requireSuperAdmin, async (req: Request, res: Response) => {
  const { userId, roleName } = req.body as { userId?: string; roleName?: string };
  
  if (!userId || !roleName) {
    return res.status(400).json({ error: 'userId and roleName are required' });
  }

  try {
    // Validate user exists
    const user = await prisma.users.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate role exists
    const role = await prisma.roles.findUnique({ where: { name: roleName } });
    if (!role) {
      return res.status(404).json({ error: `Role '${roleName}' not found` });
    }

    // Remove the role assignment
    const result = await prisma.user_roles.delete({
      where: {
        userId_roleId: {
          userId,
          roleId: role.id,
        },
      },
    });

    if (result) {
      console.log(`[Roles] Removed role '${roleName}' from user ${userId}`);
      return res.json({ success: true, message: `Role '${roleName}' removed successfully` });
    } else {
      return res.status(404).json({ error: `User does not have role '${roleName}'` });
    }
  } catch (error) {
    console.error('[Roles] remove error', error);
    if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
      return res.status(404).json({ error: `User does not have role '${roleName}'` });
    } else {
      return res.status(500).json({ error: 'Failed to remove role assignment' });
    }
  }
});

export default router; 