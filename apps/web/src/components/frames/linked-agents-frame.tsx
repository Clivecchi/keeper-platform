/**
 * Linked Agents Frame
 * ===================
 * 
 * Media card frame component for displaying agents using a Keeper Type.
 * Shows agent list with management capabilities and quick actions.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  UserIcon,
  PlusIcon,
  CpuChipIcon,
  TrashIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  PauseIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChatBubbleLeftIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface LinkedAgent {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'paused' | 'training' | 'archived';
  avatar?: string;
  owner: string;
  ownerEmail: string;
  createdAt: Date;
  lastActivity: Date;
  conversationCount: number;
  successRate: number;
  version: string;
  customizations: string[];
  isShared: boolean;
}

const LinkedAgentsFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LinkedAgent['status']>('all');
  const [isCreating, setIsCreating] = useState(false);

  // Mock linked agents data
  const [linkedAgents] = useState<LinkedAgent[]>([
    {
      id: '1',
      name: 'CodeMaster Pro',
      description: 'Advanced development assistant specialized in React and TypeScript',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
      owner: 'John Doe',
      ownerEmail: 'john@example.com',
      createdAt: new Date('2024-01-15'),
      lastActivity: new Date('2024-01-28'),
      conversationCount: 156,
      successRate: 94,
      version: '2.1.0',
      customizations: ['Custom Prompts', 'Team Workflows', 'Code Standards'],
      isShared: true
    },
    {
      id: '2',
      name: 'DevHelper',
      description: 'Personal coding assistant for debugging and code review',
      status: 'active',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
      owner: 'Jane Smith',
      ownerEmail: 'jane@example.com',
      createdAt: new Date('2024-01-20'),
      lastActivity: new Date('2024-01-27'),
      conversationCount: 89,
      successRate: 87,
      version: '2.1.0',
      customizations: ['Debug Patterns', 'Error Analysis'],
      isShared: false
    },
    {
      id: '3',
      name: 'ArchitectBot',
      description: 'System architecture and design consultation agent',
      status: 'training',
      owner: 'Mike Johnson',
      ownerEmail: 'mike@example.com',
      createdAt: new Date('2024-01-22'),
      lastActivity: new Date('2024-01-26'),
      conversationCount: 23,
      successRate: 76,
      version: '2.0.5',
      customizations: ['Architecture Patterns', 'Scalability Guidelines'],
      isShared: true
    },
    {
      id: '4',
      name: 'TestGuru',
      description: 'Testing specialist for unit and integration tests',
      status: 'paused',
      owner: 'Sarah Wilson',
      ownerEmail: 'sarah@example.com',
      createdAt: new Date('2024-01-18'),
      lastActivity: new Date('2024-01-24'),
      conversationCount: 67,
      successRate: 91,
      version: '2.1.0',
      customizations: ['Test Strategies', 'Coverage Analysis'],
      isShared: false
    }
  ]);

  const getStatusColor = (status: LinkedAgent['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'training':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'paused':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'archived':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status: LinkedAgent['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-3 h-3" />;
      case 'training':
        return <PlayIcon className="w-3 h-3" />;
      case 'paused':
        return <PauseIcon className="w-3 h-3" />;
      case 'archived':
        return <ClockIcon className="w-3 h-3" />;
      default:
        return <ClockIcon className="w-3 h-3" />;
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 80) return 'text-blue-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleAgentAction = (action: string, agentId?: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, agentId, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const filteredAgents = linkedAgents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         agent.owner.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <CpuChipIcon className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-gray-900">Linked Agents</h3>
        </div>
        <p className="text-sm text-gray-600">
          Manage agents using this Keeper Type.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CpuChipIcon className="w-5 h-5 text-amber-600" />
            <h3 className="font-medium text-gray-900">Linked Agents</h3>
            <span className="text-sm text-gray-500">({linkedAgents.length})</span>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create Agent</span>
          </button>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search agents..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="training">Training</option>
              <option value="paused">Paused</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Create Agent Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-white border border-gray-200 rounded-lg"
            >
              <h4 className="text-sm font-medium text-gray-900 mb-3">Create New Agent</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Agent name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <textarea
                  placeholder="Agent description"
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      handleAgentAction('agent_create', 'new-agent');
                      setIsCreating(false);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
                  >
                    Create Agent
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Agent List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {filteredAgents.map((agent, index) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Agent Avatar */}
                    <div className="w-10 h-10 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                      {agent.avatar ? (
                        <img src={agent.avatar} alt={agent.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Agent Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{agent.name}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(agent.status)}`}>
                          {getStatusIcon(agent.status)}
                          <span className="ml-1 capitalize">{agent.status}</span>
                        </span>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                          v{agent.version}
                        </span>
                        {agent.isShared && (
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">
                            Shared
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {agent.description}
                      </p>

                      {/* Owner Info */}
                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <div className="flex items-center space-x-1">
                          <UserIcon className="w-3 h-3" />
                          <span>{agent.owner}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ChatBubbleLeftIcon className="w-3 h-3" />
                          <span>{agent.conversationCount} conversations</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <ChartBarIcon className="w-3 h-3" />
                          <span className={getSuccessRateColor(agent.successRate)}>
                            {agent.successRate}% success rate
                          </span>
                        </div>
                      </div>

                      {/* Customizations */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {agent.customizations.slice(0, 2).map((customization, idx) => (
                          <span
                            key={idx}
                            className="inline-block px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-md"
                          >
                            {customization}
                          </span>
                        ))}
                        {agent.customizations.length > 2 && (
                          <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                            +{agent.customizations.length - 2} more
                          </span>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>Created {agent.createdAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Last activity: {agent.lastActivity.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => handleAgentAction('agent_view', agent.id)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="View Agent"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAgentAction('agent_chat', agent.id)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="Chat with Agent"
                    >
                      <ChatBubbleLeftIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleAgentAction('agent_delete', agent.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Delete Agent"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Empty State */}
        {filteredAgents.length === 0 && (
          <div className="text-center py-12">
            <CpuChipIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching agents' : 'No linked agents'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Create agents using this Keeper Type to get started.'
              }
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Your First Agent</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Showing {filteredAgents.length} of {linkedAgents.length} agents
          </span>
          <div className="flex items-center space-x-4">
            <span className="text-gray-500">
              {linkedAgents.filter(a => a.status === 'active').length} active
            </span>
            <button
              onClick={() => handleAgentAction('agents_manage')}
              className="text-amber-600 hover:text-amber-700 font-medium"
            >
              Manage All Agents
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LinkedAgentsFrame;
