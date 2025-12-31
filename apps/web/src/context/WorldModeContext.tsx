/**
 * WorldModeContext
 * ================
 * 
 * Provides the "world mode" context for the two-world model:
 * - Presentation: The social/story-facing layer (Porch)
 * - Workshop: The builder/system layer (Studio)
 * 
 * Mode is determined automatically from the current route:
 * - Routes starting with /d/:slug → Presentation
 * - Routes starting with /studio → Workshop
 * 
 * Components can use this context to adapt their rendering,
 * theming, and behavior based on which world they're in.
 */

import React, { createContext, useContext, useMemo } from 'react';
import { useLocation } from 'react-router-dom';

// =============================================================================
// TYPES
// =============================================================================

export type WorldMode = 'presentation' | 'workshop';

export interface WorldModeContextValue {
  /** Current world mode */
  mode: WorldMode;
  /** True if in Presentation world */
  isPresentation: boolean;
  /** True if in Workshop world */
  isWorkshop: boolean;
  /** Current route pathname (for debugging) */
  pathname: string;
}

// =============================================================================
// CONTEXT
// =============================================================================

const WorldModeContext = createContext<WorldModeContextValue | undefined>(undefined);

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Determine world mode from route pathname
 */
function determineWorldMode(pathname: string): WorldMode {
  // Presentation routes: /d/:slug and any sub-routes
  if (pathname.startsWith('/d/')) {
    return 'presentation';
  }
  
  // Workshop routes: /studio and any sub-routes
  if (pathname.startsWith('/studio')) {
    return 'workshop';
  }
  
  // Default to workshop for authenticated routes (most builder routes)
  // This is a safe default since presentation routes are explicitly /d/:slug
  return 'workshop';
}

/**
 * Hook to access world mode context
 * 
 * @example
 * ```tsx
 * const { mode, isPresentation, isWorkshop } = useWorldMode();
 * 
 * if (isPresentation) {
 *   // Render with warm, narrative styling
 * } else {
 *   // Render with crisp, tool-like styling
 * }
 * ```
 */
export function useWorldMode(): WorldModeContextValue {
  const context = useContext(WorldModeContext);
  
  if (context === undefined) {
    throw new Error('useWorldMode must be used within a WorldModeProvider');
  }
  
  return context;
}

// =============================================================================
// PROVIDER
// =============================================================================

interface WorldModeProviderProps {
  children: React.ReactNode;
}

/**
 * WorldModeProvider
 * 
 * Automatically determines world mode from current route and provides
 * it via context to all child components.
 */
export const WorldModeProvider: React.FC<WorldModeProviderProps> = ({ children }) => {
  const location = useLocation();
  
  const value = useMemo<WorldModeContextValue>(() => {
    const mode = determineWorldMode(location.pathname);
    
    return {
      mode,
      isPresentation: mode === 'presentation',
      isWorkshop: mode === 'workshop',
      pathname: location.pathname,
    };
  }, [location.pathname]);
  
  return (
    <WorldModeContext.Provider value={value}>
      {children}
    </WorldModeContext.Provider>
  );
};

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get world mode from a pathname (useful for route planning or testing)
 */
export function getWorldModeFromPath(pathname: string): WorldMode {
  return determineWorldMode(pathname);
}

/**
 * Check if a pathname is a Presentation route
 */
export function isPresentationRoute(pathname: string): boolean {
  return determineWorldMode(pathname) === 'presentation';
}

/**
 * Check if a pathname is a Workshop route
 */
export function isWorkshopRoute(pathname: string): boolean {
  return determineWorldMode(pathname) === 'workshop';
}

