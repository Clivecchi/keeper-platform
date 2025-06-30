/**
 * KipAgentPermissionService
 * =========================
 * 
 * Service for managing agent visibility and permissions.
 * Handles who can view, run, edit, and share agents.
 */

import { PrismaClient } from '@prisma/client';
import type { AgentPermission, AgentVisibility } from '@keeper/database/types';

const prisma = new PrismaClient();

export class KipAgentPermissionService {
  /**
   * Check if user has permission to perform an action on an agent
   */
  static async hasPermission(agentId: string, userId: string, action: AgentPermission): Promise<boolean> {
    try {
      // Get the agent with its visibility and owner info
      const agent = await prisma.kip_agents.findUnique({
        where: { id: agentId },
        select: {
          visibility: true,
          created_by: true,
        },
      });

      if (!agent) return false;

      // Owner has all permissions
      if (agent.created_by === userId) {
        return true;
      }

      // Public agents allow 'run' permission for everyone
      if (agent.visibility === 'public' && action === 'run') {
        return true;
      }

      // Check explicit permissions for shared agents
      if (agent.visibility === 'shared') {
        const permission = await prisma.kip_agent_permissions.findUnique({
          where: {
            agent_id_user_id_permission: {
              agent_id: agentId,
              user_id: userId,
              permission: action,
            },
          },
        });

        return !!permission;
      }

      // Private agents are only accessible by owner
      return false;
    } catch (error) {
      console.error('Error checking permission:', error);
      return false;
    }
  }

  /**
   * Grant permission to a user for an agent
   */
  static async grantPermission(agentId: string, userId: string, permission: AgentPermission): Promise<boolean> {
    try {
      await prisma.kip_agent_permissions.upsert({
        where: {
          agent_id_user_id_permission: {
            agent_id: agentId,
            user_id: userId,
            permission: permission,
          },
        },
        update: {},
        create: {
          agent_id: agentId,
          user_id: userId,
          permission: permission,
        },
      });

      return true;
    } catch (error) {
      console.error('Error granting permission:', error);
      return false;
    }
  }

  /**
   * Revoke permission from a user for an agent
   */
  static async revokePermission(agentId: string, userId: string, permission: AgentPermission): Promise<boolean> {
    try {
      await prisma.kip_agent_permissions.delete({
        where: {
          agent_id_user_id_permission: {
            agent_id: agentId,
            user_id: userId,
            permission: permission,
          },
        },
      });

      return true;
    } catch (error) {
      console.error('Error revoking permission:', error);
      return false;
    }
  }

  /**
   * Get all users with permissions for an agent
   */
  static async getAgentPermissions(agentId: string): Promise<Array<{
    user_id: string;
    permission: AgentPermission;
    user?: { name?: string; email?: string };
  }>> {
    try {
      const permissions = await prisma.kip_agent_permissions.findMany({
        where: { agent_id: agentId },
        include: {
          // Note: We need to add user relation in schema, for now just return IDs
        },
      });

      return permissions.map((p: any) => ({
        user_id: p.user_id,
        permission: p.permission as AgentPermission,
      }));
    } catch (error) {
      console.error('Error getting agent permissions:', error);
      return [];
    }
  }

  /**
   * Get all agents visible to a user
   */
  static async getVisibleAgents(userId: string): Promise<string[]> {
    try {
      // Get public agents
      const publicAgents = await prisma.kip_agents.findMany({
        where: { visibility: 'public' },
        select: { id: true },
      });

      // Get user's own agents
      const ownAgents = await prisma.kip_agents.findMany({
        where: { created_by: userId },
        select: { id: true },
      });

      // Get shared agents where user has permissions
      const sharedAgents = await prisma.kip_agent_permissions.findMany({
        where: { user_id: userId },
        select: { agent_id: true },
        distinct: ['agent_id'],
      });

      const allAgentIds = [
        ...publicAgents.map(a => a.id),
        ...ownAgents.map(a => a.id),
        ...sharedAgents.map(p => p.agent_id),
      ];

      // Remove duplicates
      return [...new Set(allAgentIds)];
    } catch (error) {
      console.error('Error getting visible agents:', error);
      return [];
    }
  }

  /**
   * Update agent visibility
   */
  static async updateAgentVisibility(agentId: string, userId: string, visibility: AgentVisibility): Promise<boolean> {
    try {
      // Check if user is the owner
      const agent = await prisma.kip_agents.findUnique({
        where: { id: agentId },
        select: { created_by: true },
      });

      if (!agent || agent.created_by !== userId) {
        return false; // Only owner can change visibility
      }

      await prisma.kip_agents.update({
        where: { id: agentId },
        data: { visibility },
      });

      return true;
    } catch (error) {
      console.error('Error updating agent visibility:', error);
      return false;
    }
  }
} 