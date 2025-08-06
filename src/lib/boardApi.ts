/**
 * Board and Frame API Utilities
 * 
 * Provides API functions for Board and Frame CRUD operations,
 * including context-aware endpoints for entity-specific operations.
 */

import { apiFetch } from './api';
import type { 
  Board, 
  BoardWithFrames, 
  FrameConfig, 
  FrameContent, 
  FrameInstance, 
  FrameInstanceWithConfig,
  BoardType,
  FrameType 
} from '../types/board';

// Board API Functions
export async function fetchBoard(boardId: string): Promise<BoardWithFrames> {
  return apiFetch(`/api/boards/${boardId}`);
}

export async function fetchBoardsByType(type: BoardType, ownerId?: string): Promise<Board[]> {
  const params = new URLSearchParams({ type });
  if (ownerId) params.append('ownerId', ownerId);
  return apiFetch(`/api/boards?${params.toString()}`);
}

export async function fetchBoardsByEntity(entityType: string, entityId: string): Promise<Board[]> {
  return apiFetch(`/api/boards/entity/${entityType}/${entityId}`);
}

export async function createBoard(data: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>): Promise<Board> {
  return apiFetch('/api/boards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateBoard(boardId: string, data: Partial<Board>): Promise<Board> {
  return apiFetch(`/api/boards/${boardId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteBoard(boardId: string): Promise<void> {
  return apiFetch(`/api/boards/${boardId}`, {
    method: 'DELETE',
  });
}

// Frame Config API Functions
export async function fetchFrameConfigs(type?: FrameType): Promise<FrameConfig[]> {
  const params = type ? `?type=${type}` : '';
  return apiFetch(`/api/frames/configs${params}`);
}

export async function fetchFrameConfig(configId: string): Promise<FrameConfig> {
  return apiFetch(`/api/frames/configs/${configId}`);
}

export async function createFrameConfig(data: Omit<FrameConfig, 'id' | 'createdAt' | 'updatedAt'>): Promise<FrameConfig> {
  return apiFetch('/api/frames/configs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFrameConfig(configId: string, data: Partial<FrameConfig>): Promise<FrameConfig> {
  return apiFetch(`/api/frames/configs/${configId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// Frame Instance API Functions
export async function fetchFrameInstances(entityType: string, entityId: string): Promise<FrameInstanceWithConfig[]> {
  return apiFetch(`/api/frames/instances/entity/${entityType}/${entityId}`);
}

export async function fetchFrameInstancesByBoard(boardId: string): Promise<FrameInstanceWithConfig[]> {
  return apiFetch(`/api/frames/instances/board/${boardId}`);
}

export async function createFrameInstance(data: Omit<FrameInstance, 'id' | 'createdAt' | 'updatedAt'>): Promise<FrameInstance> {
  return apiFetch('/api/frames/instances', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFrameInstance(instanceId: string, data: Partial<FrameInstance>): Promise<FrameInstance> {
  return apiFetch(`/api/frames/instances/${instanceId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFrameInstance(instanceId: string): Promise<void> {
  return apiFetch(`/api/frames/instances/${instanceId}`, {
    method: 'DELETE',
  });
}

// Frame Content API Functions
export async function fetchFrameContent(contentId: string): Promise<FrameContent> {
  return apiFetch(`/api/frames/content/${contentId}`);
}

export async function fetchPlaylistContent(playlistOwnerId: string): Promise<FrameContent[]> {
  return apiFetch(`/api/frames/content/playlist/${playlistOwnerId}`);
}

export async function createFrameContent(data: Omit<FrameContent, 'id' | 'createdAt'>): Promise<FrameContent> {
  return apiFetch('/api/frames/content', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateFrameContent(contentId: string, data: Partial<FrameContent>): Promise<FrameContent> {
  return apiFetch(`/api/frames/content/${contentId}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteFrameContent(contentId: string): Promise<void> {
  return apiFetch(`/api/frames/content/${contentId}`, {
    method: 'DELETE',
  });
}

// Convenience Functions
export async function createBoardWithFrames(
  boardData: Omit<Board, 'id' | 'createdAt' | 'updatedAt'>,
  frameConfigs: string[]
): Promise<BoardWithFrames> {
  return apiFetch('/api/boards/with-frames', {
    method: 'POST',
    body: JSON.stringify({ board: boardData, frameConfigs }),
  });
}

export async function duplicateBoard(boardId: string, newName: string): Promise<Board> {
  return apiFetch(`/api/boards/${boardId}/duplicate`, {
    method: 'POST',
    body: JSON.stringify({ name: newName }),
  });
}