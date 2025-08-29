/**
 * Autosave Hook - Phase 3 Implementation
 * Debounced autosave with etag conflict detection
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// =============================================================================
// TYPES
// =============================================================================

interface AutosaveState {
  status: 'idle' | 'saving' | 'saved' | 'error' | 'conflict';
  lastSaved?: Date;
  error?: string;
  conflictData?: any;
}

interface AutosaveOptions {
  debounceMs?: number;
  enabled?: boolean;
  onConflict?: (conflictData: any) => void;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

interface SaveFunction {
  (data: any, options?: { etag?: string; force?: boolean }): Promise<any>;
}

// =============================================================================
// HOOK
// =============================================================================

export const useAutosave = (
  saveFunction: SaveFunction,
  options: AutosaveOptions = {}
) => {
  const {
    debounceMs = 800,
    enabled = true,
    onConflict,
    onError,
    onSuccess
  } = options;

  const [state, setState] = useState<AutosaveState>({ status: 'idle' });
  const [currentEtag, setCurrentEtag] = useState<string | undefined>();
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const pendingDataRef = useRef<any>(null);
  const isSavingRef = useRef(false);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Debounced save function
  const save = useCallback(async (data: any, force = false) => {
    if (isSavingRef.current && !force) return;
    
    isSavingRef.current = true;
    setState(prev => ({ ...prev, status: 'saving', error: undefined }));

    try {
      const result = await saveFunction(data, { 
        etag: currentEtag,
        force 
      });

      // Update etag if returned
      if (result.data?.etag) {
        setCurrentEtag(result.data.etag);
      }

      setState({
        status: 'saved',
        lastSaved: new Date(),
        error: undefined,
        conflictData: undefined
      });

      onSuccess?.();

      // Auto-clear saved status after 2 seconds
      setTimeout(() => {
        setState(prev => prev.status === 'saved' ? { ...prev, status: 'idle' } : prev);
      }, 2000);

      return result;
    } catch (error: any) {
      console.error('Autosave error:', error);

      // Handle conflict (409)
      if (error.status === 409 && error.data?.code === 'ETAG_MISMATCH') {
        setState({
          status: 'conflict',
          error: 'Changes detected from another session',
          conflictData: error.data,
          lastSaved: state.lastSaved
        });
        
        onConflict?.(error.data);
        return;
      }

      // Handle other errors
      const errorMessage = error.message || 'Save failed';
      setState({
        status: 'error',
        error: errorMessage,
        lastSaved: state.lastSaved
      });

      onError?.(errorMessage);
      throw error;
    } finally {
      isSavingRef.current = false;
    }
  }, [saveFunction, currentEtag, onConflict, onError, onSuccess, state.lastSaved]);

  // Debounced autosave
  const debouncedSave = useCallback((data: any) => {
    if (!enabled) return;

    // Store the latest data
    pendingDataRef.current = data;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout
    timeoutRef.current = setTimeout(() => {
      if (pendingDataRef.current && !isSavingRef.current) {
        save(pendingDataRef.current);
      }
    }, debounceMs);
  }, [enabled, debounceMs, save]);

  // Manual save (immediate)
  const saveNow = useCallback((data: any) => {
    // Clear any pending autosave
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    return save(data);
  }, [save]);

  // Force save (bypass conflict detection)
  const forceSave = useCallback((data: any) => {
    return save(data, true);
  }, [save]);

  // Resolve conflict by taking server version
  const resolveConflictWithServer = useCallback(() => {
    if (state.conflictData?.serverVersion) {
      setCurrentEtag(state.conflictData.serverVersion.etag);
      setState(prev => ({ ...prev, status: 'idle', conflictData: undefined, error: undefined }));
      return state.conflictData.serverVersion;
    }
    return null;
  }, [state.conflictData]);

  // Update etag (when loading fresh data)
  const updateEtag = useCallback((etag: string) => {
    setCurrentEtag(etag);
  }, []);

  return {
    // State
    ...state,
    currentEtag,
    
    // Actions
    save: debouncedSave,
    saveNow,
    forceSave,
    resolveConflictWithServer,
    updateEtag,
    
    // Utilities
    isConflicted: state.status === 'conflict',
    isSaving: state.status === 'saving',
    hasError: state.status === 'error',
    canSave: enabled && !isSavingRef.current
  };
};

export default useAutosave;
