/**
 * Draft Frame
 * ===========
 * 
 * Frame component for managing agent drafts in Agent Home Boards.
 * Supports editing, proposing, committing drafts with tabs for Form, JSON, Diff, and History.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DocumentTextIcon,
  CodeBracketIcon,
  ArrowsRightLeftIcon,
  ClockIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  BookmarkIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { AgentDraft, AgentDraftHistory, UpdateAgentDraftRequest } from '../../types/keeper';
import { useFrame } from '../../context/FrameContext';

interface DraftFrameProps extends BaseFrameProps {
  agentId?: string;
  tabs?: ('Form' | 'JSON' | 'Diff' | 'History')[];
  allowEdit?: boolean;
  allowPropose?: boolean;
  allowCommit?: boolean;
}

const DraftFrame: React.FC<DraftFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
  agentId,
  tabs = ['Form', 'JSON', 'Diff', 'History'],
  allowEdit = true,
  allowPropose = true,
  allowCommit = true,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [activeTab, setActiveTab] = useState<string>(tabs[0] || 'Form');
  const [draft, setDraft] = useState<AgentDraft | null>(null);
  const [history, setHistory] = useState<AgentDraftHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    model: '',
    provider: '',
    tools: [] as string[],
    permissions: [] as string[],
    customConfig: {} as Record<string, unknown>
  });

  // JSON editor state
  const [jsonContent, setJsonContent] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Load draft from API
  useEffect(() => {
    if (!agentId) return;

    const loadDraft = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load current draft
        const draftResponse = await fetch(`/api/agents/${agentId}/draft`, {
          credentials: 'include'
        });

        if (draftResponse.ok) {
          const draftData = await draftResponse.json();
          const loadedDraft: AgentDraft = draftData.data;
          setDraft(loadedDraft);

          // Initialize form data from draft
          if (loadedDraft.payload) {
            setFormData({
              title: loadedDraft.title || '',
              description: loadedDraft.payload.description as string || '',
              model: loadedDraft.payload.model as string || '',
              provider: loadedDraft.payload.provider as string || '',
              tools: loadedDraft.payload.tools as string[] || [],
              permissions: loadedDraft.payload.permissions as string[] || [],
              customConfig: loadedDraft.payload.customConfig as Record<string, unknown> || {}
            });
            setJsonContent(JSON.stringify(loadedDraft.payload, null, 2));
          }
        } else {
          // No draft exists yet, initialize empty
          setDraft({
            status: 'editing',
            title: '',
            payload: {}
          });
        }

        // Load draft history
        const historyResponse = await fetch(`/api/agents/${agentId}/draft/history`, {
          credentials: 'include'
        });

        if (historyResponse.ok) {
          const historyData = await historyResponse.json();
          setHistory(historyData.data || []);
        }
      } catch (err) {
        console.error('Error loading draft:', err);
        setError(err instanceof Error ? err.message : 'Failed to load draft');
        
        // Mock data for development
        setDraft({
          status: 'editing',
          title: 'Agent Configuration Draft',
          payload: {
            model: 'gpt-4',
            provider: 'openai',
            tools: ['web_search', 'code_interpreter'],
            permissions: ['read', 'write']
          },
          updatedAt: new Date().toISOString()
        });
        
        setFormData({
          title: 'Agent Configuration Draft',
          description: 'Updated agent configuration with new model and tools',
          model: 'gpt-4',
          provider: 'openai',
          tools: ['web_search', 'code_interpreter'],
          permissions: ['read', 'write'],
          customConfig: {}
        });
        
        setJsonContent(JSON.stringify({
          model: 'gpt-4',
          provider: 'openai',
          tools: ['web_search', 'code_interpreter'],
          permissions: ['read', 'write']
        }, null, 2));
      } finally {
        setIsLoading(false);
      }
    };

    loadDraft();
  }, [agentId]);

  // Handle form changes
  const handleFormChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  // Handle JSON changes
  const handleJsonChange = (value: string) => {
    setJsonContent(value);
    setJsonError(null);
    setHasUnsavedChanges(true);
    
    try {
      JSON.parse(value);
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON');
    }
  };

  // Save draft
  const handleSave = async () => {
    if (!agentId || !draft) return;

    try {
      setIsSaving(true);
      setError(null);

      let payload: Record<string, unknown>;

      if (activeTab === 'JSON') {
        if (jsonError) {
          setError('Cannot save: JSON has errors');
          return;
        }
        payload = JSON.parse(jsonContent);
      } else {
        payload = {
          description: formData.description,
          model: formData.model,
          provider: formData.provider,
          tools: formData.tools,
          permissions: formData.permissions,
          customConfig: formData.customConfig
        };
      }

      const request: UpdateAgentDraftRequest = {
        status: 'editing',
        title: formData.title,
        payload
      };

      const response = await fetch(`/api/agents/${agentId}/draft`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      const data = await response.json();
      const updatedDraft: AgentDraft = data.data;
      setDraft(updatedDraft);
      setHasUnsavedChanges(false);

      handleFrameInteraction({
        type: 'submit',
        frameId: frameInstance.id,
        data: { action: 'save_draft', agentId },
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Error saving draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Propose draft
  const handlePropose = async () => {
    if (!agentId || !draft) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/agents/${agentId}/draft/propose`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to propose draft');
      }

      const data = await response.json();
      const updatedDraft: AgentDraft = data.data;
      setDraft(updatedDraft);

      handleFrameInteraction({
        type: 'submit',
        frameId: frameInstance.id,
        data: { action: 'propose_draft', agentId },
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Error proposing draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to propose draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Commit draft
  const handleCommit = async () => {
    if (!agentId || !draft) return;

    try {
      setIsSaving(true);
      setError(null);

      const response = await fetch(`/api/agents/${agentId}/draft/commit`, {
        method: 'POST',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to commit draft');
      }

      const data = await response.json();
      const updatedDraft: AgentDraft = data.data;
      setDraft(updatedDraft);

      // Reload history
      const historyResponse = await fetch(`/api/agents/${agentId}/draft/history`, {
        credentials: 'include'
      });

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        setHistory(historyData.data || []);
      }

      handleFrameInteraction({
        type: 'submit',
        frameId: frameInstance.id,
        data: { action: 'commit_draft', agentId },
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Error committing draft:', err);
      setError(err instanceof Error ? err.message : 'Failed to commit draft');
    } finally {
      setIsSaving(false);
    }
  };

  // Get status color
  const getStatusColor = (status: AgentDraft['status']) => {
    switch (status) {
      case 'editing': return 'text-blue-600 bg-blue-50';
      case 'proposed': return 'text-orange-600 bg-orange-50';
      case 'committed': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center text-gray-600 mt-4">Loading draft...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <DocumentTextIcon className="w-5 h-5 text-gray-500" />
            <div>
              <h3 className="text-lg font-medium text-gray-900">Agent Draft</h3>
              {draft && (
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(draft.status)}`}>
                    {draft.status}
                  </span>
                  {hasUnsavedChanges && (
                    <span className="text-xs text-orange-600">Unsaved changes</span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {draft && !isPreview && (
            <div className="flex items-center space-x-2">
              {allowEdit && draft.status === 'editing' && (
                <button
                  onClick={handleSave}
                  disabled={isSaving || (activeTab === 'JSON' && jsonError !== null)}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <BookmarkIcon className="w-4 h-4" />
                  <span>Save</span>
                </button>
              )}

              {allowPropose && draft.status === 'editing' && (
                <button
                  onClick={handlePropose}
                  disabled={isSaving || hasUnsavedChanges}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ArrowUpIcon className="w-4 h-4" />
                  <span>Propose</span>
                </button>
              )}

              {allowCommit && draft.status === 'proposed' && (
                <button
                  onClick={handleCommit}
                  disabled={isSaving}
                  className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Commit</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex space-x-0">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-blue-600'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                {tab === 'Form' && <PencilIcon className="w-4 h-4" />}
                {tab === 'JSON' && <CodeBracketIcon className="w-4 h-4" />}
                {tab === 'Diff' && <ArrowsRightLeftIcon className="w-4 h-4" />}
                {tab === 'History' && <ClockIcon className="w-4 h-4" />}
                <span>{tab}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'Form' && (
              <FormTab
                formData={formData}
                onChange={handleFormChange}
                disabled={!allowEdit || draft?.status !== 'editing' || isPreview}
              />
            )}

            {activeTab === 'JSON' && (
              <JsonTab
                content={jsonContent}
                error={jsonError}
                onChange={handleJsonChange}
                disabled={!allowEdit || draft?.status !== 'editing' || isPreview}
              />
            )}

            {activeTab === 'Diff' && (
              <DiffTab
                currentDraft={draft}
                history={history}
              />
            )}

            {activeTab === 'History' && (
              <HistoryTab
                history={history}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

// Form Tab Component
interface FormTabProps {
  formData: any;
  onChange: (field: string, value: any) => void;
  disabled: boolean;
}

const FormTab: React.FC<FormTabProps> = ({ formData, onChange, disabled }) => {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Draft Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => onChange('title', e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          disabled={disabled}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Model
          </label>
          <select
            value={formData.model}
            onChange={(e) => onChange('model', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            <option value="">Select model...</option>
            <option value="gpt-4">GPT-4</option>
            <option value="gpt-4-turbo">GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
            <option value="claude-3-opus">Claude 3 Opus</option>
            <option value="claude-3-sonnet">Claude 3 Sonnet</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Provider
          </label>
          <select
            value={formData.provider}
            onChange={(e) => onChange('provider', e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:cursor-not-allowed"
          >
            <option value="">Select provider...</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
            <option value="google">Google</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tools
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['web_search', 'code_interpreter', 'file_upload', 'image_generation'].map((tool) => (
            <label key={tool} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.tools.includes(tool)}
                onChange={(e) => {
                  const newTools = e.target.checked
                    ? [...formData.tools, tool]
                    : formData.tools.filter((t: string) => t !== tool);
                  onChange('tools', newTools);
                }}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-700 capitalize">{tool.replace('_', ' ')}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Permissions
        </label>
        <div className="grid grid-cols-2 gap-2">
          {['read', 'write', 'execute', 'admin'].map((permission) => (
            <label key={permission} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.permissions.includes(permission)}
                onChange={(e) => {
                  const newPermissions = e.target.checked
                    ? [...formData.permissions, permission]
                    : formData.permissions.filter((p: string) => p !== permission);
                  onChange('permissions', newPermissions);
                }}
                disabled={disabled}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
              />
              <span className="text-sm text-gray-700 capitalize">{permission}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

// JSON Tab Component
interface JsonTabProps {
  content: string;
  error: string | null;
  onChange: (value: string) => void;
  disabled: boolean;
}

const JsonTab: React.FC<JsonTabProps> = ({ content, error, onChange, disabled }) => {
  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-600">{error}</span>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Draft Configuration (JSON)
        </label>
        <textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          rows={16}
          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm disabled:bg-gray-50 disabled:cursor-not-allowed ${
            error ? 'border-red-300' : 'border-gray-300'
          }`}
          placeholder="Enter JSON configuration..."
        />
      </div>
    </div>
  );
};

// Diff Tab Component
interface DiffTabProps {
  currentDraft: AgentDraft | null;
  history: AgentDraftHistory[];
}

const DiffTab: React.FC<DiffTabProps> = ({ currentDraft, history }) => {
  const lastCommitted = history.find(h => h.status === 'committed');

  if (!currentDraft || !lastCommitted) {
    return (
      <div className="text-center py-8">
        <ArrowsRightLeftIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Comparison Available</h3>
        <p className="text-gray-600">
          {!lastCommitted 
            ? 'No previous committed version to compare against.'
            : 'Current draft has no changes to compare.'
          }
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900">
          Comparing: Current Draft vs Last Committed
        </h4>
        <span className="text-xs text-gray-500">
          {new Date(lastCommitted.committedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h5 className="text-sm font-medium text-red-600 mb-2">Previous (Committed)</h5>
          <pre className="p-3 bg-red-50 border border-red-200 rounded text-xs overflow-auto max-h-64">
            {JSON.stringify(lastCommitted.snapshot, null, 2)}
          </pre>
        </div>

        <div>
          <h5 className="text-sm font-medium text-green-600 mb-2">Current (Draft)</h5>
          <pre className="p-3 bg-green-50 border border-green-200 rounded text-xs overflow-auto max-h-64">
            {JSON.stringify(currentDraft.payload, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

// History Tab Component
interface HistoryTabProps {
  history: AgentDraftHistory[];
}

const HistoryTab: React.FC<HistoryTabProps> = ({ history }) => {
  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <ClockIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No History Yet</h3>
        <p className="text-gray-600">Draft history will appear here once you commit changes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-gray-900">Draft History</h4>
      
      <div className="space-y-3">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="p-4 border border-gray-200 rounded-lg"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {entry.status === 'committed' ? (
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircleIcon className="w-4 h-4 text-red-600" />
                )}
                <span className={`text-sm font-medium ${
                  entry.status === 'committed' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {entry.status === 'committed' ? 'Committed' : 'Rejected'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(entry.committedAt).toLocaleString()}
              </span>
            </div>
            
            {entry.reason && (
              <p className="text-sm text-gray-600 mb-3">{entry.reason}</p>
            )}
            
            <details className="group">
              <summary className="cursor-pointer text-sm text-blue-600 hover:text-blue-800">
                View Configuration
              </summary>
              <pre className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded text-xs overflow-auto max-h-48">
                {JSON.stringify(entry.snapshot, null, 2)}
              </pre>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DraftFrame;
