/**
 * Linked Journeys Frame
 * =====================
 * 
 * Media card frame component for displaying journeys associated with a Keeper Type.
 * Shows journey list with linking/unlinking capabilities and quick actions.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapIcon,
  PlusIcon,
  LinkIcon,
  TrashIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  UserGroupIcon,
  MagnifyingGlassIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface LinkedJourney {
  id: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'draft' | 'archived';
  progress: number;
  pathCount: number;
  momentCount: number;
  collaborators: number;
  linkedAt: Date;
  lastActivity: Date;
  category: string;
  isOwner: boolean;
}

const LinkedJourneysFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LinkedJourney['status']>('all');
  const [isLinking, setIsLinking] = useState(false);

  // Mock linked journeys data
  const [linkedJourneys] = useState<LinkedJourney[]>([
    {
      id: '1',
      title: 'React Development Mastery',
      description: 'Complete learning path for modern React development',
      status: 'active',
      progress: 75,
      pathCount: 8,
      momentCount: 24,
      collaborators: 3,
      linkedAt: new Date('2024-01-15'),
      lastActivity: new Date('2024-01-28'),
      category: 'Frontend Development',
      isOwner: true
    },
    {
      id: '2',
      title: 'Node.js Backend Architecture',
      description: 'Building scalable backend systems with Node.js',
      status: 'active',
      progress: 45,
      pathCount: 6,
      momentCount: 18,
      collaborators: 2,
      linkedAt: new Date('2024-01-20'),
      lastActivity: new Date('2024-01-27'),
      category: 'Backend Development',
      isOwner: false
    },
    {
      id: '3',
      title: 'TypeScript Advanced Patterns',
      description: 'Advanced TypeScript patterns and best practices',
      status: 'completed',
      progress: 100,
      pathCount: 5,
      momentCount: 15,
      collaborators: 1,
      linkedAt: new Date('2024-01-10'),
      lastActivity: new Date('2024-01-25'),
      category: 'Programming Languages',
      isOwner: true
    },
    {
      id: '4',
      title: 'DevOps Fundamentals',
      description: 'Introduction to DevOps practices and tools',
      status: 'draft',
      progress: 20,
      pathCount: 4,
      momentCount: 6,
      collaborators: 1,
      linkedAt: new Date('2024-01-22'),
      lastActivity: new Date('2024-01-26'),
      category: 'DevOps',
      isOwner: false
    }
  ]);

  const getStatusColor = (status: LinkedJourney['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'completed':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'draft':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'archived':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleJourneyAction = (action: string, journeyId?: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, journeyId, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const filteredJourneys = linkedJourneys.filter(journey => {
    const matchesSearch = journey.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         journey.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         journey.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || journey.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <LinkIcon className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-gray-900">Linked Journeys</h3>
        </div>
        <p className="text-sm text-gray-600">
          Manage journeys associated with this Keeper Type.
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
            <LinkIcon className="w-5 h-5 text-amber-600" />
            <h3 className="font-medium text-gray-900">Linked Journeys</h3>
            <span className="text-sm text-gray-500">({linkedJourneys.length})</span>
          </div>
          <button
            onClick={() => setIsLinking(!isLinking)}
            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Link Journey</span>
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
              placeholder="Search journeys..."
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
              <option value="completed">Completed</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Link Journey Form */}
        <AnimatePresence>
          {isLinking && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-white border border-gray-200 rounded-lg"
            >
              <h4 className="text-sm font-medium text-gray-900 mb-3">Link New Journey</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Search available journeys..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => {
                      handleJourneyAction('journey_link', 'new-journey');
                      setIsLinking(false);
                    }}
                    className="px-4 py-2 bg-amber-600 text-white text-sm rounded-lg hover:bg-amber-700"
                  >
                    Link Journey
                  </button>
                  <button
                    onClick={() => setIsLinking(false)}
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

      {/* Journey List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {filteredJourneys.map((journey, index) => (
            <motion.div
              key={journey.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors"
            >
              <div className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Journey Icon */}
                    <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapIcon className="w-5 h-5 text-amber-600" />
                    </div>

                    {/* Journey Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{journey.title}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(journey.status)}`}>
                          {journey.status === 'completed' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                          {journey.status === 'active' && <PlayIcon className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{journey.status}</span>
                        </span>
                        {journey.isOwner && (
                          <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">
                            Owner
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {journey.description}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-2">
                        <div className="flex items-center space-x-1">
                          <MapIcon className="w-3 h-3" />
                          <span>{journey.pathCount} paths</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <CheckCircleIcon className="w-3 h-3" />
                          <span>{journey.momentCount} moments</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <UserGroupIcon className="w-3 h-3" />
                          <span>{journey.collaborators} collaborators</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-blue-600">{journey.category}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mb-2">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-medium text-gray-900">{journey.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-1.5">
                          <motion.div
                            className={`h-1.5 rounded-full ${getProgressColor(journey.progress)}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${journey.progress}%` }}
                            transition={{ duration: 0.8, delay: index * 0.1 }}
                          />
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>Linked {journey.linkedAt.toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span>Last activity: {journey.lastActivity.toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-4">
                    <button
                      onClick={() => handleJourneyAction('journey_view', journey.id)}
                      className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                      title="View Journey"
                    >
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleJourneyAction('journey_unlink', journey.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="Unlink Journey"
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
        {filteredJourneys.length === 0 && (
          <div className="text-center py-12">
            <LinkIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching journeys' : 'No linked journeys'}
            </h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Link journeys to this Keeper Type to get started.'
              }
            </p>
            <button
              onClick={() => setIsLinking(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Link Your First Journey</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Showing {filteredJourneys.length} of {linkedJourneys.length} linked journeys
          </span>
          <button
            onClick={() => handleJourneyAction('journeys_manage')}
            className="text-amber-600 hover:text-amber-700 font-medium"
          >
            Manage All Links
          </button>
        </div>
      </div>
    </div>
  );
};

export default LinkedJourneysFrame;
