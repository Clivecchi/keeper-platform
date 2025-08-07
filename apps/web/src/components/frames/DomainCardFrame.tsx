/**
 * Domain Card Frame
 * =================
 * 
 * Preview frame component for displaying domain overview information.
 * Shows domain status, member count, setup progress, and branding.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  GlobeAltIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

interface DomainData {
  domainName: string;
  status: 'active' | 'pending' | 'inactive' | 'error';
  memberCount: number;
  setupProgress: number;
  logo?: string;
  customDomain?: string;
  lastActivity?: Date;
  plan?: string;
}

const DomainCardFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
}) => {
  const { handleFrameInteraction } = useFrame();

  // Extract domain data from frame content metadata
  const domainData: DomainData = {
    domainName: 'demo.keeper-platform.com',
    status: 'active',
    memberCount: 5,
    setupProgress: 75,
    logo: 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=200&h=200&fit=crop&crop=center',
    customDomain: 'my-domain.com',
    lastActivity: new Date(),
    plan: 'Professional',
    ...frameInstance.FrameContent_FrameInstance_currentContentIdToFrameContent?.metadata
  };

  const handleCardClick = () => {
    const interaction = {
      type: 'click' as const,
      frameId: frameInstance.id,
      data: { action: 'domain_select', domainName: domainData.domainName },
      timestamp: new Date(),
    };
    
    handleFrameInteraction(interaction);
    onInteraction?.(interaction);
  };

  const getStatusIcon = (status: DomainData['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'pending':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'inactive':
        return <ClockIcon className="w-5 h-5 text-gray-400" />;
      case 'error':
        return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <GlobeAltIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: DomainData['status']) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'inactive':
        return 'text-gray-600 bg-gray-50 border-gray-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'text-green-600 bg-green-600';
    if (progress >= 50) return 'text-yellow-600 bg-yellow-600';
    return 'text-red-600 bg-red-600';
  };

  if (isPreview) {
    return (
      <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center space-x-2 mb-2">
          <GlobeAltIcon className="w-5 h-5 text-green-600" />
          <h3 className="font-medium text-gray-900">Domain Card</h3>
        </div>
        <p className="text-sm text-gray-600">
          Domain overview with status and setup progress.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow cursor-pointer ${className}`}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
    >
      {/* Header with Logo and Status */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            {/* Domain Logo */}
            <div className="w-12 h-12 bg-white rounded-lg border border-gray-200 overflow-hidden flex-shrink-0">
              {domainData.logo ? (
                <img 
                  src={domainData.logo} 
                  alt={`${domainData.domainName} logo`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <GlobeAltIcon className="w-6 h-6 text-gray-400" />
                </div>
              )}
            </div>

            {/* Domain Info */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 truncate">
                {domainData.domainName}
              </h3>
              {domainData.customDomain && (
                <p className="text-sm text-gray-600 flex items-center space-x-1">
                  <span>→</span>
                  <span>{domainData.customDomain}</span>
                  <ArrowTopRightOnSquareIcon className="w-3 h-3" />
                </p>
              )}
              {domainData.plan && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mt-1">
                  {domainData.plan}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge */}
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(domainData.status)}`}>
            {getStatusIcon(domainData.status)}
            <span className="ml-1 capitalize">{domainData.status}</span>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Member Count */}
          <div className="flex items-center space-x-2">
            <UserGroupIcon className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium text-gray-900">{domainData.memberCount}</div>
              <div className="text-xs text-gray-500">Members</div>
            </div>
          </div>

          {/* Last Activity */}
          <div className="flex items-center space-x-2">
            <ClockIcon className="w-4 h-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium text-gray-900">
                {domainData.lastActivity?.toLocaleDateString() || 'Today'}
              </div>
              <div className="text-xs text-gray-500">Last activity</div>
            </div>
          </div>
        </div>

        {/* Setup Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Setup Progress</span>
            <span className={`text-sm font-medium ${getProgressColor(domainData.setupProgress).split(' ')[0]}`}>
              {domainData.setupProgress}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${getProgressColor(domainData.setupProgress).split(' ')[1]}`}
              initial={{ width: 0 }}
              animate={{ width: `${domainData.setupProgress}%` }}
              transition={{ duration: 1, delay: 0.5 }}
            />
          </div>
        </div>
      </div>

      {/* Quick Actions Footer */}
      <div className="bg-gray-50 px-6 py-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Click to configure</span>
          <div className="flex items-center space-x-4">
            {domainData.setupProgress < 100 && (
              <span className="text-orange-600 font-medium">Setup incomplete</span>
            )}
            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-gray-400" />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DomainCardFrame;
