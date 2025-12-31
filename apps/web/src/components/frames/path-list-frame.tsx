/**
 * Path List Frame
 * ===============
 * 
 * Media card frame component for displaying and managing paths within a journey.
 * Shows path list with creation, editing, and organization capabilities.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowRightIcon,
  ClockIcon,
  CheckCircleIcon,
  PlayIcon,
  BookOpenIcon,
  CodeBracketIcon,
  VideoCameraIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface PathItem {
  id: string;
  title: string;
  description: string;
  type: 'lesson' | 'exercise' | 'project' | 'video' | 'reading';
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  duration: string;
  progress: number;
  order: number;
  createdAt: Date;
  momentsCount: number;
}

const PathListFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [isCreating, setIsCreating] = useState(false);
  const [newPath, setNewPath] = useState({
    title: '',
    description: '',
    type: 'lesson' as PathItem['type']
  });

  // Mock paths data
  const [paths, setPaths] = useState<PathItem[]>([
    {
      id: '1',
      title: 'React Fundamentals',
      description: 'Learn the basics of React components, JSX, and props',
      type: 'lesson',
      status: 'completed',
      duration: '2 hours',
      progress: 100,
      order: 1,
      createdAt: new Date('2024-01-15'),
      momentsCount: 5
    },
    {
      id: '2',
      title: 'State Management with Hooks',
      description: 'Master useState, useEffect, and custom hooks',
      type: 'lesson',
      status: 'completed',
      duration: '1.5 hours',
      progress: 100,
      order: 2,
      createdAt: new Date('2024-01-18'),
      momentsCount: 4
    },
    {
      id: '3',
      title: 'Building a Todo App',
      description: 'Hands-on project to practice React concepts',
      type: 'project',
      status: 'in_progress',
      duration: '3 hours',
      progress: 65,
      order: 3,
      createdAt: new Date('2024-01-20'),
      momentsCount: 3
    },
    {
      id: '4',
      title: 'Component Patterns',
      description: 'Learn advanced component composition patterns',
      type: 'lesson',
      status: 'not_started',
      duration: '2.5 hours',
      progress: 0,
      order: 4,
      createdAt: new Date('2024-01-22'),
      momentsCount: 0
    },
    {
      id: '5',
      title: 'React Router Deep Dive',
      description: 'Master client-side routing with React Router',
      type: 'video',
      status: 'locked',
      duration: '1 hour',
      progress: 0,
      order: 5,
      createdAt: new Date('2024-01-25'),
      momentsCount: 0
    }
  ]);

  const getTypeIcon = (type: PathItem['type']) => {
    switch (type) {
      case 'lesson':
        return <BookOpenIcon className="w-4 h-4" />;
      case 'exercise':
        return <CodeBracketIcon className="w-4 h-4" />;
      case 'project':
        return <CodeBracketIcon className="w-4 h-4" />;
      case 'video':
        return <VideoCameraIcon className="w-4 h-4" />;
      case 'reading':
        return <DocumentTextIcon className="w-4 h-4" />;
      default:
        return <BookOpenIcon className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: PathItem['status']) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'not_started':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'locked':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeColor = (type: PathItem['type']) => {
    switch (type) {
      case 'lesson':
        return 'text-blue-600 bg-blue-100';
      case 'exercise':
        return 'text-green-600 bg-green-100';
      case 'project':
        return 'text-purple-600 bg-purple-100';
      case 'video':
        return 'text-red-600 bg-red-100';
      case 'reading':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handlePathAction = (action: string, pathId?: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, pathId, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const handleCreatePath = () => {
    if (!newPath.title) return;

    const path: PathItem = {
      id: Date.now().toString(),
      title: newPath.title,
      description: newPath.description,
      type: newPath.type,
      status: 'not_started',
      duration: 'TBD',
      progress: 0,
      order: paths.length + 1,
      createdAt: new Date(),
      momentsCount: 0
    };

    setPaths(prev => [...prev, path]);
    setNewPath({ title: '', description: '', type: 'lesson' });
    setIsCreating(false);
    
    handlePathAction('path_create', path.id, { path });
  };

  const handlePathSelect = (path: PathItem) => {
    if (path.status === 'locked') return;
    handlePathAction('path_select', path.id, { path });
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <MapIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Path List</h3>
        </div>
        <p className="text-sm text-gray-600">
          Manage and organize learning paths within the journey.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-900">Learning Paths</h3>
            <span className="text-sm text-gray-500">({paths.length})</span>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="inline-flex items-center space-x-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Add Path</span>
          </button>
        </div>

        {/* Create Path Form */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 p-4 bg-white border border-gray-200 rounded-lg"
            >
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Path title"
                  value={newPath.title}
                  onChange={(e) => setNewPath(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="Path description"
                  value={newPath.description}
                  onChange={(e) => setNewPath(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                />
                <div className="flex items-center space-x-3">
                  <select
                    value={newPath.type}
                    onChange={(e) => setNewPath(prev => ({ ...prev, type: e.target.value as PathItem['type'] }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="lesson">Lesson</option>
                    <option value="exercise">Exercise</option>
                    <option value="project">Project</option>
                    <option value="video">Video</option>
                    <option value="reading">Reading</option>
                  </select>
                  <button
                    onClick={handleCreatePath}
                    disabled={!newPath.title}
                    className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Create Path
                  </button>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Path List */}
      <div className="max-h-96 overflow-y-auto">
        <AnimatePresence>
          {paths.map((path, index) => (
            <motion.div
              key={path.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`border-b border-gray-200 last:border-b-0 hover:bg-gray-50 transition-colors ${
                path.status === 'locked' ? 'opacity-60' : 'cursor-pointer'
              }`}
              onClick={() => handlePathSelect(path)}
            >
              <div className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    {/* Path Order & Type */}
                    <div className="flex flex-col items-center space-y-1">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm font-medium text-blue-600">
                        {path.order}
                      </div>
                      <div className={`p-1 rounded ${getTypeColor(path.type)}`}>
                        {getTypeIcon(path.type)}
                      </div>
                    </div>

                    {/* Path Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-gray-900 truncate">{path.title}</h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(path.status)}`}>
                          {path.status === 'completed' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
                          {path.status === 'in_progress' && <PlayIcon className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{path.status.replace('_', ' ')}</span>
                        </span>
                      </div>
                      
                      <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                        {path.description}
                      </p>

                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <div className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>{path.duration}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <BookOpenIcon className="w-3 h-3" />
                          <span>{path.momentsCount} moments</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="capitalize">{path.type}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {path.progress > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium text-gray-900">{path.progress}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <motion.div
                              className="bg-blue-600 h-1.5 rounded-full"
                              initial={{ width: 0 }}
                              animate={{ width: `${path.progress}%` }}
                              transition={{ duration: 0.8, delay: index * 0.1 }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-1 ml-4">
                    {path.status !== 'locked' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePathAction('path_edit', path.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePathAction('path_delete', path.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">
            {paths.filter(p => p.status === 'completed').length} of {paths.length} paths completed
          </span>
          <button
            onClick={() => handlePathAction('paths_reorder')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Reorder Paths
          </button>
        </div>
      </div>
    </div>
  );
};

export default PathListFrame;
