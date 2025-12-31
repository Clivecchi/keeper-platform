/**
 * Moment Grid Frame
 * =================
 * 
 * Media card frame component for displaying recent moments from a journey.
 * Shows moments in a grid layout with media previews and quick actions.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhotoIcon,
  VideoCameraIcon,
  DocumentTextIcon,
  CodeBracketIcon,
  HeartIcon,
  ChatBubbleLeftIcon,
  ShareIcon,
  EyeIcon,
  ClockIcon,
  PlusIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface MomentItem {
  id: string;
  title: string;
  description: string;
  type: 'image' | 'video' | 'text' | 'code' | 'link' | 'note';
  thumbnail?: string;
  content: string;
  pathId: string;
  pathTitle: string;
  createdAt: Date;
  likes: number;
  comments: number;
  views: number;
  tags: string[];
  isPublic: boolean;
}

const MomentGridFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [filter, setFilter] = useState<'all' | MomentItem['type']>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'views'>('recent');

  // Mock moments data
  const [moments] = useState<MomentItem[]>([
    {
      id: '1',
      title: 'Component State Breakthrough',
      description: 'Finally understood how useState works with complex objects!',
      type: 'text',
      content: 'Had a major breakthrough understanding how to properly update nested state objects in React...',
      pathId: '2',
      pathTitle: 'State Management with Hooks',
      createdAt: new Date('2024-01-28T10:30:00'),
      likes: 12,
      comments: 3,
      views: 45,
      tags: ['react', 'state', 'hooks'],
      isPublic: true
    },
    {
      id: '2',
      title: 'Todo App Demo',
      description: 'Working version of my React todo application',
      type: 'video',
      thumbnail: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=300&h=200&fit=crop',
      content: 'Demo video showing the completed todo app with add, edit, delete functionality',
      pathId: '3',
      pathTitle: 'Building a Todo App',
      createdAt: new Date('2024-01-27T15:45:00'),
      likes: 8,
      comments: 5,
      views: 32,
      tags: ['react', 'project', 'demo'],
      isPublic: true
    },
    {
      id: '3',
      title: 'Custom Hook Pattern',
      description: 'Created a reusable hook for form validation',
      type: 'code',
      content: 'const useFormValidation = (initialState, validate) => { ... }',
      pathId: '2',
      pathTitle: 'State Management with Hooks',
      createdAt: new Date('2024-01-26T09:15:00'),
      likes: 15,
      comments: 7,
      views: 68,
      tags: ['react', 'hooks', 'custom', 'validation'],
      isPublic: false
    },
    {
      id: '4',
      title: 'React Component Diagram',
      description: 'Visual breakdown of component hierarchy',
      type: 'image',
      thumbnail: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=300&h=200&fit=crop',
      content: 'Component tree diagram showing parent-child relationships',
      pathId: '1',
      pathTitle: 'React Fundamentals',
      createdAt: new Date('2024-01-25T14:20:00'),
      likes: 6,
      comments: 2,
      views: 28,
      tags: ['react', 'components', 'diagram'],
      isPublic: true
    },
    {
      id: '5',
      title: 'Key Learning Points',
      description: 'Important concepts to remember from today\'s session',
      type: 'note',
      content: '1. Always use keys in lists\n2. State is immutable\n3. Effects run after render...',
      pathId: '1',
      pathTitle: 'React Fundamentals',
      createdAt: new Date('2024-01-24T16:30:00'),
      likes: 9,
      comments: 1,
      views: 41,
      tags: ['notes', 'learning', 'concepts'],
      isPublic: true
    },
    {
      id: '6',
      title: 'Helpful React Resources',
      description: 'Collection of useful React learning materials',
      type: 'link',
      content: 'https://react.dev/learn - Official React documentation and tutorials',
      pathId: '1',
      pathTitle: 'React Fundamentals',
      createdAt: new Date('2024-01-23T11:45:00'),
      likes: 4,
      comments: 0,
      views: 19,
      tags: ['resources', 'documentation', 'learning'],
      isPublic: true
    }
  ]);

  const getTypeIcon = (type: MomentItem['type']) => {
    switch (type) {
      case 'image':
        return <PhotoIcon className="w-4 h-4" />;
      case 'video':
        return <VideoCameraIcon className="w-4 h-4" />;
      case 'code':
        return <CodeBracketIcon className="w-4 h-4" />;
      case 'text':
      case 'note':
        return <DocumentTextIcon className="w-4 h-4" />;
      case 'link':
        return <ShareIcon className="w-4 h-4" />;
      default:
        return <DocumentTextIcon className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: MomentItem['type']) => {
    switch (type) {
      case 'image':
        return 'text-green-600 bg-green-100';
      case 'video':
        return 'text-red-600 bg-red-100';
      case 'code':
        return 'text-purple-600 bg-purple-100';
      case 'text':
        return 'text-blue-600 bg-blue-100';
      case 'note':
        return 'text-yellow-600 bg-yellow-100';
      case 'link':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleMomentAction = (action: string, momentId?: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, momentId, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const filteredMoments = moments.filter(moment => 
    filter === 'all' || moment.type === filter
  );

  const sortedMoments = [...filteredMoments].sort((a, b) => {
    switch (sortBy) {
      case 'popular':
        return b.likes - a.likes;
      case 'views':
        return b.views - a.views;
      case 'recent':
      default:
        return b.createdAt.getTime() - a.createdAt.getTime();
    }
  });

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <PhotoIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Moment Grid</h3>
        </div>
        <p className="text-sm text-gray-600">
          Visual grid of recent moments and achievements from the journey.
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
            <PhotoIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Recent Moments</h3>
            <span className="text-sm text-gray-500">({moments.length})</span>
          </div>
          <button
            onClick={() => handleMomentAction('moment_create')}
            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Moment</span>
          </button>
        </div>

        {/* Filters and Sort */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-4 h-4 text-gray-500" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="code">Code</option>
              <option value="text">Text</option>
              <option value="note">Notes</option>
              <option value="link">Links</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="recent">Recent</option>
              <option value="popular">Popular</option>
              <option value="views">Most Viewed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Moments Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence>
            {sortedMoments.map((moment, index) => (
              <motion.div
                key={moment.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleMomentAction('moment_view', moment.id, { moment })}
              >
                {/* Thumbnail/Preview */}
                <div className="relative h-32 bg-gray-100">
                  {moment.thumbnail ? (
                    <img
                      src={moment.thumbnail}
                      alt={moment.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className={`p-3 rounded-full ${getTypeColor(moment.type)}`}>
                        {getTypeIcon(moment.type)}
                      </div>
                    </div>
                  )}
                  
                  {/* Type Badge */}
                  <div className={`absolute top-2 left-2 inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(moment.type)}`}>
                    {getTypeIcon(moment.type)}
                    <span className="capitalize">{moment.type}</span>
                  </div>

                  {/* Privacy Indicator */}
                  {!moment.isPublic && (
                    <div className="absolute top-2 right-2 p-1 bg-gray-800 bg-opacity-75 rounded-full">
                      <EyeIcon className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-4">
                  <h4 className="font-medium text-gray-900 mb-1 line-clamp-1">
                    {moment.title}
                  </h4>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                    {moment.description}
                  </p>

                  {/* Path Reference */}
                  <div className="text-xs text-blue-600 mb-3">
                    From: {moment.pathTitle}
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {moment.tags.slice(0, 3).map((tag, tagIndex) => (
                      <span
                        key={tagIndex}
                        className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
                      >
                        #{tag}
                      </span>
                    ))}
                    {moment.tags.length > 3 && (
                      <span className="inline-block px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                        +{moment.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-1">
                        <HeartIcon className="w-3 h-3" />
                        <span>{moment.likes}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <ChatBubbleLeftIcon className="w-3 h-3" />
                        <span>{moment.comments}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <EyeIcon className="w-3 h-3" />
                        <span>{moment.views}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <ClockIcon className="w-3 h-3" />
                      <span>{moment.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {sortedMoments.length === 0 && (
          <div className="text-center py-12">
            <PhotoIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No moments found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? 'Start creating moments to track your learning journey.'
                : `No ${filter} moments found. Try a different filter.`
              }
            </p>
            <button
              onClick={() => handleMomentAction('moment_create')}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Create Your First Moment</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            Showing {sortedMoments.length} of {moments.length} moments
          </span>
          <button
            onClick={() => handleMomentAction('moments_export')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Export Moments
          </button>
        </div>
      </div>
    </div>
  );
};

export default MomentGridFrame;
