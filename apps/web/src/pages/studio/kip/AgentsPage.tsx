import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { KipApi, KipAgent, AgentClass } from '../../../lib/kipApi';
import AgentBuilderForm from './AgentBuilderForm';

const AgentsPage: React.FC = () => {
  const [agents, setAgents] = useState<KipAgent[]>([]);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [isRunningAgent, setIsRunningAgent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingAgent, setEditingAgent] = useState<KipAgent | null>(null);
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
  };

  const handleAgentUpdated = (updatedAgent: KipAgent) => {
    setAgents(prev => prev.map(agent => 
      agent.id === updatedAgent.id ? updatedAgent : agent
    ));
    setEditingAgent(null);
  };

  const handleEditAgent = (agent: KipAgent) => {
    setEditingAgent(agent);
    setTimeout(() => {
      const formSection = document.querySelector('[data-testid="agent-form-section"]');
      if (formSection) {
        formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleCancelEdit = () => {
    setEditingAgent(null);
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

  return (
    <motion.div
      className="max-w-6xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Kip Agents
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Create and manage Kip agents.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/studio/kip/logs"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              View Logs
            </Link>
            <Link
              to="/studio/kip"
              className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md transition-colors"
            >
              ← Back to Studio
            </Link>
          </div>
        </div>
      </header>

      <div className="space-y-8">
        {/* Agent Builder Form Section */}
        <section 
          data-testid="agent-form-section"
          className={`bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 transition-all duration-300 ${
            editingAgent ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">
              {editingAgent ? 'Edit Agent' : 'Create New Agent'}
            </h2>
            {editingAgent && (
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md transition-colors"
              >
                Cancel Edit
              </button>
            )}
          </div>
          <AgentBuilderForm 
            onAgentCreated={handleAgentCreated} 
            onAgentUpdated={handleAgentUpdated}
            existingAgent={editingAgent}
            mode={editingAgent ? 'edit' : 'create'}
          />
        </section>

        {/* Agent List View Section */}
        <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Agent Registry</h2>
            <button
              onClick={loadAgents}
              disabled={isLoadingAgents}
              className="text-sm text-primary hover:text-primary/80 underline disabled:opacity-50"
            >
              {isLoadingAgents ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {isLoadingAgents ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2 text-sm text-muted-foreground">Loading agents...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">Error loading agents: {error}</p>
              <button 
                onClick={loadAgents}
                className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {agents.map((agent) => (
                <div key={agent.id} className="border border-border rounded-lg p-4 space-y-3">
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
                    <div className="flex justify-between">
                      <span>Temp:</span>
                      <span className="font-medium">{agent.model_settings?.temperature ?? 'N/A'}</span>
                    </div>
                    {agent.model_settings?.retry && (
                      <div className="flex justify-between">
                        <span>Retry:</span>
                        <span className="font-medium">
                          {agent.model_settings.retry.max_retries > 0 ? '🔄' : '❌'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Coordinator Bundle Information */}
                  {agent.agent_class === 'Coordinator' && (
                    <div className="space-y-2">
                      <div className="text-xs font-medium text-foreground">Agent Bundle:</div>
                      {agent.config?.bundle && agent.config.bundle.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {agent.config.bundle.map((slug: string) => (
                            <span key={slug} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded border border-purple-200">
                              {slug}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No agents bundled</span>
                      )}
                    </div>
                  )}

                  <div className="flex space-x-2 pt-2">
                    <button
                      onClick={() => handleRunAgent(agent.id)}
                      disabled={isRunningAgent === agent.id || agent.status !== 'ready'}
                      className="flex-1 px-3 py-2 text-xs bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded transition-colors"
                    >
                      {isRunningAgent === agent.id ? 'Running...' : 'Run'}
                    </button>
                    <button
                      onClick={() => handleEditAgent(agent)}
                      disabled={!!editingAgent}
                      className={`flex-1 px-3 py-2 text-xs rounded transition-colors ${
                        editingAgent?.id === agent.id 
                          ? 'bg-blue-600 text-white font-medium' 
                          : 'bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-secondary-foreground'
                      }`}
                    >
                      {editingAgent?.id === agent.id ? '✏️ Editing...' : 'Edit'}
                    </button>
                    <button
                      onClick={() => handleDeleteAgent(agent)}
                      disabled={isDeleting}
                      className="px-3 py-2 text-xs bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
              
              {agents.length === 0 && (
                <div className="col-span-full text-center py-8 text-muted-foreground">
                  No agents found. Create your first agent using the form above.
                </div>
              )}
            </div>
          )}
        </section>

        {/* Delete Confirmation Dialog */}
        {deletingAgent && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-card text-card-foreground border border-border rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Delete Agent</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Are you sure you want to delete <strong>{deletingAgent.name}</strong>? 
                This action cannot be undone and will permanently remove the agent and all its data.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={cancelDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-secondary-foreground rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-md transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Delete Agent'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default AgentsPage; 