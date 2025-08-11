/**
 * Boards API Routes
 * Same-origin API endpoints for all board types and frame data
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { authMiddlewareCompat } from '../middleware/authMiddleware.js';
import { requireDomainReadCompat } from '../middleware/domainPermissionMiddleware.js';

const router: Router = Router();
const prisma = new PrismaClient();

// Validation schemas
const boardQuerySchema = z.object({
  domainId: z.string().optional(),
  type: z.enum(['agent', 'domain', 'journey', 'keeper-type', 'people']).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

const createBoardSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['agent', 'domain', 'journey', 'keeper-type', 'people']),
  description: z.string().max(1000).optional(),
  entityId: z.string(),
  domainId: z.string().optional(),
  theme: z.record(z.any()).optional(),
});

/**
 * GET /api/boards - Get all boards with filtering
 */
router.get('/', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { domainId, type, limit, offset } = boardQuerySchema.parse(req.query);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, return structured mock data that matches the expected format
    // This will be replaced with real database queries once the Board model is added to Prisma
    const boards = [
      {
        id: 'agent-board-1',
        name: 'Agent Configuration Board',
        type: 'agent',
        description: 'Configure and manage AI agents',
        entityId: 'kip-agent-1',
        domainId: domainId || 'default-domain',
        lastModified: new Date('2024-01-28'),
        frameCount: 3,
        engagementMode: 'dialogic',
        theme: {
          primaryColor: '#3B82F6',
          backgroundColor: '#F8FAFC',
        }
      },
      {
        id: 'domain-board-1',
        name: 'Domain Management Board',
        type: 'domain',
        description: 'Manage domain settings and members',
        entityId: 'keeper-platform',
        domainId: domainId || 'default-domain',
        lastModified: new Date('2024-01-27'),
        frameCount: 4,
        engagementMode: 'wizard',
        theme: {
          primaryColor: '#059669',
          backgroundColor: '#F0FDF4',
        }
      },
      {
        id: 'journey-board-1',
        name: 'Journey Visualization Board',
        type: 'journey',
        description: 'Visualize and manage learning journeys',
        entityId: 'journey-1',
        domainId: domainId || 'default-domain',
        lastModified: new Date('2024-01-26'),
        frameCount: 4,
        engagementMode: 'canvas',
        theme: {
          primaryColor: '#3B82F6',
          backgroundColor: '#EFF6FF',
        }
      },
      {
        id: 'keeper-type-board-1',
        name: 'Keeper Type Board',
        type: 'keeper-type',
        description: 'Manage keeper types and capabilities',
        entityId: 'devkeeper',
        domainId: domainId || 'default-domain',
        lastModified: new Date('2024-01-25'),
        frameCount: 2,
        engagementMode: 'dialogic',
        theme: {
          primaryColor: '#F59E0B',
          backgroundColor: '#FFFBEB',
        }
      },
      {
        id: 'people-board-1',
        name: 'People Management Board',
        type: 'people',
        description: 'Manage team members and roles',
        entityId: 'people-1',
        domainId: domainId || 'default-domain',
        lastModified: new Date('2024-01-24'),
        frameCount: 5,
        engagementMode: 'canvas',
        theme: {
          primaryColor: '#6366F1',
          backgroundColor: '#EEF2FF',
        }
      }
    ];

    // Filter by type if specified
    const filteredBoards = type ? boards.filter(board => board.type === type) : boards;

    // Apply pagination
    const paginatedBoards = filteredBoards.slice(offset, offset + limit);

    return res.json({
      boards: paginatedBoards,
      total: filteredBoards.length,
      page: Math.floor(offset / limit) + 1,
      limit,
    });
  } catch (error) {
    console.error('Error fetching boards:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/boards/:id - Get a specific board by ID
 */
router.get('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Mock board data - replace with real database query
    const mockBoards: Record<string, any> = {
      'agent-board-1': {
        id: 'agent-board-1',
        config: {
          id: 'agent-board-config-1',
          type: 'agent',
          name: 'Agent Configuration',
          description: 'Configure and interact with your AI agent',
          layout: 'column',
          engagementMode: 'dialogic',
          allowLayoutEditing: true,
          theme: {
            primaryColor: '#3B82F6',
            backgroundColor: '#F8FAFC',
            accentColor: '#1E40AF',
          }
        },
        frames: [
          {
            id: 'agent-preview-frame-1',
            type: 'agent_preview',
            data: {
              agentName: 'Kip',
              description: 'Kip is the Keeper Platform\'s Lead Agent, guiding users with wisdom, humor, and clarity.',
              status: 'Active',
              capabilities: ['Conversation', 'Memory Management', 'Task Coordination'],
              lastActive: new Date().toISOString(),
            }
          },
          {
            id: 'agent-dialog-frame-1',
            type: 'dialog',
            data: {
              messages: [
                { role: 'assistant', content: 'Hello! I\'m Kip, your Keeper Platform assistant. How can I help you today?' },
              ],
              isActive: true,
            }
          },
          {
            id: 'agent-config-frame-1',
            type: 'config_panel',
            data: {
              settings: {
                tone: 'professional',
                responseLength: 'medium',
                expertise: 'platform_guidance',
              },
              availableSettings: ['tone', 'responseLength', 'expertise'],
            }
          }
        ],
        entityType: 'agent',
        entityId: 'kip-agent-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    };

    const board = mockBoards[id];
    if (!board) {
      return res.status(404).json({ error: 'Board not found' });
    }

    return res.json(board);
  } catch (error) {
    console.error('Error fetching board:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
