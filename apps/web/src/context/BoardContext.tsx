/**
 * Board Context
 * =============
 * 
 * React context for managing Board system state across the application.
 * Handles board configuration, layout management, and engagement modes.
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
  EngagementMode,
  ExtendedFrameInstance 
} from '../types/frame';
import { apiFetch } from '../lib/api';

// =============================================================================
// BOARD TYPES
// =============================================================================

export type BoardType = 
  | 'agent_board'
  | 'domain_board'
  | 'keeper_type_board'
  | 'journey_board'
  | 'people_board'
  | 'code_board';

export type BoardLayout = 
  | 'grid'
  | 'column'
  | 'row'
  | 'canvas'
  | 'wizard'
  | 'focus';

export interface BoardTheme {
  primaryColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  accentColor?: string;
  [key: string]: string | undefined;
}

export interface BoardConfig {
  id: string;
  type: BoardType;
  name: string;
  description?: string;
  layout: BoardLayout;
  engagementMode: EngagementMode;
  theme?: BoardTheme;
  allowLayoutEditing?: boolean;
  maxFrames?: number;
  defaultFrameSize?: { width: number; height: number };
}

export interface BoardInstance {
  id: string;
  config: BoardConfig;
  frames: ExtendedFrameInstance[];
  entityType: string;
  entityId: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// CONTEXT TYPES
// =============================================================================

export interface BoardContextState {
  activeBoard: BoardInstance | null;
  isLoading: boolean;
  error: string | null;
  isLayoutEditing: boolean;
  selectedFrameId: string | null;
}

export interface BoardContextActions {
  loadBoard: (boardId: string) => Promise<void>;
  updateBoard: (boardId: string, updates: Partial<BoardInstance>) => Promise<void>;
  addFrame: (boardId: string, frame: ExtendedFrameInstance) => Promise<void>;
  removeFrame: (boardId: string, frameId: string) => Promise<void>;
  updateFrame: (boardId: string, frameId: string, updates: Partial<ExtendedFrameInstance>) => Promise<void>;
  reorderFrames: (boardId: string, frameIds: string[]) => Promise<void>;
  setEngagementMode: (boardId: string, mode: EngagementMode) => void;
  setLayoutEditing: (isEditing: boolean) => void;
  selectFrame: (frameId: string | null) => void;
  clearBoard: () => void;
}

export interface BoardContextType extends BoardContextState, BoardContextActions {}

// =============================================================================
// REDUCER ACTIONS
// =============================================================================

type BoardAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_BOARD'; payload: BoardInstance | null }
  | { type: 'UPDATE_BOARD'; payload: Partial<BoardInstance> }
  | { type: 'ADD_FRAME'; payload: ExtendedFrameInstance }
  | { type: 'REMOVE_FRAME'; payload: string }
  | { type: 'UPDATE_FRAME'; payload: { frameId: string; updates: Partial<ExtendedFrameInstance> } }
  | { type: 'REORDER_FRAMES'; payload: string[] }
  | { type: 'SET_ENGAGEMENT_MODE'; payload: EngagementMode }
  | { type: 'SET_LAYOUT_EDITING'; payload: boolean }
  | { type: 'SELECT_FRAME'; payload: string | null };

// =============================================================================
// REDUCER FUNCTION
// =============================================================================

const boardReducer = (state: BoardContextState, action: BoardAction): BoardContextState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
      
    case 'SET_BOARD':
      return { ...state, activeBoard: action.payload, isLoading: false };
      
    case 'UPDATE_BOARD':
      return {
        ...state,
        activeBoard: state.activeBoard 
          ? { ...state.activeBoard, ...action.payload }
          : null
      };
      
    case 'ADD_FRAME':
      return {
        ...state,
        activeBoard: state.activeBoard
          ? {
              ...state.activeBoard,
              frames: [...state.activeBoard.frames, action.payload]
            }
          : null
      };
      
    case 'REMOVE_FRAME':
      return {
        ...state,
        activeBoard: state.activeBoard
          ? {
              ...state.activeBoard,
              frames: state.activeBoard.frames.filter(frame => frame.id !== action.payload)
            }
          : null
      };
      
    case 'UPDATE_FRAME':
      return {
        ...state,
        activeBoard: state.activeBoard
          ? {
              ...state.activeBoard,
              frames: state.activeBoard.frames.map(frame =>
                frame.id === action.payload.frameId
                  ? { ...frame, ...action.payload.updates }
                  : frame
              )
            }
          : null
      };
      
    case 'REORDER_FRAMES':
      return {
        ...state,
        activeBoard: state.activeBoard
          ? {
              ...state.activeBoard,
              frames: action.payload
                .map(id => state.activeBoard!.frames.find(f => f.id === id))
                .filter(Boolean) as ExtendedFrameInstance[]
            }
          : null
      };
      
    case 'SET_ENGAGEMENT_MODE':
      return {
        ...state,
        activeBoard: state.activeBoard
          ? {
              ...state.activeBoard,
              config: {
                ...state.activeBoard.config,
                engagementMode: action.payload
              }
            }
          : null
      };
      
    case 'SET_LAYOUT_EDITING':
      return { ...state, isLayoutEditing: action.payload };
      
    case 'SELECT_FRAME':
      return { ...state, selectedFrameId: action.payload };
      
    default:
      return state;
  }
};

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: BoardContextState = {
  activeBoard: null,
  isLoading: false,
  error: null,
  isLayoutEditing: false,
  selectedFrameId: null,
};

// =============================================================================
// CONTEXT SETUP
// =============================================================================

const BoardContext = createContext<BoardContextType | undefined>(undefined);

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface BoardProviderProps {
  children: ReactNode;
}

export const BoardProvider: React.FC<BoardProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(boardReducer, initialState);

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const loadBoard = useCallback(async (boardId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    const buildBoardInstance = (boardData: any): BoardInstance => {
      const normalizedFrames = (boardData.frames || []).map((f: any) => {
        const now = new Date();
        return {
          id: f.id,
          entityType: boardData.entityType || 'board',
          entityId: boardData.entityId || boardId,
          configId: `${f.id}-config`,
          currentContentId: null,
          createdAt: now,
          updatedAt: now,
          FrameConfig: {
            id: `${f.id}-config`,
            name: f.name || f.id,
            description: f.description || '',
            theme: null,
            createdAt: now,
            updatedAt: now,
            frameType: f.type,
            engagementMode: boardData.config?.engagementMode || 'canvas',
          },
          FrameContent_FrameInstance_currentContentIdToFrameContent: undefined,
          FrameContent_FrameContent_playlistOwnerIdToFrameInstance: [],
        } as ExtendedFrameInstance;
      });

      return {
        id: boardData.id,
        config: {
          ...boardData.config,
          layout: boardData.config?.layout || 'grid',
          engagementMode: boardData.config?.engagementMode || 'canvas',
          allowLayoutEditing: boardData.config?.allowLayoutEditing ?? true,
        },
        frames: normalizedFrames,
        entityType: boardData.entityType || 'board',
        entityId: boardData.entityId || boardId,
        createdAt: new Date(boardData.createdAt || Date.now()),
        updatedAt: new Date(boardData.updatedAt || Date.now()),
      } as BoardInstance;
    };

    try {
      // Primary: new board-data API
      const boardData = await apiFetch(`/api/board-data/${boardId}`);
      const board = buildBoardInstance(boardData);
      dispatch({ type: 'SET_BOARD', payload: board });
    } catch (primaryError) {
      console.warn('[BoardContext] board-data failed, attempting legacy endpoint', primaryError);
      try {
        // Fallback: legacy boards API
        const legacyBoardData = await apiFetch(`/api/boards/${boardId}`);
        const board = buildBoardInstance(legacyBoardData);
        dispatch({ type: 'SET_BOARD', payload: board });
      } catch (fallbackError) {
        console.error('Error loading board:', fallbackError);
        const message = fallbackError instanceof Error ? fallbackError.message : 'Failed to load board';
        dispatch({ type: 'SET_ERROR', payload: message });
      }
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateBoard = useCallback(async (boardId: string, updates: Partial<BoardInstance>) => {
    try {
      // TODO: Implement API call to update board
      console.log(`Updating board: ${boardId}`, updates);
      
      // Mock update - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      dispatch({ type: 'UPDATE_BOARD', payload: updates });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update board';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const addFrame = useCallback(async (boardId: string, frame: ExtendedFrameInstance) => {
    try {
      // TODO: Implement API call to add frame to board
      console.log(`Adding frame to board: ${boardId}`, frame);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      dispatch({ type: 'ADD_FRAME', payload: frame });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to add frame';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const removeFrame = useCallback(async (boardId: string, frameId: string) => {
    try {
      // TODO: Implement API call to remove frame from board
      console.log(`Removing frame from board: ${boardId}`, frameId);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      dispatch({ type: 'REMOVE_FRAME', payload: frameId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove frame';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const updateFrame = useCallback(async (boardId: string, frameId: string, updates: Partial<ExtendedFrameInstance>) => {
    try {
      // TODO: Implement API call to update frame
      console.log(`Updating frame: ${frameId}`, updates);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      dispatch({ type: 'UPDATE_FRAME', payload: { frameId, updates } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update frame';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const reorderFrames = useCallback(async (boardId: string, frameIds: string[]) => {
    try {
      // TODO: Implement API call to reorder frames
      console.log(`Reordering frames in board: ${boardId}`, frameIds);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      dispatch({ type: 'REORDER_FRAMES', payload: frameIds });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reorder frames';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const setEngagementMode = useCallback((boardId: string, mode: EngagementMode) => {
    dispatch({ type: 'SET_ENGAGEMENT_MODE', payload: mode });
  }, []);

  const setLayoutEditing = useCallback((isEditing: boolean) => {
    dispatch({ type: 'SET_LAYOUT_EDITING', payload: isEditing });
  }, []);

  const selectFrame = useCallback((frameId: string | null) => {
    dispatch({ type: 'SELECT_FRAME', payload: frameId });
  }, []);

  const clearBoard = useCallback(() => {
    dispatch({ type: 'SET_BOARD', payload: null });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SELECT_FRAME', payload: null });
    dispatch({ type: 'SET_LAYOUT_EDITING', payload: false });
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: BoardContextType = {
    // State
    ...state,
    
    // Actions
    loadBoard,
    updateBoard,
    addFrame,
    removeFrame,
    updateFrame,
    reorderFrames,
    setEngagementMode,
    setLayoutEditing,
    selectFrame,
    clearBoard,
  };

  return (
    <BoardContext.Provider value={contextValue}>
      {children}
    </BoardContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to use the Board context
 */
export const useBoard = (): BoardContextType => {
  const context = useContext(BoardContext);
  
  if (context === undefined) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  
  return context;
};

// =============================================================================
// EXPORTS
// =============================================================================

export default BoardContext;
