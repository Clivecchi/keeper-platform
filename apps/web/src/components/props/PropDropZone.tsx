/**
 * PropDropZone Component
 * =====================
 * 
 * Empty state component for frames that shows a dashed drop zone
 * with instructions for adding props. Handles drag-and-drop events
 * and provides visual feedback during drag operations.
 */

import React, { useState, useCallback } from 'react';
const __DEBUG_STUDIO__ = import.meta.env.VITE_STUDIO_DEBUG === '1';
import { motion, AnimatePresence } from 'framer-motion';
import { PlusIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { cn } from '../../features/board-studio/v0/lib/utils';

interface PropDropZoneProps {
  /** Callback when a prop is dropped */
  onPropDrop: (propType: string, propConfig: any, position?: { x: number; y: number }) => void;
  /** Whether the frame is currently active/selected */
  isActive?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Frame pattern for contextual messaging */
  framePattern?: string;
}

export const PropDropZone: React.FC<PropDropZoneProps> = ({
  onPropDrop,
  isActive = false,
  className,
  framePattern = 'default'
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isDragOver) {
      setIsDragOver(true);
    }

    // Track drag position for visual feedback
    const rect = e.currentTarget.getBoundingClientRect();
    setDragPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  }, [isDragOver]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Only set drag over to false if we're leaving the drop zone entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragOver(false);
      setDragPosition(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (__DEBUG_STUDIO__) console.log('🎯 PropDropZone: Drop event received');
    
    setIsDragOver(false);
    setDragPosition(null);

    try {
      const propData = e.dataTransfer.getData('application/json');
      if (__DEBUG_STUDIO__) console.log('📦 PropDropZone: Raw drop data:', propData);
      
      if (propData) {
        const { type, config } = JSON.parse(propData);
        if (__DEBUG_STUDIO__) console.log('✅ PropDropZone: Parsed prop data:', { type, config });
        
        const rect = e.currentTarget.getBoundingClientRect();
        const dropPosition = {
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        };
        
        if (__DEBUG_STUDIO__) console.log('📍 PropDropZone: Drop position:', dropPosition);
        if (__DEBUG_STUDIO__) console.log('🚀 PropDropZone: Calling onPropDrop...');
        
        onPropDrop(type, config, dropPosition);
      } else {
        console.warn('⚠️ PropDropZone: No prop data found in drop event');
      }
    } catch (error) {
      console.error('❌ PropDropZone: Failed to parse dropped prop data:', error);
    }
  }, [onPropDrop]);

  const getContextualMessage = () => {
    switch (framePattern) {
      case 'dialogic':
        return 'Add AI tokens, text, or media to start conversations';
      case 'wizard':
        return 'Add form elements and navigation to guide users';
      case 'focus':
        return 'Add a hero element to capture attention';
      case 'canvas':
        return 'Add any elements and arrange them freely';
      case 'gallery':
        return 'Add images and media for visual storytelling';
      case 'form':
        return 'Add input fields and form controls';
      default:
        return 'Drop props here to add to frame';
    }
  };

  return (
    <div
      className={cn(
        "relative min-h-[200px] w-full transition-all duration-200",
        "border-2 border-dashed rounded-lg",
        isDragOver
          ? "border-blue-400 bg-blue-50/50"
          : isActive
          ? "border-gray-300 bg-gray-50/30"
          : "border-gray-200 bg-transparent",
        "hover:border-gray-300 hover:bg-gray-50/20",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Empty State Content */}
      <AnimatePresence>
        {!isDragOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-gray-100">
              <PlusIcon className="w-6 h-6 text-gray-400" />
            </div>
            
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Prop Drop
            </h3>
            
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
              {getContextualMessage()}
            </p>

            {isActive && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 flex items-center text-xs text-blue-600"
              >
                <SparklesIcon className="w-4 h-4 mr-1" />
                <span>Frame is active - ready for props</span>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag Over State */}
      <AnimatePresence>
        {isDragOver && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center"
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              className="flex items-center justify-center w-16 h-16 mb-4 rounded-full bg-blue-100"
            >
              <PlusIcon className="w-8 h-8 text-blue-600" />
            </motion.div>
            
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Drop to Add Prop
            </h3>
            
            <p className="text-sm text-blue-700">
              Release to add this element to your frame
            </p>

            {/* Visual drop indicator */}
            {dragPosition && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 0.6 }}
                className="absolute w-3 h-3 bg-blue-500 rounded-full pointer-events-none"
                style={{
                  left: dragPosition.x - 6,
                  top: dragPosition.y - 6,
                }}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PropDropZone;
