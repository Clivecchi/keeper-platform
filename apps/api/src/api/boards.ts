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

    // Mock board data with V0-compatible structure
    const mockBoards: Record<string, any> = {
      'demo-board': {
        id: 'demo-board',
        name: 'Demo Board',
        description: 'A demo board for testing the V0 interface',
        keeperId: 'keeper-1',
        frames: [
          {
            id: 'cover-frame',
            name: 'Cover',
            role: 'cover',
            pattern: 'focus',
            props: [
              {
                id: 'hero-image-1',
                type: 'image',
                config: {
                  src: '/placeholder.svg',
                  alt: 'Cover image'
                }
              }
            ]
          },
          {
            id: 'settings-frame',
            name: 'Settings',
            role: 'settings',
            pattern: 'form',
            props: []
          },
          {
            id: 'content-frame',
            name: 'Content',
            role: 'custom',
            pattern: 'canvas',
            props: [
              {
                id: 'ai-token-1',
                type: 'token',
                config: {
                  displayName: 'AI Assistant',
                  avatarUrl: '/placeholder.svg',
                  personaNote: 'Helpful AI assistant for content creation'
                }
              }
            ]
          }
        ]
      },
      'agent-board-1': {
        id: 'agent-board-1',
        name: 'Agent Configuration',
        description: 'Configure and interact with your AI agent',
        keeperId: 'keeper-1',
        frames: [
          {
            id: 'agent-cover',
            name: 'Cover',
            role: 'cover',
            pattern: 'focus',
            props: []
          },
          {
            id: 'agent-settings',
            name: 'Settings',
            role: 'settings',
            pattern: 'form',
            props: []
          }
        ]
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

/**
 * POST /api/boards/:id - Save/update a full board document (idempotent upsert)
 */
const saveBoardSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  keeperId: z.string().optional(),
  frames: z.array(z.object({
    id: z.string(),
    name: z.string(),
    role: z.enum(['cover', 'settings', 'custom']),
    pattern: z.enum(['dialogic', 'wizard', 'focus', 'canvas', 'gallery', 'form']),
    props: z.array(z.object({
      id: z.string(),
      type: z.string(),
      config: z.record(z.any())
    }))
  }))
});

router.post('/:id', authMiddlewareCompat, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const boardData = saveBoardSchema.parse(req.body);
    const userId = (req as any).user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // For now, just log the save and return the board data
    // TODO: Replace with actual database save when board storage is implemented
    console.log('Board save requested:', id, boardData);

    const savedBoard = {
      ...boardData,
      id,
      updatedAt: new Date().toISOString(),
      savedBy: userId
    };

    return res.json(savedBoard);
  } catch (error) {
    console.error('Error saving board:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid board data', details: error.errors });
    }
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
