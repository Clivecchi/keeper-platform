/**
 * Board Data Context - Phase 2 Implementation
 * Provides entity data and board state to frames
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { apiFetch } from '../lib/api';

// =============================================================================
// TYPES
// =============================================================================

export interface EntityData {
  id: string;
  name: string;
  icon?: string;
  metrics?: Record<string, any>;
}

export interface BoardData {
  id: string;
  keeperId: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  theme: {
    primary?: string;
    background?: string;
  };
  behavior: {
    showGrid?: boolean;
    snapToGrid?: boolean;
    gridSize?: number;
    defaultPattern?: string;
    startFrameId?: string | null;
    draftMode?: boolean;
    autosave?: boolean;
    frameOrder?: string[];
  };
  data: {
    scope: 'keeper' | 'domain' | 'journey' | 'people' | 'custom';
    entityId?: string | null;
    dataBindings?: Record<string, any>;
    agentId?: string | null;
  };
  access: {
    visibility?: 'private' | 'unlisted' | 'org' | 'public';
    roles?: Record<string, string>;
    allowComments?: boolean;
    shareLinkEnabled?: boolean;
  };
  frames?: FrameData[];
  createdAt: string;
  updatedAt: string;
}

export interface FrameData {
  id: string;
  boardId: string;
  role?: string;
  name: string;
  pattern: string;
  frameType: string;
  orderIndex: number;
  layoutKind: string;
  layoutData: Record<string, any>;
  props: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

interface BoardDataContextType {
  // Board state
  board: BoardData | null;
  entity: EntityData | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadBoard: (boardId: string) => Promise<void>;
  saveBoard: (updates: Partial<BoardData>) => Promise<void>;
  addFrame: (frameData: Partial<FrameData>) => Promise<FrameData>;
  updateFrame: (frameId: string, updates: Partial<FrameData>) => Promise<void>;
  deleteFrame: (frameId: string) => Promise<void>;
  
  // Utility
  getFrameById: (frameId: string) => FrameData | undefined;
  getFramesByRole: (role: string) => FrameData[];
  clearBoard: () => void;
}

// =============================================================================
// CONTEXT
// =============================================================================

const BoardDataContext = createContext<BoardDataContextType | undefined>(undefined);

export const useBoardData = () => {
  const context = useContext(BoardDataContext);
  if (context === undefined) {
    throw new Error('useBoardData must be used within a BoardDataProvider');
  }
  return context;
};

// =============================================================================
// PROVIDER
// =============================================================================

interface BoardDataProviderProps {
  children: ReactNode;
}

export const BoardDataProvider: React.FC<BoardDataProviderProps> = ({ children }) => {
  const [board, setBoard] = useState<BoardData | null>(null);
  const [entity, setEntity] = useState<EntityData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // =============================================================================
  // ACTIONS
  // =============================================================================

  const loadBoard = async (boardId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Load board data
      const boardResponse = await apiFetch(`/api/boards/${boardId}`);
      
      if (!boardResponse.success) {
        throw new Error(boardResponse.error || 'Failed to load board');
      }
      
      const boardData = boardResponse.data;
      setBoard(boardData);
      
      // Load entity data if board has scope and entityId
      if (boardData.data?.scope && boardData.data?.entityId) {
        try {
          const entityResponse = await apiFetch(
            `/api/entities/${boardData.data.scope}/${boardData.data.entityId}/min`
          );
          
          if (entityResponse.success) {
            setEntity(entityResponse.data);
          } else {
            console.warn('Failed to load entity data:', entityResponse.error);
            setEntity(null);
          }
        } catch (entityError) {
          console.warn('Error loading entity data:', entityError);
          setEntity(null);
        }
      } else {
        setEntity(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load board';
      setError(errorMessage);
      console.error('Error loading board:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveBoard = async (updates: Partial<BoardData>) => {
    if (!board) {
      throw new Error('No board loaded');
    }
    
    setError(null);
    
    try {
      const response = await apiFetch(`/api/boards/${board.id}`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to save board');
      }
      
      // Update local board state
      setBoard(prev => prev ? { ...prev, ...updates } : null);
      
      // If entity-related data changed, reload entity
      if (updates.data?.scope || updates.data?.entityId) {
        const newScope = updates.data?.scope || board.data.scope;
        const newEntityId = updates.data?.entityId || board.data.entityId;
        
        if (newScope && newEntityId) {
          try {
            const entityResponse = await apiFetch(
              `/api/entities/${newScope}/${newEntityId}/min`
            );
            
            if (entityResponse.success) {
              setEntity(entityResponse.data);
            }
          } catch (entityError) {
            console.warn('Error reloading entity after board update:', entityError);
          }
        } else {
          setEntity(null);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save board';
      setError(errorMessage);
      throw err;
    }
  };

  const addFrame = async (frameData: Partial<FrameData>): Promise<FrameData> => {
    if (!board) {
      throw new Error('No board loaded');
    }
    
    setError(null);
    
    try {
      const response = await apiFetch(`/api/boards/${board.id}/frames`, {
        method: 'POST',
        body: JSON.stringify(frameData)
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to add frame');
      }
      
      const newFrame = response.data;
      
      // Update local board frames
      setBoard(prev => prev ? {
        ...prev,
        frames: [...(prev.frames || []), newFrame].sort((a, b) => a.orderIndex - b.orderIndex)
      } : null);
      
      return newFrame;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add frame';
      setError(errorMessage);
      throw err;
    }
  };

  const updateFrame = async (frameId: string, updates: Partial<FrameData>) => {
    if (!board) {
      throw new Error('No board loaded');
    }
    
    setError(null);
    
    try {
      const response = await apiFetch(`/api/boards/${board.id}/frames/${frameId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to update frame');
      }
      
      // Update local board frames
      setBoard(prev => prev ? {
        ...prev,
        frames: (prev.frames || []).map(frame => 
          frame.id === frameId ? { ...frame, ...updates } : frame
        )
      } : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update frame';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteFrame = async (frameId: string) => {
    if (!board) {
      throw new Error('No board loaded');
    }
    
    setError(null);
    
    try {
      const response = await apiFetch(`/api/boards/${board.id}/frames/${frameId}`, {
        method: 'DELETE'
      });
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to delete frame');
      }
      
      // Update local board frames
      setBoard(prev => prev ? {
        ...prev,
        frames: (prev.frames || []).filter(frame => frame.id !== frameId)
      } : null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete frame';
      setError(errorMessage);
      throw err;
    }
  };

  // =============================================================================
  // UTILITY FUNCTIONS
  // =============================================================================

  const getFrameById = (frameId: string): FrameData | undefined => {
    return board?.frames?.find(frame => frame.id === frameId);
  };

  const getFramesByRole = (role: string): FrameData[] => {
    return board?.frames?.filter(frame => frame.role === role) || [];
  };

  const clearBoard = () => {
    setBoard(null);
    setEntity(null);
    setError(null);
  };

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: BoardDataContextType = {
    // State
    board,
    entity,
    isLoading,
    error,
    
    // Actions
    loadBoard,
    saveBoard,
    addFrame,
    updateFrame,
    deleteFrame,
    
    // Utility
    getFrameById,
    getFramesByRole,
    clearBoard,
  };

  return (
    <BoardDataContext.Provider value={contextValue}>
      {children}
    </BoardDataContext.Provider>
  );
};

export default BoardDataContext;
