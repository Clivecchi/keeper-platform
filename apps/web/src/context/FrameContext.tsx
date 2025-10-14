/**
 * Frame Context
 * =============
 * 
 * React context for managing Frame system state across the application.
 * Handles frame loading, updates, and interactions.
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { 
  FrameContextType, 
  FrameContextState, 
  ExtendedFrameInstance, 
  EngagementMode,
  FrameInteraction 
} from '../types/frame';
import { makeFrameInstance } from '../utils/frameFactory';

// =============================================================================
// CONTEXT SETUP
// =============================================================================

const FrameContext = createContext<FrameContextType | undefined>(undefined);

// =============================================================================
// REDUCER ACTIONS
// =============================================================================

type FrameAction = 
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_FRAMES'; payload: ExtendedFrameInstance[] }
  | { type: 'ADD_FRAME'; payload: ExtendedFrameInstance }
  | { type: 'UPDATE_FRAME'; payload: { id: string; updates: Partial<ExtendedFrameInstance> } }
  | { type: 'REMOVE_FRAME'; payload: string }
  | { type: 'SET_ENGAGEMENT_MODE'; payload: EngagementMode };

// =============================================================================
// REDUCER FUNCTION
// =============================================================================

const frameReducer = (state: FrameContextState, action: FrameAction): FrameContextState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
      
    case 'SET_FRAMES':
      return { ...state, activeFrames: action.payload, isLoading: false };
      
    case 'ADD_FRAME':
      return { 
        ...state, 
        activeFrames: [...state.activeFrames, action.payload],
        isLoading: false 
      };
      
    case 'UPDATE_FRAME':
      return {
        ...state,
        activeFrames: state.activeFrames.map(frame => 
          frame.id === action.payload.id 
            ? { ...frame, ...action.payload.updates }
            : frame
        )
      };
      
    case 'REMOVE_FRAME':
      return {
        ...state,
        activeFrames: state.activeFrames.filter(frame => frame.id !== action.payload)
      };
      
    case 'SET_ENGAGEMENT_MODE':
      return { ...state, currentEngagementMode: action.payload };
      
    default:
      return state;
  }
};

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: FrameContextState = {
  activeFrames: [],
  currentEngagementMode: 'dialogic',
  isLoading: false,
  error: null,
};

// =============================================================================
// PROVIDER COMPONENT
// =============================================================================

interface FrameProviderProps {
  children: ReactNode;
}

export const FrameProvider: React.FC<FrameProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(frameReducer, initialState);

  // =============================================================================
  // ACTION HANDLERS
  // =============================================================================

  const loadFrame = useCallback(async (frameId: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      // TODO: Implement API call to load frame instance
      // For now, this is a placeholder that will be implemented when backend APIs are ready
      if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log(`Loading frame: ${frameId}`);
      
      // Mock frame loading - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Mock frame data - replace with actual API response
      const mockFrame: ExtendedFrameInstance = makeFrameInstance({
        name: 'Mock',
        role: 'content',
        pattern: 'preview',
        props: {},
        entityType: 'board',
        entityId: 'mock',
        configId: 'mock-config',
        id: frameId,
      });

      dispatch({ type: 'ADD_FRAME', payload: mockFrame });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load frame';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const updateFrame = useCallback(async (frameId: string, updates: Partial<ExtendedFrameInstance>) => {
    try {
      // TODO: Implement API call to update frame instance
      if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log(`Updating frame: ${frameId}`, updates);
      
      // Mock update - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 200));
      
      dispatch({ type: 'UPDATE_FRAME', payload: { id: frameId, updates } });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update frame';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
    }
  }, []);

  const removeFrame = useCallback((frameId: string) => {
    dispatch({ type: 'REMOVE_FRAME', payload: frameId });
  }, []);

  const setEngagementMode = useCallback((mode: EngagementMode) => {
    dispatch({ type: 'SET_ENGAGEMENT_MODE', payload: mode });
  }, []);

  const handleFrameInteraction = useCallback((interaction: FrameInteraction) => {
    // Handle frame interactions - can be extended for analytics, logging, etc.
    if ((import.meta as any)?.env?.VITE_STUDIO_DEBUG === '1') console.log('Frame interaction:', interaction);
    
    // TODO: Implement interaction handling logic
    // - Analytics tracking
    // - State updates based on interaction type
    // - Agent communication for dialog frames
    // - Navigation for process frames
  }, []);

  // =============================================================================
  // CONTEXT VALUE
  // =============================================================================

  const contextValue: FrameContextType = {
    // State
    ...state,
    
    // Actions
    loadFrame,
    updateFrame,
    removeFrame,
    setEngagementMode,
    handleFrameInteraction,
  };

  return (
    <FrameContext.Provider value={contextValue}>
      {children}
    </FrameContext.Provider>
  );
};

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook to use the Frame context
 */
export const useFrame = (): FrameContextType => {
  const context = useContext(FrameContext);
  
  if (context === undefined) {
    throw new Error('useFrame must be used within a FrameProvider');
  }
  
  return context;
};

// =============================================================================
// EXPORTS
// =============================================================================

export default FrameContext;
