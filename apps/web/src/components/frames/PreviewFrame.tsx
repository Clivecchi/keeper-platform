/**
 * Preview Frame
 * =============
 * 
 * Compact frame component for displaying content summaries and previews.
 * Used in lists, grids, and overview displays.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  EyeIcon,
  DocumentTextIcon,
  PhotoIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  CodeBracketIcon
} from '@heroicons/react/24/outline';
import { BaseFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

const PreviewFrame: React.FC<BaseFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = true,
}) => {
  const { handleFrameInteraction } = useFrame();

  const currentContent = frameInstance.FrameContent_FrameInstance_currentContentIdToFrameContent;
  const config = frameInstance.FrameConfig;
  
  const handleClick = () => {
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: 'preview_click' },
      timestamp: new Date(),
    });
    onInteraction?.({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: 'preview_click' },
      timestamp: new Date(),
    });
  };

  const getContentIcon = (contentType: string) => {
    switch (contentType?.toLowerCase()) {
      case 'image':
        return <PhotoIcon className="w-5 h-5" />;
      case 'video':
        return <VideoCameraIcon className="w-5 h-5" />;
      case 'audio':
        return <MusicalNoteIcon className="w-5 h-5" />;
      case 'code':
        return <CodeBracketIcon className="w-5 h-5" />;
      case 'text':
      case 'markdown':
        return <DocumentTextIcon className="w-5 h-5" />;
      default:
        return <EyeIcon className="w-5 h-5" />;
    }
  };

  const getThumbnail = () => {
    if (!currentContent) return null;

    // For images, show thumbnail
    if (currentContent.type === 'image') {
      return (
        <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
          <img
            src={currentContent.url}
            alt={currentContent.alt || 'Preview'}
            className="w-full h-full object-cover"
          />
        </div>
      );
    }

    // For other content types, show icon
    return (
      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
        <div className="text-gray-500">
          {getContentIcon(currentContent.type)}
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${className}`}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-4">
        {/* Thumbnail/Icon */}
        {getThumbnail()}

        {/* Content Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-900 truncate">
              {config?.name || currentContent?.alt || 'Untitled Frame'}
            </h3>
            <div className="text-gray-400 ml-2">
              {getContentIcon(currentContent?.type || 'unknown')}
            </div>
          </div>

          {config?.description && (
            <p className="text-xs text-gray-600 line-clamp-2 mb-2">
              {config.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="capitalize">
              {currentContent?.type || 'Unknown'}
            </span>
            <span>
              {new Date(frameInstance.updatedAt).toLocaleDateString()}
            </span>
          </div>

          {/* Engagement Mode Indicator */}
          {config?.engagementMode && config.engagementMode !== 'dialogic' && (
            <div className="mt-2">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {config.engagementMode}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PreviewFrame;
