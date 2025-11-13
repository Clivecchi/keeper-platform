/**
 * BoardRenderer - Shared Board Renderer
 * ======================================
 * 
 * Unified board renderer that adapts to world mode (Presentation vs Workshop).
 * This is the "one renderer, two modes" approach - same component, different
 * rendering based on world context.
 * 
 * Usage:
 * - Presentation: Warm, narrative, visual rendering (no editing chrome)
 * - Workshop: Structural, tool-like rendering (with editing chrome)
 * 
 * This component wraps DomainBoardRenderer and adapts its behavior based on
 * the WorldModeContext.
 */

import React from 'react';
import { useWorldMode } from '../../context/WorldModeContext';
import { DomainBoardRenderer } from '../../components/domain/DomainBoardRenderer';
import '../../worlds/shared/world-mode.css';

// =============================================================================
// TYPES
// =============================================================================

export interface BoardRendererProps {
  /** Domain ID (for Workshop routes) */
  domainId?: string;
  /** Domain slug (for Presentation routes) */
  domainSlug?: string;
  /** Override world mode (optional, usually determined from route) */
  mode?: 'presentation' | 'workshop';
  /** Additional className */
  className?: string;
  /** Callback for engagement actions */
  onEngagementAction?: (templateSlug: string, context: any) => void;
  /** Callback for board updates (Workshop only) */
  onBoardUpdate?: (changes: { frames: any[] }) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * BoardRenderer
 * 
 * Renders a domain board with mode-appropriate styling and behavior.
 * Automatically detects world mode from route, or accepts explicit mode prop.
 */
export function BoardRenderer({
  domainId,
  domainSlug,
  mode: explicitMode,
  className = '',
  onEngagementAction,
  onBoardUpdate,
}: BoardRendererProps) {
  const { mode: contextMode } = useWorldMode();
  
  // Use explicit mode if provided, otherwise use context mode
  const mode = explicitMode || contextMode;
  const isPresentation = mode === 'presentation';
  const isWorkshop = mode === 'workshop';
  
  // In Presentation mode, editing is disabled
  // In Workshop mode, editing is enabled (via Board Studio UI)
  const isEditMode = false; // Presentation is always read-only
  
  // Apply mode-specific styling
  const modeClasses = isPresentation
    ? 'presentation-mode presentation-warm' // Warm, narrative styling
    : 'workshop-mode workshop-crisp';   // Crisp, tool-like styling
  
  return (
    <div 
      className={`board-renderer ${modeClasses} ${className}`} 
      data-world-mode={mode}
      data-testid={`board-renderer-${mode}`}
    >
      <DomainBoardRenderer
        domainId={domainId}
        domainSlug={domainSlug}
        isEditMode={isEditMode}
        onEngagementAction={onEngagementAction}
        onBoardUpdate={onBoardUpdate}
      />
    </div>
  );
}

/**
 * PresentationBoardRenderer
 * 
 * Explicit Presentation mode renderer (for clarity in code)
 */
export function PresentationBoardRenderer(props: Omit<BoardRendererProps, 'mode'>) {
  return <BoardRenderer {...props} mode="presentation" />;
}

/**
 * WorkshopBoardRenderer
 * 
 * Explicit Workshop mode renderer (for clarity in code)
 */
export function WorkshopBoardRenderer(props: Omit<BoardRendererProps, 'mode'>) {
  return <BoardRenderer {...props} mode="workshop" />;
}

