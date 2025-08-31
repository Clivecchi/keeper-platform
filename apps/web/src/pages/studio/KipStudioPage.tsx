import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { KipApi, TypeAgent, KipAgent } from '../../lib/kipApi';
import { KipCommandIntent, KipThought } from '../../types/kip';

const KipStudioPage: React.FC = () => {
  const [agents, setAgents] = useState<KipAgent[]>([]);
  const [intentResult, setIntentResult] = useState<KipCommandIntent | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testInput] = useState("I've been thinking a lot about how to better organize my thoughts and ideas. Maybe I should start keeping a daily journal.");

  // Load agents from database
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

  // Mock Kip thoughts (will be database-backed in future)
  const kipThoughts: KipThought[] = [
    {
      id: '1',
      timestamp: new Date(),
      content: 'Analyzing user patterns in thought capture. Recommending enhanced categorization.',
      priority: 'medium'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 300000),
      content: `${agents.length} agents loaded and ready for processing. System operational.`,
      priority: 'low'
    }
  ];

  const handleSimulateExtraction = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await TypeAgent.extract(testInput);
      setIntentResult(result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Extraction failed';
      setError(errorMessage);
      console.error('Extraction failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRunAgent = async (agentId: string) => {
    setIsProcessing(true);
    setError(null);
    try {
      const result = await KipApi.runAgent(agentId, testInput);
      if (result.success) {
        setIntentResult((result.data ?? null) as KipCommandIntent | null);
      } else {
        setError('Agent execution failed');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Agent execution failed';
      setError(errorMessage);
      console.error('Agent execution failed:', error);
    } finally {
      setIsProcessing(false);
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

  const getPriorityColor = (priority: KipThought['priority']) => {
    switch (priority) {
      case 'high': return 'border-l-red-500';
      case 'medium': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
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
              Kip Studio
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              Welcome to Kip—the Keeper Interface Protocol. Orchestrate your platform. Capture what matters.
            </p>
          </div>
          <div className="flex space-x-3">
            <Link
              to="/studio/admin"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
            >
              Admin
            </Link>
            <Link
              to="/studio/kip/agents"
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md transition-colors"
            >
              Manage Agents
            </Link>
            <Link
              to="/studio/kip/logs"
              className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md transition-colors"
            >
              View Logs
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Kip Thoughts Section */}
        <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Kip Thoughts</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Current focus and system insights from Kip's processing
          </p>
          <div className="space-y-3">
            {kipThoughts.map((thought) => (
              <div
                key={thought.id}
                className={`p-3 border-l-4 bg-muted/50 rounded-r-md ${getPriorityColor(thought.priority)}`}
              >
                <p className="text-sm text-foreground">{thought.content}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {thought.timestamp.toLocaleTimeString()}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Agent List Section */}
        <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold mb-4">Agent Registry</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Database-backed agents in the Kip ecosystem
          </p>
          
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
            <div className="space-y-3">
              {agents.map((agent) => (
                <div key={agent.id} className="border border-border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-foreground">{agent.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(agent.status)}`}>
                        {agent.status}
                      </span>
                      <button
                        onClick={() => handleRunAgent(agent.id)}
                        disabled={isProcessing || agent.status !== 'ready'}
                        className="px-2 py-1 text-xs bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded"
                      >
                        Run
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{agent.purpose}</p>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Provider: {agent.model_provider}</span>
                    <span>Tools: {agent.tools.length}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Model: {agent.model}</span>
                    <span>Temp: {agent.model_settings?.temperature ?? 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-3 mt-2 text-xs">
                    {agent.memory_enabled && (
                      <span className="text-blue-600">🧠 Memory</span>
                    )}
                    {agent.model_settings?.retry && agent.model_settings.retry.max_retries > 0 && (
                      <span className="text-green-600">🔄 Retry</span>
                    )}
                  </div>
                </div>
              ))}
              {agents.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No agents found. Please check your database connection.
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {/* Intent Console Section */}
      <section className="mt-8 bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Intent Console</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Test agent extraction and view structured intent results
        </p>
        
        {/* Test Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-foreground mb-2">
            Test Input:
          </label>
          <div className="p-3 bg-muted rounded-md border">
            <p className="text-sm text-foreground">{testInput}</p>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSimulateExtraction}
          disabled={isProcessing || isLoadingAgents}
          className="mb-4 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground px-4 py-2 rounded-md transition-colors"
        >
          {isProcessing ? 'Processing...' : 'Run TypeAgent.extract()'}
        </button>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {intentResult && (
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              KipCommandIntent Result:
            </label>
            <pre className="bg-muted p-4 rounded-md border overflow-x-auto text-sm">
              {JSON.stringify(intentResult, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* Lead Agent Runtime Links */}
      <section className="mt-8 bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Lead Agent Experiences</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Try out standalone AI agent interfaces powered by the KIP system. These are full-page chat experiences accessible via direct URLs.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/kip"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg transition-colors group"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">🤖</span>
              <div>
                <h3 className="font-semibold group-hover:underline">Kip Assistant</h3>
                <p className="text-sm opacity-75">Thought processing & idea organization</p>
                <p className="text-xs text-blue-600 mt-1">/kip</p>
              </div>
            </div>
          </a>
          
          <a
            href="/ceox"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 bg-red-50 hover:bg-red-100 text-red-900 border border-red-200 rounded-lg transition-colors group"
          >
            <div className="flex items-center">
              <span className="text-2xl mr-3">👔</span>
              <div>
                <h3 className="font-semibold group-hover:underline">CeoX Executive</h3>
                <p className="text-sm opacity-75">Strategic analysis & business intelligence</p>
                <p className="text-xs text-red-600 mt-1">/ceox</p>
              </div>
            </div>
          </a>
        </div>
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Note:</strong> These Lead agents open in new tabs and provide ChatGPT-style interfaces for direct user interaction.
          </p>
        </div>
      </section>
    </motion.div>
  );
};

export default KipStudioPage; 