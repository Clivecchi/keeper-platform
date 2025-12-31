/**
 * NarrativeFrameRenderer - Presentation Mode Frame Renderer
 * ==========================================================
 * 
 * Renders frames in Presentation mode with warm, narrative, emotional styling.
 * This is the "Porch" renderer - designed for storytelling, belonging, remembrance.
 * 
 * Characteristics:
 * - Warm color palette (green tones)
 * - Generous spacing
 * - Soft shadows
 * - Rounded borders
 * - Emotional, narrative tone
 * - No editing chrome
 * - Focus on visual storytelling
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

export interface NarrativeFrameRendererProps {
  frame: Frame;
  domain: any;
  onEngagementAction?: (templateSlug: string, context: any) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * NarrativeFrameRenderer
 * 
 * Renders a frame in Presentation mode with warm, narrative styling.
 * No editing controls, pure storytelling focus.
 */
export function NarrativeFrameRenderer({
  frame,
  domain,
  onEngagementAction,
}: NarrativeFrameRendererProps) {
  // Get pattern-specific styling for Presentation mode
  const patternStyles = getPatternStyles(frame.pattern, 'presentation');
  
  // Sort and filter props for Presentation
  const sortedProps = sortPropsByOrder(frame.props);
  const visibleProps = filterVisibleProps(sortedProps, true);
  
  const frameDisplayName = getFrameDisplayName(frame);

  // Presentation-specific frame styling
  const frameClasses = `
    ${patternStyles.className}
    presentation-frame
    transition-all duration-300 ease-in-out
    hover:shadow-2xl hover:scale-[1.01]
  `.trim().replace(/\s+/g, ' ');

  return (
    <section 
      className={frameClasses}
      data-frame-id={frame.id}
      data-pattern={frame.pattern}
      data-world-mode="presentation"
    >
      {/* Frame header - warm, narrative styling */}
      {frameDisplayName && frame.pattern !== 'focus' && (
        <div className="mb-6 pb-4 border-b border-green-200/50">
          <h3 className="text-2xl font-semibold text-green-800 tracking-tight">
            {frameDisplayName}
          </h3>
        </div>
      )}

      {/* Render props with narrative presentation */}
      <div className="space-y-4">
        {visibleProps.map((prop) => (
          <div 
            key={prop.id}
            className="presentation-prop transition-opacity duration-200"
          >
            <PropRenderer
              prop={prop}
              domain={domain}
              onEngagementAction={onEngagementAction}
              isEditMode={false}
            />
          </div>
        ))}
      </div>

      {/* Empty state - warm, inviting */}
      {visibleProps.length === 0 && (
        <div className="text-center py-12">
          <div className="text-green-400 text-4xl mb-4">✨</div>
          <p className="text-green-700 text-lg font-medium">
            Content coming soon
          </p>
          <p className="text-green-600 text-sm mt-2">
            This space is being prepared with care
          </p>
        </div>
      )}
    </section>
  );
}

/**
 * NarrativeFrameContainer
 * 
 * Wrapper component that provides Presentation-mode container styling
 */
export function NarrativeFrameContainer({ 
  children, 
  className = '' 
}: { 
  children: React.ReactNode; 
  className?: string;
}) {
  return (
    <div className={`presentation-frame-container ${className}`}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-12">
          {children}
        </div>
      </div>
    </div>
  );
}

