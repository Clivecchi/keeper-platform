/**
 * Topics Frame
 * ============
 * 
 * Frame component for managing topics in Agent Home Boards.
 * Supports creating, editing, archiving topics and adding highlights.
 */

import React, { useState, useEffect, useContext } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PlusIcon,
  TagIcon,
  ArchiveBoxIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { apiFetch } from '../../lib/api';
import { Topic, TopicHighlight, CreateTopicRequest, CreateTopicHighlightRequest } from '../../types/keeper';
import { useFrame } from '../../context/FrameContext';
import { BoardContext } from '../../boards/BoardContext';

interface TopicsFrameProps extends BaseFrameProps {
  boardId?: string;
  view?: 'list' | 'grid' | 'compact';
  showTags?: boolean;
  groupBy?: 'status' | 'tags' | 'date';
  allowCreate?: boolean;
  allowEdit?: boolean;
}

const TopicsFrame: React.FC<TopicsFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
  boardId,
  view = 'list',
  showTags = true,
  groupBy = 'status',
  allowCreate = true,
  allowEdit = true,
}) => {
  const { handleFrameInteraction } = useFrame();
  const { setCurrentTopicId } = useContext(BoardContext);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTopic, setEditingTopic] = useState<Topic | null>(null);
  const [newTopicTitle, setNewTopicTitle] = useState('');
  const [newTopicTags, setNewTopicTags] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [showHighlightForm, setShowHighlightForm] = useState(false);
  type LocalHighlight = { kind: TopicHighlight['kind']; text: string };
  const [newHighlight, setNewHighlight] = useState<LocalHighlight>({
    kind: 'fact',
    text: ''
  });

  // Load topics from agent-scoped API
  useEffect(() => {
    const agentId = frameInstance.entityId;
    if (!agentId) return;
    const loadTopics = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await apiFetch(`/api/agents/${agentId}/topics`);
        setTopics(Array.isArray(data) ? data : (data.data || []));
      } catch (err) {
        console.error('Error loading topics:', err);
        setError(err instanceof Error ? err.message : 'Failed to load topics');
      } finally {
        setIsLoading(false);
      }
    };
    loadTopics();
  }, [frameInstance.entityId]);

  // Handle topic creation
  const handleCreateTopic = async () => {
    if (!newTopicTitle.trim()) return;
    try {
      const request: CreateTopicRequest = {
        title: newTopicTitle.trim(),
        tags: newTopicTags.split(',').map(t => t.trim()).filter(t => t)
      };
      const agentId = frameInstance.entityId;
      const data = await apiFetch(`/api/agents/${agentId}/topics`, {
        method: 'POST',
        body: JSON.stringify(request)
      });
      const created: Topic = (data.id ? data : data.data) as Topic;
      setTopics(prev => [created, ...prev]);
      setNewTopicTitle('');
      setNewTopicTags('');
      setShowCreateForm(false);
      handleFrameInteraction({
        type: 'submit',
        frameId: frameInstance.id,
        data: { action: 'create_topic', topicId: created.id },
        timestamp: new Date(),
      });
      setCurrentTopicId(created.id);
    } catch (err) {
      console.error('Error creating topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to create topic');
    }
  };

  // Handle topic update (merge title/essence/tags)
  const handleUpdateTopic = async (topic: Topic, patch: Partial<Topic>) => {
    try {
      const agentId = frameInstance.entityId;
      const data = await apiFetch(`/api/agents/${agentId}/topics/${topic.id}`, {
        method: 'PUT',
        body: JSON.stringify(patch)
      });
      const updated: Topic = (data.id ? data : data.data) as Topic;
      setTopics(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t));
      setCurrentTopicId(updated.id);
    } catch (err) {
      console.error('Error updating topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to update topic');
    }
  };

  // Handle topic archiving
  const handleArchiveTopic = async (topicId: string) => {
    try {
      const agentId = frameInstance.entityId;
      await apiFetch(`/api/agents/${agentId}/topics/${topicId}`, { method: 'DELETE' });
      setTopics(prev => prev.map(topic => topic.id === topicId ? { ...topic, status: 'archived' } : topic));
      handleFrameInteraction({
        type: 'click',
        frameId: frameInstance.id,
        data: { action: 'archive_topic', topicId },
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Error archiving topic:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive topic');
    }
  };

  // Handle adding highlight
  const handleAddHighlight = async () => {
    if (!newHighlight.text.trim() || !selectedTopic) return;

    try {
      const request: CreateTopicHighlightRequest = {
        kind: newHighlight.kind,
        text: newHighlight.text.trim()
      };

      // TODO: Replace with actual API call
      const data = await apiFetch(`/api/topics/${selectedTopic.id}/highlights`, {
        method: 'POST',
        body: JSON.stringify(request)
      });
      const highlight: TopicHighlight = data.data;

      setTopics(prev => prev.map(topic => 
        topic.id === selectedTopic.id 
          ? { ...topic, highlights: [...(topic.highlights || []), highlight] }
          : topic
      ));

      setNewHighlight({ kind: 'fact', text: '' });
      setShowHighlightForm(false);
      setSelectedTopic(null);

      handleFrameInteraction({
        type: 'submit',
        frameId: frameInstance.id,
        data: { action: 'add_highlight', topicId: selectedTopic.id, highlightId: highlight.id },
        timestamp: new Date(),
      });
    } catch (err) {
      console.error('Error adding highlight:', err);
      setError(err instanceof Error ? err.message : 'Failed to add highlight');
    }
  };

  // Group topics by status
  const groupedTopics = React.useMemo(() => {
    if (groupBy === 'status') {
      const active = topics.filter(t => t.status === 'active');
      const archived = topics.filter(t => t.status === 'archived');
      return { active, archived };
    }
    return { all: topics };
  }, [topics, groupBy]);

  // Get icon for highlight kind
  const getHighlightIcon = (kind: TopicHighlight['kind']) => {
    switch (kind) {
      case 'fact': return <DocumentTextIcon className="w-4 h-4" />;
      case 'decision': return <CheckCircleIcon className="w-4 h-4" />;
      case 'task': return <ClockIcon className="w-4 h-4" />;
      case 'question': return <ChatBubbleLeftRightIcon className="w-4 h-4" />;
      case 'risk': return <ExclamationTriangleIcon className="w-4 h-4" />;
      default: return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  // Get color for highlight kind
  const getHighlightColor = (kind: TopicHighlight['kind']) => {
    switch (kind) {
      case 'fact': return 'text-blue-600 bg-blue-50';
      case 'decision': return 'text-green-600 bg-green-50';
      case 'task': return 'text-orange-600 bg-orange-50';
      case 'question': return 'text-purple-600 bg-purple-50';
      case 'risk': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center text-gray-600 mt-4">Loading topics...</p>
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
          <div className="flex items-center space-x-2">
            <TagIcon className="w-5 h-5 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Topics</h3>
            <span className="text-sm text-gray-500">
              ({topics.filter(t => t.status === 'active').length} active)
            </span>
          </div>
          
          {allowCreate && !isPreview && (
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center space-x-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add Topic</span>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Create Form */}
        <AnimatePresence>
          {showCreateForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-gray-50 rounded-lg border"
            >
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Topic Title
                  </label>
                  <input
                    type="text"
                    value={newTopicTitle}
                    onChange={(e) => setNewTopicTitle(e.target.value)}
                    placeholder="Enter topic title..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newTopicTags}
                    onChange={(e) => setNewTopicTags(e.target.value)}
                    placeholder="configuration, best-practices, ..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCreateTopic}
                    disabled={!newTopicTitle.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Topic
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewTopicTitle('');
                      setNewTopicTags('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Topics List */}
        {groupBy === 'status' ? (
          <div className="space-y-6">
            {/* Active Topics */}
            {groupedTopics.active && groupedTopics.active.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                  Active Topics ({groupedTopics.active.length})
                </h4>
                <div className="space-y-3">
                  {groupedTopics.active.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      showTags={showTags}
                      allowEdit={allowEdit}
                      onArchive={() => handleArchiveTopic(topic.id)}
                      onAddHighlight={() => {
                        setSelectedTopic(topic);
                        setShowHighlightForm(true);
                      }}
                      getHighlightIcon={getHighlightIcon}
                      getHighlightColor={getHighlightColor}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Archived Topics */}
            {groupedTopics.archived && groupedTopics.archived.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <ArchiveBoxIcon className="w-4 h-4 text-gray-500 mr-2" />
                  Archived Topics ({groupedTopics.archived.length})
                </h4>
                <div className="space-y-3">
                  {groupedTopics.archived.map((topic) => (
                    <TopicCard
                      key={topic.id}
                      topic={topic}
                      showTags={showTags}
                      allowEdit={false}
                      archived
                      getHighlightIcon={getHighlightIcon}
                      getHighlightColor={getHighlightColor}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {topics.map((topic) => (
              <TopicCard
                key={topic.id}
                topic={topic}
                showTags={showTags}
                allowEdit={allowEdit}
                onArchive={() => handleArchiveTopic(topic.id)}
                onAddHighlight={() => {
                  setSelectedTopic(topic);
                  setShowHighlightForm(true);
                }}
                getHighlightIcon={getHighlightIcon}
                getHighlightColor={getHighlightColor}
              />
            ))}
          </div>
        )}

        {/* Empty State */}
        {topics.length === 0 && (
          <div className="text-center py-8">
            <TagIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Topics Yet</h3>
            <p className="text-gray-600 mb-4">Create your first topic to start organizing your agent's knowledge.</p>
            {allowCreate && (
              <button
                onClick={() => setShowCreateForm(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Create First Topic
              </button>
            )}
          </div>
        )}
      </div>

      {/* Highlight Form Modal */}
      <AnimatePresence>
        {showHighlightForm && selectedTopic && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowHighlightForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg p-6 max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Highlight to "{selectedTopic.title}"
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Highlight Type
                  </label>
                  <select
                    value={newHighlight.kind}
                    onChange={(e) => setNewHighlight(prev => ({ 
                      ...prev, 
                      kind: e.target.value as TopicHighlight['kind'] 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="fact">Fact</option>
                    <option value="decision">Decision</option>
                    <option value="task">Task</option>
                    <option value="question">Question</option>
                    <option value="risk">Risk</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Highlight Text
                  </label>
                  <textarea
                    value={newHighlight.text}
                    onChange={(e) => setNewHighlight(prev => ({ ...prev, text: e.target.value }))}
                    placeholder="Enter the highlight text..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddHighlight}
                    disabled={!newHighlight.text.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Add Highlight
                  </button>
                  <button
                    onClick={() => {
                      setShowHighlightForm(false);
                      setSelectedTopic(null);
                      setNewHighlight({ kind: 'fact', text: '' });
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Topic Card Component
interface TopicCardProps {
  topic: Topic;
  showTags: boolean;
  allowEdit: boolean;
  archived?: boolean;
  onArchive?: () => void;
  onAddHighlight?: () => void;
  getHighlightIcon: (kind: TopicHighlight['kind']) => React.ReactNode;
  getHighlightColor: (kind: TopicHighlight['kind']) => string;
}

const TopicCard: React.FC<TopicCardProps> = ({
  topic,
  showTags,
  allowEdit,
  archived = false,
  onArchive,
  onAddHighlight,
  getHighlightIcon,
  getHighlightColor,
}) => {
  return (
    <div className={`p-4 border rounded-lg ${archived ? 'bg-gray-50 border-gray-200' : 'bg-white border-gray-200 hover:border-gray-300'} transition-colors`}>
      <div className="flex items-start justify-between mb-2">
        <h4 className={`font-medium ${archived ? 'text-gray-600' : 'text-gray-900'}`}>
          {topic.title}
        </h4>
        
        {!archived && allowEdit && (
          <div className="flex items-center space-x-1 ml-2">
            {onAddHighlight && (
              <button
                onClick={onAddHighlight}
                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                title="Add Highlight"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            )}
            {onArchive && (
              <button
                onClick={onArchive}
                className="p-1 text-gray-400 hover:text-orange-600 transition-colors"
                title="Archive Topic"
              >
                <ArchiveBoxIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      
      {topic.essence && (
        <p className={`text-sm mb-3 ${archived ? 'text-gray-500' : 'text-gray-600'}`}>
          {topic.essence}
        </p>
      )}
      
      {showTags && topic.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {topic.tags.map((tag) => (
            <span
              key={tag}
              className={`px-2 py-1 text-xs rounded-full ${
                archived 
                  ? 'bg-gray-100 text-gray-500' 
                  : 'bg-blue-100 text-blue-700'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      
      {topic.highlights && topic.highlights.length > 0 && (
        <div className="space-y-2 mb-3">
          {topic.highlights.map((highlight) => (
            <div
              key={highlight.id}
              className={`flex items-start space-x-2 p-2 rounded text-xs ${getHighlightColor(highlight.kind)}`}
            >
              {getHighlightIcon(highlight.kind)}
              <span>{highlight.text}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {topic.highlights?.length || 0} highlight{(topic.highlights?.length || 0) !== 1 ? 's' : ''}
        </span>
        <span>
          Last active: {new Date(topic.lastActiveAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
};

export default TopicsFrame;
