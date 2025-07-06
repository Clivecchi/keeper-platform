import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { KipApi, KipAgent, AgentClass } from '../../../lib/kipApi';
import AgentBuilderForm from './AgentBuilderForm';
import AgentKeeperTypeAssignment from '../../../components/studio/AgentKeeperTypeAssignment';
import {
  UserGroupIcon,
  CogIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  PlayIcon,
  ArrowPathIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

type TabType = 'registry' | 'agent' | 'keeper-types';

const AgentsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('registry');
  const [agents, setAgents] = useState<KipAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isRunningAgent, setIsRunningAgent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<KipAgent | null>(null);
  const [deletingAgent, setDeletingAgent] = useState<KipAgent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setIsLoadingAgents(true);
      setError(null);
      const fetchedAgents = await KipApi.getAllAgents();
      setAgents(fetchedAgents);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load agents');
      console.error('Error loading agents:', err);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const handleAgentCreated = (newAgent: KipAgent) => {
    setAgents(prev => [...prev, newAgent]);
    setActiveTab('registry'); // Switch back to registry after creation
  };

  const handleAgentUpdated = (updatedAgent: KipAgent) => {
    setAgents(prev => prev.map(agent => 
      agent.id === updatedAgent.id ? updatedAgent : agent
    ));
    setSelectedAgent(updatedAgent);
    setActiveTab('registry'); // Switch back to registry after update
  };

  const handleSelectAgent = (agent: KipAgent) => {
    setSelectedAgent(agent);
    setActiveTab('agent');
  };

  const handleCreateNewAgent = () => {
    setSelectedAgent(null);
    setActiveTab('agent');
  };

  const handleCancelEdit = () => {
    setSelectedAgent(null);
    setActiveTab('registry');
  };

  const handleDeleteAgent = async (agent: KipAgent) => {
    setDeletingAgent(agent);
  };

  const confirmDelete = async () => {
    if (!deletingAgent) return;
    
    setIsDeleting(true);
    try {
      await KipApi.deleteAgent(deletingAgent.id);
      setAgents(prev => prev.filter(agent => agent.id !== deletingAgent.id));
      setDeletingAgent(null);
      // If we're deleting the currently selected agent, clear selection
      if (selectedAgent?.id === deletingAgent.id) {
        setSelectedAgent(null);
        setActiveTab('registry');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete agent');
      console.error('Error deleting agent:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDelete = () => {
    setDeletingAgent(null);
  };

  const handleRunAgent = async (agentId: string) => {
    setIsRunningAgent(agentId);
    try {
      const testInput = "Test agent execution from Agent Builder";
      const result = await KipApi.runAgent(agentId, testInput);
      
      if (result.success) {
        alert(`Agent executed successfully in ${result.processing_time_ms}ms`);
      } else {
        alert('Agent execution failed');
      }
    } catch (error) {
      console.error('Agent execution failed:', error);
      alert('Agent execution failed');
    } finally {
      setIsRunningAgent(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'in-progress': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getAgentClassColor = (agentClass: AgentClass) => {
    switch (agentClass) {
      case 'Standard': return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'Coordinator': return 'text-purple-600 bg-purple-100 border-purple-200';
      case 'Lead': return 'text-green-600 bg-green-100 border-green-200';
      case 'Persona': return 'text-pink-600 bg-pink-100 border-pink-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const renderTabButton = (tab: TabType, icon: React.ReactNode, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center gap-2 px-4 py-2 font-medium text-sm rounded-lg transition-colors ${
        activeTab === tab
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  const renderRegistryTab = () => (
    <div className="space-y-6">
      {/* Registry Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">Agent Registry</h2>
          <p className="text-muted-foreground mt-1">Select an agent to view and edit, or create a new one</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadAgents}
            disabled={isLoadingAgents}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
          >
            <ArrowPathIcon className="w-4 h-4" />
            {isLoadingAgents ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleCreateNewAgent}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create New Agent
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">Error loading agents: {error}</p>
          <button 
            onClick={loadAgents}
            className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoadingAgents ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">Loading agents...</span>
        </div>
      ) : (
        /* Agent Grid */
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {agents.map((agent) => (
            <motion.div
              key={agent.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleSelectAgent(agent)}
            >
              <div className="flex justify-between items-start">
                <div className="flex flex-col space-y-1">
                  <h3 className="font-semibold text-foreground">{agent.name}</h3>
                  <span className={`self-start px-2 py-1 rounded-full text-xs font-medium border ${getAgentClassColor(agent.agent_class)}`}>
                    {agent.agent_class}
                  </span>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                  {agent.status}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {agent.purpose}
              </p>
              
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Context:</span>
                  <span className="font-medium">{agent.context_scope || 'General'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Memory:</span>
                  <span>{agent.memory_enabled ? '✅' : '❌'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tools:</span>
                  <span className="font-medium">{agent.tools.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Provider:</span>
                  <span className="font-medium capitalize">{agent.model_provider}</span>
                </div>
                <div className="flex justify-between">
                  <span>Model:</span>
                  <span className="font-medium text-xs truncate">{agent.model}</span>
                </div>
              </div>

              {/* Coordinator Bundle Information */}
              {agent.agent_class === 'Coordinator' && agent.config?.bundle && agent.config.bundle.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-foreground">Agent Bundle:</div>
                  <div className="flex flex-wrap gap-1">
                    {agent.config.bundle.map((slug: string) => (
                      <span key={slug} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200">
                        {slug}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex space-x-2 pt-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleRunAgent(agent.id)}
                  disabled={isRunningAgent === agent.id || agent.status !== 'ready'}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded transition-colors"
                >
                  <PlayIcon className="w-3 h-3" />
                  {isRunningAgent === agent.id ? 'Running...' : 'Run'}
                </button>
                <button
                  onClick={() => handleSelectAgent(agent)}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded transition-colors"
                >
                  <PencilIcon className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteAgent(agent);
                  }}
                  disabled={isDeleting}
                  className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded transition-colors"
                >
                  <TrashIcon className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
          
          {agents.length === 0 && !isLoadingAgents && (
            <div className="col-span-full text-center py-12">
              <UserGroupIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No agents found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first agent to get started with the AI platform.
              </p>
              <button
                onClick={handleCreateNewAgent}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                Create New Agent
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderAgentTab = () => (
    <div className="space-y-6">
      {/* Agent Form Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {selectedAgent ? 'Edit Agent' : 'Create New Agent'}
          </h2>
          <p className="text-muted-foreground mt-1">
            {selectedAgent 
              ? `Configure settings for ${selectedAgent.name}` 
              : 'Configure model, visibility, and sharing settings for your new agent'
            }
          </p>
        </div>
        <button
          onClick={handleCancelEdit}
          className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
        >
          ← Back to Registry
        </button>
      </div>

      {/* Agent Form */}
      <div className="bg-card border border-border rounded-lg p-6">
        <AgentBuilderForm 
          onAgentCreated={handleAgentCreated} 
          onAgentUpdated={handleAgentUpdated}
          existingAgent={selectedAgent}
          mode={selectedAgent ? 'edit' : 'create'}
        />
      </div>
    </div>
  );

  const renderKeeperTypesTab = () => {
    if (!selectedAgent) {
      return (
        <div className="text-center py-16">
          <SparklesIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No Agent Selected
          </h3>
          <p className="text-muted-foreground">
            Please select an agent from the registry to manage keeper type assignments.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-foreground">
              Keeper Type Assignments
            </h2>
            <p className="text-muted-foreground mt-1">
              Manage which keeper types {selectedAgent.name} can work with
            </p>
          </div>
          <button
            onClick={() => setActiveTab('agent')}
            className="px-4 py-2 text-sm text-muted-foreground border border-border rounded-lg hover:bg-muted/50 transition-colors"
          >
            ← Back to Agent Details
          </button>
        </div>

        {/* Assignment Component */}
        <div className="bg-card border border-border rounded-lg p-6">
          <AgentKeeperTypeAssignment 
            agent={selectedAgent}
            onAssignmentsUpdated={(assignments) => {
              // Handle assignments update if needed
              console.log('Assignments updated:', assignments);
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Manage Agents
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Create and manage AI agents for the Keeper platform.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/studio/kip/logs"
              className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg transition-colors"
            >
              View Logs
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-border">
        <div className="flex items-center gap-1 pb-3">
          {renderTabButton('registry', <UserGroupIcon className="w-4 h-4" />, 'Registry')}
          {renderTabButton('agent', <CogIcon className="w-4 h-4" />, 'Agent')}
          {selectedAgent && renderTabButton('keeper-types', <SparklesIcon className="w-4 h-4" />, 'Keeper Types')}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === 'registry' && renderRegistryTab()}
        {activeTab === 'agent' && renderAgentTab()}
        {activeTab === 'keeper-types' && renderKeeperTypesTab()}
      </div>

      {/* Delete Confirmation Dialog */}
      {deletingAgent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4"
          >
            <h3 className="text-lg font-semibold mb-4 text-foreground">Delete Agent</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{deletingAgent.name}</strong>? 
              This action cannot be undone and will permanently remove the agent and all its data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-secondary-foreground rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete Agent'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default AgentsPage; 