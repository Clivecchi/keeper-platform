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
import { setLastBoardDataError } from '../lib/debug';
import { handleAuthError } from '../auth/handleAuthError';

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
  data?: {
    frames?: Array<{ id: string; key: string; title?: string; visible?: boolean; props?: Record<string, unknown>; region?: 'main'|'side'|'footer' }>;
    [key: string]: unknown;
  };
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
  onLayoutChange: (layout: Record<string, unknown>) => Promise<void>;
  // Phase 9 data-frames helpers
  addDataFrame: (key: string, init?: { title?: string; visible?: boolean; props?: Record<string, unknown>; region?: 'main'|'side'|'footer' }) => Promise<void>;
  updateDataFrame: (frameId: string, patch: { title?: string; visible?: boolean; props?: Record<string, unknown>; region?: 'main'|'side'|'footer' }) => Promise<void>;
  removeDataFrame: (frameId: string) => Promise<void>;
  reorderDataFrames: (order: string[]) => Promise<void>;
  refreshBoard: () => Promise<void>;
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

    try {
      if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log(`Loading board: ${boardId}`);
      
      // Make API call to load board instance using apiFetch with authentication
      const response = await apiFetch(`/api/board-data/${boardId}`);
      const payload = response?.data || {};
      
      // Transform API response to match BoardInstance interface
      // Attempt localStorage fallback if server layoutPrefs missing
      let localLayout: Record<string, unknown> | null = null;
      try {
        if (!payload?.data?.layoutPrefs) {
          const stored = localStorage.getItem(`agentBoardLayout:${boardId}`);
          if (stored) localLayout = JSON.parse(stored);
        }
      } catch (e) {
        // ignore malformed local storage content
      }

      const layoutPrefs = (payload?.data?.layoutPrefs as Record<string, unknown>) || localLayout || {};
      const frames = Array.isArray(payload?.frames) ? payload.frames : [];

      const board: BoardInstance = {
        id: payload.id,
        config: {
          id: payload.id,
          type: (payload?.data?.scope === 'agent' ? 'agent_board' : 'custom') as any,
          name: payload?.name || 'Board',
          description: payload?.description || '',
          layout: 'canvas',
          engagementMode: 'dialogic',
          theme: payload?.theme || {},
          allowLayoutEditing: true,
        },
        // Apply server layoutPrefs or local fallback
        frames: frames.map((f: any) => {
          const frameLayout = (layoutPrefs as Record<string, any>)[f.id] || {};
          return { ...f, layoutData: { ...(f.layoutData || {}), ...frameLayout } };
        }),
        entityType: payload?.data?.scope || 'custom',
        entityId: payload?.data?.entityId || payload?.data?.agentId || 'unknown',
        createdAt: new Date(payload.createdAt),
        updatedAt: new Date(payload.updatedAt),
        data: payload?.data,
      };

      dispatch({ type: 'SET_BOARD', payload: board });
    } catch (error) {
      console.error('Error loading board:', error);
      
      // Handle 401 errors by clearing auth and redirecting to login
      if (handleAuthError(undefined, error)) {
        return; // handleAuthError redirects, no need to continue
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to load board';
      try {
        const anyErr = error as any;
        const body = anyErr?.body;
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        const reqId = parsed?.reqId ?? null;
        setLastBoardDataError({
          reqId,
          url: (anyErr?.url as string) || `/api/board-data/${boardId}`,
          status: anyErr?.status ?? null,
          boardId,
          at: new Date().toISOString()
        });
      } catch {}
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const updateBoard = useCallback(async (boardId: string, updates: Partial<BoardInstance>) => {
    try {
      if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log(`Updating board: ${boardId}`, updates);
      
      // Call backend API to update board metadata
      const response = await apiFetch(`/api/boards/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updates.config?.name,
          description: updates.config?.description,
          theme: updates.config?.theme
        })
      });
      
      if (response.success) {
        dispatch({ type: 'UPDATE_BOARD', payload: updates });
        console.log('✅ Board updated');
      }
    } catch (error) {
      console.error('❌ Failed to update board:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update board';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const addFrame = useCallback(async (boardId: string, frame: ExtendedFrameInstance) => {
    try {
      if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log(`Adding frame to board: ${boardId}`, frame);
      
      // Call backend API to create frame
      const response = await apiFetch(`/api/boards/${boardId}/frames`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: frame.name || 'New Frame',
          pattern: (frame as any).pattern || 'dialogic',
          frameType: frame.frameType || 'media_card',
          orderIndex: (frame as any).orderIndex || 0,
          layoutKind: frame.layoutKind || 'canvas',
          props: (frame as any).props || {}
        })
      });
      
      if (response.success && response.data) {
        // Add server-created frame to state
        dispatch({ type: 'ADD_FRAME', payload: response.data });
        console.log('✅ Frame created and persisted:', response.data.id);
      }
    } catch (error) {
      console.error('❌ Failed to add frame:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to add frame';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const removeFrame = useCallback(async (boardId: string, frameId: string) => {
    try {
      if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log(`Removing frame from board: ${boardId}`, frameId);
      
      // Call backend API to delete frame
      await apiFetch(`/api/boards/${boardId}/frames/${frameId}`, {
        method: 'DELETE'
      });
      
      dispatch({ type: 'REMOVE_FRAME', payload: frameId });
      console.log('✅ Frame deleted:', frameId);
    } catch (error) {
      console.error('❌ Failed to remove frame:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to remove frame';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const updateFrame = useCallback(async (boardId: string, frameId: string, updates: Partial<ExtendedFrameInstance>) => {
    try {
      if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log(`Updating frame: ${frameId}`, updates);
      
      // Call backend API to update frame
      const response = await apiFetch(`/api/boards/${boardId}/frames/${frameId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: updates.name,
          pattern: (updates as any).pattern,
          layoutKind: updates.layoutKind,
          layoutData: updates.layoutData,
          props: (updates as any).props
        })
      });
      
      if (response.success && response.data) {
        // Update with server response
        dispatch({ type: 'UPDATE_FRAME', payload: { frameId, updates: response.data } });
        console.log('✅ Frame updated and persisted:', frameId);
      } else {
        // Fallback to optimistic update if no data returned
        dispatch({ type: 'UPDATE_FRAME', payload: { frameId, updates } });
      }
    } catch (error) {
      console.error('❌ Failed to update frame:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update frame';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const reorderFrames = useCallback(async (boardId: string, frameIds: string[]) => {
    try {
      if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log(`Reordering frames in board: ${boardId}`, frameIds);
      
      // Call backend API to reorder frames
      await apiFetch(`/api/boards/${boardId}/frames/reorder`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: frameIds })
      });
      
      dispatch({ type: 'REORDER_FRAMES', payload: frameIds });
      console.log('✅ Frames reordered');
    } catch (error) {
      console.error('❌ Failed to reorder frames:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reorder frames';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  // Persist layout changes to server with localStorage fallback
  const onLayoutChange = useCallback(async (layout: Record<string, unknown>) => {
    try {
      const boardId = state.activeBoard?.id;
      if (!boardId) return;

      await apiFetch(`/api/board-data/${boardId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutPrefs: layout })
      });
    } catch (error) {
      try {
        const boardId = state.activeBoard?.id;
        if (!boardId) return;
        // Fallback to localStorage
        localStorage.setItem(`agentBoardLayout:${boardId}`, JSON.stringify(layout));
      } catch {}
    }
  }, [state.activeBoard?.id]);

  // -----------------------------
  // Phase 9 data-frames helpers
  // -----------------------------
  const addDataFrame = useCallback(async (key: string, init?: { title?: string; visible?: boolean; props?: Record<string, unknown>; region?: 'main'|'side'|'footer' }) => {
    const boardId = state.activeBoard?.id;
    if (!boardId) return;
    await apiFetch(`/api/board-data/${boardId}/frames-data`, {
      method: 'POST',
      body: JSON.stringify({ key, ...(init || {}) })
    });
    await loadBoard(boardId);
  }, [state.activeBoard?.id, loadBoard]);

  const updateDataFrame = useCallback(async (frameId: string, patch: { title?: string; visible?: boolean; props?: Record<string, unknown>; region?: 'main'|'side'|'footer' }) => {
    const boardId = state.activeBoard?.id;
    if (!boardId) return;
    await apiFetch(`/api/board-data/${boardId}/frames-data/${frameId}`, {
      method: 'PATCH',
      body: JSON.stringify(patch)
    });
    await loadBoard(boardId);
  }, [state.activeBoard?.id, loadBoard]);

  const removeDataFrame = useCallback(async (frameId: string) => {
    const boardId = state.activeBoard?.id;
    if (!boardId) return;
    await apiFetch(`/api/board-data/${boardId}/frames-data/${frameId}`, {
      method: 'DELETE'
    });
    await loadBoard(boardId);
  }, [state.activeBoard?.id, loadBoard]);

  const reorderDataFrames = useCallback(async (order: string[]) => {
    const boardId = state.activeBoard?.id;
    if (!boardId) return;
    await apiFetch(`/api/board-data/${boardId}/frames-data/reorder`, {
      method: 'PATCH',
      body: JSON.stringify({ order })
    });
    await loadBoard(boardId);
  }, [state.activeBoard?.id, loadBoard]);

  const refreshBoard = useCallback(async () => {
    const boardId = state.activeBoard?.id;
    if (!boardId) return;
    await loadBoard(boardId);
  }, [state.activeBoard?.id, loadBoard]);

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
    onLayoutChange,
    addDataFrame,
    updateDataFrame,
    removeDataFrame,
    reorderDataFrames,
    refreshBoard,
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
