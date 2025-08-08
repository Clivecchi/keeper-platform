/**
 * Journey Board
 * =============
 * 
 * Board component for journey management and visualization.
 * Uses canvas engagement mode for freeform layout and eventual layout editing.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  MapIcon,
  PlusIcon,
  Cog6ToothIcon,
  EyeIcon,
  PencilSquareIcon,
  ShareIcon
} from '@heroicons/react/24/outline';
import { BoardRenderer } from '../components/boards/BoardRenderer';
import { useBoard, BoardInstance } from '../context/BoardContext';
import { useFrame } from '../context/FrameContext';
import { 
  ExtendedFrameInstance, 
  FrameInteraction 
} from '../types/frame';

// =============================================================================
// JOURNEY BOARD PROPS
// =============================================================================

interface JourneyBoardProps {
  journeyId?: string;
  className?: string;
  onJourneyUpdate?: (journeyId: string, updates: any) => void;
  showControls?: boolean;
  allowLayoutEditing?: boolean;
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const createMockJourneyBoard = (journeyId: string): BoardInstance => ({
  id: `journey-board-${journeyId}`,
  config: {
    id: `journey-board-config-${journeyId}`,
    type: 'journey_board',
    name: 'Journey Management',
    description: 'Manage and visualize journeys, paths, and moments',
    layout: 'canvas',
    engagementMode: 'canvas',
    allowLayoutEditing: true,
    theme: {
      primaryColor: '#3B82F6',
      backgroundColor: '#EFF6FF',
      accentColor: '#1E40AF',
      borderColor: '#BFDBFE',
    }
  },
  frames: [],
  entityType: 'journey',
  entityId: journeyId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createJourneyOverviewFrame = (journeyId: string): ExtendedFrameInstance => ({
  id: `journey-overview-${journeyId}`,
  entityType: 'journey',
  entityId: journeyId,
  configId: `journey-overview-config-${journeyId}`,
  currentContentId: `journey-overview-content-${journeyId}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `journey-overview-config-${journeyId}`,
    name: 'Journey Overview',
    description: 'High-level journey information and status',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'preview',
    engagementMode: 'canvas',
  },
  FrameContent_FrameInstance_currentContentIdToFrameContent: {
    id: `journey-overview-content-${journeyId}`,
    type: 'journey_info',
    url: '',
    alt: 'Journey Overview',
    createdAt: new Date(),
    playlistOwnerId: null,
    metadata: {
      title: journeyId === 'demo' ? 'Learning React Development' : `Journey: ${journeyId}`,
      description: 'A comprehensive learning path for modern React development',
      status: 'active',
      icon: '🚀',
      tags: ['React', 'JavaScript', 'Frontend', 'Development'],
      progress: 65,
      totalPaths: 8,
      totalMoments: 24,
      collaborators: 3,
      visibility: 'public',
      createdAt: new Date('2024-01-15'),
      lastModified: new Date(),
    }
  }
});

const createPathListFrame = (journeyId: string): ExtendedFrameInstance => ({
  id: `path-list-${journeyId}`,
  entityType: 'journey',
  entityId: journeyId,
  configId: `path-list-config-${journeyId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `path-list-config-${journeyId}`,
    name: 'Journey Paths',
    description: 'List of paths within this journey',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'media_card',
    engagementMode: 'canvas',
  },
});

const createMomentGridFrame = (journeyId: string): ExtendedFrameInstance => ({
  id: `moment-grid-${journeyId}`,
  entityType: 'journey',
  entityId: journeyId,
  configId: `moment-grid-config-${journeyId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `moment-grid-config-${journeyId}`,
    name: 'Recent Moments',
    description: 'Recent moments from this journey',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'media_card',
    engagementMode: 'canvas',
  },
});

const createJourneyConfigFrame = (journeyId: string): ExtendedFrameInstance => ({
  id: `journey-config-${journeyId}`,
  entityType: 'journey',
  entityId: journeyId,
  configId: `journey-config-config-${journeyId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `journey-config-config-${journeyId}`,
    name: 'Journey Settings',
    description: 'Configure journey settings and permissions',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'config_panel',
    engagementMode: 'canvas',
  },
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const JourneyBoard: React.FC<JourneyBoardProps> = ({
  journeyId: propJourneyId,
  className = '',
  onJourneyUpdate,
  showControls = true,
  allowLayoutEditing = false,
}) => {
  const [searchParams] = useSearchParams();
  const journeyId = propJourneyId || searchParams.get('journeyId') || 'demo-journey';
  
  const { 
    activeBoard, 
    loadBoard, 
    addFrame, 
    isLoading, 
    error 
  } = useBoard();
  const { handleFrameInteraction } = useFrame();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'view' | 'edit'>('view');
  const [journeyStats, setJourneyStats] = useState({
    totalPaths: 8,
    totalMoments: 24,
    completedPaths: 5,
    progressPercentage: 65,
  });

  // Initialize board with journey-specific frames
  useEffect(() => {
    const initializeBoard = async () => {
      if (isInitialized) return;

      try {
        // Create mock board instance
        const mockBoard = createMockJourneyBoard(journeyId);
        
        // Add frames in canvas layout
        const frames = [
          createJourneyOverviewFrame(journeyId),
          createPathListFrame(journeyId),
          createMomentGridFrame(journeyId),
          createJourneyConfigFrame(journeyId),
        ];

        mockBoard.frames = frames;

        // Load the board (this would normally be an API call)
        await loadBoard(mockBoard.id);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize journey board:', error);
      }
    };

    initializeBoard();
  }, [journeyId, isInitialized, loadBoard]);

  // Handle frame interactions specific to journey board
  const handleJourneyFrameInteraction = (interaction: FrameInteraction) => {
    console.log('Journey board interaction:', interaction);
    
    // Handle journey-specific interactions
    switch (interaction.data?.action) {
      case 'path_create':
        console.log('Creating new path:', interaction.data);
        break;
        
      case 'path_select':
        console.log('Selecting path:', interaction.data);
        break;
        
      case 'moment_view':
        console.log('Viewing moment:', interaction.data);
        break;
        
      case 'journey_update':
        console.log('Updating journey:', interaction.data);
        onJourneyUpdate?.(journeyId, interaction.data);
        break;
        
      case 'layout_edit':
        setLayoutMode(layoutMode === 'view' ? 'edit' : 'view');
        console.log('Toggling layout mode:', layoutMode);
        break;
        
      case 'journey_share':
        console.log('Sharing journey:', interaction.data);
        break;
        
      default:
        handleFrameInteraction(interaction);
    }
  };

  const toggleLayoutMode = () => {
    const newMode = layoutMode === 'view' ? 'edit' : 'view';
    setLayoutMode(newMode);
    
    const interaction: FrameInteraction = {
      type: 'click',
      frameId: 'journey-board-controls',
      data: { action: 'layout_edit', mode: newMode },
      timestamp: new Date(),
    };
    
    handleJourneyFrameInteraction(interaction);
  };

  if (!isInitialized && isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <MapIcon className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Journey Board</h3>
          <p className="text-gray-600">Setting up your journey workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Journey Board</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setIsInitialized(false)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Journey Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <MapIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Journey Management</h1>
              <p className="text-gray-600">Journey: {journeyId}</p>
            </div>
          </div>

          {/* Journey Stats & Controls */}
          <div className="flex items-center space-x-4">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{journeyStats.totalPaths}</div>
                <div className="text-gray-500">Paths</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{journeyStats.totalMoments}</div>
                <div className="text-gray-500">Moments</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{journeyStats.progressPercentage}%</div>
                <div className="text-gray-500">Complete</div>
              </div>
            </div>

            {/* Control Buttons */}
            {showControls && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleLayoutMode}
                  className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    layoutMode === 'edit'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {layoutMode === 'edit' ? (
                    <>
                      <EyeIcon className="w-4 h-4" />
                      <span>View</span>
                    </>
                  ) : (
                    <>
                      <PencilSquareIcon className="w-4 h-4" />
                      <span>Edit Layout</span>
                    </>
                  )}
                </button>
                
                <button className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <ShareIcon className="w-4 h-4" />
                  <span>Share</span>
                </button>
                
                <button className="inline-flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Frame</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Layout Mode Indicator */}
      {layoutMode === 'edit' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <PencilSquareIcon className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-900">Layout Edit Mode</span>
            <span className="text-sm text-blue-700">Drag frames to rearrange • Click outside frames to add new ones</span>
          </div>
        </motion.div>
      )}

      {/* Board Renderer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <BoardRenderer
          boardInstance={activeBoard || undefined}
          onFrameInteraction={handleJourneyFrameInteraction}
          showLayoutControls={layoutMode === 'edit'}
          className="min-h-[600px]"
        />
      </motion.div>

      {/* Journey Board Info */}
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <MapIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Journey Board Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Canvas Mode:</strong> Freeform layout with drag-and-drop frame positioning</li>
              <li>• <strong>Journey Overview:</strong> High-level journey information and progress tracking</li>
              <li>• <strong>Path Management:</strong> View and organize learning paths within the journey</li>
              <li>• <strong>Moment Grid:</strong> Visual display of recent moments and achievements</li>
              <li>• <strong>Configuration Panel:</strong> Journey settings, themes, and collaboration options</li>
              <li>• <strong>Layout Editing:</strong> {allowLayoutEditing ? 'Enabled' : 'Available'} - customize frame positions and sizes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyBoard;
