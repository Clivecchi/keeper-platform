import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { keeperApi } from '../../lib/keeperApi';
import { SoleReflection } from '../../types/keeper';
import {
  PlusIcon,
  DocumentTextIcon,
  LightBulbIcon,
  ClockIcon,
  CheckIcon,
  PencilIcon,
  ArrowUpIcon
} from '@heroicons/react/24/outline';

interface ReflectionJournalProps {
  keeperId: string;
}

const ReflectionJournal: React.FC<ReflectionJournalProps> = ({ keeperId }) => {
  const { user } = useAuth();
  const [reflections, setReflections] = useState<SoleReflection[]>([]);
  const [suggestedPromotions, setSuggestedPromotions] = useState<SoleReflection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'write' | 'all' | 'suggestions'>('write');
  
  // Form state
  const [newReflection, setNewReflection] = useState({
    content: '',
    topic: '',
    agentId: 'default-agent' // TODO: Get from context
  });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');

  useEffect(() => {
    loadReflections();
    loadSuggestedPromotions();
  }, [keeperId]);

  const loadReflections = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;
      
      const response = await keeperApi.getReflectionsByKeeper(keeperId, user.id);
      
      if (response.success && response.data) {
        setReflections(response.data);
      } else {
        console.error('Error loading reflections:', response.error);
      }
    } catch (error) {
      console.error('Error loading reflections:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuggestedPromotions = async () => {
    try {
      if (!user?.id) return;
      
      const response = await keeperApi.getSuggestedPromotions(keeperId, user.id);
      
      if (response.success && response.data) {
        setSuggestedPromotions(response.data);
      } else {
        console.error('Error loading suggested promotions:', response.error);
      }
    } catch (error) {
      console.error('Error loading suggested promotions:', error);
    }
  };

  const handleSubmitReflection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReflection.content.trim() || !user?.id) return;

    try {
      setSubmitting(true);
      
      const response = await keeperApi.createReflection({
        keeperId,
        ...newReflection
      }, user.id);

      if (response.success && response.data) {
        setReflections(prev => [response.data!, ...prev]);
        setNewReflection({ content: '', topic: '', agentId: 'default-agent' });
        setActiveTab('all');
      } else {
        console.error('Error creating reflection:', response.error);
      }
    } catch (error) {
      console.error('Error creating reflection:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePromoteReflection = async (reflectionId: string) => {
    try {
      if (!user?.id) return;
      
      const response = await keeperApi.promoteReflectionToMemoryCard(reflectionId, user.id);
      
      if (response.success && response.data) {
        setReflections(prev => prev.map(r => 
          r.id === reflectionId 
            ? response.data!
            : r
        ));
        
        setSuggestedPromotions(prev => prev.filter(r => r.id !== reflectionId));
      } else {
        console.error('Error promoting reflection:', response.error);
      }
    } catch (error) {
      console.error('Error promoting reflection:', error);
    }
  };

  const startEditing = (reflection: SoleReflection) => {
    setEditingId(reflection.id);
    setEditContent(reflection.content);
  };

  const saveEdit = async (reflectionId: string) => {
    try {
      if (!user?.id) return;
      
      const response = await keeperApi.updateReflection(reflectionId, { content: editContent }, user.id);
      
      if (response.success && response.data) {
        setReflections(prev => prev.map(r => 
          r.id === reflectionId ? response.data! : r
        ));
        setEditingId(null);
        setEditContent('');
      } else {
        console.error('Error updating reflection:', response.error);
      }
    } catch (error) {
      console.error('Error updating reflection:', error);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderWriteTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <PlusIcon className="w-5 h-5" />
          Write New Reflection
        </h3>
        
        <form onSubmit={handleSubmitReflection} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Topic (Optional)
            </label>
            <input
              type="text"
              value={newReflection.topic}
              onChange={(e) => setNewReflection(prev => ({ ...prev, topic: e.target.value }))}
              placeholder="e.g., Communication Style, Learning Preferences"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Reflection Content
            </label>
            <textarea
              value={newReflection.content}
              onChange={(e) => setNewReflection(prev => ({ ...prev, content: e.target.value }))}
              placeholder="What did you learn from this interaction? How might this inform future conversations?"
              rows={6}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
          
          <button
            type="submit"
            disabled={!newReflection.content.trim() || submitting}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Reflection'}
          </button>
        </form>
      </div>
    </motion.div>
  );

  const renderAllTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <DocumentTextIcon className="w-5 h-5" />
          All Reflections ({reflections.length})
        </h3>
      </div>
      
      {reflections.length === 0 ? (
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No reflections yet. Start by writing your first reflection!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reflections.map((reflection) => (
            <div
              key={reflection.id}
              className={`bg-card border border-border rounded-lg p-4 ${
                reflection.promotedToMemoryCard ? 'border-green-200 bg-green-50/50' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {reflection.topic && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {reflection.topic}
                    </span>
                  )}
                  {reflection.promotedToMemoryCard && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                      <CheckIcon className="w-3 h-3" />
                      Promoted
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {formatDate(reflection.createdAt)}
                  </span>
                  {!reflection.promotedToMemoryCard && (
                    <>
                      <button
                        onClick={() => startEditing(reflection)}
                        className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handlePromoteReflection(reflection.id)}
                        className="p-1 text-green-600 hover:text-green-700 transition-colors"
                        title="Promote to Memory Card"
                      >
                        <ArrowUpIcon className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              {editingId === reflection.id ? (
                <div className="space-y-3">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveEdit(reflection.id)}
                      className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded hover:bg-primary/90 transition-colors"
                    >
                      Save
                    </button>
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-1 bg-muted text-muted-foreground text-sm rounded hover:bg-muted/80 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-foreground whitespace-pre-wrap">{reflection.content}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  const renderSuggestionsTab = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <LightBulbIcon className="w-5 h-5" />
          Suggested Promotions ({suggestedPromotions.length})
        </h3>
      </div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-amber-800 text-sm">
          These reflections are older than 24 hours and may be ready to promote to long-term memory cards.
        </p>
      </div>
      
      {suggestedPromotions.length === 0 ? (
        <div className="text-center py-12">
          <LightBulbIcon className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No promotion suggestions at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestedPromotions.map((reflection) => (
            <div
              key={reflection.id}
              className="bg-card border border-amber-200 rounded-lg p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {reflection.topic && (
                    <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                      {reflection.topic}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" />
                    {formatDate(reflection.createdAt)}
                  </span>
                  <button
                    onClick={() => handlePromoteReflection(reflection.id)}
                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors flex items-center gap-1"
                  >
                    <ArrowUpIcon className="w-3 h-3" />
                    Promote
                  </button>
                </div>
              </div>
              
              <p className="text-foreground">{reflection.content}</p>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-2">Reflection Journal</h2>
        <p className="text-muted-foreground">
          Capture insights and learnings from interactions to build contextual memory.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-border">
        <nav className="flex space-x-8">
          {[
            { id: 'write', label: 'Write Reflection', icon: PlusIcon },
            { id: 'all', label: 'All Reflections', icon: DocumentTextIcon },
            { id: 'suggestions', label: 'Suggested Promotions', icon: LightBulbIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'suggestions' && suggestedPromotions.length > 0 && (
                <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">
                  {suggestedPromotions.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'write' && renderWriteTab()}
        {activeTab === 'all' && renderAllTab()}
        {activeTab === 'suggestions' && renderSuggestionsTab()}
      </div>
    </div>
  );
};

export default ReflectionJournal; 