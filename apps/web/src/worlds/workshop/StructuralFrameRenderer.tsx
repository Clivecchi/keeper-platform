/**
 * StructuralFrameRenderer - Studio Mode Frame Renderer
 * =====================================================
 * 
 * Renders frames in Studio mode with visual, design-focused styling.
 * This is the "Studio" renderer - designed for visual design and content creation.
 * 
 * Characteristics:
 * - Visual content rendering (images show as images, text as text)
 * - Generous spacing for visual clarity
 * - Clean, modern design aesthetic
 * - Subtle editing affordances
 * - Focus on visual design, not configuration
 * - Design tool appearance
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
 * Renders a frame in Studio mode with visual, design-focused styling.
 * Props render as actual visual content (images, headings, text) with subtle editing controls.
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

  // Studio-specific frame styling - visual design focus
  const frameClasses = `
    ${patternStyles.className}
    studio-frame
    bg-white rounded-lg shadow-sm
    transition-all duration-200
    ${isEditMode ? 'ring-1 ring-gray-200 hover:ring-gray-300' : ''}
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
      data-world-mode="studio"
    >
      {/* Frame header - clean, visual design */}
      {frameDisplayName && frame.pattern !== 'focus' && (
        <div className="mb-6 pb-4 border-b border-gray-100">
          <h3 className="text-2xl font-semibold text-gray-900 tracking-tight">
            {frameDisplayName}
          </h3>
          {showConfigControls && isEditMode && (
            <p className="text-sm text-gray-500 mt-1">
              {sortedProps.length} {sortedProps.length === 1 ? 'element' : 'elements'}
            </p>
          )}
        </div>
      )}

      {/* Render props as visual content with editing affordances */}
      <div className="space-y-6 studio-props-container">
        {visibleProps.map((prop) => (
          <div 
            key={prop.id}
            className="studio-prop-wrapper group relative"
          >
            {/* Visual content rendering - props show as actual images, headings, text, etc. */}
            <div className="studio-prop-content">
              <PropRenderer
                prop={prop}
                domain={domain}
                onEngagementAction={onEngagementAction}
                isEditMode={isEditMode}
                onPropUpdate={handlePropsUpdate}
              />
            </div>
            
            {/* Subtle editing overlay - only visible on hover in edit mode */}
            {isEditMode && (
              <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="absolute top-2 right-2 flex items-center gap-1">
                  <div className="bg-white/95 backdrop-blur-sm border border-gray-200 rounded-md px-2 py-1 text-xs text-gray-600 shadow-sm">
                    {prop.type}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Empty state - visual, inviting */}
      {visibleProps.length === 0 && (
        <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
          <div className="text-gray-300 text-4xl mb-4">✨</div>
          <p className="text-gray-600 text-base font-medium mb-2">
            Start designing
          </p>
          {isEditMode && (
            <p className="text-gray-500 text-sm">
              Drag elements from the Props Library or click to add
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
 * Wrapper component that provides Studio-mode container styling
 */
export function StructuralFrameContainer({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`studio-frame-container ${className}`}>
      <div className="w-full max-w-7xl mx-auto p-8">
        <div className="space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}

