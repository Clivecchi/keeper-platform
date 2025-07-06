import React, { createContext, useContext, useState, useEffect } from 'react';
import { ViewMode, ViewModeContextType, ViewModeState } from '../types/viewMode';

const ViewModeContext = createContext<ViewModeContextType | undefined>(undefined);

interface ViewModeProviderProps {
  children: React.ReactNode;
}

const VIEW_MODE_STORAGE_KEY = 'keeper-view-mode';

export const ViewModeProvider: React.FC<ViewModeProviderProps> = ({ children }) => {
  const [currentMode, setCurrentMode] = useState<ViewMode>(() => {
    // Try to load from localStorage first
    const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
    if (stored) {
      try {
        const parsed: ViewModeState = JSON.parse(stored);
        return parsed.mode;
      } catch {
        // If parsing fails, default to Architect
        return ViewMode.Architect;
      }
    }
    return ViewMode.Architect;
  });

  // Persist to localStorage whenever mode changes
  useEffect(() => {
    const viewModeState: ViewModeState = {
      mode: currentMode,
      timestamp: Date.now()
    };
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, JSON.stringify(viewModeState));
  }, [currentMode]);

  const setViewMode = (mode: ViewMode) => {
    setCurrentMode(mode);
  };

  const isMode = (mode: ViewMode) => {
    return currentMode === mode;
  };

  const value: ViewModeContextType = {
    currentMode,
    setViewMode,
    isMode
  };

  return (
    <ViewModeContext.Provider value={value}>
      {children}
    </ViewModeContext.Provider>
  );
};

export const useViewMode = () => {
  const context = useContext(ViewModeContext);
  if (context === undefined) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}; 