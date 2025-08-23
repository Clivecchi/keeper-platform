/**
 * Agent Board
 * ===========
 * 
 * Board component for agent configuration and management.
 * Uses dialogic engagement mode with agent preview, configuration, and interaction frames.
 */

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  CpuChipIcon,
  PlusIcon,
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { BoardRenderer } from '../components/boards/BoardRenderer';
import { useBoard, BoardInstance } from '../context/BoardContext';
import { useFrame } from '../context/FrameContext';
import { 
  ExtendedFrameInstance, 
  FrameInteraction,
  CreateFrameInstanceRequest 
} from '../types/frame';

// =============================================================================
// AGENT BOARD PROPS
// =============================================================================

interface AgentBoardProps {
  agentId?: string;
  className?: string;
  onAgentUpdate?: (agentId: string, updates: any) => void;
  showControls?: boolean;
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

const createMockAgentBoard = (agentId: string): BoardInstance => ({
  id: `agent-board-${agentId}`,
  config: {
    id: `agent-board-config-${agentId}`,
    type: 'agent_board',
    name: 'Agent Configuration',
    description: 'Configure and interact with your AI agent',
    layout: 'column',
    engagementMode: 'dialogic',
    allowLayoutEditing: true,
    theme: {
      primaryColor: '#3B82F6',
      backgroundColor: '#F8FAFC',
      accentColor: '#1E40AF',
    }
  },
  frames: [],
  entityType: 'agent',
  entityId: agentId,
  createdAt: new Date(),
  updatedAt: new Date(),
});

const createAgentPreviewFrame = (agentId: string, agentData?: any): ExtendedFrameInstance => ({
  id: `agent-preview-${agentId}`,
  entityType: 'agent',
  entityId: agentId,
  configId: `agent-preview-config-${agentId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  data: agentData ? {
    agentName: agentData.name,
    description: agentData.purpose,
    status: agentData.status === 'ready' ? 'Active' : agentData.status,
    capabilities: agentData.tools || ['Conversation', 'Task Assistance'],
    lastActive: agentData.updated_at,
    model: agentData.model,
    provider: agentData.model_provider,
  } : undefined,
  FrameConfig: {
    id: `agent-preview-config-${agentId}`,
    name: 'Agent Overview',
    description: 'View agent identity and status',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'agent_preview',
    engagementMode: 'dialogic',
  },
});

const createAgentDialogFrame = (agentId: string, agentData?: any): ExtendedFrameInstance => ({
  id: `agent-dialog-${agentId}`,
  entityType: 'agent',
  entityId: agentId,
  configId: `agent-dialog-config-${agentId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  data: agentData ? {
    agentName: agentData.name,
    messages: [
      { 
        role: 'assistant', 
        content: `Hello! I'm ${agentData.name}. ${agentData.purpose}` 
      },
    ],
    isActive: agentData.status === 'ready',
  } : undefined,
  FrameConfig: {
    id: `agent-dialog-config-${agentId}`,
    name: 'Agent Conversation',
    description: 'Interactive conversation with the agent',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'dialog',
    engagementMode: 'dialogic',
  },
});

const createAgentConfigFrame = (agentId: string, agentData?: any): ExtendedFrameInstance => ({
  id: `agent-config-${agentId}`,
  entityType: 'agent',
  entityId: agentId,
  configId: `agent-config-config-${agentId}`,
  currentContentId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  data: agentData ? {
    settings: {
      model: agentData.model,
      model_provider: agentData.model_provider,
      visibility: agentData.visibility,
      agent_class: agentData.agent_class,
      tools: agentData.tools,
      permissions: agentData.permissions,
      ...agentData.config,
    },
    availableSettings: ['model', 'model_provider', 'visibility', 'agent_class', 'tools', 'permissions'],
  } : undefined,
  FrameConfig: {
    id: `agent-config-config-${agentId}`,
    name: 'Agent Settings',
    description: 'Configure agent parameters and behavior',
    theme: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    frameType: 'config_panel',
    engagementMode: 'dialogic',
  },
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AgentBoard: React.FC<AgentBoardProps> = ({
  agentId = 'demo-agent',
  className = '',
  onAgentUpdate,
  showControls = true,
}) => {
  const { 
    activeBoard, 
    loadBoard, 
    addFrame, 
    isLoading, 
    error 
  } = useBoard();
  const { handleFrameInteraction } = useFrame();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [availableFrameTypes, setAvailableFrameTypes] = useState<string[]>([
    'agent_preview',
    'dialog', 
    'config_panel'
  ]);

  // Initialize board with agent-specific frames using the new Agent Home Board API
  useEffect(() => {
    const initializeBoard = async () => {
      if (isInitialized) return;

      try {
        // Load Agent Home Board from API (creates one if it doesn't exist)
        const response = await fetch(`/api/agents/${agentId}/home-board`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Failed to load agent home board: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Loaded agent home board:', data);

        if (!data.success) {
          throw new Error(data.error || 'Failed to load agent home board');
        }

        const { board, agent } = data.data;

        // Transform API response to match BoardInstance interface
        const boardInstance = {
          id: board.id,
          config: {
            id: `${board.id}-config`,
            type: 'agent_board' as const,
            name: board.name,
            description: board.description || `Home board for ${agent.name}`,
            layout: 'column' as const,
            engagementMode: 'dialogic' as const,
            allowLayoutEditing: true,
            theme: {
              primaryColor: '#3B82F6',
              backgroundColor: '#F8FAFC',
              accentColor: '#1E40AF',
            }
          },
          frames: board.frames || [],
          entityType: 'agent',
          entityId: agentId,
          createdAt: new Date(board.createdAt || Date.now()),
          updatedAt: new Date(board.updatedAt || Date.now()),
        };

        // Use the board context to load the board
        await loadBoard(boardInstance.id);
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize agent board:', error);
        // Fall back to mock data if API fails
        const mockBoard = createMockAgentBoard(agentId);
        const frames = [
          createAgentPreviewFrame(agentId),
          createAgentDialogFrame(agentId),
          createAgentConfigFrame(agentId),
        ];
        mockBoard.frames = frames;
        await loadBoard(mockBoard.id);
        setIsInitialized(true);
      }
    };

    initializeBoard();
  }, [agentId, isInitialized, loadBoard]);

  // Handle frame interactions specific to agent board
  const handleAgentFrameInteraction = (interaction: FrameInteraction) => {
    console.log('Agent board interaction:', interaction);
    
    // Handle agent-specific interactions
    switch (interaction.data?.action) {
      case 'agent_select':
        console.log('Agent selected:', interaction.data.agentId);
        break;
        
      case 'chat':
        console.log('Starting chat with agent:', interaction.data.agentId);
        break;
        
      case 'configure':
        console.log('Configuring agent:', interaction.data.agentId);
        break;
        
      case 'save_config':
        console.log('Saving agent configuration:', interaction.data);
        onAgentUpdate?.(agentId, interaction.data);
        break;
        
      default:
        handleFrameInteraction(interaction);
    }
  };

  // Add new frame to the board
  const handleAddFrame = async (frameType: string) => {
    if (!activeBoard) return;

    let newFrame: ExtendedFrameInstance;

    switch (frameType) {
      case 'agent_preview':
        newFrame = createAgentPreviewFrame(agentId);
        break;
      case 'dialog':
        newFrame = createAgentDialogFrame(agentId);
        break;
      case 'config_panel':
        newFrame = createAgentConfigFrame(agentId);
        break;
      default:
        console.warn('Unknown frame type:', frameType);
        return;
    }

    try {
      await addFrame(activeBoard.id, newFrame);
    } catch (error) {
      console.error('Failed to add frame:', error);
    }
  };

  if (!isInitialized && isLoading) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <CpuChipIcon className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Loading Agent Board</h3>
          <p className="text-gray-600">Setting up your agent workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center py-12 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CpuChipIcon className="w-6 h-6 text-red-600" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Agent Board</h3>
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
      {/* Agent Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agent Workspace</h1>
              <p className="text-gray-600">Configure and interact with Agent ID: {agentId}</p>
            </div>
          </div>

          {/* Quick Actions */}
          {showControls && (
            <div className="flex items-center space-x-2">
              <div className="relative group">
                <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Frame</span>
                </button>
                
                {/* Dropdown Menu */}
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                  {availableFrameTypes.map((frameType) => (
                    <button
                      key={frameType}
                      onClick={() => handleAddFrame(frameType)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        {frameType === 'agent_preview' && <CpuChipIcon className="w-4 h-4" />}
                        {frameType === 'dialog' && <ChatBubbleLeftRightIcon className="w-4 h-4" />}
                        {frameType === 'config_panel' && <Cog6ToothIcon className="w-4 h-4" />}
                        <span className="capitalize">{frameType.replace('_', ' ')}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
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
          onFrameInteraction={handleAgentFrameInteraction}
          showLayoutControls={showControls}
          className="min-h-[600px]"
        />
      </motion.div>

      {/* Agent Board Info */}
      <div className="mt-8 bg-blue-50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <CpuChipIcon className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">Agent Board Features</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Dialogic Mode:</strong> Agent-guided interactions and conversations</li>
              <li>• <strong>Agent Preview:</strong> View agent identity, status, and capabilities</li>
              <li>• <strong>Configuration Panel:</strong> Adjust agent parameters and behavior</li>
              <li>• <strong>Interactive Dialog:</strong> Real-time conversation with the agent</li>
              <li>• <strong>Layout Editing:</strong> Customize frame arrangement and sizing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentBoard;
