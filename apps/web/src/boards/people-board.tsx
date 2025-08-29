/**
 * People Board
 * ============
 * 
 * Board component for managing people across domains, journeys, and the platform.
 * Uses canvas engagement mode for flexible layout with optional wizard mode for workflows.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  UserGroupIcon,
  PlusIcon,
  EyeIcon,
  ShareIcon,
  ClockIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { BoardRenderer } from '../components/boards/BoardRenderer';
import { useBoard, BoardInstance } from '../context/BoardContext';
import { useFrame } from '../context/FrameContext';
import {
  ExtendedFrameInstance,
  FrameInteraction,
  EngagementMode
} from '../types/frame';
import { makeFrameInstance } from '../utils/frameFactory';

// =============================================================================
// PEOPLE BOARD PROPS
// =============================================================================

interface PeopleBoardProps {
  personId?: string;
  className?: string;
  onPeopleUpdate?: (personId: string, updates: any) => void;
  showControls?: boolean;
  allowLayoutEditing?: boolean;
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const createMockPeopleBoard = (personId: string): BoardInstance => ({
  id: `people-board-${personId}`,
  config: {
    id: `people-board-config-${personId}`,
    type: 'people_board',
    name: 'People Management',
    description: 'Manage people, roles, and collaboration across the platform',
    layout: 'canvas',
    engagementMode: 'canvas',
    allowLayoutEditing: true,
    theme: {
      primaryColor: '#6366F1',
      backgroundColor: '#EEF2FF',
      accentColor: '#3730A3',
      borderColor: '#C7D2FE',
    }
  },
  frames: [],
  entityType: 'people',
  entityId: personId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createPeopleOverviewFrame = (personId: string): ExtendedFrameInstance => {
  return makeFrameInstance({
    id: `people-overview-${personId}`,
    entityType: 'people',
    entityId: personId,
    configId: `people-overview-config-${personId}`,
    currentContentId: `people-overview-content-${personId}`,
    FrameConfig: {
      id: `people-overview-config-${personId}`,
      name: 'People Overview',
      description: 'Overview of all people with filtering and management',
      theme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      frameType: 'preview',
      engagementMode: 'canvas',
    },
    FrameContent_FrameInstance_currentContentIdToFrameContent: undefined
  });
};

const createRoleManagerFrame = (personId: string): ExtendedFrameInstance => {
  return makeFrameInstance({
    id: `role-manager-${personId}`,
    entityType: 'people',
    entityId: personId,
    configId: `role-manager-config-${personId}`,
    currentContentId: null,
    FrameConfig: {
      id: `role-manager-config-${personId}`,
      name: 'Role Manager',
      description: 'Manage roles and permissions for people',
      theme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      frameType: 'config_panel',
      engagementMode: 'canvas',
    },
  });
};

const createCollaborationNetworkFrame = (personId: string): ExtendedFrameInstance => {
  return makeFrameInstance({
    id: `collaboration-network-${personId}`,
    entityType: 'people',
    entityId: personId,
    configId: `collaboration-network-config-${personId}`,
    currentContentId: null,
    FrameConfig: {
      id: `collaboration-network-config-${personId}`,
      name: 'Collaboration Network',
      description: 'Visual network of people, domains, and journeys',
      theme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      frameType: 'media_card',
      engagementMode: 'canvas',
    },
  });
};

const createActivityFeedFrame = (personId: string): ExtendedFrameInstance => {
  return makeFrameInstance({
    id: `activity-feed-${personId}`,
    entityType: 'people',
    entityId: personId,
    configId: `activity-feed-config-${personId}`,
    currentContentId: null,
    FrameConfig: {
      id: `activity-feed-config-${personId}`,
      name: 'Activity Feed',
      description: 'Timeline of recent activities across the platform',
      theme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      frameType: 'media_card',
      engagementMode: 'canvas',
    },
  });
};

const createPeopleProcessFrame = (personId: string): ExtendedFrameInstance => {
  return makeFrameInstance({
    id: `people-process-${personId}`,
    entityType: 'people',
    entityId: personId,
    configId: `people-process-config-${personId}`,
    currentContentId: null,
    FrameConfig: {
      id: `people-process-config-${personId}`,
      name: 'People Process',
      description: 'Guided workflow for onboarding and inviting people',
      theme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      frameType: 'process_frame',
      engagementMode: 'canvas',
    },
  });
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const PeopleBoard: React.FC<PeopleBoardProps> = ({
  personId: propPersonId,
  className = '',
  onPeopleUpdate,
  showControls = true,
  allowLayoutEditing = false,
}) => {
  const [searchParams] = useSearchParams();
  const personId = propPersonId || searchParams.get('personId') || 'demo-people';
  
  const { 
    activeBoard, 
    loadBoard, 
    addFrame, 
    isLoading, 
    error 
  } = useBoard();
  const { handleFrameInteraction } = useFrame();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [engagementMode, setEngagementMode] = useState<EngagementMode>('canvas');
  const [filterMode, setFilterMode] = useState<'all' | 'active' | 'pending'>('all');
  const [peopleStats, setPeopleStats] = useState({
    totalPeople: 47,
    activePeople: 42,
    pendingInvites: 5,
    totalDomains: 8,
    totalJourneys: 23,
  });

  // Initialize board with people-specific frames
  useEffect(() => {
    const initializeBoard = async () => {
      if (isInitialized) return;

      try {
        // Create mock board instance
        const mockBoard = createMockPeopleBoard(personId);
        
        // Add frames in canvas layout
        const frames = [
          createPeopleOverviewFrame(personId),
          createRoleManagerFrame(personId),
          createCollaborationNetworkFrame(personId),
          createActivityFeedFrame(personId),
          createPeopleProcessFrame(personId),
        ];

        mockBoard.frames = frames;

        // Load the board (this would normally be an API call)
        await loadBoard(mockBoard.id);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize people board:', error);
      }
    };

    initializeBoard();
  }, [personId, isInitialized, loadBoard]);

  // Handle frame interactions specific to people board
  const handlePeopleFrameInteraction = (interaction: FrameInteraction) => {
    console.log('People board interaction:', interaction);
    
    // Handle people-specific interactions
    switch (interaction.data?.action) {
      case 'person_invite':
        console.log('Inviting person:', interaction.data);
        break;
        
      case 'person_select':
        console.log('Selecting person:', interaction.data);
        break;
        
      case 'role_assign':
        console.log('Assigning role:', interaction.data);
        break;
        
      case 'people_update':
        console.log('Updating people:', interaction.data);
        onPeopleUpdate?.(personId, interaction.data);
        break;
        
      case 'toggle_mode':
        const newMode = engagementMode === 'canvas' ? 'wizard' : 'canvas';
        setEngagementMode(newMode);
        console.log('Toggling engagement mode:', newMode);
        break;
        
      case 'filter_change':
        const filterValue = interaction.data?.filter as typeof filterMode;
        setFilterMode(filterValue || 'all');
        console.log('Changing filter:', filterValue);
        break;
        
      case 'people_share':
        console.log('Sharing people data:', interaction.data);
        break;
        
      default:
        handleFrameInteraction(interaction);
    }
  };

  const toggleEngagementMode = () => {
    const newMode = engagementMode === 'canvas' ? 'wizard' : 'canvas';
    setEngagementMode(newMode);
    
    const interaction: FrameInteraction = {
      type: 'click',
      frameId: 'people-board-controls',
      data: { action: 'toggle_mode', mode: newMode },
      timestamp: new Date(),
    };
    
    handlePeopleFrameInteraction(interaction);
  };

  if (!isInitialized && isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <UserGroupIcon className="w-12 h-12 text-indigo-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading People Board</h3>
          <p className="text-gray-600">Setting up your people management workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserGroupIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load People Board</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setIsInitialized(false)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* People Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">People Management</h1>
              <p className="text-gray-600">Manage people across domains and journeys</p>
            </div>
          </div>

          {/* People Stats & Controls */}
          <div className="flex items-center space-x-4">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{peopleStats.totalPeople}</div>
                <div className="text-gray-500">Total</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-green-600">{peopleStats.activePeople}</div>
                <div className="text-gray-500">Active</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-yellow-600">{peopleStats.pendingInvites}</div>
                <div className="text-gray-500">Pending</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-blue-600">{peopleStats.totalDomains}</div>
                <div className="text-gray-500">Domains</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-purple-600">{peopleStats.totalJourneys}</div>
                <div className="text-gray-500">Journeys</div>
              </div>
            </div>

            {/* Filter Controls */}
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4 text-gray-500" />
              <select
                value={filterMode}
                onChange={(e) => {
                  const newFilter = e.target.value as typeof filterMode;
                  setFilterMode(newFilter);
                  handlePeopleFrameInteraction({
                    type: 'click',
                    frameId: 'people-board-filter',
                    data: { action: 'filter_change', filter: newFilter },
                    timestamp: new Date(),
                  });
                }}
                className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">All People</option>
                <option value="active">Active Only</option>
                <option value="pending">Pending Invites</option>
              </select>
            </div>

            {/* Control Buttons */}
            {showControls && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleEngagementMode}
                  className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    engagementMode === 'wizard'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {engagementMode === 'wizard' ? (
                    <>
                      <EyeIcon className="w-4 h-4" />
                      <span>Canvas Mode</span>
                    </>
                  ) : (
                    <>
                      <ClockIcon className="w-4 h-4" />
                      <span>Wizard Mode</span>
                    </>
                  )}
                </button>
                
                <button className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <ShareIcon className="w-4 h-4" />
                  <span>Export</span>
                </button>
                
                <button className="inline-flex items-center space-x-2 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
                  <PlusIcon className="w-4 h-4" />
                  <span>Invite People</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement Mode Indicator */}
      {engagementMode === 'wizard' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-indigo-50 border border-indigo-200 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-4 h-4 text-indigo-600" />
            <span className="text-sm font-medium text-indigo-900">Wizard Mode</span>
            <span className="text-sm text-indigo-700">Guided workflow for role assignment and onboarding</span>
          </div>
        </motion.div>
      )}

      {/* Active Filter Indicator */}
      {filterMode !== 'all' && (
        <div className="mb-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FunnelIcon className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-900">
                Filtered by: <span className="capitalize">{filterMode}</span>
              </span>
            </div>
            <button
              onClick={() => {
                setFilterMode('all');
                handlePeopleFrameInteraction({
                  type: 'click',
                  frameId: 'people-board-filter',
                  data: { action: 'filter_change', filter: 'all' },
                  timestamp: new Date(),
                });
              }}
              className="text-sm text-indigo-600 hover:text-indigo-700"
            >
              Clear Filter
            </button>
          </div>
        </div>
      )}

      {/* Board Renderer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <BoardRenderer
          boardInstance={activeBoard || undefined}
          onFrameInteraction={handlePeopleFrameInteraction}
          showLayoutControls={engagementMode === 'canvas' && allowLayoutEditing}
          className="min-h-[600px]"
        />
      </motion.div>

      {/* People Board Info */}
      <div className="mt-8 bg-indigo-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <UserGroupIcon className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-indigo-900 mb-1">People Board Features</h3>
            <ul className="text-sm text-indigo-800 space-y-1">
              <li>• <strong>Canvas Mode:</strong> Freeform layout for comprehensive people management</li>
              <li>• <strong>Wizard Mode:</strong> Guided workflows for role assignment and onboarding</li>
              <li>• <strong>People Overview:</strong> Comprehensive view with filtering and quick actions</li>
              <li>• <strong>Role Manager:</strong> Advanced permission matrix and role assignment</li>
              <li>• <strong>Collaboration Network:</strong> Visual graph of people, domains, and journeys</li>
              <li>• <strong>Activity Feed:</strong> Real-time timeline of platform activities</li>
              <li>• <strong>Process Workflow:</strong> Step-by-step onboarding and invitation system</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PeopleBoard;
