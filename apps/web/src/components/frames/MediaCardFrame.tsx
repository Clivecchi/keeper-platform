/**
 * Media Card Frame
 * ================
 * 
 * Frame component for displaying rich media content (images, videos, audio).
 * Supports playlists and media controls.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  PlayIcon, 
  PauseIcon, 
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowLeftIcon,
  ArrowRightIcon 
} from '@heroicons/react/24/outline';
import { MediaCardFrameProps } from '../../types/frame';
import { useFrame } from '../../context/FrameContext';

const MediaCardFrame: React.FC<MediaCardFrameProps> = ({
  frameInstance,
  className = '',
  onInteraction,
  isPreview = false,
  autoPlay = false,
  showControls = true,
}) => {
  const { handleFrameInteraction } = useFrame();
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [isMuted, setIsMuted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Get current content and playlist
  const currentContent = frameInstance.FrameContent_FrameInstance_currentContentIdToFrameContent;
  const playlist = frameInstance.FrameContent_FrameContent_playlistOwnerIdToFrameInstance || [];
  const hasPlaylist = playlist.length > 1;

  const handlePlay = () => {
    setIsPlaying(!isPlaying);
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: isPlaying ? 'pause' : 'play' },
      timestamp: new Date(),
    });
    onInteraction?.({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: isPlaying ? 'pause' : 'play' },
      timestamp: new Date(),
    });
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    handleFrameInteraction({
      type: 'click',
      frameId: frameInstance.id,
      data: { action: isMuted ? 'unmute' : 'mute' },
      timestamp: new Date(),
    });
  };

  const handlePrevious = () => {
    if (hasPlaylist && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      handleFrameInteraction({
        type: 'navigate',
        frameId: frameInstance.id,
        data: { action: 'previous', index: currentIndex - 1 },
        timestamp: new Date(),
      });
    }
  };

  const handleNext = () => {
    if (hasPlaylist && currentIndex < playlist.length - 1) {
      setCurrentIndex(currentIndex + 1);
      handleFrameInteraction({
        type: 'navigate',
        frameId: frameInstance.id,
        data: { action: 'next', index: currentIndex + 1 },
        timestamp: new Date(),
      });
    }
  };

  if (!currentContent) {
    return (
      <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
        <div className="text-center text-gray-500">
          <p>No media content available</p>
        </div>
      </div>
    );
  }

  const renderMedia = () => {
    const { type, url, alt } = currentContent;

    switch (type.toLowerCase()) {
      case 'image':
        return (
          <img
            src={url}
            alt={alt || 'Media content'}
            className="w-full h-auto rounded-lg"
          />
        );
      
      case 'video':
        return (
          <video
            src={url}
            controls={showControls}
            autoPlay={autoPlay}
            muted={isMuted}
            className="w-full rounded-lg"
          />
        );
      
      case 'audio':
        return (
          <audio
            src={url}
            controls={showControls}
            autoPlay={autoPlay}
            muted={isMuted}
            className="w-full"
          />
        );
      
      default:
        return (
          <div className="p-8 bg-gray-100 rounded-lg text-center">
            <p className="text-gray-600">Unsupported media type: {type}</p>
          </div>
        );
    }
  };

  return (
    <motion.div
      className={`bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm ${className}`}
      whileHover={isPreview ? undefined : { scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Media Content */}
      <div className="relative">
        {renderMedia()}
        
        {/* Custom Controls Overlay */}
        {showControls && (currentContent.type === 'video' || currentContent.type === 'audio') && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-black bg-opacity-50 rounded-lg p-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={handlePlay}
                  className="text-white hover:text-blue-300 transition-colors"
                >
                  {isPlaying ? (
                    <PauseIcon className="w-5 h-5" />
                  ) : (
                    <PlayIcon className="w-5 h-5" />
                  )}
                </button>
                
                <button
                  onClick={handleMute}
                  className="text-white hover:text-blue-300 transition-colors"
                >
                  {isMuted ? (
                    <SpeakerXMarkIcon className="w-5 h-5" />
                  ) : (
                    <SpeakerWaveIcon className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Playlist Controls */}
              {hasPlaylist && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrevious}
                    disabled={currentIndex === 0}
                    className="text-white hover:text-blue-300 disabled:text-gray-500 transition-colors"
                  >
                    <ArrowLeftIcon className="w-4 h-4" />
                  </button>
                  
                  <span className="text-white text-sm">
                    {currentIndex + 1} / {playlist.length}
                  </span>
                  
                  <button
                    onClick={handleNext}
                    disabled={currentIndex === playlist.length - 1}
                    className="text-white hover:text-blue-300 disabled:text-gray-500 transition-colors"
                  >
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Content Info */}
      {!isPreview && (currentContent.alt || frameInstance.FrameConfig?.description) && (
        <div className="p-4">
          {currentContent.alt && (
            <h3 className="font-medium text-gray-900 mb-1">{currentContent.alt}</h3>
          )}
          {frameInstance.FrameConfig?.description && (
            <p className="text-sm text-gray-600">{frameInstance.FrameConfig.description}</p>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default MediaCardFrame;
