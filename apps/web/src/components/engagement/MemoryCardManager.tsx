import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDownIcon, ChevronUpIcon, TagIcon, CalendarIcon, BoltIcon } from '@heroicons/react/24/outline';
import { SoleMemoryCard, SoleMemoryCardListResponse } from '../../types/keeper';

interface MemoryCardManagerProps {
  keeperId: string;
  agentId: string;
  isDemo?: boolean;
}

const MemoryCardManager: React.FC<MemoryCardManagerProps> = ({ keeperId, agentId, isDemo = false }) => {
  const [memoryCards, setMemoryCards] = useState<SoleMemoryCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Demo data
  const demoMemoryCards: SoleMemoryCard[] = [
    {
      id: 'demo-card-1',
      keeperId,
      reflectionId: 'demo-reflection-1',
      content: 'I notice that I tend to ask clarifying questions when tasks are ambiguous. This helps me provide better assistance but might sometimes feel like I\'m being overly cautious.',
      topic: 'Communication Style',
      embedding: undefined,
      embedded: true,
      createdAt: '2024-01-15T10:30:00Z',
      reflection: {
        id: 'demo-reflection-1',
        agentId: agentId,
        createdAt: '2024-01-15T09:00:00Z'
      }
    },
    {
      id: 'demo-card-2',
      keeperId,
      reflectionId: 'demo-reflection-2',
      content: 'When users express frustration, I find myself trying to acknowledge their feelings while staying solution-focused. This seems to help de-escalate situations.',
      topic: 'Emotional Intelligence',
      embedding: undefined,
      embedded: true,
      createdAt: '2024-01-14T14:20:00Z',
      reflection: {
        id: 'demo-reflection-2',
        agentId: agentId,
        createdAt: '2024-01-14T13:45:00Z'
      }
    },
    {
      id: 'demo-card-3',
      keeperId,
      reflectionId: 'demo-reflection-3',
      content: 'I\'ve observed that I perform better on coding tasks when I think through the problem step-by-step rather than jumping to solutions. This methodical approach reduces errors.',
      topic: 'Problem Solving',
      embedding: undefined,
      embedded: false,
      createdAt: '2024-01-13T16:45:00Z',
      reflection: {
        id: 'demo-reflection-3',
        agentId: agentId,
        createdAt: '2024-01-13T16:00:00Z'
      }
    }
  ];

  const fetchMemoryCards = async () => {
    if (isDemo) {
      setMemoryCards(demoMemoryCards);
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/keeper/keepers/${keeperId}/memory-cards?userId=${agentId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch memory cards');
      }

      const data: SoleMemoryCardListResponse = await response.json();
      
      if (data.success && data.data) {
        setMemoryCards(data.data);
      } else {
        throw new Error(data.error || 'Failed to fetch memory cards');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMemoryCards();
  }, [keeperId, agentId, isDemo]);

  const toggleCardExpansion = (cardId: string) => {
    const newExpanded = new Set(expandedCards);
    if (expandedCards.has(cardId)) {
      newExpanded.delete(cardId);
    } else {
      newExpanded.add(cardId);
    }
    setExpandedCards(newExpanded);
  };

  const getUniqueTopics = () => {
    const topics = memoryCards
      .map(card => card.topic)
      .filter((topic): topic is string => topic !== undefined && topic !== null);
    return Array.from(new Set(topics));
  };

  const filteredCards = selectedTopic
    ? memoryCards.filter(card => card.topic === selectedTopic)
    : memoryCards;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchMemoryCards();
          }}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Memory Cards</h2>
          <p className="text-gray-600">Vectorized memories from promoted reflections</p>
        </div>
        {isDemo && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 text-sm text-blue-700">
            Demo Mode
          </div>
        )}
      </div>

      {/* Filter Controls */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2">
          <TagIcon className="h-4 w-4 text-gray-500" />
          <select
            value={selectedTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Topics</option>
            {getUniqueTopics().map(topic => (
              <option key={topic} value={topic}>{topic}</option>
            ))}
          </select>
        </div>

        <div className="text-sm text-gray-500">
          {filteredCards.length} card{filteredCards.length !== 1 ? 's' : ''} 
          ({memoryCards.filter(card => card.embedded).length} embedded)
        </div>
      </div>

      {/* Memory Cards */}
      <div className="space-y-4">
        {filteredCards.length === 0 ? (
          <div className="text-center py-12">
            <BoltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No memory cards found</p>
            <p className="text-sm text-gray-400 mt-1">
              Memory cards are created when reflections are promoted after 24 hours
            </p>
          </div>
        ) : (
          filteredCards.map((card) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {card.topic && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {card.topic}
                      </span>
                    )}
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      card.embedded 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {card.embedded ? '✓ Embedded' : '⏳ Pending'}
                    </span>
                  </div>

                  <div className="text-gray-900 mb-3">
                    {expandedCards.has(card.id) ? (
                      <p className="text-sm leading-relaxed">{card.content}</p>
                    ) : (
                      <p className="text-sm leading-relaxed line-clamp-2">
                        {card.content}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-3 w-3" />
                      {formatDate(card.createdAt)}
                    </div>
                    {card.reflection && (
                      <div>
                        From reflection {formatDate(card.reflection.createdAt)}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => toggleCardExpansion(card.id)}
                  className="ml-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {expandedCards.has(card.id) ? (
                    <ChevronUpIcon className="h-4 w-4" />
                  ) : (
                    <ChevronDownIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Stats */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2">Memory Statistics</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900">{memoryCards.length}</div>
            <div className="text-xs text-gray-500">Total Cards</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{memoryCards.filter(card => card.embedded).length}</div>
            <div className="text-xs text-gray-500">Embedded</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{getUniqueTopics().length}</div>
            <div className="text-xs text-gray-500">Topics</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryCardManager; 