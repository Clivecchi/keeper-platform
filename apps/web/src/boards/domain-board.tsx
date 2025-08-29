/**
 * Domain Board
 * ============
 * 
 * Board component for domain management and setup.
 * Uses wizard engagement mode to guide users through domain configuration.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  GlobeAltIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { BoardRenderer } from '../components/boards/BoardRenderer';
import { useBoard, BoardInstance } from '../context/BoardContext';
import { useFrame } from '../context/FrameContext';
import { 
  ExtendedFrameInstance, 
  FrameInteraction 
} from '../types/frame';

// =============================================================================
// DOMAIN BOARD PROPS
// =============================================================================

interface DomainBoardProps {
  domainId?: string;
  className?: string;
  onDomainUpdate?: (domainId: string, updates: any) => void;
  showControls?: boolean;
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const createMockDomainBoard = (domainId: string): BoardInstance => ({
  id: `domain-board-${domainId}`,
  config: {
    id: `domain-board-config-${domainId}`,
    type: 'domain_board',
    name: 'Domain Configuration',
    description: 'Configure and manage your domain settings',
    layout: 'wizard',
    engagementMode: 'wizard',
    allowLayoutEditing: true,
    theme: {
      primaryColor: '#059669',
      backgroundColor: '#F0FDF4',
      accentColor: '#047857',
      borderColor: '#BBF7D0',
    }
  },
  frames: [],
  entityType: 'domain',
  entityId: domainId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createDomainCardFrame = (domainId: string): ExtendedFrameInstance => ({
  id: `domain-card-${domainId}`,
  entityType: 'domain',
  entityId: domainId,
  configId: `domain-card-config-${domainId}`,
  currentContentId: `domain-card-content-${domainId}`,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `domain-card-config-${domainId}`,
    name: 'Domain Overview',
    description: 'Basic domain information and branding',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'preview',
    engagementMode: 'wizard',
  },
  FrameContent_FrameInstance_currentContentIdToFrameContent: {
    id: `domain-card-content-${domainId}`,
    type: 'domain_info',
    url: '',
    alt: 'Domain Information Card',
    createdAt: new Date(),
    playlistOwnerId: null,
    metadata: {
      domainName: domainId === 'demo' ? 'demo.keeper-platform.com' : `${domainId}.keeper-platform.com`,
      status: 'active',
      memberCount: 5,
      setupProgress: 75,
      logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop&crop=center',
    }
  }
});

const createSetupStepsFrame = (domainId: string): ExtendedFrameInstance => ({
  id: `setup-steps-${domainId}`,
  entityType: 'domain',
  entityId: domainId,
  configId: `setup-steps-config-${domainId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `setup-steps-config-${domainId}`,
    name: 'Setup Progress',
    description: 'Domain setup and configuration steps',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'process_frame',
    engagementMode: 'wizard',
  },
});

const createMemberListFrame = (domainId: string): ExtendedFrameInstance => ({
  id: `member-list-${domainId}`,
  entityType: 'domain',
  entityId: domainId,
  configId: `member-list-config-${domainId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `member-list-config-${domainId}`,
    name: 'Team Members',
    description: 'Manage domain members and permissions',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'config_panel',
    engagementMode: 'wizard',
  },
});

const createCustomDomainFrame = (domainId: string): ExtendedFrameInstance => ({
  id: `custom-domain-${domainId}`,
  entityType: 'domain',
  entityId: domainId,
  configId: `custom-domain-config-${domainId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  FrameConfig: {
    id: `custom-domain-config-${domainId}`,
    name: 'Custom Domain',
    description: 'Configure custom domain settings and DNS',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'config_panel',
    engagementMode: 'wizard',
  },
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const DomainBoard: React.FC<DomainBoardProps> = ({
  domainId: propDomainId,
  className = '',
  onDomainUpdate,
  showControls = true,
}) => {
  const [searchParams] = useSearchParams();
  const domainId = propDomainId || searchParams.get('domainId') || 'demo-domain';
  
  const { 
    activeBoard, 
    loadBoard, 
    addFrame, 
    isLoading, 
    error 
  } = useBoard();
  const { handleFrameInteraction } = useFrame();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [setupProgress, setSetupProgress] = useState({
    domainInfo: true,
    setupSteps: false,
    members: false,
    customDomain: false,
  });

  // Initialize board with domain-specific frames
  useEffect(() => {
    const initializeBoard = async () => {
      if (isInitialized) return;

      try {
        // Create mock board instance
        const mockBoard = createMockDomainBoard(domainId);
        
        // Add frames in wizard order
        const frames = [
          createDomainCardFrame(domainId),
          createSetupStepsFrame(domainId),
          createMemberListFrame(domainId),
          createCustomDomainFrame(domainId),
        ];

        mockBoard.frames = frames;

        // Load the board (this would normally be an API call)
        await loadBoard(mockBoard.id);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize domain board:', error);
      }
    };

    initializeBoard();
  }, [domainId, isInitialized, loadBoard]);

  // Handle frame interactions specific to domain board
  const handleDomainFrameInteraction = (interaction: FrameInteraction) => {
    console.log('Domain board interaction:', interaction);
    
    // Handle domain-specific interactions
    switch (interaction.data?.action) {
      case 'next_step':
        const nextStep = Math.min(currentStep + 1, 3);
        setCurrentStep(nextStep);
        break;
        
      case 'previous_step':
        const prevStep = Math.max(currentStep - 1, 0);
        setCurrentStep(prevStep);
        break;
        
      case 'domain_update':
        console.log('Updating domain:', interaction.data);
        onDomainUpdate?.(domainId, interaction.data);
        break;
        
      case 'member_invite':
        console.log('Inviting member:', interaction.data);
        break;
        
      case 'custom_domain_save':
        console.log('Saving custom domain:', interaction.data);
        setSetupProgress(prev => ({ ...prev, customDomain: true }));
        break;
        
      default:
        handleFrameInteraction(interaction);
    }
  };

  // Calculate overall completion
  const completionPercentage = Math.round(
    (Object.values(setupProgress).filter(Boolean).length / 4) * 100
  );

  if (!isInitialized && isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <GlobeAltIcon className="w-12 h-12 text-green-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Domain Board</h3>
          <p className="text-gray-600">Setting up your domain workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GlobeAltIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Domain Board</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => setIsInitialized(false)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* Domain Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <GlobeAltIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Domain Management</h1>
              <p className="text-gray-600">Configure domain: {domainId}</p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm font-medium text-gray-900">{completionPercentage}% Complete</div>
              <div className="text-xs text-gray-500">Setup Progress</div>
            </div>
            <div className="w-16 h-16 relative">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-gray-200"
                  stroke="currentColor"
                  strokeWidth="3"
                  fill="transparent"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-green-600"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${completionPercentage}, 100`}
                  strokeLinecap="round"
                  fill="transparent"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Board Renderer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <BoardRenderer
          boardInstance={activeBoard || undefined}
          onFrameInteraction={handleDomainFrameInteraction}
          showLayoutControls={showControls}
          className="min-h-[600px]"
        />
      </motion.div>

      {/* Domain Board Info */}
      <div className="mt-8 bg-green-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <GlobeAltIcon className="w-4 h-4 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-green-900 mb-1">Domain Board Features</h3>
            <ul className="text-sm text-green-800 space-y-1">
              <li>• <strong>Wizard Mode:</strong> Step-by-step domain setup and configuration</li>
              <li>• <strong>Domain Card:</strong> Overview of domain status and basic information</li>
              <li>• <strong>Setup Progress:</strong> Track completion of domain configuration steps</li>
              <li>• <strong>Member Management:</strong> Invite and manage team members with roles</li>
              <li>• <strong>Custom Domain:</strong> Configure DNS settings and custom domain mapping</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DomainBoard;
