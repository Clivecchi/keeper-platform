/**
 * StructuralFrameRenderer - Workshop Mode Frame Renderer
 * =======================================================
 * 
 * Renders frames in Workshop mode with crisp, tool-like, structural styling.
 * This is the "Studio" renderer - designed for building, editing, configuration.
 * 
 * Characteristics:
 * - Crisp color palette (blue tones)
 * - Tighter spacing
 * - Sharp shadows
 * - Technical typography
 * - Editing chrome visible
 * - Focus on structure and configuration
 * - Tool-like appearance
 */

import React from 'react';
import { PropRenderer } from '../../components/domain/PropRenderer';
import { 
  getPatternStyles, 
  sortPropsByOrder, 
  filterVisibleProps,
  getFrameDisplayName,
  type Frame 
} from '../shared/patternUtils';

// =============================================================================
// TYPES
// =============================================================================

export interface StructuralFrameRendererProps {
  frame: Frame;
  domain: any;
  isEditMode?: boolean;
  onEngagementAction?: (templateSlug: string, context: any) => void;
  onFrameUpdate?: (frameId: string, props: any[]) => void;
  showConfigControls?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * StructuralFrameRenderer
 * 
 * Renders a frame in Workshop mode with crisp, structural styling.
 * Includes editing controls and configuration options.
 */
export function StructuralFrameRenderer({
  frame,
  domain,
  isEditMode = false,
  onEngagementAction,
  onFrameUpdate,
  showConfigControls = true,
}: StructuralFrameRendererProps) {
  // Get pattern-specific styling for Workshop mode
  const patternStyles = getPatternStyles(frame.pattern, 'workshop');
  
  // Sort props (Workshop shows all props)
  const sortedProps = sortPropsByOrder(frame.props);
  const visibleProps = filterVisibleProps(sortedProps, false);
  
  const frameDisplayName = getFrameDisplayName(frame);

  // Workshop-specific frame styling
  const frameClasses = `
    ${patternStyles.className}
    workshop-frame
    transition-all duration-150
    ${isEditMode ? 'ring-2 ring-blue-500 ring-opacity-50 hover:ring-opacity-100' : ''}
  `.trim().replace(/\s+/g, ' ');

  const handlePropsUpdate = (propId: string, newValue: any) => {
    if (!onFrameUpdate) return;

    const updatedProps = visibleProps.map(p => {
      if (p.id === propId) {
        // Handle different value types
        if (typeof newValue === 'object' && newValue.label !== undefined) {
          return { 
            ...p, 
            config: { 
              ...p.config, 
              label: newValue.label,
              name: newValue.label,
              url: newValue.url 
            },
            value: newValue
          };
        } else if (typeof newValue === 'object' && newValue.url !== undefined) {
          return {
            ...p,
            config: {
              ...p.config,
              url: newValue.url,
              alt: newValue.alt
            },
            value: newValue
          };
        } else {
          return { 
            ...p, 
            config: { ...p.config, content: newValue }, 
            value: newValue 
          };
        }
      }
      return p;
    });
    
    onFrameUpdate(frame.id, updatedProps);
  };

  return (
    <section 
      className={frameClasses}
      data-frame-id={frame.id}
      data-pattern={frame.pattern}
      data-world-mode="workshop"
    >
      {/* Frame header with structural styling and controls */}
      {frameDisplayName && frame.pattern !== 'focus' && (
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-gray-900 tracking-tight">
              {frameDisplayName}
            </h3>
            {showConfigControls && (
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                {frame.pattern} • {sortedProps.length} props • {frame.visibility}
              </span>
            )}
          </div>
          
          {isEditMode && showConfigControls && (
            <div className="flex items-center gap-2">
              <button
                className="text-xs px-2 py-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded inline-flex items-center gap-1 transition-colors"
                title="Configure frame"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Config
              </button>
            </div>
          )}
        </div>
      )}

      {/* Render props with structural presentation */}
      <div className="space-y-3">
        {visibleProps.map((prop) => (
          <div 
            key={prop.id}
            className="workshop-prop"
          >
            <PropRenderer
              prop={prop}
              domain={domain}
              onEngagementAction={onEngagementAction}
              isEditMode={isEditMode}
              onPropUpdate={handlePropsUpdate}
            />
          </div>
        ))}
      </div>

      {/* Empty state - technical, actionable */}
      {visibleProps.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
          <div className="text-gray-400 text-2xl mb-2">📋</div>
          <p className="text-gray-600 text-sm font-medium">
            No props configured
          </p>
          {isEditMode && (
            <p className="text-gray-500 text-xs mt-1">
              Add props from the Props Library
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * StructuralFrameContainer
 * 
 * Wrapper component that provides Workshop-mode container styling
 */
export function StructuralFrameContainer({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`workshop-frame-container ${className}`}>
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="space-y-6">
          {children}
        </div>
      </div>
    </div>
  );
}

