/**
 * DomainBoardRenderer
 * Fetches and renders the Domain Design Board with live data
 * 
 * Features:
 * - Fetches /api/domains/:domainId/board-data
 * - Renders frames in order
 * - Renders props in order using PropRenderer
 * - Handles loading/error states
 * - Respects visibility filtering from backend
 */

import React, { useEffect, useState } from 'react';
import { apiFetch } from '../../lib/api';
import { PropRenderer } from './PropRenderer';
import { PathwayNav } from '../patterns/PathwayNav';
import PropManager from '../props/PropManager';

interface Frame {
  id: string;
  name: string;
  pattern: string;
  visibility: 'public' | 'admin';
  layoutData?: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  props: Array<{
    id: string;
    type: string;
    config: any;
    value?: any;
    orderIndex: number;
  }>;
}

interface BoardData {
  board: {
    id: string;
    name: string;
    description?: string;
    frames: Frame[];
  };
  domain: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    customDomain?: string;
    customDomainVerified?: boolean;
    theme?: any;
    settings?: any;
    owner?: any;
  };
  userPermissions: {
    canEdit: boolean;
    role: string;
  };
}

interface DomainBoardRendererProps {
  domainId?: string;
  domainSlug?: string;
  className?: string;
  isEditMode?: boolean;
  onEngagementAction?: (templateSlug: string, context: any) => void;
  onBoardUpdate?: (changes: { frames: any[] }) => void;
}

export function DomainBoardRenderer({ 
  domainId, 
  domainSlug,
  className = '',
  isEditMode = false,
  onEngagementAction,
  onBoardUpdate
}: DomainBoardRendererProps) {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [frameChanges, setFrameChanges] = useState<Map<string, any[]>>(new Map());

  useEffect(() => {
    loadBoardData();
  }, [domainId, domainSlug]);

  // Clear frame changes when exiting edit mode
  useEffect(() => {
    if (!isEditMode) {
      setFrameChanges(new Map());
    }
  }, [isEditMode]);

  async function loadBoardData() {
    setIsLoading(true);
    setError(null);

    try {
      let endpoint: string;
      
      if (domainId) {
        endpoint = `/api/domains/${domainId}/board-data`;
      } else if (domainSlug) {
        // First resolve slug to ID
        const domainResponse = await apiFetch(`/api/domains/by-slug/${domainSlug}`);
        if (domainResponse.error || !domainResponse.id) {
          throw new Error('Domain not found');
        }
        endpoint = `/api/domains/${domainResponse.id}/board-data`;
      } else {
        throw new Error('Either domainId or domainSlug must be provided');
      }

      const response = await apiFetch(endpoint);
      
      if (response.error) {
        throw new Error(response.error);
      }

      setBoardData(response);
    } catch (err) {
      console.error('Error loading board data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load board');
    } finally {
      setIsLoading(false);
    }
  }

  const refreshBoardData = () => {
    loadBoardData();
  };

  const handleEngagementAction = (templateSlug: string, context: any) => {
    if (onEngagementAction) {
      onEngagementAction(templateSlug, context);
    } else {
      console.log('Engagement action triggered:', templateSlug, context);
      // Default behavior: just refresh after a moment
      setTimeout(refreshBoardData, 1000);
    }
  };

  const handleFrameUpdate = (frameId: string, updatedProps: any[]) => {
    // Store the updated props for this frame
    const newFrameChanges = new Map(frameChanges);
    newFrameChanges.set(frameId, updatedProps);
    setFrameChanges(newFrameChanges);

    // Build the complete changes object to send to parent
    const frames = Array.from(newFrameChanges.entries()).map(([id, props]) => ({
      id,
      props: props.map(prop => ({
        id: prop.id,
        type: prop.type,
        config: prop.config,
        orderIndex: prop.orderIndex,
        isVisible: prop.isVisible,
        isDraft: prop.isDraft
      }))
    }));

    // Notify parent that changes were made
    onBoardUpdate?.({ frames });
  };

  if (isLoading) {
    return (
      <div className={`w-full max-w-7xl mx-auto p-6 ${className}`}>
        <div className="space-y-6">
          {/* Loading skeleton */}
          <div className="animate-pulse">
            <div className="h-64 bg-gray-200 rounded-lg mb-6" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="h-48 bg-gray-200 rounded-lg" />
              <div className="h-48 bg-gray-200 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full max-w-7xl mx-auto p-6 ${className}`}>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-2">
            Failed to load board
          </h3>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadBoardData}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!boardData) {
    return (
      <div className={`w-full max-w-7xl mx-auto p-6 ${className}`}>
        <div className="text-center text-gray-600">
          No board data available
        </div>
      </div>
    );
  }

  const { board, domain, userPermissions } = boardData;

  // Determine if user is domain admin (owner or admin role)
  const isDomainAdmin = userPermissions.canEdit || 
                        userPermissions.role === 'owner' || 
                        userPermissions.role === 'admin';

  // Filter frames based on visibility and user role
  // Anonymous or non-admin: show only 'public' frames
  // Admin: show both 'public' and 'admin' frames
  const visibleFrames = board.frames.filter((frame) => {
    if (frame.visibility === 'public') return true;
    if (frame.visibility === 'admin' && isDomainAdmin) return true;
    return false;
  });

  // Separate Pathway frames from content frames
  const pathwayFrame = visibleFrames.find((frame) => 
    frame.pattern === 'pathway' || frame.name.toLowerCase().includes('pathway')
  );
  const contentFrames = visibleFrames.filter((frame) => 
    frame.pattern !== 'pathway' && !frame.name.toLowerCase().includes('pathway')
  );

  return (
    <div className={`w-full ${className}`}>
      {/* Debug info (can be removed later) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="max-w-7xl mx-auto mb-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Board:</strong> {board.name} | 
          <strong> Total Frames:</strong> {board.frames.length} | 
          <strong> Visible:</strong> {visibleFrames.length} |
          <strong> Pathway:</strong> {pathwayFrame ? 'Yes' : 'No'} |
          <strong> Role:</strong> {userPermissions.role} |
          <strong> Is Admin:</strong> {isDomainAdmin ? 'Yes' : 'No'}
        </div>
      )}

      {/* Render Pathway navigation if exists */}
      {pathwayFrame && (
        <PathwayRenderer 
          frame={pathwayFrame} 
          domain={domain}
        />
      )}

      {/* Render content frames */}
      <div className="w-full max-w-7xl mx-auto p-6">
        <div className="space-y-8">
          {contentFrames.map((frame) => (
            <FrameRenderer
              key={frame.id}
              frame={frame}
              domain={domain}
              isEditMode={isEditMode}
              onEngagementAction={handleEngagementAction}
              onFrameUpdate={handleFrameUpdate}
            />
          ))}

          {contentFrames.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-600">No frames to display</p>
              {!isDomainAdmin && board.frames.length > 0 && (
                <p className="text-sm text-gray-500 mt-2">
                  Sign in as the domain owner to see admin frames
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// PATHWAY RENDERER
// ============================================================================

interface PathwayRendererProps {
  frame: Frame;
  domain: any;
}

function PathwayRenderer({ frame, domain }: PathwayRendererProps) {
  // Extract pathway configuration from props
  const pathwayConfig = frame.props.find(p => p.type === 'pathway-config')?.config || {};
  
  // Extract path items from props
  const pathProps = frame.props.filter(p => p.type === 'pathway-item' || p.type === 'link');
  
  // Convert props to pathway items format
  const paths = pathProps
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map(prop => ({
      label: prop.config.label || prop.config.text || 'Link',
      href: prop.config.href || prop.config.url || '#',
      description: prop.config.description || prop.config.label,
      variant: prop.config.variant || 'system',
      analyticsId: prop.config.analyticsId
    }));

  // If no paths configured, don't render anything
  if (paths.length === 0) {
    return null;
  }

  return (
    <PathwayNav
      layout={pathwayConfig.layout || 'inline'}
      orientation={pathwayConfig.orientation || 'horizontal'}
      position={pathwayConfig.position || 'right'}
      themeVariant={pathwayConfig.themeVariant || 'system'}
      paths={paths}
      authedPaths={pathwayConfig.authedPaths || []}
      visibleFor={pathwayConfig.visibleFor || ['public', 'authed']}
      ownerOnlyAuthedPaths={pathwayConfig.ownerOnlyAuthedPaths || false}
    />
  );
}

// ============================================================================
// FRAME RENDERER
// ============================================================================

interface FrameRendererProps {
  frame: Frame;
  domain: any;
  isEditMode?: boolean;
  onEngagementAction: (templateSlug: string, context: any) => void;
  onFrameUpdate?: (frameId: string, props: any[]) => void;
}

function FrameRenderer({ frame, domain, isEditMode = false, onEngagementAction, onFrameUpdate }: FrameRendererProps) {
  // Sort props by orderIndex
  const sortedProps = [...frame.props].sort((a, b) => a.orderIndex - b.orderIndex);
  const [localProps, setLocalProps] = React.useState(sortedProps);

  // Update local props when frame props change (unless in edit mode with unsaved changes)
  React.useEffect(() => {
    if (!isEditMode) {
      setLocalProps(sortedProps);
    }
  }, [frame.props, isEditMode, sortedProps]);

  // Pattern-based styling
  const patternStyles = {
    focus: 'bg-white shadow-lg rounded-lg p-8',
    canvas: 'bg-white border border-gray-200 rounded-lg p-6',
    gallery: 'bg-gray-50 rounded-lg p-6',
    form: 'bg-white border-2 border-gray-300 rounded-lg p-6',
    dialogic: 'bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6',
    wizard: 'bg-white shadow-md rounded-lg p-6',
  };

  const frameClasses = patternStyles[frame.pattern as keyof typeof patternStyles] || patternStyles.canvas;
  
  // Add edit mode styling
  const editModeClasses = isEditMode 
    ? 'ring-2 ring-blue-500 ring-opacity-50 hover:ring-opacity-100 transition-all' 
    : '';

  const handlePropsUpdate = async (frameId: string, updatedProps: any[]) => {
    setLocalProps(updatedProps);
    // Notify parent renderer of the changes
    onFrameUpdate?.(frameId, updatedProps);
  };

  return (
    <section 
      className={`${frameClasses} ${editModeClasses}`}
      data-frame-id={frame.id}
      data-pattern={frame.pattern}
    >
      {/* Frame header (optional, can be styled based on pattern) */}
      {frame.name && frame.pattern !== 'focus' && (
        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-800">
            {frame.name}
          </h3>
          {isEditMode && (
            <span className="text-xs text-blue-600 font-medium px-2 py-1 bg-blue-50 rounded">
              Editable
            </span>
          )}
        </div>
      )}

      {/* Render props - use PropManager in edit mode, PropRenderer in view mode */}
      {isEditMode ? (
        <PropManager
          frameId={frame.id}
          initialProps={localProps}
          isActive={true}
          framePattern={frame.pattern}
          isEditMode={true}
          isDraggable={false}
          onPropsUpdate={handlePropsUpdate}
        />
      ) : (
        <div className="space-y-3">
          {sortedProps.map((prop) => (
            <PropRenderer
              key={prop.id}
              prop={prop}
              domain={domain}
              onEngagementAction={onEngagementAction}
            />
          ))}
        </div>
      )}

      {sortedProps.length === 0 && !isEditMode && (
        <div className="text-sm text-gray-500 italic">
          No content configured for this frame
        </div>
      )}
    </section>
  );
}

export default DomainBoardRenderer;

