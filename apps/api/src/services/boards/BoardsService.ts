/**
 * Boards Service
 * ==============
 * Core business logic for board operations
 */

import { PrismaClient, Prisma } from '@keeper/database';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

export interface SetViewerModeInput {
  boardId: string;
  mode: 'public' | 'member' | 'editor';
  userId: string;
}

export interface AddFrameInput {
  boardId: string;
  pattern: string;
  name: string;
  index?: number;
  props?: Record<string, any>;
  userId: string;
}

export interface UpdateFrameInput {
  frameId: string;
  patch: Record<string, any>;
  userId: string;
}

export interface SetCoverInput {
  boardId: string;
  mediaId: string;
  userId: string;
}

export interface UpsertNavInput {
  boardId: string;
  items: Array<{
    label: string;
    href: string;
    icon?: string;
  }>;
  userId: string;
}

export interface PublishBoardInput {
  boardId: string;
  isPublic: boolean;
  userId: string;
}

/**
 * Check if user has permission to modify a board
 */
export async function checkBoardPermission(boardId: string, userId: string): Promise<boolean> {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    include: { domain: true }
  });

  if (!board || !board.domainId) {
    return false;
  }

  const permission = await prisma.domainPermission.findFirst({
    where: {
      domainId: board.domainId,
      userId: userId,
      role: { in: ['owner', 'admin', 'editor'] }
    }
  });

  return !!permission;
}

/**
 * Set viewer mode for a board
 */
export async function setViewerMode(input: SetViewerModeInput) {
  const hasPermission = await checkBoardPermission(input.boardId, input.userId);
  if (!hasPermission) {
    throw new Error('ACCESS_DENIED');
  }

  const board = await prisma.board.update({
    where: { id: input.boardId },
    data: { viewerMode: input.mode }
  });

  return {
    ok: true,
    boardId: board.id,
    viewerMode: board.viewerMode
  };
}

/**
 * Add a frame to a board
 */
export async function addFrame(input: AddFrameInput) {
  const hasPermission = await checkBoardPermission(input.boardId, input.userId);
  if (!hasPermission) {
    throw new Error('ACCESS_DENIED');
  }

  // Get default config or create one
  let config = await prisma.frameConfig.findFirst({
    where: { name: 'default-frame-config' }
  });

  if (!config) {
    config = await prisma.frameConfig.create({
      data: {
        id: randomUUID(),
        name: 'default-frame-config',
        description: 'Default frame configuration',
        theme: {},
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });
  }

  // Determine order index
  let orderIndex = input.index ?? 0;
  if (input.index === undefined) {
    const maxFrame = await prisma.frameInstance.findFirst({
      where: { boardId: input.boardId },
      orderBy: { orderIndex: 'desc' },
      select: { orderIndex: true }
    });
    orderIndex = maxFrame ? maxFrame.orderIndex + 1 : 0;
  }

  const frame = await prisma.frameInstance.create({
    data: {
      id: randomUUID(),
      boardId: input.boardId,
      entityType: 'board',
      entityId: input.boardId,
      configId: config.id,
      name: input.name,
      pattern: input.pattern,
      orderIndex,
      props: input.props || {},
      visibility: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  });

  return {
    ok: true,
    frame: {
      id: frame.id,
      name: frame.name,
      pattern: frame.pattern,
      orderIndex: frame.orderIndex,
      props: frame.props
    }
  };
}

/**
 * Update a frame
 */
export async function updateFrame(input: UpdateFrameInput) {
  const frame = await prisma.frameInstance.findUnique({
    where: { id: input.frameId },
    include: { Board: true }
  });

  if (!frame || !frame.boardId) {
    throw new Error('FRAME_NOT_FOUND');
  }

  const hasPermission = await checkBoardPermission(frame.boardId, input.userId);
  if (!hasPermission) {
    throw new Error('ACCESS_DENIED');
  }

  // Validate and apply patch
  const allowedFields = ['name', 'pattern', 'props', 'orderIndex', 'visibility', 'layoutData'];
  const updateData: any = {};

  for (const [key, value] of Object.entries(input.patch)) {
    if (allowedFields.includes(key)) {
      updateData[key] = value;
    }
  }

  if (Object.keys(updateData).length === 0) {
    throw new Error('INVALID_PATCH');
  }

  const updatedFrame = await prisma.frameInstance.update({
    where: { id: input.frameId },
    data: {
      ...updateData,
      updatedAt: new Date()
    }
  });

  return {
    ok: true,
    frame: {
      id: updatedFrame.id,
      name: updatedFrame.name,
      pattern: updatedFrame.pattern,
      props: updatedFrame.props,
      orderIndex: updatedFrame.orderIndex
    }
  };
}

/**
 * Set board cover
 */
export async function setCover(input: SetCoverInput) {
  const hasPermission = await checkBoardPermission(input.boardId, input.userId);
  if (!hasPermission) {
    throw new Error('ACCESS_DENIED');
  }

  // Store mediaId in board config
  const board = await prisma.board.findUnique({
    where: { id: input.boardId }
  });

  if (!board) {
    throw new Error('BOARD_NOT_FOUND');
  }

  const config = typeof board.config === 'object' && board.config !== null
    ? board.config as Prisma.JsonObject
    : {};

  const updatedBoard = await prisma.board.update({
    where: { id: input.boardId },
    data: {
      config: {
        ...config,
        coverId: input.mediaId
      }
    }
  });

  return {
    ok: true,
    boardId: updatedBoard.id,
    coverId: input.mediaId
  };
}

/**
 * Upsert pathway navigation
 */
export async function upsertNav(input: UpsertNavInput) {
  const hasPermission = await checkBoardPermission(input.boardId, input.userId);
  if (!hasPermission) {
    throw new Error('ACCESS_DENIED');
  }

  const board = await prisma.board.findUnique({
    where: { id: input.boardId }
  });

  if (!board) {
    throw new Error('BOARD_NOT_FOUND');
  }

  const config = typeof board.config === 'object' && board.config !== null
    ? board.config as Prisma.JsonObject
    : {};

  const updatedBoard = await prisma.board.update({
    where: { id: input.boardId },
    data: {
      config: {
        ...config,
        nav: input.items
      }
    }
  });

  return {
    ok: true,
    boardId: updatedBoard.id,
    nav: input.items
  };
}

/**
 * Publish or unpublish a board
 */
export async function publishBoard(input: PublishBoardInput) {
  const hasPermission = await checkBoardPermission(input.boardId, input.userId);
  if (!hasPermission) {
    throw new Error('ACCESS_DENIED');
  }

  const board = await prisma.board.update({
    where: { id: input.boardId },
    data: { isPublic: input.isPublic }
  });

  return {
    ok: true,
    boardId: board.id,
    isPublic: board.isPublic
  };
}

/**
 * Upload media (base64)
 * This is a placeholder - integrate with actual media upload service
 */
export async function uploadMedia(input: {
  mime: string;
  name: string;
  bytesBase64: string;
  userId: string;
}): Promise<{ mediaId: string; url: string }> {
  // For MVP, we'll create a simple record
  // In production, this should use the actual media service
  const mediaId = randomUUID();
  
  // TODO: Integrate with actual media upload service
  // For now, return a mock response
  return {
    mediaId,
    url: `/api/media/${mediaId}`
  };
}

