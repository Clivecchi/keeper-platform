/**
 * Boards API Routes
 * =================
 * 
 * Express routes for board CRUD operations.
 * Handles board creation, retrieval, updating, and deletion.
 */

import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@keeper/database';
import { requireAuth } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';

const router = Router();
const prisma = new PrismaClient();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const CreateBoardSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.string().min(1).max(50),
  description: z.string().optional(),
  engagementMode: z.enum(['dialogic', 'wizard', 'focus', 'canvas']).default('canvas'),
  layout: z.enum(['grid', 'column', 'row', 'wizard', 'focus', 'canvas']).default('canvas'),
  domainId: z.string().uuid(),
  theme: z.object({
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    accentColor: z.string().optional(),
    borderColor: z.string().optional()
  }).optional()
});

const UpdateBoardSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
  engagementMode: z.enum(['dialogic', 'wizard', 'focus', 'canvas']).optional(),
  layout: z.enum(['grid', 'column', 'row', 'wizard', 'focus', 'canvas']).optional(),
  theme: z.object({
    primaryColor: z.string().optional(),
    backgroundColor: z.string().optional(),
    accentColor: z.string().optional(),
    borderColor: z.string().optional()
  }).optional(),
  frames: z.array(z.object({
    id: z.string(),
    entityType: z.string(),
    entityId: z.string(),
    configId: z.string(),
    currentContentId: z.string().nullable(),
    position: z.object({
      x: z.number(),
      y: z.number(),
      width: z.number().optional(),
      height: z.number().optional()
    }).optional()
  })).optional()
});

// =============================================================================
// ROUTES
// =============================================================================

/**
 * GET /api/boards
 * List boards for a domain
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { domainId } = req.query;
    
    if (!domainId || typeof domainId !== 'string') {
      return res.status(400).json({ error: 'domainId is required' });
    }

    // Check if user has access to this domain
    const userDomain = await prisma.userDomain.findFirst({
      where: {
        userId: req.user.id,
        domainId: domainId
      }
    });

    if (!userDomain) {
      return res.status(403).json({ error: 'Access denied to domain' });
    }

    // For now, return mock data since we don't have a boards table yet
    // TODO: Replace with actual board queries when board storage is implemented
    const mockBoards = [
      {
        id: 'agent-board-1',
        name: 'Agent Configuration Board',
        type: 'agent_board',
        description: 'Configure and manage AI agents',
        lastModified: new Date('2024-01-28'),
        frameCount: 4,
        engagementMode: 'dialogic',
        domainId
      },
      {
        id: 'domain-board-1',
        name: 'Domain Management Board',
        type: 'domain_board',
        description: 'Manage domain settings and members',
        lastModified: new Date('2024-01-27'),
        frameCount: 4,
        engagementMode: 'wizard',
        domainId
      },
      {
        id: 'journey-board-1',
        name: 'Journey Visualization Board',
        type: 'journey_board',
        description: 'Visualize and manage learning journeys',
        lastModified: new Date('2024-01-26'),
        frameCount: 4,
        engagementMode: 'canvas',
        domainId
      },
      {
        id: 'keeper-type-board-1',
        name: 'Keeper Type Management',
        type: 'keeper_type_board',
        description: 'Manage Keeper Types and configurations',
        lastModified: new Date('2024-01-25'),
        frameCount: 5,
        engagementMode: 'wizard',
        domainId
      },
      {
        id: 'people-board-1',
        name: 'People Management Board',
        type: 'people_board',
        description: 'Manage people and collaboration',
        lastModified: new Date('2024-01-24'),
        frameCount: 5,
        engagementMode: 'canvas',
        domainId
      }
    ];

    res.json(mockBoards);
  } catch (error) {
    console.error('Error fetching boards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/boards
 * Create a new board
 */
router.post('/', requireAuth, validateRequest(CreateBoardSchema), async (req, res) => {
  try {
    const { name, type, description, engagementMode, layout, domainId, theme } = req.body;

    // Check if user has access to this domain
    const userDomain = await prisma.userDomain.findFirst({
      where: {
        userId: req.user.id,
        domainId: domainId
      }
    });

    if (!userDomain) {
      return res.status(403).json({ error: 'Access denied to domain' });
    }

    // For now, return mock created board
    // TODO: Replace with actual board creation when board storage is implemented
    const mockBoard = {
      id: `board-${Date.now()}`,
      name,
      type,
      description,
      engagementMode,
      layout,
      domainId,
      theme,
      frameCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: req.user.id
    };

    console.log('Board created:', mockBoard);
    res.status(201).json(mockBoard);
  } catch (error) {
    console.error('Error creating board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/boards/:boardId
 * Get a specific board with its frames
 */
router.get('/:boardId', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;

    // For now, return mock board data
    // TODO: Replace with actual board query when board storage is implemented
    const mockBoard = {
      id: boardId,
      config: {
        id: `${boardId}-config`,
        type: 'custom_board',
        name: 'Custom Board',
        description: 'A custom board created in Board Studio',
        layout: 'canvas',
        engagementMode: 'canvas',
        allowLayoutEditing: true,
        theme: {
          primaryColor: '#334155',
          backgroundColor: '#E2E8F0',
          accentColor: '#0F172A',
          borderColor: '#CBD5E1'
        }
      },
      frames: [],
      entityType: 'board',
      entityId: boardId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    res.json(mockBoard);
  } catch (error) {
    console.error('Error fetching board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PATCH /api/boards/:boardId
 * Update a board
 */
router.patch('/:boardId', requireAuth, validateRequest(UpdateBoardSchema), async (req, res) => {
  try {
    const { boardId } = req.params;
    const updates = req.body;

    // For now, just log the update and return success
    // TODO: Replace with actual board update when board storage is implemented
    console.log('Board update requested:', boardId, updates);

    const updatedBoard = {
      id: boardId,
      ...updates,
      updatedAt: new Date()
    };

    res.json(updatedBoard);
  } catch (error) {
    console.error('Error updating board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/boards/:boardId
 * Delete a board
 */
router.delete('/:boardId', requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;

    // For now, just log the deletion
    // TODO: Replace with actual board deletion when board storage is implemented
    console.log('Board deletion requested:', boardId);

    res.json({ success: true, message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Error deleting board:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
