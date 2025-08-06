/**
 * Board API Endpoints
 * 
 * Express API routes for Board and Frame CRUD operations.
 * Provides context-aware endpoints for entity-specific operations.
 */

import type { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { BoardSchema, FrameConfigSchema, FrameInstanceSchema, FrameContentSchema } from '../types/board.js';

const prisma = new PrismaClient();

// Validation schemas for API requests
const CreateBoardSchema = BoardSchema.omit({ id: true, createdAt: true, updatedAt: true });
const UpdateBoardSchema = BoardSchema.partial().omit({ id: true, createdAt: true, updatedAt: true });

const CreateFrameConfigSchema = FrameConfigSchema.omit({ id: true, createdAt: true, updatedAt: true });
const UpdateFrameConfigSchema = FrameConfigSchema.partial().omit({ id: true, createdAt: true, updatedAt: true });

const CreateFrameInstanceSchema = FrameInstanceSchema.omit({ id: true, createdAt: true, updatedAt: true });
const UpdateFrameInstanceSchema = FrameInstanceSchema.partial().omit({ id: true, createdAt: true, updatedAt: true });

const CreateFrameContentSchema = FrameContentSchema.omit({ id: true, createdAt: true });
const UpdateFrameContentSchema = FrameContentSchema.partial().omit({ id: true, createdAt: true });

// Board Endpoints
export async function getBoardsHandler(req: Request, res: Response) {
  try {
    const { type, ownerId } = req.query;
    
    const where: any = {};
    if (type) where.type = type;
    if (ownerId) where.ownerId = ownerId;

    const boards = await prisma.board.findMany({
      where,
      include: {
        themes: true,
        FrameInstance: {
          include: {
            FrameConfig: true,
            FrameContent_FrameInstance_currentContentIdToFrameContent: true,
            FrameContent_FrameContent_playlistOwnerIdToFrameInstance: true,
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ success: true, data: boards });
  } catch (error) {
    console.error('Get boards error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch boards' });
  }
}

export async function getBoardHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const board = await prisma.board.findUnique({
      where: { id },
      include: {
        themes: true,
        FrameInstance: {
          include: {
            FrameConfig: true,
            FrameContent_FrameInstance_currentContentIdToFrameContent: true,
            FrameContent_FrameContent_playlistOwnerIdToFrameInstance: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!board) {
      return res.status(404).json({ success: false, error: 'Board not found' });
    }

    // Transform to expected format
    const transformedBoard = {
      ...board,
      frames: board.FrameInstance.map(instance => ({
        ...instance,
        config: instance.FrameConfig,
        currentContent: instance.FrameContent_FrameInstance_currentContentIdToFrameContent,
        playlistContent: instance.FrameContent_FrameContent_playlistOwnerIdToFrameInstance,
      })),
    };

    res.json({ success: true, data: transformedBoard });
  } catch (error) {
    console.error('Get board error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch board' });
  }
}

export async function createBoardHandler(req: Request, res: Response) {
  try {
    const validatedData = CreateBoardSchema.parse(req.body);
    
    const board = await prisma.board.create({
      data: {
        id: crypto.randomUUID(),
        name: validatedData.name,
        type: validatedData.type,
        engagementMode: validatedData.engagementMode,
        ownerId: validatedData.ownerId,
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        config: validatedData.config,
        // theme_id is handled by Prisma relation
        ...(validatedData.theme_id && { themes: { connect: { id: validatedData.theme_id } } }),
      },
      include: {
        themes: true,
        FrameInstance: {
          include: {
            FrameConfig: true,
            FrameContent_FrameInstance_currentContentIdToFrameContent: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.status(201).json({ success: true, data: board });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Create board error:', error);
    res.status(500).json({ success: false, error: 'Failed to create board' });
  }
}

export async function updateBoardHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const validatedData = UpdateBoardSchema.parse(req.body);

    const board = await prisma.board.update({
      where: { id },
      data: validatedData,
      include: {
        themes: true,
        FrameInstance: {
          include: {
            FrameConfig: true,
            FrameContent_FrameInstance_currentContentIdToFrameContent: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    res.json({ success: true, data: board });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Update board error:', error);
    res.status(500).json({ success: false, error: 'Failed to update board' });
  }
}

export async function deleteBoardHandler(req: Request, res: Response) {
  try {
    const { id } = req.params;

    await prisma.board.delete({
      where: { id },
    });

    res.json({ success: true, message: 'Board deleted successfully' });
  } catch (error) {
    console.error('Delete board error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete board' });
  }
}

// Frame Config Endpoints
export async function getFrameConfigsHandler(req: Request, res: Response) {
  try {
    const { type } = req.query;
    
    const where: any = {};
    if (type) where.type = type;

    const configs = await prisma.frameConfig.findMany({
      where,
      orderBy: { name: 'asc' },
    });

    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Get frame configs error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch frame configs' });
  }
}

export async function createFrameConfigHandler(req: Request, res: Response) {
  try {
    const validatedData = CreateFrameConfigSchema.parse(req.body);
    
    const config = await prisma.frameConfig.create({
      data: {
        id: crypto.randomUUID(),
        name: validatedData.name,
        type: validatedData.type,
        description: validatedData.description,
        theme: validatedData.theme,
        config: validatedData.config,
      },
    });

    res.status(201).json({ success: true, data: config });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Create frame config error:', error);
    res.status(500).json({ success: false, error: 'Failed to create frame config' });
  }
}

// Frame Instance Endpoints
export async function getFrameInstancesHandler(req: Request, res: Response) {
  try {
    const { entityType, entityId, boardId } = req.params;
    
    const where: any = {};
    if (entityType && entityId) {
      where.entityType = entityType;
      where.entityId = entityId;
    }
    if (boardId) {
      where.boardId = boardId;
    }

    const instances = await prisma.frameInstance.findMany({
      where,
      include: {
        FrameConfig: true,
        FrameContent_FrameInstance_currentContentIdToFrameContent: true,
        FrameContent_FrameContent_playlistOwnerIdToFrameInstance: true,
      },
      orderBy: { order: 'asc' },
    });

    // Transform to expected format
    const transformedInstances = instances.map(instance => ({
      ...instance,
      config: instance.FrameConfig,
      currentContent: instance.FrameContent_FrameInstance_currentContentIdToFrameContent,
      playlistContent: instance.FrameContent_FrameContent_playlistOwnerIdToFrameInstance,
    }));

    res.json({ success: true, data: transformedInstances });
  } catch (error) {
    console.error('Get frame instances error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch frame instances' });
  }
}

export async function createFrameInstanceHandler(req: Request, res: Response) {
  try {
    const validatedData = CreateFrameInstanceSchema.parse(req.body);
    
    const instance = await prisma.frameInstance.create({
      data: {
        id: crypto.randomUUID(),
        boardId: validatedData.boardId,
        entityType: validatedData.entityType,
        entityId: validatedData.entityId,
        configId: validatedData.configId,
        currentContentId: validatedData.currentContentId,
        order: validatedData.order,
      },
      include: {
        FrameConfig: true,
        FrameContent_FrameInstance_currentContentIdToFrameContent: true,
      },
    });

    res.status(201).json({ success: true, data: instance });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Create frame instance error:', error);
    res.status(500).json({ success: false, error: 'Failed to create frame instance' });
  }
}

// Frame Content Endpoints
export async function createFrameContentHandler(req: Request, res: Response) {
  try {
    const validatedData = CreateFrameContentSchema.parse(req.body);
    
    const content = await prisma.frameContent.create({
      data: {
        ...validatedData,
        id: crypto.randomUUID(),
      },
    });

    res.status(201).json({ success: true, data: content });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: 'Validation error', details: error.errors });
    }
    console.error('Create frame content error:', error);
    res.status(500).json({ success: false, error: 'Failed to create frame content' });
  }
}