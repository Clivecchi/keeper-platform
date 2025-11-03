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
  onEngagementAction?: (templateSlug: string, context: any) => void;
}

export function DomainBoardRenderer({ 
  domainId, 
  domainSlug,
  className = '',
  onEngagementAction
}: DomainBoardRendererProps) {
  const [boardData, setBoardData] = useState<BoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadBoardData();
  }, [domainId, domainSlug]);

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

  return (
    <div className={`w-full max-w-7xl mx-auto p-6 ${className}`}>
      {/* Debug info (can be removed later) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-gray-100 rounded text-xs text-gray-600">
          <strong>Board:</strong> {board.name} | 
          <strong> Frames:</strong> {board.frames.length} | 
          <strong> Role:</strong> {userPermissions.role}
        </div>
      )}

      {/* Render frames */}
      <div className="space-y-8">
        {board.frames.map((frame) => (
          <FrameRenderer
            key={frame.id}
            frame={frame}
            domain={domain}
            onEngagementAction={handleEngagementAction}
          />
        ))}
      </div>

      {board.frames.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-600">No frames to display</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FRAME RENDERER
// ============================================================================

interface FrameRendererProps {
  frame: Frame;
  domain: any;
  onEngagementAction: (templateSlug: string, context: any) => void;
}

function FrameRenderer({ frame, domain, onEngagementAction }: FrameRendererProps) {
  // Sort props by orderIndex
  const sortedProps = [...frame.props].sort((a, b) => a.orderIndex - b.orderIndex);

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

  return (
    <section 
      className={frameClasses}
      data-frame-id={frame.id}
      data-pattern={frame.pattern}
    >
      {/* Frame header (optional, can be styled based on pattern) */}
      {frame.name && frame.pattern !== 'focus' && (
        <h3 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-200">
          {frame.name}
        </h3>
      )}

      {/* Render props */}
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

      {sortedProps.length === 0 && (
        <div className="text-sm text-gray-500 italic">
          No content configured for this frame
        </div>
      )}
    </section>
  );
}

export default DomainBoardRenderer;

