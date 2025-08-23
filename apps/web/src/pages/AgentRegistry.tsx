/**
 * Agent Registry
 * ==============
 * 
 * Page component that lists all agents and provides access to their Home Boards.
 * Serves as the main entry point for agent management and interaction.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  CpuChipIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  Squares2X2Icon,
  ListBulletIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  PencilIcon,
  HomeIcon
} from '@heroicons/react/24/outline';

interface Agent {
  id: string;
  name: string;
  slug: string;
  purpose: string;
  model: string;
  agent_class: string;
  status: 'ready' | 'training' | 'error' | 'inactive';
  model_provider: string;
  visibility: 'private' | 'public' | 'shared';
  tools: string[];
  permissions: string[];
  created_at: string;
  updated_at: string;
}

type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'ready' | 'training' | 'error' | 'inactive';

const AgentRegistry: React.FC = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Load agents from API
  useEffect(() => {
    const loadAgents = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams();
        if (filterStatus !== 'all') {
          params.append('status', filterStatus);
        }
        params.append('limit', '50');

        const response = await fetch(`/api/agents?${params}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Failed to load agents');
        }

        const data = await response.json();
        setAgents(data.agents || []);
      } catch (err) {
        console.error('Error loading agents:', err);
        setError(err instanceof Error ? err.message : 'Failed to load agents');
        
        // Mock data for development
        setAgents([
          {
            id: '1',
            name: 'Research Assistant',
            slug: 'research-assistant',
            purpose: 'Helps with research tasks and information gathering',
            model: 'gpt-4',
            agent_class: 'Standard',
            status: 'ready',
            model_provider: 'openai',
            visibility: 'private',
            tools: ['web_search', 'document_analysis'],
            permissions: ['read', 'write'],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          {
            id: '2',
            name: 'Code Review Bot',
            slug: 'code-review-bot',
            purpose: 'Reviews code and provides feedback on best practices',
            model: 'gpt-4',
            agent_class: 'Expert',
            status: 'ready',
            model_provider: 'openai',
            visibility: 'shared',
            tools: ['code_interpreter', 'file_analysis'],
            permissions: ['read'],
            created_at: new Date(Date.now() - 86400000).toISOString(),
            updated_at: new Date(Date.now() - 3600000).toISOString(),
          },
          {
            id: '3',
            name: 'Content Creator',
            slug: 'content-creator',
            purpose: 'Creates marketing content and blog posts',
            model: 'claude-3-sonnet',
            agent_class: 'Creative',
            status: 'training',
            model_provider: 'anthropic',
            visibility: 'private',
            tools: ['image_generation', 'text_generation'],
            permissions: ['read', 'write', 'publish'],
            created_at: new Date(Date.now() - 172800000).toISOString(),
            updated_at: new Date(Date.now() - 7200000).toISOString(),
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    loadAgents();
  }, [filterStatus]);

  // Filter agents based on search query
  const filteredAgents = agents.filter(agent => 
    searchQuery === '' || 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle opening Agent Home Board
  const handleOpenHomeBoard = (agentId: string) => {
    navigate(`/agent-board/${agentId}`);
  };

  // Handle creating new agent
  const handleCreateAgent = () => {
    navigate('/agents/new');
  };

  // Get status icon and color
  const getStatusInfo = (status: Agent['status']) => {
    switch (status) {
      case 'ready':
        return { icon: CheckCircleIcon, color: 'text-green-600 bg-green-50' };
      case 'training':
        return { icon: ClockIcon, color: 'text-orange-600 bg-orange-50' };
      case 'error':
        return { icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-50' };
      case 'inactive':
        return { icon: ClockIcon, color: 'text-gray-600 bg-gray-50' };
      default:
        return { icon: ClockIcon, color: 'text-gray-600 bg-gray-50' };
    }
  };

  // Get visibility badge color
  const getVisibilityColor = (visibility: Agent['visibility']) => {
    switch (visibility) {
      case 'public':
        return 'text-blue-600 bg-blue-50';
      case 'shared':
        return 'text-purple-600 bg-purple-50';
      case 'private':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Agent Registry</h1>
              <p className="text-gray-600">Manage and interact with your AI agents</p>
            </div>
          </div>

          <button
            onClick={handleCreateAgent}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Agent</span>
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between space-x-4">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 border rounded-lg transition-colors ${
                showFilters || filterStatus !== 'all'
                  ? 'bg-blue-50 text-blue-600 border-blue-200'
                  : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <FunnelIcon className="w-4 h-4" />
              <span>Filters</span>
            </button>

            {/* View Mode Toggle */}
            <div className="flex border border-gray-300 rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'} rounded-l-lg transition-colors`}
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'} rounded-r-lg transition-colors`}
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Options */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200"
            >
              <div className="flex items-center space-x-4">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <div className="flex space-x-2">
                  {(['all', 'ready', 'training', 'error', 'inactive'] as FilterStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-3 py-1 text-sm rounded-full transition-colors ${
                        filterStatus === status
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Results Summary */}
      <div className="mb-4">
        <p className="text-sm text-gray-600">
          Showing {filteredAgents.length} of {agents.length} agents
          {searchQuery && ` matching "${searchQuery}"`}
          {filterStatus !== 'all' && ` with status "${filterStatus}"`}
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      {/* Agents Grid/List */}
      {filteredAgents.length === 0 ? (
        <div className="text-center py-12">
          <CpuChipIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Agents Found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterStatus !== 'all' 
              ? 'Try adjusting your search or filters.'
              : 'Create your first agent to get started.'
            }
          </p>
          {!searchQuery && filterStatus === 'all' && (
            <button
              onClick={handleCreateAgent}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Create First Agent
            </button>
          )}
        </div>
      ) : (
        <div className={viewMode === 'grid' 
          ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
          : 'space-y-4'
        }>
          <AnimatePresence>
            {filteredAgents.map((agent, index) => (
              <motion.div
                key={agent.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                {viewMode === 'grid' ? (
                  <AgentCard agent={agent} onOpenHomeBoard={handleOpenHomeBoard} />
                ) : (
                  <AgentListItem agent={agent} onOpenHomeBoard={handleOpenHomeBoard} />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// Agent Card Component (Grid View)
interface AgentCardProps {
  agent: Agent;
  onOpenHomeBoard: (agentId: string) => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, onOpenHomeBoard }) => {
  const statusInfo = getStatusInfo(agent.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <CpuChipIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">{agent.name}</h3>
              <div className="flex items-center space-x-2 mt-1">
                <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {agent.status}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getVisibilityColor(agent.visibility)}`}>
                  {agent.visibility}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Purpose */}
        <p className="text-gray-600 text-sm mb-4 line-clamp-2">
          {agent.purpose}
        </p>

        {/* Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Model:</span>
            <span className="text-gray-900">{agent.model}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Provider:</span>
            <span className="text-gray-900">{agent.model_provider}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Class:</span>
            <span className="text-gray-900">{agent.agent_class}</span>
          </div>
        </div>

        {/* Tools */}
        {agent.tools.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2">Tools:</p>
            <div className="flex flex-wrap gap-1">
              {agent.tools.slice(0, 3).map((tool) => (
                <span key={tool} className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {tool.replace('_', ' ')}
                </span>
              ))}
              {agent.tools.length > 3 && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  +{agent.tools.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onOpenHomeBoard(agent.id)}
            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            <span>Open Home Board</span>
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <PencilIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 rounded-b-lg">
        <p className="text-xs text-gray-500">
          Updated {new Date(agent.updated_at).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
};

// Agent List Item Component (List View)
const AgentListItem: React.FC<AgentCardProps> = ({ agent, onOpenHomeBoard }) => {
  const statusInfo = getStatusInfo(agent.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <CpuChipIcon className="w-6 h-6 text-blue-600" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-medium text-gray-900 truncate">{agent.name}</h3>
                <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${statusInfo.color}`}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {agent.status}
                </span>
                <span className={`px-2 py-1 text-xs rounded-full ${getVisibilityColor(agent.visibility)}`}>
                  {agent.visibility}
                </span>
              </div>
              <p className="text-gray-600 text-sm mt-1 truncate">{agent.purpose}</p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                <span>{agent.model} ({agent.model_provider})</span>
                <span>•</span>
                <span>{agent.agent_class}</span>
                <span>•</span>
                <span>{agent.tools.length} tools</span>
                <span>•</span>
                <span>Updated {new Date(agent.updated_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => onOpenHomeBoard(agent.id)}
              className="flex items-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <HomeIcon className="w-4 h-4" />
              <span>Home Board</span>
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <EyeIcon className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
              <PencilIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper functions (moved outside component to avoid recreation)
const getStatusInfo = (status: Agent['status']) => {
  switch (status) {
    case 'ready':
      return { icon: CheckCircleIcon, color: 'text-green-600 bg-green-50' };
    case 'training':
      return { icon: ClockIcon, color: 'text-orange-600 bg-orange-50' };
    case 'error':
      return { icon: ExclamationTriangleIcon, color: 'text-red-600 bg-red-50' };
    case 'inactive':
      return { icon: ClockIcon, color: 'text-gray-600 bg-gray-50' };
    default:
      return { icon: ClockIcon, color: 'text-gray-600 bg-gray-50' };
  }
};

const getVisibilityColor = (visibility: Agent['visibility']) => {
  switch (visibility) {
    case 'public':
      return 'text-blue-600 bg-blue-50';
    case 'shared':
      return 'text-purple-600 bg-purple-50';
    case 'private':
      return 'text-gray-600 bg-gray-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};

export default AgentRegistry;
