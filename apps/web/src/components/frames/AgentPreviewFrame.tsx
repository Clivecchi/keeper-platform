/**
 * Agent Preview Frame
 * ===================
 * 
 * Frame component for displaying agent identity, configuration, and status.
 * Used in agent management interfaces and dashboards.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  CpuChipIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CogIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface AgentData {
  id: string;
  name: string;
  purpose?: string;
  status: 'active' | 'inactive' | 'error' | 'loading';
  model?: string;
  provider?: string;
  lastActive?: Date;
  conversationCount?: number;
  capabilities?: string[];
  avatar?: string;
}

interface AgentPreviewFrameProps extends BaseFrameProps {
  agentData?: AgentData;
  showActions?: boolean;
  compact?: boolean;
}

const AgentPreviewFrame: React.FC<AgentPreviewFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
  agentData,
  showActions = true,
  compact = false,
}) => {
  const { handleFrameInteraction } = useFrame();

  // Mock agent data if none provided
  const defaultAgentData: AgentData = {
    id: 'agent-1',
    name: 'Demo Agent',
    purpose: 'A helpful AI assistant for demonstration purposes',
    status: 'active',
    model: 'gpt-4',
    provider: 'openai',
    lastActive: new Date(),
    conversationCount: 42,
    capabilities: ['conversation', 'analysis', 'code-review'],
  };

  const agent = agentData || defaultAgentData;

  const getStatusIcon = (status: AgentData['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
      case 'inactive':
        return <ClockIcon className="w-4 h-4 text-gray-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
      case 'loading':
        return <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default:
        return <CpuChipIcon className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: AgentData['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'inactive':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'loading':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const handleAgentClick = () => {
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: 'agent_select', agentId: agent.id },
      timestamp: new Date(),
    });
    onInteraction?.({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: 'agent_select', agentId: agent.id },
      timestamp: new Date(),
    });
  };

  const handleActionClick = (action: string) => {
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action, agentId: agent.id },
      timestamp: new Date(),
    });
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <CpuChipIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Agent Preview</h3>
        </div>
        <p className="text-sm text-gray-600">
          Agent identity and configuration display.
        </p>
      </div>
    );
  }

  if (compact) {
    return (
      <motion.div
        className={`bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer ${className}`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleAgentClick}
      >
        <div className="flex items-center space-x-3">
          {/* Avatar */}
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
            {agent.avatar ? (
              <img src={agent.avatar} alt={agent.name} className="w-10 h-10 rounded-full" />
            ) : (
              <CpuChipIcon className="w-5 h-5 text-blue-600" />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {agent.name}
              </h3>
              {getStatusIcon(agent.status)}
            </div>
            <p className="text-xs text-gray-500 truncate">
              {agent.model} • {agent.conversationCount} conversations
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${className}`}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Avatar */}
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              {agent.avatar ? (
                <img src={agent.avatar} alt={agent.name} className="w-12 h-12 rounded-full" />
              ) : (
                <CpuChipIcon className="w-6 h-6 text-blue-600" />
              )}
            </div>

            {/* Basic Info */}
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{agent.name}</h3>
              {agent.purpose && (
                <p className="text-sm text-gray-600 mt-1">{agent.purpose}</p>
              )}
            </div>
          </div>

          {/* Status */}
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(agent.status)}`}>
            {getStatusIcon(agent.status)}
            <span className="ml-1 capitalize">{agent.status}</span>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Model</dt>
            <dd className="text-sm text-gray-900 mt-1">{agent.model || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Provider</dt>
            <dd className="text-sm text-gray-900 mt-1 capitalize">{agent.provider || 'Unknown'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Conversations</dt>
            <dd className="text-sm text-gray-900 mt-1">{agent.conversationCount || 0}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Last Active</dt>
            <dd className="text-sm text-gray-900 mt-1">
              {agent.lastActive ? agent.lastActive.toLocaleDateString() : 'Never'}
            </dd>
          </div>
        </div>

        {/* Capabilities */}
        {agent.capabilities && agent.capabilities.length > 0 && (
          <div className="mb-4">
            <dt className="text-sm font-medium text-gray-500 mb-2">Capabilities</dt>
            <div className="flex flex-wrap gap-2">
              {agent.capabilities.map((capability) => (
                <span
                  key={capability}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      {showActions && (
        <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
          <div className="flex space-x-2">
            <button
              onClick={() => handleActionClick('chat')}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <ChatBubbleLeftRightIcon className="w-4 h-4" />
              <span>Chat</span>
            </button>
            
            <button
              onClick={() => handleActionClick('configure')}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <CogIcon className="w-4 h-4" />
              <span>Configure</span>
            </button>
            
            <button
              onClick={() => handleActionClick('test')}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm text-green-600 hover:text-green-700 hover:bg-green-50 rounded-lg transition-colors"
            >
              <BoltIcon className="w-4 h-4" />
              <span>Test</span>
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AgentPreviewFrame;
