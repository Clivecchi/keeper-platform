/**
 * Journey Overview Frame
 * ======================
 * 
 * Preview frame component for displaying high-level journey information.
 * Shows journey status, progress, metadata, and quick actions.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MapIcon,
  TagIcon,
  UserGroupIcon,
  ClockIcon,
  ShareIcon,
  PencilIcon,
  EyeIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface JourneyData {
  title: string;
  description: string;
  status: 'active' | 'draft' | 'archived' | 'completed';
  icon: string;
  tags: string[];
  progress: number;
  totalPaths: number;
  totalMoments: number;
  collaborators: number;
  visibility: 'public' | 'private' | 'shared';
  createdAt: Date;
  lastModified: Date;
}

const JourneyOverviewFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [isEditing, setIsEditing] = useState(false);

  // Extract journey data from frame content metadata
  const journeyData: JourneyData = {
    title: 'Learning React Development',
    description: 'A comprehensive learning path for modern React development',
    status: 'active',
    icon: '🚀',
    tags: ['React', 'JavaScript', 'Frontend', 'Development'],
    progress: 65,
    totalPaths: 8,
    totalMoments: 24,
    collaborators: 3,
    visibility: 'public',
    createdAt: new Date('2024-01-15'),
    lastModified: new Date(),
    ...(typeof frameInstance.FrameContent_FrameInstance_currentContentIdToFrameContent?.metadata === 'object'
      ? (frameInstance.FrameContent_FrameInstance_currentContentIdToFrameContent?.metadata as Record<string, unknown>)
      : {})
  };

  const handleJourneyAction = (action: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const getStatusColor = (status: JourneyData['status']) => {
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

  const getVisibilityIcon = (visibility: JourneyData['visibility']) => {
    switch (visibility) {
      case 'public':
        return <EyeIcon className="w-4 h-4 text-green-500" />;
      case 'shared':
        return <UserGroupIcon className="w-4 h-4 text-blue-500" />;
      case 'private':
        return <EyeIcon className="w-4 h-4 text-gray-500" />;
      default:
        return <EyeIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <MapIcon className="w-5 h-5 text-blue-600" />
          <h3 className="font-medium text-gray-900">Journey Overview</h3>
        </div>
        <p className="text-sm text-gray-600">
          High-level journey information with progress tracking and metadata.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      {/* Header with Icon and Status */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Journey Icon */}
            <div className="w-16 h-16 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-2xl shadow-sm">
              {journeyData.icon}
            </div>

            {/* Journey Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  {journeyData.title}
                </h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(journeyData.status)}`}>
                  <span className="capitalize">{journeyData.status}</span>
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {journeyData.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1">
                {journeyData.tags.slice(0, 4).map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {tag}
                  </span>
                ))}
                {journeyData.tags.length > 4 && (
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                    +{journeyData.tags.length - 4} more
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleJourneyAction('journey_edit')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              title="Edit Journey"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleJourneyAction('journey_share')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              title="Share Journey"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-gray-900">Progress</h3>
          <span className="text-sm font-semibold text-blue-600">{journeyData.progress}%</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
          <motion.div
            className={`h-2.5 rounded-full ${getProgressColor(journeyData.progress)}`}
            initial={{ width: 0 }}
            animate={{ width: `${journeyData.progress}%` }}
            transition={{ duration: 1, delay: 0.3 }}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{journeyData.totalPaths}</div>
            <div className="text-xs text-gray-500">Paths</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{journeyData.totalMoments}</div>
            <div className="text-xs text-gray-500">Moments</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{journeyData.collaborators}</div>
            <div className="text-xs text-gray-500">Contributors</div>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          {/* Visibility */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              {getVisibilityIcon(journeyData.visibility)}
              <span>Visibility</span>
            </div>
            <span className="text-sm font-medium text-gray-900 capitalize">
              {journeyData.visibility}
            </span>
          </div>

          {/* Created Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4" />
              <span>Created</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {journeyData.createdAt.toLocaleDateString()}
            </span>
          </div>

          {/* Last Modified */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4" />
              <span>Last Modified</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {journeyData.lastModified.toLocaleDateString()}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleJourneyAction('journey_analytics')}
              className="inline-flex items-center space-x-1 text-sm text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ChartBarIcon className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            
            {journeyData.status === 'active' && (
              <button
                onClick={() => handleJourneyAction('journey_complete')}
                className="inline-flex items-center space-x-1 text-sm text-gray-600 hover:text-green-600 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>Mark Complete</span>
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Journey ID: {frameInstance.entityId}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JourneyOverviewFrame;
