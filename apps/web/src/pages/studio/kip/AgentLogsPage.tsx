import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { KipApi, KipAgent } from '../../../lib/kipApi';

interface AgentLog {
  id: string;
  agent_id: string;
  user_id?: string | null;
  input: string;
  output?: string | null;
  error?: string | null;
  model?: string | null;
  execution_time_ms?: number | null;
  created_at: string;
  agent?: {
    id: string;
    name: string;
    slug: string;
    model: string;
  };
  user?: {
    id: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

interface LogsResponse {
  logs: AgentLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const AgentLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [agents, setAgents] = useState<KipAgent[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    loadAgents();
    loadLogs();
  }, []);

  useEffect(() => {
    loadLogs();
  }, [selectedAgentId, currentPage]);

  const loadAgents = async () => {
    try {
      setIsLoadingAgents(true);
      const fetchedAgents = await KipApi.getAllAgents();
      setAgents(fetchedAgents);
    } catch (err) {
      console.error('Error loading agents:', err);
    } finally {
      setIsLoadingAgents(false);
    }
  };

  const loadLogs = async () => {
    try {
      setIsLoadingLogs(true);
      setError(null);
      const logsResponse: LogsResponse = await KipApi.getAgentLogs({
        page: currentPage,
        pageSize: 20,
        agentId: selectedAgentId || undefined
      });
      setLogs(logsResponse.logs);
      setTotalPages(logsResponse.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
      console.error('Error loading logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getStatusColor = (log: AgentLog) => {
    if (log.error) return 'bg-red-50 border-red-200';
    return 'bg-green-50 border-green-200';
  };

  const getStatusIcon = (log: AgentLog) => {
    if (log.error) return '❌';
    return '✅';
  };

  return (
    <motion.div
      className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <header className="mb-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-foreground">
              Agent Execution Logs
            </h1>
            <p className="mt-2 text-lg text-muted-foreground">
              View and analyze KIP agent execution history with detailed logs.
            </p>
          </div>
          <Link
            to="/studio/kip"
            className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-md transition-colors"
          >
            ← Back to Studio
          </Link>
        </div>
      </header>

      {/* Filters Section */}
      <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Filters</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-foreground mb-2">
              Filter by Agent:
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => {
                setSelectedAgentId(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-border rounded-md bg-background text-foreground"
              disabled={isLoadingAgents}
            >
              <option value="">All Agents</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name} ({agent.slug})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={loadLogs}
              disabled={isLoadingLogs}
              className="px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-primary-foreground rounded-md transition-colors"
            >
              {isLoadingLogs ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>
      </section>

      {/* Logs Section */}
      <section className="bg-card text-card-foreground border border-border rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Execution Logs</h2>
          <div className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </div>
        </div>

        {isLoadingLogs ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2 text-sm text-muted-foreground">Loading logs...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">Error loading logs: {error}</p>
            <button 
              onClick={loadLogs}
              className="mt-2 text-sm text-red-700 hover:text-red-900 underline"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {logs.map((log) => (
                <div key={log.id} className={`border rounded-lg p-4 ${getStatusColor(log)}`}>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="text-lg">{getStatusIcon(log)}</span>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {log.agent?.name || 'Unknown Agent'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {formatTimestamp(log.created_at)}
                          {log.execution_time_ms && (
                            <span className="ml-2">• {log.execution_time_ms}ms</span>
                          )}
                          {log.model && (
                            <span className="ml-2">• {log.model}</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                      className="text-xs px-2 py-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded"
                    >
                      {expandedLog === log.id ? 'Collapse' : 'Expand'}
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium text-foreground">Input:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {expandedLog === log.id ? log.input : truncateText(log.input)}
                      </p>
                    </div>

                    {expandedLog === log.id && (
                      <>
                        {log.output && (
                          <div>
                            <span className="text-sm font-medium text-foreground">Output:</span>
                            <pre className="text-sm text-muted-foreground mt-1 bg-muted p-2 rounded overflow-x-auto">
                              {JSON.stringify(JSON.parse(log.output), null, 2)}
                            </pre>
                          </div>
                        )}

                        {log.error && (
                          <div>
                            <span className="text-sm font-medium text-red-600">Error:</span>
                            <p className="text-sm text-red-600 mt-1">{log.error}</p>
                          </div>
                        )}

                        {log.user && (
                          <div>
                            <span className="text-sm font-medium text-foreground">User:</span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {log.user.name || log.user.email || log.user.id}
                            </p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}

              {logs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No logs found. Execute some agents to see logs here.
                </div>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center space-x-4 mt-6">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-secondary-foreground rounded transition-colors"
                >
                  Previous
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm bg-secondary hover:bg-secondary/90 disabled:bg-secondary/50 text-secondary-foreground rounded transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </motion.div>
  );
};

export default AgentLogsPage; 