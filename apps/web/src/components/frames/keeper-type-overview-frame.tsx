/**
 * Keeper Type Overview Frame
 * ===========================
 * 
 * Preview frame component for displaying Keeper Type summary information.
 * Shows type metadata, statistics, capabilities, and quick actions.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  SparklesIcon,
  TagIcon,
  LinkIcon,
  UserGroupIcon,
  ClockIcon,
  ShareIcon,
  PencilIcon,
  CalendarIcon,
  ChartBarIcon,
  CheckCircleIcon,
  CpuChipIcon,
  BeakerIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface KeeperTypeData {
  name: string;
  description: string;
  status: 'active' | 'draft' | 'deprecated' | 'beta';
  icon: string;
  category: string;
  linkedJourneys: number;
  linkedAgents: number;
  totalInstances: number;
  createdAt: Date;
  lastModified: Date;
  version: string;
  capabilities: string[];
}

const KeeperTypeOverviewFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [isExpanded, setIsExpanded] = useState(false);

  // Extract keeper type data from frame content metadata
  const keeperTypeData: KeeperTypeData = {
    name: 'DevKeeper',
    description: 'Specialized AI assistant for software development and coding tasks',
    status: 'active',
    icon: '🚀',
    category: 'Development',
    linkedJourneys: 12,
    linkedAgents: 8,
    totalInstances: 156,
    createdAt: new Date('2024-01-10'),
    lastModified: new Date(),
    version: '2.1.0',
    capabilities: ['Code Generation', 'Debugging', 'Architecture Review', 'Testing'],
    ...frameInstance.FrameContent_FrameInstance_currentContentIdToFrameContent?.metadata
  };

  const handleKeeperTypeAction = (action: string, data?: any) => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action, ...data },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const getStatusColor = (status: KeeperTypeData['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'beta':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'draft':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'deprecated':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'development':
        return <CodeBracketIcon className="w-4 h-4 text-blue-500" />;
      case 'business':
        return <ChartBarIcon className="w-4 h-4 text-green-500" />;
      case 'commerce':
        return <CpuChipIcon className="w-4 h-4 text-purple-500" />;
      case 'research':
        return <BeakerIcon className="w-4 h-4 text-orange-500" />;
      default:
        return <SparklesIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <SparklesIcon className="w-5 h-5 text-amber-600" />
          <h3 className="font-medium text-gray-900">Keeper Type Overview</h3>
        </div>
        <p className="text-sm text-gray-600">
          Comprehensive overview of Keeper Type with metadata and statistics.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow ${className}`}>
      {/* Header with Icon and Status */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Keeper Type Icon */}
            <div className="w-16 h-16 bg-white rounded-xl border border-gray-200 flex items-center justify-center text-2xl shadow-sm">
              {keeperTypeData.icon}
            </div>

            {/* Keeper Type Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  {keeperTypeData.name}
                </h2>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(keeperTypeData.status)}`}>
                  <span className="capitalize">{keeperTypeData.status}</span>
                </span>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                  v{keeperTypeData.version}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                {keeperTypeData.description}
              </p>

              {/* Category */}
              <div className="flex items-center space-x-2 mb-3">
                {getCategoryIcon(keeperTypeData.category)}
                <span className="text-sm font-medium text-gray-700">{keeperTypeData.category}</span>
              </div>

              {/* Capabilities Preview */}
              <div className="flex flex-wrap gap-1">
                {keeperTypeData.capabilities.slice(0, 3).map((capability, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800"
                  >
                    <TagIcon className="w-3 h-3 mr-1" />
                    {capability}
                  </span>
                ))}
                {keeperTypeData.capabilities.length > 3 && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                  >
                    +{keeperTypeData.capabilities.length - 3} more
                  </button>
                )}
              </div>

              {/* Expanded Capabilities */}
              {isExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2 flex flex-wrap gap-1"
                >
                  {keeperTypeData.capabilities.slice(3).map((capability, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800"
                    >
                      <TagIcon className="w-3 h-3 mr-1" />
                      {capability}
                    </span>
                  ))}
                </motion.div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => handleKeeperTypeAction('keeper_type_edit')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              title="Edit Keeper Type"
            >
              <PencilIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleKeeperTypeAction('keeper_type_share')}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
              title="Share Keeper Type"
            >
              <ShareIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-4">Usage Statistics</h3>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <LinkIcon className="w-4 h-4 text-blue-500" />
              <div className="text-lg font-semibold text-gray-900">{keeperTypeData.linkedJourneys}</div>
            </div>
            <div className="text-xs text-gray-500">Linked Journeys</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <UserGroupIcon className="w-4 h-4 text-green-500" />
              <div className="text-lg font-semibold text-gray-900">{keeperTypeData.linkedAgents}</div>
            </div>
            <div className="text-xs text-gray-500">Active Agents</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-1 mb-1">
              <CpuChipIcon className="w-4 h-4 text-purple-500" />
              <div className="text-lg font-semibold text-gray-900">{keeperTypeData.totalInstances}</div>
            </div>
            <div className="text-xs text-gray-500">Total Instances</div>
          </div>
        </div>
      </div>

      {/* Metadata Section */}
      <div className="px-6 py-4">
        <div className="space-y-3">
          {/* Created Date */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <CalendarIcon className="w-4 h-4" />
              <span>Created</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {keeperTypeData.createdAt.toLocaleDateString()}
            </span>
          </div>

          {/* Last Modified */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <ClockIcon className="w-4 h-4" />
              <span>Last Modified</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {keeperTypeData.lastModified.toLocaleDateString()}
            </span>
          </div>

          {/* Version */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <TagIcon className="w-4 h-4" />
              <span>Version</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {keeperTypeData.version}
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => handleKeeperTypeAction('keeper_type_analytics')}
              className="inline-flex items-center space-x-1 text-sm text-gray-600 hover:text-amber-600 transition-colors"
            >
              <ChartBarIcon className="w-4 h-4" />
              <span>Analytics</span>
            </button>
            
            <button
              onClick={() => handleKeeperTypeAction('keeper_type_duplicate')}
              className="inline-flex items-center space-x-1 text-sm text-gray-600 hover:text-amber-600 transition-colors"
            >
              <CpuChipIcon className="w-4 h-4" />
              <span>Duplicate</span>
            </button>

            {keeperTypeData.status === 'active' && (
              <button
                onClick={() => handleKeeperTypeAction('keeper_type_publish')}
                className="inline-flex items-center space-x-1 text-sm text-gray-600 hover:text-green-600 transition-colors"
              >
                <CheckCircleIcon className="w-4 h-4" />
                <span>Publish Update</span>
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Type ID: {frameInstance.entityId}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeeperTypeOverviewFrame;
