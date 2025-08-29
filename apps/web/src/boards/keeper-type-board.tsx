/**
 * Keeper Type Board
 * =================
 * 
 * Board component for managing and configuring Keeper Types.
 * Uses wizard engagement mode for guided creation and canvas mode for editing.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  SparklesIcon,
  PlusIcon,
  PencilSquareIcon,
  ShareIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { BoardRenderer } from '../components/boards/BoardRenderer';
import { useBoard, BoardInstance } from '../context/BoardContext';
import { useFrame } from '../context/FrameContext';
import { 
  ExtendedFrameInstance, 
  FrameInteraction,
  EngagementMode
} from '../types/frame';

// =============================================================================
// KEEPER TYPE BOARD PROPS
// =============================================================================

interface KeeperTypeBoardProps {
  keeperTypeId?: string;
  className?: string;
  onKeeperTypeUpdate?: (keeperTypeId: string, updates: any) => void;
  showControls?: boolean;
  allowLayoutEditing?: boolean;
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const createMockKeeperTypeBoard = (keeperTypeId: string): BoardInstance => ({
  id: `keeper-type-board-${keeperTypeId}`,
  config: {
    id: `keeper-type-board-config-${keeperTypeId}`,
    type: 'keeper_type_board',
    name: 'Keeper Type Management',
    description: 'Configure and manage Keeper Types and their associations',
    layout: 'wizard',
    engagementMode: 'wizard',
    allowLayoutEditing: true,
    theme: {
      primaryColor: '#F59E0B',
      backgroundColor: '#FFFBEB',
      accentColor: '#B45309',
      borderColor: '#FED7AA',
    }
  },
  frames: [],
  entityType: 'keeper_type',
  entityId: keeperTypeId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createKeeperTypeOverviewFrame = (keeperTypeId: string): ExtendedFrameInstance => ({
  id: `keeper-type-overview-${keeperTypeId}`,
  entityType: 'keeper_type',
  entityId: keeperTypeId,
  configId: `keeper-type-overview-config-${keeperTypeId}`,
  currentContentId: `keeper-type-overview-content-${keeperTypeId}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `keeper-type-overview-config-${keeperTypeId}`,
    name: 'Keeper Type Overview',
    description: 'Summary of Keeper Type details and status',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'preview',
    engagementMode: 'wizard',
  },
  FrameContent_FrameInstance_currentContentIdToFrameContent: {
    id: `keeper-type-overview-content-${keeperTypeId}`,
    type: 'keeper_type_info',
    url: '',
    alt: 'Keeper Type Overview',
    createdAt: new Date(),
    playlistOwnerId: null,
    metadata: {
      name: keeperTypeId === 'demo' ? 'DevKeeper' : `${keeperTypeId}Keeper`,
      description: 'Specialized AI assistant for software development and coding tasks',
      status: 'active',
      icon: '🚀',
      category: 'Development',
      linkedJourneys: 12,
      linkedAgents: 8,
      totalInstances: 156,
      createdAt: new Date('2024-01-10'),
      lastModified: new Date(),
      version: '2.1.0',
      capabilities: ['Code Generation', 'Debugging', 'Architecture Review', 'Testing'],
    }
  }
});

const createKeeperTypeConfigFrame = (keeperTypeId: string): ExtendedFrameInstance => ({
  id: `keeper-type-config-${keeperTypeId}`,
  entityType: 'keeper_type',
  entityId: keeperTypeId,
  configId: `keeper-type-config-config-${keeperTypeId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `keeper-type-config-config-${keeperTypeId}`,
    name: 'Keeper Type Configuration',
    description: 'Edit Keeper Type settings and properties',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'config_panel',
    engagementMode: 'wizard',
  },
});

const createLinkedJourneysFrame = (keeperTypeId: string): ExtendedFrameInstance => ({
  id: `linked-journeys-${keeperTypeId}`,
  entityType: 'keeper_type',
  entityId: keeperTypeId,
  configId: `linked-journeys-config-${keeperTypeId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `linked-journeys-config-${keeperTypeId}`,
    name: 'Linked Journeys',
    description: 'Journeys associated with this Keeper Type',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'media_card',
    engagementMode: 'wizard',
  },
});

const createLinkedAgentsFrame = (keeperTypeId: string): ExtendedFrameInstance => ({
  id: `linked-agents-${keeperTypeId}`,
  entityType: 'keeper_type',
  entityId: keeperTypeId,
  configId: `linked-agents-config-${keeperTypeId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `linked-agents-config-${keeperTypeId}`,
    name: 'Linked Agents',
    description: 'Agents using this Keeper Type',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'media_card',
    engagementMode: 'wizard',
  },
});

const createKeeperTypeProcessFrame = (keeperTypeId: string): ExtendedFrameInstance => ({
  id: `keeper-type-process-${keeperTypeId}`,
  entityType: 'keeper_type',
  entityId: keeperTypeId,
  configId: `keeper-type-process-config-${keeperTypeId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `keeper-type-process-config-${keeperTypeId}`,
    name: 'Setup Process',
    description: 'Keeper Type creation and configuration steps',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'process_frame',
    engagementMode: 'wizard',
  },
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const KeeperTypeBoard: React.FC<KeeperTypeBoardProps> = ({
  keeperTypeId: propKeeperTypeId,
  className = '',
  onKeeperTypeUpdate,
  showControls = true,
  allowLayoutEditing = false,
}) => {
  const [searchParams] = useSearchParams();
  const keeperTypeId = propKeeperTypeId || searchParams.get('keeperTypeId') || 'demo-keeper-type';
  
  const { 
    activeBoard, 
    loadBoard, 
    addFrame, 
    isLoading, 
    error 
  } = useBoard();
  const { handleFrameInteraction } = useFrame();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [engagementMode, setEngagementMode] = useState<EngagementMode>('wizard');
  const [currentStep, setCurrentStep] = useState(0);
  const [keeperTypeStats, setKeeperTypeStats] = useState({
    linkedJourneys: 12,
    linkedAgents: 8,
    totalInstances: 156,
    setupProgress: 85,
  });

  // Initialize board with keeper type-specific frames
  useEffect(() => {
    const initializeBoard = async () => {
      if (isInitialized) return;

      try {
        // Create mock board instance
        const mockBoard = createMockKeeperTypeBoard(keeperTypeId);
        
        // Add frames in wizard order
        const frames = [
          createKeeperTypeOverviewFrame(keeperTypeId),
          createKeeperTypeProcessFrame(keeperTypeId),
          createKeeperTypeConfigFrame(keeperTypeId),
          createLinkedJourneysFrame(keeperTypeId),
          createLinkedAgentsFrame(keeperTypeId),
        ];

        mockBoard.frames = frames;

        // Load the board (this would normally be an API call)
        await loadBoard(mockBoard.id);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize keeper type board:', error);
      }
    };

    initializeBoard();
  }, [keeperTypeId, isInitialized, loadBoard]);

  // Handle frame interactions specific to keeper type board
  const handleKeeperTypeFrameInteraction = (interaction: FrameInteraction) => {
    console.log('Keeper Type board interaction:', interaction);
    
    // Handle keeper type-specific interactions
    switch (interaction.data?.action) {
      case 'next_step':
        const nextStep = Math.min(currentStep + 1, 4);
        setCurrentStep(nextStep);
        break;
        
      case 'previous_step':
        const prevStep = Math.max(currentStep - 1, 0);
        setCurrentStep(prevStep);
        break;
        
      case 'keeper_type_update':
        console.log('Updating keeper type:', interaction.data);
        onKeeperTypeUpdate?.(keeperTypeId, interaction.data);
        break;
        
      case 'journey_link':
        console.log('Linking journey:', interaction.data);
        break;
        
      case 'agent_link':
        console.log('Linking agent:', interaction.data);
        break;
        
      case 'toggle_mode':
        const newMode = engagementMode === 'wizard' ? 'canvas' : 'wizard';
        setEngagementMode(newMode);
        console.log('Toggling engagement mode:', newMode);
        break;
        
      case 'keeper_type_share':
        console.log('Sharing keeper type:', interaction.data);
        break;
        
      default:
        handleFrameInteraction(interaction);
    }
  };

  const toggleEngagementMode = () => {
    const newMode = engagementMode === 'wizard' ? 'canvas' : 'wizard';
    setEngagementMode(newMode);
    
    const interaction: FrameInteraction = {
      type: 'click',
      frameId: 'keeper-type-board-controls',
      data: { action: 'toggle_mode', mode: newMode },
      timestamp: new Date(),
    };
    
    handleKeeperTypeFrameInteraction(interaction);
  };

  if (!isInitialized && isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <SparklesIcon className="w-12 h-12 text-amber-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Keeper Type Board</h3>
          <p className="text-gray-600">Setting up your Keeper Type workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SparklesIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Keeper Type Board</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setIsInitialized(false)}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Keeper Type Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Keeper Type Management</h1>
              <p className="text-gray-600">Keeper Type: {keeperTypeId}</p>
            </div>
          </div>

          {/* Keeper Type Stats & Controls */}
          <div className="flex items-center space-x-4">
            {/* Quick Stats */}
            <div className="hidden md:flex items-center space-x-6 text-sm">
              <div className="text-center">
                <div className="font-semibold text-gray-900">{keeperTypeStats.linkedJourneys}</div>
                <div className="text-gray-500">Journeys</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{keeperTypeStats.linkedAgents}</div>
                <div className="text-gray-500">Agents</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-gray-900">{keeperTypeStats.totalInstances}</div>
                <div className="text-gray-500">Instances</div>
              </div>
              <div className="text-center">
                <div className="font-semibold text-amber-600">{keeperTypeStats.setupProgress}%</div>
                <div className="text-gray-500">Setup</div>
              </div>
            </div>

            {/* Control Buttons */}
            {showControls && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleEngagementMode}
                  className={`inline-flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    engagementMode === 'canvas'
                      ? 'bg-amber-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {engagementMode === 'canvas' ? (
                    <>
                      <ClockIcon className="w-4 h-4" />
                      <span>Wizard Mode</span>
                    </>
                  ) : (
                    <>
                      <PencilSquareIcon className="w-4 h-4" />
                      <span>Canvas Mode</span>
                    </>
                  )}
                </button>
                
                <button className="inline-flex items-center space-x-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  <ShareIcon className="w-4 h-4" />
                  <span>Share</span>
                </button>
                
                <button className="inline-flex items-center space-x-2 px-3 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">
                  <PlusIcon className="w-4 h-4" />
                  <span>New Type</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Engagement Mode Indicator */}
      {engagementMode === 'canvas' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 bg-amber-50 border border-amber-200 rounded-lg p-3"
        >
          <div className="flex items-center space-x-2">
            <PencilSquareIcon className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-900">Canvas Mode</span>
            <span className="text-sm text-amber-700">Freeform layout editing • Drag frames to rearrange</span>
          </div>
        </motion.div>
      )}

      {/* Setup Progress Indicator (Wizard Mode) */}
      {engagementMode === 'wizard' && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-amber-900">Setup Progress</h3>
            <span className="text-sm font-semibold text-amber-600">{keeperTypeStats.setupProgress}%</span>
          </div>
          <div className="w-full bg-amber-200 rounded-full h-2">
            <motion.div
              className="h-2 rounded-full bg-amber-600"
              initial={{ width: 0 }}
              animate={{ width: `${keeperTypeStats.setupProgress}%` }}
              transition={{ duration: 1, delay: 0.3 }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-amber-700">
            <span>Step {currentStep + 1} of 5</span>
            <span>Almost complete</span>
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
          onFrameInteraction={handleKeeperTypeFrameInteraction}
          showLayoutControls={engagementMode === 'canvas'}
          className="min-h-[600px]"
        />
      </motion.div>

      {/* Keeper Type Board Info */}
      <div className="mt-8 bg-amber-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <SparklesIcon className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-900 mb-1">Keeper Type Board Features</h3>
            <ul className="text-sm text-amber-800 space-y-1">
              <li>• <strong>Wizard Mode:</strong> Guided setup and configuration workflow</li>
              <li>• <strong>Canvas Mode:</strong> Freeform layout editing for advanced users</li>
              <li>• <strong>Type Overview:</strong> Comprehensive Keeper Type metadata and statistics</li>
              <li>• <strong>Configuration Panel:</strong> Edit properties, capabilities, and settings</li>
              <li>• <strong>Linked Journeys:</strong> Manage Journey associations and relationships</li>
              <li>• <strong>Linked Agents:</strong> View and manage agents using this Keeper Type</li>
              <li>• <strong>Process Tracking:</strong> Step-by-step setup progress with validation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeeperTypeBoard;
