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
  CpuChipIcon
} from '@heroicons/react/24/outline';
import { BoardRenderer } from '../components/boards/BoardRenderer';
import { BoardProvider } from './BoardContext';
import { useBoard, BoardInstance } from '../context/BoardContext';
import { useFrame } from '../context/FrameContext';
import {
  ExtendedFrameInstance,
  FrameInteraction
} from '../types/frame';
import { makeFrameInstance } from '../utils/frameFactory';
import { useAgentEvents, AgentEvent } from '../hooks/useAgentEvents';
import { useRef } from 'react';
import { BoardToolbar } from './components/BoardToolbar';
import { apiFetch } from '../lib/api';
import { useNavigate } from 'react-router-dom';

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

const createAgentPreviewFrame = (agentId: string, agentData?: any): ExtendedFrameInstance =>
  makeFrameInstance({
    id: `agent-preview-${agentId}`,
    entityType: 'agent',
    entityId: agentId,
    configId: `agent-preview-config-${agentId}`,
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

const createAgentDialogFrame = (agentId: string, agentData?: any): ExtendedFrameInstance =>
  makeFrameInstance({
    id: `agent-dialog-${agentId}`,
    entityType: 'agent',
    entityId: agentId,
    configId: `agent-dialog-config-${agentId}`,
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

const createAgentConfigFrame = (agentId: string, agentData?: any): ExtendedFrameInstance =>
  makeFrameInstance({
    id: `agent-config-${agentId}`,
    entityType: 'agent',
    entityId: agentId,
    configId: `agent-config-config-${agentId}`,
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

const createTopicsFrame = (agentId: string): ExtendedFrameInstance =>
  makeFrameInstance({
    id: `topics-${agentId}`,
    entityType: 'agent',
    entityId: agentId,
    configId: `topics-config-${agentId}`,
    FrameConfig: {
      id: `topics-config-${agentId}`,
      name: 'Topics',
      description: 'Manage topics and highlights for this agent',
      theme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      frameType: 'topics',
      engagementMode: 'focus',
    },
  });

const createDraftFrame = (agentId: string): ExtendedFrameInstance =>
  makeFrameInstance({
    id: `draft-${agentId}`,
    entityType: 'agent',
    entityId: agentId,
    configId: `draft-config-${agentId}`,
    FrameConfig: {
      id: `draft-config-${agentId}`,
      name: 'Draft',
      description: 'Edit and manage agent configuration drafts',
      theme: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      frameType: 'draft',
      engagementMode: 'canvas',
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
    isLoading, 
    error,
    refreshBoard
  } = useBoard();
  const { handleFrameInteraction } = useFrame();
  const navigate = useNavigate();
  
  const [isInitialized, setIsInitialized] = useState(false);
  // Realtime: subscribe to agent events when enabled by board behavior
  const realtimeEnabled = true; // TODO: wire from board.behavior.realtime?.enabled; default true
  const refreshDebounceRef = useRef<number | null>(null);

  useAgentEvents(agentId, realtimeEnabled, {
    onEvent: (e: AgentEvent) => {
      // Minimal reactions: refresh only affected slices via existing handlers or add targeted fetches
      switch (e.type) {
        case 'topic.created':
        case 'topic.updated':
        case 'topic.merged':
          // For now, rely on TopicsFrame internal fetching via context triggers (future: expose refresh fn)
          break;
        case 'draft.created':
        case 'draft.updated':
        case 'draft.proposed':
        case 'draft.committed':
          break;
        case 'task.created':
        case 'task.updated':
        case 'task.status':
          break;
        case 'activity.appended':
          break;
        case 'board.settings.updated':
          if (refreshDebounceRef.current) window.clearTimeout(refreshDebounceRef.current);
          refreshDebounceRef.current = window.setTimeout(() => {
            refreshBoard();
          }, 300);
          break;
        default:
          if (e.type.startsWith('board.frames.')) {
            if (refreshDebounceRef.current) window.clearTimeout(refreshDebounceRef.current);
            refreshDebounceRef.current = window.setTimeout(() => {
              refreshBoard();
            }, 300);
          }
          break;
      }
    },
  });
  // Frame creation is handled by BoardToolbar + FramePicker (data.frames API)

  // Initialize board with agent-specific frames using authenticated board-data API
  useEffect(() => {
    const initializeBoard = async () => {
      if (isInitialized) return;

      try {
        // First, ensure the agent has a home board (authenticated)
        const agentData = await apiFetch(`/api/agents/${agentId}/home-board`);
        
        if (!agentData?.success) throw new Error(agentData?.error || 'Failed to ensure agent home board');

        const boardId = agentData.data.board.id;

        // Load the board via the existing board-data API
        await loadBoard(boardId);
        setIsInitialized(true);
        
      } catch (error) {
        const status = (error as any)?.status;
        if (status === 401) {
          navigate('/login');
          return;
        }
        console.error('Failed to initialize agent board:', error);
        // Fall back to mock data if API fails
        const mockBoard = createMockAgentBoard(agentId);
        const frames = [
          createAgentPreviewFrame(agentId),
          createAgentDialogFrame(agentId),
          createTopicsFrame(agentId),
          createDraftFrame(agentId),
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

  // Legacy addFrame UI removed; use BoardToolbar + FramePicker

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
    <BoardProvider>
    <div className={className}>
      {/* Agent Board Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Agent Home Board</h1>
              <p className="text-gray-600">Configure and interact with Agent ID: {agentId}</p>
            </div>
          </div>

          {/* Quick Actions */}
          {showControls && (
            <div className="flex items-center space-x-2">
              <BoardToolbar />
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
              <li>• <strong>Topics Management:</strong> Create, organize, and highlight key topics</li>
              <li>• <strong>Draft System:</strong> Edit, propose, and commit agent configuration changes</li>
              <li>• <strong>Configuration Panel:</strong> Adjust agent parameters and behavior</li>
              <li>• <strong>Interactive Dialog:</strong> Real-time conversation with the agent</li>
              <li>• <strong>Layout Editing:</strong> Customize frame arrangement and sizing</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
    </BoardProvider>
  );
};

export default AgentBoard;
